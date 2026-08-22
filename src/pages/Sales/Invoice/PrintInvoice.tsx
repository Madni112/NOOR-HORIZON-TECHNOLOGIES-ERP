import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import Barcode from 'react-barcode';
import FbrLogo from '../../../images/logo/fbr-logo.png';
import { useAuth } from '../../../Context/Auth';


interface InvoiceItem {
  itemName?: string;
  product_name?: string;
  qty?: number;
  quantity?: number;
  rp?: number;
  mrp?: number;
  rate?: number;
  price?: number;
  gstRate?: number;
  gst_rate?: number;
  fTaxPer?: number;
  f_tax_per?: number;
  discount?: number;
  location?: string;
}

interface InvoiceData {
  id: number;
  customer_name: string;
  salesman?: string;
  sale_date?: string;
  payment_term?: string;
  dispatch_warehouse?: string;
  dc_no?: string;
  quotation_id?: string;
  fbr_fiscal_number?: string;
  fbr_qr_code?: string;
  cash_amount_paid?: number;
  total_amount?: number;
  total_gst_amount?: number;
  total_net_amount?: number;
  remarks?: string;
  seller_name?: string;
  seller_address?: string;
  items: InvoiceItem[];
  created_at: string;
}

const PrintInvoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { businessName, tenantId } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const barcodeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('sales_invoices')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        setInvoice(data);

        // Fetch customer info dynamically
        if (data.customer_name) {
          const { data: custData } = await supabase
            .from('customers')
            .select('ntnNo, cnicNo, primaryPhone, address')
            .eq('customerName', data.customer_name)
            .maybeSingle();
          if (custData) {
            setCustomerInfo(custData);
          }
        }
      } catch (err: any) {
        toast.error('Failed to load invoice: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  if (loading) return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
  if (!invoice) return <div className="text-center py-20 text-gray-500">Invoice not found.</div>;

  // ── Compute line items ──────────────────────────────────────────────────────
  const items = Array.isArray(invoice.items) ? invoice.items : [];

  let computedTotalBase = 0;
  let computedTotalGst = 0;
  let computedTotalNet = 0;

  const processedItems = items.map((item) => {
    const qty = Number(item.qty ?? item.quantity ?? 0);
    const basePrice = Number(item.rp ?? item.mrp ?? item.rate ?? item.price ?? 0);
    const gstRate = Number(item.gstRate ?? item.gst_rate ?? 0);
    const fTaxPer = Number(item.fTaxPer ?? item.f_tax_per ?? 0);
    const discount = Number(item.discount ?? 0);

    const baseAmount = basePrice * qty;
    const discountAmt = (baseAmount * discount) / 100;
    const afterDiscount = baseAmount - discountAmt;
    const gstAmount = (afterDiscount * gstRate) / 100;
    const fTaxAmount = (afterDiscount * fTaxPer) / 100;
    const netRowAmount = afterDiscount + gstAmount + fTaxAmount;
    const pName = item.itemName ?? item.product_name ?? 'N/A';

    computedTotalBase += afterDiscount;
    computedTotalGst += gstAmount;
    computedTotalNet += netRowAmount;

    return { pName, qty, basePrice, gstRate, gstAmount, discount, discountAmt, netRowAmount };
  });

  const finalTotalGoods = computedTotalBase > 0 ? computedTotalBase : Number(invoice.total_amount || 0);
  const finalTotalGst = computedTotalGst > 0 ? computedTotalGst : Number(invoice.total_gst_amount || 0);
  const finalTotalNet = computedTotalNet > 0 ? computedTotalNet : Number(invoice.total_net_amount || invoice.total_amount || 0);
  const amountPaid = Number(invoice.cash_amount_paid || 0);
  const balance = finalTotalNet - amountPaid;

  const invoiceNo = `INV-${String(invoice.id).padStart(4, '0')}`;
  const fbrCode = invoice.fbr_fiscal_number || '';
  const saleDate = invoice.sale_date || new Date(invoice.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // ── Number to Words Helper ───────────────────────────────────────────────
  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const n = ('000000000' + num).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0] as any] + ' ' + a[n[1][1] as any]) + 'Crore ' : '';
    str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0] as any] + ' ' + a[n[2][1] as any]) + 'Lakh ' : '';
    str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0] as any] + ' ' + a[n[3][1] as any]) + 'Thousand ' : '';
    str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0] as any] + ' ' + a[n[4][1] as any]) + 'Hundred ' : '';
    str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0] as any] + ' ' + a[n[5][1] as any]) : '';
    return str.trim() + ' Rupees Only';
  };

  const amountInWords = numberToWords(Math.round(finalTotalNet));

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8 bg-white text-black font-sans min-h-screen relative">
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm 15mm;
          }
          aside, nav, header, .no-print, button {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* ── No-print toolbar ─────────────────────────────────────────────── */}
      <div className="no-print flex justify-between items-center mb-6 bg-slate-50 p-4 rounded border border-stroke">
        <button
          onClick={() => navigate(`${tenantId ? `/${tenantId}` : ''}/sales/invoice/list`)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black transition cursor-pointer"
        >
          ← Back to List
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded bg-primary py-2 px-5 text-sm font-medium text-white hover:bg-opacity-90 transition shadow-sm cursor-pointer"
        >
          🖨 Print Invoice
        </button>
      </div>

      {/* ── Printable Invoice Layout matching PDF ─────────────────────────────────────────────── */}
      <div className="bg-white text-black text-[12px] leading-relaxed w-full">

        {/* ── Header Top ─────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-start mb-6">
          <div className="w-1/2 pt-4">
            <h1 className="text-xl font-bold uppercase tracking-wide text-gray-900">
              {invoice?.seller_name || (businessName ? businessName.toUpperCase() : 'NOOR HORIZON TECHNOLOGIES ERP')}
            </h1>
          </div>

          <div className="w-1/2 flex flex-col items-end">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-[80px] flex items-center justify-center">
                <img src={FbrLogo} alt="FBR Logo" className="w-full h-auto object-contain" />
              </div>
              <div className="w-[70px] h-[70px] border border-gray-300 p-0.5">
                {fbrCode ? (
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(fbrCode)}&margin=0`} alt="FBR QR" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[8px] text-gray-400 text-center">No QR</div>
                )}
              </div>
            </div>
            <div className="text-right text-[10px] font-semibold">
              <p>FBR Invoice No</p>
              <p className="font-mono">{fbrCode || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* ── Title Box ──────────────────────────────────────────────────────── */}
        <div className="border border-gray-300 rounded-md text-center py-2 mb-3">
          <h2 className="text-[13px] font-bold tracking-widest uppercase">SALES TAX INVOICE</h2>
        </div>

        {/* ── Meta Info ──────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-center mb-4 font-bold text-[12px]">
          <div>Serial No: #{invoice.id}</div>
          <div>Date: {saleDate}</div>
        </div>

        {/* ── Company & Customer Boxes ───────────────────────────────────────── */}
        <div className="flex gap-4 mb-4">
          {/* Company Info */}
          <div className="flex-1 border border-gray-300 rounded-md">
            <div className="bg-white border-b border-gray-300 px-3 py-2 font-bold text-[12px] rounded-t-md">
              Company Information
            </div>
            <div className="p-3">
              <table className="w-full text-[11px]">
                <tbody>
                  <tr><td className="w-24 pb-1">Name:</td><td className="font-semibold pb-1">{invoice.seller_name || 'NOOR HORIZON TECHNOLOGIES'}</td></tr>
                  <tr><td className="w-24 pb-1 align-top">Address:</td><td className="pb-1">{invoice.seller_address || 'Karachi, Pakistan'}</td></tr>
                  <tr><td className="w-24 pb-1">NTN:</td><td className="pb-1">{invoice.seller_ntn || '4130686580237'}</td></tr>
                  <tr><td className="w-24 pb-1">Phone No:</td><td className="pb-1">-</td></tr>
                  <tr><td className="w-24 pb-1">Email:</td><td className="pb-1">-</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Info */}
          <div className="flex-1 border border-gray-300 rounded-md">
            <div className="bg-white border-b border-gray-300 px-3 py-2 font-bold text-[12px] rounded-t-md">
              Customer Information
            </div>
            <div className="p-3">
              <table className="w-full text-[11px]">
                <tbody>
                  <tr>
                    <td className="w-24 pb-1">Name:</td>
                    <td className="font-semibold pb-1 flex items-center gap-1">
                      <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      {invoice.customer_name}
                    </td>
                  </tr>
                  <tr><td className="w-24 pb-1 align-top">Address:</td><td className="pb-1">{customerInfo?.address || '-'}</td></tr>
                  <tr><td className="w-24 pb-1">NTN/CNIC:</td><td className="pb-1">{customerInfo?.ntnNo || customerInfo?.cnicNo || '-'}</td></tr>
                  <tr><td className="w-24 pb-1">Phone No:</td><td className="pb-1">{customerInfo?.primaryPhone || '-'}</td></tr>
                  <tr><td className="w-24 pb-1">Email:</td><td className="pb-1">-</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Items Table ────────────────────────────────────────────────────── */}
        <div className="border border-gray-300 rounded-md overflow-hidden mb-4">
          <table className="w-full text-[11px] text-center border-collapse">
            <thead>
              <tr className="border-b border-gray-300 bg-white">
                <th className="py-2 px-2 font-normal text-left w-8">#</th>
                <th className="py-2 px-2 font-normal text-left">Item Name</th>
                <th className="py-2 px-2 font-normal">Qty</th>
                <th className="py-2 px-2 font-normal">Rate</th>
                <th className="py-2 px-2 font-normal">Exclusive<br />Amount</th>
                <th className="py-2 px-2 font-normal">Disc.<br />%</th>
                <th className="py-2 px-2 font-normal">Disc.<br />Amount</th>
                <th className="py-2 px-2 font-normal">S. Tax<br />%</th>
                <th className="py-2 px-2 font-normal">S. Tax<br />Amount</th>
                <th className="py-2 px-2 font-normal text-right pr-3">Inclusive<br />Amount</th>
              </tr>
            </thead>
            <tbody>
              {processedItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 px-2 text-left">{idx + 1}</td>
                  <td className="py-2 px-2 text-left max-w-[150px] uppercase">{item.pName}</td>
                  <td className="py-2 px-2">{item.qty.toFixed(2)}</td>
                  <td className="py-2 px-2">Rs {item.basePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="py-2 px-2">Rs {(item.qty * item.basePrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="py-2 px-2">{item.discount.toFixed(2)}%</td>
                  <td className="py-2 px-2">Rs {item.discountAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="py-2 px-2">{item.gstRate}%</td>
                  <td className="py-2 px-2">Rs {item.gstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="py-2 px-2 text-right pr-3">Rs {item.netRowAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}

              {/* Totals Row */}
              <tr className="border-t border-gray-300 font-bold bg-white">
                <td colSpan={2} className="py-3 px-2 text-center text-[12px]">Totals</td>
                <td className="py-3 px-2">{processedItems.reduce((sum, item) => sum + item.qty, 0).toFixed(2)}</td>
                <td className="py-3 px-2"></td>
                <td className="py-3 px-2">Rs {computedTotalBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="py-3 px-2"></td>
                <td className="py-3 px-2">Rs {processedItems.reduce((sum, item) => sum + item.discountAmt, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="py-3 px-2"></td>
                <td className="py-3 px-2">Rs {computedTotalGst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="py-3 px-2 text-right pr-3">Rs {finalTotalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Amount in Words ────────────────────────────────────────────────── */}
        <div className="border border-gray-300 rounded-md px-3 py-2.5 mb-6 text-[11px] font-bold">
          AMOUNT: <span className="italic font-normal ml-1">{amountInWords}</span>
        </div>

        {/* ── Terms and Footer ───────────────────────────────────────────────── */}
        <div className="text-[10px]">
          <h4 className="font-bold mb-1">TERMS AND CONDITIONS:</h4>
          <ol className="list-decimal list-inside text-gray-700 space-y-1 mb-8">
            <li>Make the cheque payable to {invoice.seller_name || 'NOOR HORIZON TECHNOLOGIES'}.<br />
              <span className="ml-3">Account/IBAN Number: PK73MEZN0017810106376510 Meezan Bank</span></li>
          </ol>

          <div className="text-center font-bold text-gray-800 mt-12 border-t border-transparent pt-4">
            *This is a system generated invoice and does not require any signature.
          </div>
        </div>

      </div>
    </div>
  );
};

export default PrintInvoice;
