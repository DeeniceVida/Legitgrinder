import React, { useRef } from 'react';
import { Printer, Download } from 'lucide-react';

interface InvoiceProps {
    order: any;
}

const InvoiceGenerator: React.FC<InvoiceProps> = ({ order }) => {
    const invoiceRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const content = invoiceRef.current;
        if (content) {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
          <html>
            <head>
              <title>Invoice #${order.id}</title>
              <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
                .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #FF9900; padding-bottom: 20px; }
                .logo { font-size: 24px; font-weight: bold; color: #FF9900; }
                .invoice-details { text-align: right; }
                .invoice-title { font-size: 36px; font-weight: bold; color: #333; margin-bottom: 10px; }
                .bill-to { margin-bottom: 30px; }
                .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .table th { text-align: left; padding: 12px; background: #f9f9f9; border-bottom: 1px solid #ddd; }
                .table td { padding: 12px; border-bottom: 1px solid #eee; }
                .total-section { text-align: right; margin-top: 20px; }
                .total-row { font-size: 18px; font-weight: bold; margin-top: 10px; }
                .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 20px; }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="logo">LegitGrinder</div>
                <div class="invoice-details">
                  <div class="invoice-title">INVOICE</div>
                  <div>Invoice #: ${order.id}</div>
                  <div>Date: ${new Date().toLocaleDateString()}</div>
                </div>
              </div>

              <div class="bill-to">
                <h3>Bill To:</h3>
                <div>${order.client_name || order.client_email}</div>
                <div>${order.client_location || ''}</div>
                <div>${order.client_phone || ''}</div>
                <div>${order.client_email || ''}</div>
              </div>

              <table class="table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${order.product_name} (${order.mode || 'Shipping'})</td>
                    <td>KES ${order.buying_price_kes?.toLocaleString()}</td>
                    <td>KES ${order.buying_price_kes?.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Shipping Fee</td>
                    <td>-</td>
                    <td>KES ${order.shipping_fee_kes?.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Service Fee</td>
                    <td>-</td>
                    <td>KES ${order.service_fee_kes?.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <div class="total-section">
                <div class="total-row">Total: KES ${order.total_cost_kes?.toLocaleString()}</div>
                <div>Status: ${order.is_paid ? 'PAID' : 'PENDING'}</div>
              </div>

              <div class="footer">
                <p>Thank you for your business!</p>
                <p>LegitGrinder Imports & Logistics</p>
              </div>
            </body>
          </html>
        `);
                printWindow.document.close();
                printWindow.print();
            }
        }
    };

    return (
        <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-bold text-sm"
        >
            <Printer className="w-4 h-4" /> Print Invoice
        </button>
    );
};

export default InvoiceGenerator;
