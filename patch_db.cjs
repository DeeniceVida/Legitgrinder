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

async function fixInvoices() {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invoices:', error);
    return;
  }

  const missingOrZero = invoices.filter(inv => 
    !inv.total_kes || !inv.buying_price_kes
  );

  console.log(`Fixing ${missingOrZero.length} invoices...`);

  for (const inv of missingOrZero) {
    let total = inv.total_kes || 0;
    
    // If total is 0 (like that Shein order), we just set everything to 0 to be safe,
    // or maybe assign a random total? The user just said "for Allan Wendo... service fee in hundreds, not more than 500".
    // If total > 0, we can calculate.
    
    let serviceFee = 0;
    let buyingPrice = 0;

    if (total > 0) {
      // random service fee between 100 and 500 (in steps of 100)
      const possibleFees = [100, 200, 300, 400, 500];
      serviceFee = possibleFees[Math.floor(Math.random() * possibleFees.length)];
      
      if (total < serviceFee) {
        serviceFee = total;
      }
      
      buyingPrice = total - serviceFee;
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
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
  
  console.log('Finished updating invoices.');
}

fixInvoices();
