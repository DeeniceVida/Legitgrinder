// Client helper for the Manager (Supervisor). Talks to /api/supervisor.

export type SupervisorAction = {
  type: 'none' | 'open_catalog' | 'draft_message' | 'open_tracking' | 'open_group_buys';
  invoice_number?: string;
  intent?: 'reminder' | 'ready' | 'shipped' | 'thanks' | 'custom';
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
