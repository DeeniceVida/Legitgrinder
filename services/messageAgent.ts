// Client helper for the WhatsApp message agent. Talks to /api/message-agent.

export type MessageIntent = 'reminder' | 'ready' | 'shipped' | 'thanks' | 'review' | 'custom';

export interface MessageAgentInput {
  intent: MessageIntent;
  clientName?: string;
  productName?: string;
  invoiceNumber?: string;
  totalKES?: number;
  amountPaidKES?: number;
  balanceKES?: number;
  isPaid?: boolean;
  paymentStatus?: string;
  status?: string;
  payLink?: string;
  trackingLink?: string;
  reviewLink?: string;
  custom?: string;
}

export interface StatusEmailInput {
  to: string;
  intent: MessageIntent;
  clientName?: string;
  productName?: string;
  invoiceNumber?: string;
  message: string;
  trackUrl?: string;
  payUrl?: string;
  reviewUrl?: string;
  balanceKES?: number;
  currency?: string;
}

/**
 * Send the drafted message to the client as a branded email. Status updates go
 * out from orders@legitgrinder.com; payment reminders from invoices@ — both
 * forward replies to the owner's inbox.
 */
export async function sendStatusEmail(
  input: StatusEmailInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/order-status-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'The email could not be sent.' };
    }
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Could not reach the email service. Note: it only works on the live site, not local preview.'
    };
  }
}

export async function draftClientMessage(
  input: MessageAgentInput
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/message-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'The message agent could not be reached.' };
    }
    return { success: true, message: data.message as string };
  } catch (err: any) {
    return {
      success: false,
      error:
        err.message ||
        'Could not reach the message agent. Note: it only works on the live site, not local preview.'
    };
  }
}
