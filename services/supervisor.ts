// Client helper for the Manager (Supervisor). Talks to /api/supervisor.

export interface SupervisorPayload {
  // create_order
  client_name?: string;
  client_whatsapp?: string;
  product_name?: string;
  quantity?: number;
  total_kes?: number;
  is_paid?: boolean;
  // create_product
  name?: string;
  description?: string;
  category?: string;
  price_kes?: number;
  availability?: 'Available Locally' | 'Import on Order';
  stock_count?: number;
  shipping_duration?: string;
  // update_tracking
  internal_status?: string;
  // create_group_buy
  title?: string;
  unit_price_kes?: number;
  min_deposit_kes?: number;
  closes_at?: string;
}

export type SupervisorAction = {
  type:
    | 'none'
    | 'create_order' | 'create_product' | 'update_tracking' | 'create_group_buy'
    | 'open_catalog' | 'draft_message' | 'open_tracking' | 'open_group_buys';
  invoice_number?: string;
  intent?: 'reminder' | 'ready' | 'shipped' | 'thanks' | 'custom';
  payload?: SupervisorPayload;
};

export interface SupervisorReply {
  reply: string;
  action: SupervisorAction;
}

export async function askSupervisor(
  messages: { role: 'user' | 'assistant'; content: string }[],
  snapshot: string
): Promise<{ success: boolean; data?: SupervisorReply; error?: string }> {
  try {
    const res = await fetch('/api/supervisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, snapshot })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'The Manager could not be reached.' };
    return { success: true, data: { reply: data.reply, action: data.action || { type: 'none' } } };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Could not reach the Manager. Note: it only works on the live site, not local preview.'
    };
  }
}
