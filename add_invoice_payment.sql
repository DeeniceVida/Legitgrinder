-- Record a pay-link payment against an invoice (deposit or full).
-- Run ONCE in Supabase Dashboard → SQL Editor.
--
-- Guests (anon) cannot write to `invoices` directly (RLS blocks it, correctly).
-- This SECURITY DEFINER function is the single safe gate a public pay page may
-- call. It records the amount paid, sets the payment status (Paid when the
-- running total covers the invoice, else Partially Paid), stamps the Paystack
-- reference, and returns the resulting state so the page can show a receipt.

create or replace function public.record_invoice_payment(
  p_invoice_number text,
  p_amount_kes int,
  p_reference text,
  p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_prev_paid int;
  v_new_paid int;
  v_status text;
  v_fully boolean;
begin
  select * into v_inv from invoices where invoice_number = p_invoice_number for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'invoice_not_found');
  end if;

  -- amount_paid_kes tracks the running total across deposit + balance payments
  v_prev_paid := coalesce(v_inv.amount_paid_kes, case when v_inv.is_paid then coalesce(v_inv.total_kes, 0) else 0 end);
  v_new_paid  := v_prev_paid + greatest(coalesce(p_amount_kes, 0), 0);
  v_fully     := v_new_paid >= coalesce(v_inv.total_kes, 0) and coalesce(v_inv.total_kes, 0) > 0;
  v_status    := case when v_fully then 'Paid' else 'Partially Paid' end;

  update invoices set
    amount_paid_kes    = v_new_paid,
    is_paid            = v_fully,
    payment_status     = v_status,
    paystack_reference = coalesce(p_reference, paystack_reference),
    client_email       = coalesce(p_email, client_email),
    last_update        = now()
  where invoice_number = p_invoice_number;

  return jsonb_build_object(
    'success', true,
    'invoice_number', p_invoice_number,
    'amount_paid_kes', v_new_paid,
    'total_kes', coalesce(v_inv.total_kes, 0),
    'balance_kes', greatest(coalesce(v_inv.total_kes, 0) - v_new_paid, 0),
    'payment_status', v_status,
    'is_paid', v_fully
  );
end;
$$;

grant execute on function public.record_invoice_payment(text, int, text, text) to anon, authenticated;

-- Supporting columns (safe to run repeatedly)
alter table public.invoices add column if not exists amount_paid_kes int default 0;
alter table public.invoices add column if not exists client_email text;
