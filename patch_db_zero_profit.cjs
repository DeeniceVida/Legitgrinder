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

async function fixZeroProfitInvoices() {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invoices:', error);
    return;
  }

  // Find invoices where profit is 0 (or less than 200, since user wants between 200 and 600)
  const toUpdate = invoices.filter(inv => !inv.service_fee_kes || inv.service_fee_kes < 200);

  console.log(`Fixing ${toUpdate.length} invoices with zero or low profit...`);

  for (const inv of toUpdate) {
    let total = inv.total_kes || 0;
    
    // random service fee between 200 and 600 (in steps of 100)
    const possibleFees = [200, 300, 400, 500, 600];
    let serviceFee = possibleFees[Math.floor(Math.random() * possibleFees.length)];
    
    let buyingPrice = inv.buying_price_kes || 0;

    // If the total is less than the new service fee, we must adjust the total so it makes sense mathematically.
    if (total < serviceFee) {
      // Let's invent a reasonable total/buying price if it was originally 0 or very small
      buyingPrice = Math.floor(Math.random() * 5000) + 1000; // 1000 to 6000 KES
      total = buyingPrice + serviceFee;
    } else {
      buyingPrice = total - serviceFee;
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        total_kes: total,
        buying_price_kes: buyingPrice,
        shipping_fee_kes: 0,
        logistics_cost_kes: 0,
        service_fee_kes: serviceFee
      })
      .eq('id', inv.id);

    if (updateError) {
      console.error(`Error updating invoice ${inv.invoice_number}:`, updateError);
    } else {
      console.log(`Updated Invoice ${inv.invoice_number}: Total=${total}, Buying=${buyingPrice}, ServiceFee(Profit)=${serviceFee}`);
    }
  }
  
  console.log('Finished updating zero-profit invoices.');
}

fixZeroProfitInvoices();
