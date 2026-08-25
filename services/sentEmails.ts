import { supabase } from '../lib/supabase';

/**
 * A record of what the site has emailed.
 *
 * Logged from the client, right after each send returns, because the mailer
 * itself runs in a Pages Function with no Supabase credentials. Every send
 * site calls logSentEmail — including on failure, since a bounced invoice
 * matters far more than a delivered one and was previously invisible.
 */

export type EmailKind =
  | 'invoice' | 'receipt' | 'restock' | 'corporate'
  | 'sale-alert' | 'order-status' | 'group-balance';

export interface SentEmail {
  id: string;
  kind: EmailKind | string;
  recipient: string;
  recipients: number;
  subject?: string;
  status: 'sent' | 'failed';
  error?: string;
  reference?: string;
  createdAt: string;
}

/**
 * Record one send. Never throws and never blocks: a logging failure must not
 * break, delay or report an error on the thing that was actually being done.
 */
export const logSentEmail = async (e: {
  kind: EmailKind;
  recipient: string | string[];
  subject?: string;
  status: 'sent' | 'failed';
  error?: string;
  reference?: string;
}): Promise<void> => {
  try {
    const list = Array.isArray(e.recipient) ? e.recipient : [e.recipient];
    const clean = list.map(r => (r || '').trim()).filter(Boolean);
    if (!clean.length) return;
    await supabase.from('sent_emails').insert({
      kind: e.kind,
      recipient: clean.join(', '),
      recipients: clean.length,
      subject: e.subject ?? null,
      status: e.status,
      // Truncated: some provider errors are enormous and the column is for
      // reading at a glance, not forensics.
      error: e.error ? String(e.error).slice(0, 400) : null,
      reference: e.reference ?? null,
    });
  } catch {
    // Swallowed on purpose — see above.
  }
};

const toSentEmail = (d: any): SentEmail => ({
  id: d.id,
  kind: d.kind,
  recipient: d.recipient,
  recipients: d.recipients ?? 1,
  subject: d.subject || undefined,
  status: d.status === 'failed' ? 'failed' : 'sent',
  error: d.error || undefined,
  reference: d.reference || undefined,
  createdAt: d.created_at,
});

/** Admin: the history, newest first. */
export const fetchSentEmails = async (limit = 250): Promise<SentEmail[]> => {
  try {
    const { data, error } = await supabase
      .from('sent_emails')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map(toSentEmail);
  } catch {
    return [];
  }
};

/** How each kind reads in the dashboard. */
export const KIND_LABEL: Record<string, string> = {
  invoice: 'Invoice',
  receipt: 'Receipt',
  restock: 'Back in stock',
  corporate: 'Corporate quote',
  'sale-alert': 'Sale alert',
  'order-status': 'Order update',
  'group-balance': 'Group balance',
};
