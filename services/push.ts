import { supabase } from '../lib/supabase';
import { VAPID_PUBLIC_KEY } from '../constants';

/**
 * Web Push for riders.
 *
 * The rider half (enable/disable/status) authenticates with the same access
 * token + PIN as the rest of the rider dashboard, through SECURITY DEFINER
 * RPCs — riders have no Supabase account and never touch the table directly.
 *
 * The admin half (notifyRider) reads the rider's subscriptions under RLS and
 * hands them to /api/notify-rider, which does the VAPID signing. The private
 * key never reaches the browser.
 */

/**
 * The migration has not been run yet. Two audiences need two answers: the
 * owner can fix it and should be told which file to run; a rider cannot and
 * should not be shown our schema. Same test, different wording.
 */
const migrationMissing = (msg?: string): boolean =>
  /schema cache|does not exist|function public\./i.test(msg || '');

const ADMIN_MIGRATION_HINT =
  'Run add_rider_push.sql in Supabase first — the alerts table does not exist yet.';
const RIDER_MIGRATION_HINT =
  'Alerts are not switched on yet. Ask LegitGrinder to finish setting them up.';

export const pushSupported = (): boolean =>
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator &&
  typeof window !== 'undefined' &&
  'PushManager' in window &&
  'Notification' in window;

/**
 * iOS only exposes push to an app that has been added to the Home Screen, and
 * gives no install prompt to trigger it from. Detecting this is the difference
 * between "Turn on alerts does nothing" and telling the rider what to do.
 */
export const isIOS = (): boolean =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports as a Mac; the touch points give it away.
    (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1));

export const isInstalled = (): boolean =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true);

/** The applicationServerKey has to be raw bytes, not the base64url string. */
const urlBase64ToUint8Array = (b64: string): Uint8Array => {
  const padded = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

const keyOf = (sub: PushSubscription, name: 'p256dh' | 'auth'): string => {
  const key = sub.getKey(name);
  if (!key) return '';
  const bytes = new Uint8Array(key);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const registration = async (): Promise<ServiceWorkerRegistration | null> => {
  try { return await navigator.serviceWorker.ready; } catch { return null; }
};

export interface PushResult { success: boolean; error?: string; needsPin?: boolean; }

/**
 * Ask for permission, subscribe this phone, and record it against the rider.
 * Returns a specific reason on every failure path — "it didn't work" is not
 * something a rider standing in the street can act on.
 */
export const enablePush = async (token: string, pin?: string): Promise<PushResult> => {
  if (!pushSupported()) {
    return {
      success: false,
      error: isIOS() && !isInstalled()
        ? 'On iPhone, first add this page to your Home Screen (Share → Add to Home Screen), open it from there, then turn alerts on.'
        : 'This browser cannot do notifications. Try Chrome.',
    };
  }

  let permission: NotificationPermission;
  try { permission = await Notification.requestPermission(); }
  catch { return { success: false, error: 'Could not ask for notification permission.' }; }

  if (permission === 'denied') {
    return {
      success: false,
      error: 'Notifications are blocked for this site. Turn them back on in your browser settings for legitgrinder.com, then try again.',
    };
  }
  if (permission !== 'granted') return { success: false, error: 'Permission was not granted.' };

  const reg = await registration();
  if (!reg) return { success: false, error: 'The app is still starting up. Try again in a moment.' };

  let sub: PushSubscription;
  try {
    // An existing subscription made with a different VAPID key cannot be
    // reused; unsubscribe first or subscribe() throws InvalidStateError.
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      const same = existing.options?.applicationServerKey;
      const wanted = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const matches = same && new Uint8Array(same as ArrayBuffer).every((b, i) => b === wanted[i]);
      if (!matches) await existing.unsubscribe();
    }
    sub = (await reg.pushManager.getSubscription())
      || (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));
  } catch (e: any) {
    return { success: false, error: e?.message || 'This phone would not register for notifications.' };
  }

  const { data, error } = await supabase.rpc('rider_save_push', {
    p_token: token,
    p_pin: pin || null,
    p_endpoint: sub.endpoint,
    p_p256dh: keyOf(sub, 'p256dh'),
    p_auth: keyOf(sub, 'auth'),
    p_ua: navigator.userAgent.slice(0, 300),
  });
  if (error) return { success: false, error: migrationMissing(error.message) ? RIDER_MIGRATION_HINT : error.message };
  const r = data as { ok?: boolean; error?: string; needsPin?: boolean };
  if (!r?.ok) return { success: false, error: r?.error || 'Could not save the alert setting.', needsPin: r?.needsPin };
  return { success: true };
};

