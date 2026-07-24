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
