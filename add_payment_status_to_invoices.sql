ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'Unpaid';