export const disablePush = async (token: string, pin?: string): Promise<PushResult> => {
  const reg = await registration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (!sub) return { success: true };

  const endpoint = sub.endpoint;
  try { await sub.unsubscribe(); } catch { /* server row still needs clearing */ }

  const { data, error } = await supabase.rpc('rider_delete_push', {
    p_token: token, p_pin: pin || null, p_endpoint: endpoint,
  });
  if (error) return { success: false, error: migrationMissing(error.message) ? RIDER_MIGRATION_HINT : error.message };
  const r = data as { ok?: boolean; error?: string };
  return r?.ok ? { success: true } : { success: false, error: r?.error || 'Could not turn alerts off.' };
};

/**
 * Whether THIS phone is registered, according to the server. Deliberately not
 * read from localStorage: after a reinstall or cleared site data the browser
 * has a new endpoint while localStorage still says "on", and the rider would
 * sit there trusting a toggle that no longer points at anything.
 */
export const pushEnabled = async (token: string, pin?: string): Promise<boolean> => {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  const reg = await registration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (!sub) return false;

  const { data, error } = await supabase.rpc('rider_push_status', {
    p_token: token, p_pin: pin || null, p_endpoint: sub.endpoint,
  });
  if (error) return false;
  return (data as { enabled?: boolean })?.enabled === true;
};

/* ------------------------------------------------------------------ *
 * Admin side
 * ------------------------------------------------------------------ */

export interface NotifyResult { success: boolean; sent: number; error?: string; }

/**
 * Buzz a rider's phone(s). Called when a job is assigned to them.
 *
 * Never throws and never blocks the caller's own success: assigning the
 * delivery is the real work, and a failed notification must not make a
 * completed assignment look broken.
 */
export const notifyRider = async (opts: {
  riderId: string;
  riderToken?: string;
  title: string;
  body: string;
}): Promise<NotifyResult> => {
  try {
    // Stored as auth_secret, not auth — the column cannot be called `auth`
    // without colliding with the auth schema in this table's RLS policy.
    // The push spec calls the field `auth`, so it is renamed on the way out.
    const { data: rows, error } = await supabase
      .from('rider_push_subscriptions')
      .select('endpoint,p256dh,auth_secret')
      .eq('rider_id', opts.riderId);
    const subs = (rows || []).map(r => ({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth_secret }));
    if (error) {
      return { success: false, sent: 0, error: migrationMissing(error.message) ? ADMIN_MIGRATION_HINT : error.message };
    }
    if (!subs?.length) {
      return { success: false, sent: 0, error: 'That rider has not turned on alerts yet.' };
    }

    const { data: sess } = await supabase.auth.getSession();
    const jwt = sess?.session?.access_token;
    if (!jwt) return { success: false, sent: 0, error: 'Your session expired — sign in again.' };

    const res = await fetch('/api/notify-rider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({
        subscriptions: subs,
        title: opts.title,
        body: opts.body,
        url: opts.riderToken ? `/rider/${opts.riderToken}` : '/',
        tag: 'delivery',
      }),
    });

    const text = await res.text();
    let json: any = {};
    try { json = JSON.parse(text); } catch { /* keep the raw text for the error */ }
    if (!res.ok) {
      return { success: false, sent: 0, error: json?.error || `Push failed (${res.status}). ${text.slice(0, 120)}` };
    }

    // Endpoints the push service has retired. Left in place they accumulate
    // forever and every future send reports failures that mean nothing.
    if (Array.isArray(json.expired) && json.expired.length) {
      await supabase.from('rider_push_subscriptions').delete().in('endpoint', json.expired);
    }

    return { success: !!json.success, sent: json.sent || 0, error: json.success ? undefined : (json.error || 'No phone accepted the alert.') };
  } catch (e: any) {
    return { success: false, sent: 0, error: e?.message || 'Could not send the alert.' };
  }
};
