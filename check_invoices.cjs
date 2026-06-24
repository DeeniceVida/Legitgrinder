const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
  console.error("Missing supabase credentials in .env.local");
  process.exit(1);
}

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInvoices() {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, client_name, product_name, total_kes, buying_price_kes, shipping_fee_kes, logistics_cost_kes, service_fee_kes, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invoices:', error);
    return;
  }

  const missingOrZero = invoices.filter(inv => 
    !inv.total_kes || !inv.buying_price_kes
  );

  console.log(`Total Invoices: ${invoices.length}`);
  console.log(`Invoices missing or zero total/buying price: ${missingOrZero.length}`);
  
  if (missingOrZero.length > 0) {
    console.log('\nMissing Invoices (needs updating):');
    missingOrZero.forEach(inv => {
      console.log(`- Invoice #${inv.invoice_number} (${inv.client_name} - ${inv.product_name}) [Total: ${inv.total_kes}, Buying: ${inv.buying_price_kes}, Shipping: ${inv.shipping_fee_kes}, Logistics: ${inv.logistics_cost_kes}, Service: ${inv.service_fee_kes}]`);
    });
  }
}

checkInvoices();
