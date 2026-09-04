import React, { useEffect, useRef, useState } from 'react';
import { BellRinging, BellSlash, DeviceMobile, Export, CircleNotch, CheckCircle } from '@phosphor-icons/react';
import { enablePush, disablePush, pushEnabled, pushSupported, isIOS, isInstalled } from '../services/push';

/**
 * "Install the app" + "Buzz my phone when a job comes in", for the rider page.
 *
 * The awkward part is iPhone. iOS grants push ONLY to a page that has been
 * added to the Home Screen, and Safari offers no install prompt to trigger —
 * the rider has to do it by hand from the Share sheet. So this deliberately
 * shows the Home Screen instructions BEFORE the alerts toggle on iOS, because
 * tapping the toggle first would just fail and teach them the feature is broken.
 *
 * Android/Chrome is the easy path: the browser fires beforeinstallprompt and we
 * hand it back on a button.
 */

interface Props {
  token: string;
  pin?: string;
  /** Bubble a PIN failure up so the dashboard can show its sign-in screen. */
  onNeedsPin?: () => void;
}

const RiderAlerts: React.FC<Props> = ({ token, pin, onNeedsPin }) => {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const installEvent = useRef<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(isInstalled());

  const ios = isIOS();
  const supported = pushSupported();

  // The manifest for THIS rider, so an install from this page produces an app
  // that opens on their jobs rather than the storefront. Swapping the existing
  // <link> is what the install prompt reads at the moment it is shown.
  useEffect(() => {
    if (!token) return;
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) return;
    const previous = link.href;
    link.href = `/api/rider-manifest?token=${encodeURIComponent(token)}`;
    return () => { link.href = previous; };
  }, [token]);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();          // keep Chrome's own mini-bar from firing
      installEvent.current = e;
      setCanInstall(true);
    };
    const onInstalled = () => { setInstalled(true); setCanInstall(false); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Ask the server, not localStorage — see pushEnabled's note.
  useEffect(() => {
    let alive = true;
    pushEnabled(token, pin).then(v => { if (alive) setOn(v); });
    return () => { alive = false; };
  }, [token, pin]);

  // Chrome occasionally rotates a subscription; the worker tells us so we can
  // re-register instead of going quietly dead.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'push-subscription-changed') enablePush(token, pin).catch(() => { });
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [token, pin]);

  const install = async () => {
    const e = installEvent.current;
    if (!e) return;
    e.prompt();
    try { await e.userChoice; } catch { /* dismissed */ }
    installEvent.current = null;
    setCanInstall(false);
  };

  const toggle = async () => {
    setBusy(true); setMsg(null); setOk(null);
    const res = on ? await disablePush(token, pin) : await enablePush(token, pin);
    setBusy(false);

    if (res.needsPin) { onNeedsPin?.(); return; }
    if (!res.success) { setMsg(res.error || 'That did not work.'); return; }

    setOn(!on);
    setOk(on ? 'Alerts are off on this phone.' : 'Alerts are on. Your phone will buzz when a job is assigned to you.');
  };

  const showIOSHelp = ios && !installed;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${on ? 'bg-emerald-500/15' : 'bg-white/10'}`}>
          {on
            ? <BellRinging size={19} weight="fill" className="text-emerald-400" />
            : <BellSlash size={19} weight="duotone" className="text-neutral-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">Job alerts</p>
          <p className="text-[12px] text-neutral-400 font-light leading-relaxed mt-0.5">
            {on
              ? 'This phone buzzes when a package is assigned to you.'
              : 'Get a notification the moment a package is assigned to you — you will not have to keep checking this page.'}
          </p>
        </div>
      </div>

      {/* iPhone: the Home Screen step is not optional, so it comes first. */}
      {showIOSHelp && (
        <div className="mt-4 rounded-xl bg-[#3D8593]/10 border border-[#3D8593]/25 p-4">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#3D8593] mb-2">iPhone: one-time setup</p>
          <ol className="text-[12px] text-neutral-300 font-light leading-relaxed space-y-1.5 list-decimal list-inside">
            <li>Tap the Share button <Export size={13} weight="bold" className="inline align-[-2px]" /> at the bottom of Safari.</li>
            <li>Choose <strong className="text-white font-semibold">Add to Home Screen</strong>.</li>
            <li>Open LG Rider from your Home Screen, then turn alerts on here.</li>
          </ol>
          <p className="text-[11px] text-neutral-500 mt-2.5">
            iPhone only allows notifications from the Home Screen app — not from Safari itself.
          </p>
        </div>
      )}

      {/* Android/Chrome: a real install button. */}
      {canInstall && !installed && (
        <button
          onClick={install}
          className="mt-4 w-full h-12 rounded-full bg-white text-[#0f1a1c] font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <DeviceMobile size={16} weight="bold" /> Install the app
        </button>
      )}

      {installed && (
        <p className="mt-3 text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
          <CheckCircle size={13} weight="fill" /> Installed on this phone
        </p>
      )}

      {supported && !showIOSHelp && (
        <button
          onClick={toggle}
          disabled={busy}
          className={`mt-4 w-full h-12 rounded-full font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 ${
            on ? 'bg-white/10 text-white border border-white/20' : 'bg-[#3D8593] text-white'
          }`}
        >
          {busy
            ? <><CircleNotch size={15} className="animate-spin" /> Working…</>
            : on
              ? <><BellSlash size={15} weight="bold" /> Turn alerts off</>
              : <><BellRinging size={15} weight="bold" /> Turn alerts on</>}
        </button>
      )}

      {!supported && !showIOSHelp && (
        <p className="mt-3 text-[11px] text-neutral-500">
          This browser cannot show notifications. Open the page in Chrome.
        </p>
      )}

      {ok && <p className="mt-3 text-[12px] text-emerald-400 font-medium">{ok}</p>}
      {msg && <p className="mt-3 text-[12px] text-rose-300 font-medium leading-relaxed">{msg}</p>}
    </div>
  );
};

export default RiderAlerts;
