import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import { MdPrint, MdArrowBack } from 'react-icons/md';

const AccountReportPrint = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [reportRows, setReportRows] = useState<any[]>([]);

    const config = location.state || { tab: 1, criteria: {} };
    const { tab: activeTab, criteria: filters } = config;

    useEffect(() => {
        const compileAccountAuditingDataset = async () => {
            try {
                setLoading(true);

                // --- 📊 TAB 1: MASTER RECONCILED GENERAL LEDGER TWO-LINE TIMELINE ---
                if (activeTab === 1) {
                    const { data: sales } = await supabase.from('sales_invoices').select('*');
                    const { data: purchases } = await supabase.from('supplier_purchases').select('*');
                    const { data: rawVouchers } = await supabase.from('vouchers').select('*');
                    const { data: salesReturns } = await supabase.from('sales_returns').select('*');
                    const { data: returnReceipts } = await supabase.from('sales_return_receipts').select('*');

                    const unifiedLedgerEntries: any[] = [];

                    const parseDateString = (dateInput: any) => {
                        if (!dateInput) return '';
                        const str = String(dateInput).trim();
                        if (str.includes('T')) return str.split('T')[0];
                        if (str.includes(' ')) return str.split(' ')[0];
                        return str;
                    };

                    (sales || []).forEach(s => {
                        if (String(s.sale_status).trim().toLowerCase() !== 'cancel') {
                            unifiedLedgerEntries.push({
                                voucher_no: s.id ? `INV-${String(s.id).padStart(4, '0')}` : 'N/A',
                                description: `Commercial Sale Invoice - Customer Account: ${s.customer_name}`,
                                debit: 0,
                                credit: Number(s.total_amount || 0),
                                raw_date: parseDateString(s.sale_date || s.created_at)
                            });
                        }
                    });

                    (purchases || []).forEach(p => {
                        unifiedLedgerEntries.push({
                            voucher_no: p.purchase_no || `PUR-00${p.id}`,
                            description: `Procurement Stock Acquisition - Vendor: ${p.supplier_name}`,
                            debit: Number(p.total_amount || 0),
                            credit: 0,
                            raw_date: parseDateString(p.purchase_date || p.created_at)
                        });
                    });

                    // C. Map Standalone Vouchers
                    (rawVouchers || []).forEach(v => {
                        const vType = String(v.voucherType || '').trim().toLowerCase();
                        const isReceipt = vType.includes('receipt') || vType.endsWith('rv');
                        const amt = Number(v.amountReceived || 0);

                        unifiedLedgerEntries.push({
                            voucher_no: v.voucherNo || `VCH-${v.id}`,
                            description: v.remarks || `Voucher entry - Account: ${v.customerName || 'General'}`,
                            debit: !isReceipt ? amt : 0,
                            credit: isReceipt ? amt : 0,
                            raw_date: parseDateString(v.voucherDate || v.created_at)
                        });
                    });

                    (salesReturns || []).forEach(rtn => {
                        const trueReturnedValue = Number(rtn.payout_amount_paid || rtn.total_amount || rtn.total_net_amount || 0);

                        unifiedLedgerEntries.push({
                            voucher_no: rtn.id ? `RTN-${String(rtn.id).padStart(4, '0')}` : 'N/A',
                            description: `Sales Return Invoice (Orig INV: ${rtn.original_invoice_no}) - Customer: ${rtn.customer_name}`,
                            debit: trueReturnedValue, // ✅ Fixed: Now accurately injects the true returned amounts (10,000 & 7,200) into Debits column
                            credit: 0,
                            raw_date: parseDateString(rtn.return_date || rtn.created_at)
                        });
                    });

                    // E. Map Sales Return Cash Receipts (Debits - Formatted as REC-)
                    (returnReceipts || []).forEach(rec => {
                        unifiedLedgerEntries.push({
                            voucher_no: rec.id ? `REC-${String(rec.id).padStart(4, '0')}` : 'N/A',
                            description: `Sales Return Cash Receipt Payout (Orig INV: ${rec.original_invoice_no}) - Customer: ${rec.customer_name}`,
                            debit: Number(rec.amount_paid || 0),
                            credit: 0,
                            raw_date: parseDateString(rec.processing_date || rec.created_at)
                        });
                    });

                    let filteredPool = unifiedLedgerEntries.filter(entry => entry.raw_date);
                    if (filters.dateFrom && filters.dateTo) {
                        filteredPool = filteredPool.filter(e => e.raw_date >= filters.dateFrom && e.raw_date <= filters.dateTo);
                    }

                    filteredPool.sort((a, b) => a.raw_date.localeCompare(b.raw_date));

                    let cumulativeBalance = 0;
                    const finalPayload = filteredPool.map(e => {
                        cumulativeBalance += (e.credit - e.debit);
                        return { ...e, balance: cumulativeBalance };
                    });

                    setReportRows(finalPayload);
                }


                else if (activeTab === 2 || activeTab === 12) {
                    const { data: invoices, error: invErr } = await supabase
                        .from('sales_invoices')
                        .select('*')
                        .order('id', { ascending: true });

                    const { data: returns, error: retErr } = await supabase
                        .from('sales_returns')
                        .select('original_invoice_no, total_amount, total_net_amount');

                    if (invErr) throw invErr;
                    if (retErr) throw retErr;

                    let pool = invoices || [];

                    if (filters.customer && filters.customer !== 'All') {
                        pool = pool.filter(row => row.customer_name === filters.customer);
                    }

                    if (filters.dateFrom && filters.dateTo) {
                        const startTimestamp = new Date(filters.dateFrom).getTime();
                        const endTimestamp = new Date(filters.dateTo).getTime();

                        pool = pool.filter(row => {
                            const rawRowDate = row.sale_date || String(row.created_at || '').split('T')[0];
                            if (!rawRowDate) return false;
                            const rowTimestamp = new Date(rawRowDate).getTime();
                            return rowTimestamp >= startTimestamp && rowTimestamp <= endTimestamp;
                        });
                    }

                    const adjustedCustomerRows = pool.map(inv => {
                        const matchingReturns = (returns || []).filter(r => {
                            const cleanRef = String(r.original_invoice_no || '').replace('INV-', '').trim();
                            return cleanRef === String(inv.id).trim();
                        });

                        const totalReturnedValue = matchingReturns.reduce((sum, r) => sum + Number(r.total_amount || r.total_net_amount || 0), 0);

                        const finalAdjustedInvoiceValue = Math.max(0, Number(inv.total_amount || 0) - totalReturnedValue);

                        return {
                            ...inv,
                            total_amount: finalAdjustedInvoiceValue // Overwrites old value with true active balance debt
                        };
                    });

                    setReportRows(adjustedCustomerRows);
                }



                // --- 📊 TABS 3 & 6: PROCUREMENT VENDOR BALANCES WITH LIVE FINANCIAL VOUCHERS INTEGRATION ---
                else if (activeTab === 3 || activeTab === 6) {
                    // 1. Fetch original vendor procurement invoices
                    let query = supabase
                        .from('supplier_purchases')
                        .select('*')
                        .order('id', { ascending: true });

                    if (filters.vendor && filters.vendor !== 'All') {
                        query = query.eq('supplier_name', filters.vendor);
                    }

                    const { data: purchasesData, error: purchaseErr } = await query;
                    if (purchaseErr) throw purchaseErr;

                    // 2. ✅ SCHEMA MATCHED: Reads strict schema variables from financial_vouchers definitions
                    const { data: vouchersData, error: voucherErr } = await supabase
                        .from('financial_vouchers')
                        .select('voucher_no, original_invoice_no, total_amount');

                    if (voucherErr) throw voucherErr;

                    let pool = purchasesData || [];

                    // Apply calendar timeline bracket filters
                    if (filters.dateFrom && filters.dateTo) {
                        const startTimestamp = new Date(filters.dateFrom).getTime();
                        const endTimestamp = new Date(filters.dateTo).getTime();

                        pool = pool.filter(row => {
                            const rawRowDate = row.purchase_date || String(row.created_at || '').split('T')[0];
                            if (!rawRowDate) return false;
                            const rowTimestamp = new Date(rawRowDate).getTime();
                            return rowTimestamp >= startTimestamp && rowTimestamp <= endTimestamp;
                        });
                    }

                    // 3. ✅ THE UNIFIED ACCURATE DEBT BALANCER ENGINE
                    const calculatedVendorOutstandingRows = pool.map(p => {
                        const grossBillTotal = Number(p.total_amount || 0);

                        // Capture your upfront cash payment field safely from your supplier_purchases table column variables
                        const amountPaidUpfront = Number(p.amount_paid || p.paid_amount || p.cash_amount_paid || p.cash_paid || 0);

                        // Find all subsequent receipts inside financial_vouchers matching this purchase order ID reference number
                        const currentPurchaseNo = String(p.purchase_no || `PUR-0900${p.id}`).toUpperCase().trim();
                        const rawPurchaseId = String(p.id).trim();

                        const subsequentReceipts = (vouchersData || []).filter(v => {
                            const cleanVoucherNo = String(v.voucher_no || '').toUpperCase().trim();
                            const cleanInvoiceNo = String(v.original_invoice_no || '').toUpperCase().trim();

                            // ✅ MULTI-COLUMN INTERCEPTOR: Scans both voucher references for matches (e.g. "PUR-090015")
                            return (
                                cleanVoucherNo === currentPurchaseNo ||
                                cleanVoucherNo.includes(currentPurchaseNo) ||
                                cleanInvoiceNo === currentPurchaseNo ||
                                cleanInvoiceNo.includes(currentPurchaseNo) ||
                                cleanVoucherNo.includes(rawPurchaseId)
                            );
                        });

                        // Aggregate all subsequent cash receipt payouts using your true total_amount column
                        const totalSubsequentReceiptsSum = subsequentReceipts.reduce((sum, v) => sum + Number(v.total_amount || 0), 0);

                        // True credit debt = Gross Bill (300,000) - Upfront Cash (10,000) - Subsequent Vouchers (90,000)
                        const trueNetCreditDebtRemaining = activeTab === 6
                            ? Math.max(0, grossBillTotal - amountPaidUpfront - totalSubsequentReceiptsSum)
                            : grossBillTotal;

                        return {
                            ...p,
                            total_amount: trueNetCreditDebtRemaining // Updates row to show true outstanding balance (200,000)
                        };
                    });

                    setReportRows(calculatedVendorOutstandingRows);
                }




                else if (activeTab === 4) {
                    const { data: rev } = await supabase.from('sales_invoices').select('total_amount, sale_date, created_at');
                    const { data: exp } = await supabase.from('supplier_purchases').select('total_amount, purchase_date, created_at');
                    const { data: ret } = await supabase.from('sales_returns').select('*');
                    // ✅ NEW: Fetch your receipts to capture subsequent payments dynamically
                    const { data: rec } = await supabase.from('sales_return_receipts').select('*');

                    let filteredRev = rev || [];
                    let filteredExp = exp || [];
                    let filteredRet = ret || [];
                    let filteredRec = rec || [];

                    if (filters.dateFrom && filters.dateTo) {
                        const startTimestamp = new Date(filters.dateFrom + 'T00:00:00').getTime();
                        const endTimestamp = new Date(filters.dateTo + 'T23:59:59').getTime();

                        filteredRev = filteredRev.filter(s => {
                            const d = s.sale_date || s.created_at;
                            if (!d) return false;
                            const ts = new Date(String(d).includes('T') ? String(d) : String(d) + 'T12:00:00').getTime();
                            return ts >= startTimestamp && ts <= endTimestamp;
                        });

                        filteredExp = filteredExp.filter(p => {
                            const d = p.purchase_date || p.created_at;
                            if (!d) return false;
                            const ts = new Date(String(d).includes('T') ? String(d) : String(d) + 'T12:00:00').getTime();
                            return ts >= startTimestamp && ts <= endTimestamp;
                        });

                        filteredRet = filteredRet.filter(r => {
                            const d = r.return_date || r.created_at;
                            if (!d) return false;
                            const ts = new Date(String(d).includes('T') ? String(d) : String(d) + 'T12:00:00').getTime();
                            return ts >= startTimestamp && ts <= endTimestamp;
                        });

                        // ✅ NEW: Filter receipts by your timeline parameters
                        filteredRec = filteredRec.filter(rc => {
                            const d = rc.processing_date || rc.created_at;
                            if (!d) return false;
                            const ts = new Date(String(d).includes('T') ? String(d) : String(d) + 'T12:00:00').getTime();
                            return ts >= startTimestamp && ts <= endTimestamp;
                        });
                    }

                    setReportRows([
                        { title: 'Gross Revenue (Sales Log Summary)', entries: filteredRev, type: 'income' },
                        { title: 'Cost of Goods Sold (Procurements)', entries: filteredExp, type: 'expense' },
                        { title: 'Sales Returns Summary', entries: filteredRet, type: 'return_sales' },
                        { title: 'Sales Return Receipts Log', entries: filteredRec, type: 'receipt_sales' } // ✅ Added to state pool
                    ]);
                }




                else if (activeTab === 5 || activeTab === 11) {
                    let query = supabase.from('chart_of_accounts').select('*');
                    if (filters.categoryCode && filters.categoryCode !== 'All') query = query.eq('category_code', filters.categoryCode);
                    if (filters.controlCode && filters.controlCode !== 'All') query = query.eq('control_code', filters.controlCode);
                    if (filters.chartOfAccountCode && filters.chartOfAccountCode !== 'All') query = query.eq('account_code', filters.chartOfAccountCode);

                    const { data, error } = await query;
                    if (error) throw error;
                    setReportRows(data || []);
                }

                else if (activeTab === 7) {
                    let query = supabase.from('customer_recovery_logs').select('*');
                    if (filters.customer && filters.customer !== 'All') query = query.eq('customer_name', filters.customer);
                    if (filters.company && filters.company !== 'All') query = query.eq('company_name', filters.company);
                    const { data, error } = await query;
                    if (error) throw error;
                    setReportRows(data || []);
                }

                else if (activeTab === 8 || activeTab === 9 || activeTab === 10) {
                    let tableTarget = filters.saleType === 'Purchase' ? 'supplier_purchases' : filters.saleType === 'Cashbook' ? 'vouchers' : 'sales_invoices';
                    if (activeTab === 8 || filters.saleType === 'Banks' || filters.saleType === 'Cashbook') tableTarget = 'vouchers';

                    let query = supabase.from(tableTarget).select('*');
                    const { data, error } = await query;
                    if (error) throw error;

                    let pool = data || [];
                    if (activeTab === 8 && filters.voucherType && filters.voucherType !== 'All') {
                        pool = pool.filter(v => String(v.voucherType).trim().toLowerCase() === String(filters.voucherType).trim().toLowerCase());
                    }
                    if (activeTab === 10 && filters.salesman && filters.salesman !== 'All') {
                        pool = pool.filter(v => v.salesman === filters.salesman);
                    }

                    setReportRows(pool);
                }

            } catch (err: any) {
                toast.error('Financial compiling routine failure: ' + err.message);
            } finally {
                setLoading(false);
            }
        };
        compileAccountAuditingDataset();
    }, [activeTab, filters]);

    if (loading) return <div className="flex h-64 items-center justify-center"><Spinner /></div>;
    return (
        <div className="w-full bg-white text-black p-6 space-y-6 text-xs min-h-screen print:absolute print:top-0 print:left-0 print:w-screen print:h-screen print:p-0 print:m-0 print:bg-white print:text-black">
            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          body * { visibility: hidden !important; }
          .print-root-container, .print-root-container * { visibility: visible !important; }
          .print-root-container { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; z-index: 999999 !important; background: white !important; }
          aside, header, nav, .print-hidden-element, button { display: none !important; visibility: hidden !important; }
        }
      `}} />

            <div className="print-root-container w-full bg-white p-4 space-y-6">
                <div className="flex justify-between items-center bg-gray-100 p-3 rounded border print-hidden-element print:hidden">
                    <button type="button" onClick={() => navigate('/Reports/Account-Report')} className="flex items-center gap-1.5 font-bold hover:underline cursor-pointer"><MdArrowBack size={16} /> Return to Auditing Center</button>
                    <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 bg-primary text-white py-1.5 px-5 rounded font-black cursor-pointer hover:bg-opacity-90 transition shadow-sm"><MdPrint size={16} /> Print Workbook Report</button>
                </div>

                <div className="text-center space-y-1 py-4 border-b border-double border-black">
                    <h1 className="text-xl font-black uppercase tracking-widest font-serif">AL-SYED SOFTWARE ERP LOGISTICS</h1>
                    <p className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">Master Corporate Ledger Book & Financial Audit Statement Summary</p>
                    <div className="text-[10px] pt-1 font-mono flex justify-between px-2 text-gray-600">
                        <span>Audit Sub-Categorization: <b className="text-black uppercase underline">
                            {activeTab === 1 && 'General Ledger Audit Statement'}
                            {activeTab === 2 && 'Customer Account Balance Ledger'}
                            {activeTab === 3 && 'Procurement Vendor Balance Ledger'}
                            {activeTab === 4 && 'Enterprise Income Statement / P&L'}
                            {activeTab === 5 && 'Chart of Accounts Structural Catalog'}
                            {activeTab === 6 && 'Vendor Outstanding Balances Ledger'}
                            {activeTab === 7 && 'Customer Recovery Collection Statement'}
                            {activeTab === 8 && 'Corporate Voucher Audit Log Summary'}
                            {activeTab === 9 && 'Daily Financial Activity Statement'}
                            {activeTab === 10 && 'Salesman Sales & Cash Collection Sheet'}
                            {activeTab === 11 && 'General Trial Balance Audit Workbook'}
                            {activeTab === 12 && 'Account Debit Aging Matrix Sheet'}
                        </b></span>
                        <span>Duration Window Block: {filters.dateFrom || 'Initial'} up to {filters.dateTo || 'Today'}</span>
                    </div>
                </div>

                <div className="w-full overflow-x-auto">
                    {/* --- 📊 RENDER TABLE 1: GENERAL GENERAL LEDGER RUNNING ENTRIES (TAB 1) WITH NEW DATE COLUMN --- */}
                    {activeTab === 1 && (
                        <table className="w-full table-auto border border-collapse border-black text-[11px] font-sans text-left print:w-full">
                            <thead className="bg-gray-100 border-b border-black font-black uppercase text-black font-mono text-[10px]">
                                <tr>
                                    <th className="p-1.5 border border-black text-center w-12">Index</th>
                                    <th className="p-1.5 border border-black text-center w-28">Processing Date</th>
                                    <th className="p-1.5 border border-black w-32">Voucher/Doc Ref #</th>
                                    <th className="p-1.5 border border-black">Account Narrative Details Description</th>
                                    <th className="p-1.5 border border-black text-right w-28">Debit (PKR)</th>
                                    <th className="p-1.5 border border-black text-right w-28">Credit (PKR)</th>
                                    <th className="p-1.5 border border-black text-right w-32 pr-3">Net Balance Pool</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportRows.map((row, i) => (
                                    <tr key={i} className="border-b border-black hover:bg-gray-50 font-semibold font-mono text-xs">
                                        <td className="p-1.5 border border-black text-center text-gray-400">{i + 1}</td>
                                        <td className="p-1.5 border border-black text-center text-gray-600 font-bold whitespace-nowrap">{row.raw_date}</td>
                                        <td className="p-1.5 border border-black text-primary font-black uppercase">{row.voucher_no}</td>
                                        <td className="p-1.5 border border-black text-black font-sans">{row.description}</td>
                                        <td className="p-1.5 border border-black text-right text-red-600">Rs. {Number(row.debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="p-1.5 border border-black text-right text-success font-black">Rs. {Number(row.credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="p-1.5 border border-black text-right pr-3 font-mono">Rs. {Number(row.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* --- 📊 RENDER TABLE 2: MASTER CUSTOMER/VENDOR LEDGER TRANSACTIONS SUMMARIES (TABS 2, 3, 6, 12) --- */}
                    {(activeTab === 2 || activeTab === 3 || activeTab === 6 || activeTab === 12) && (
                        <table className="w-full table-auto border border-collapse border-black text-[11px] font-sans text-left print:w-full">
                            <thead className="bg-gray-100 border-b border-black font-black uppercase text-black font-mono text-[10px]">
                                <tr>
                                    <th className="p-1.5 border border-black text-center w-12">S#</th>
                                    <th className="p-1.5 border border-black w-36">Transaction Document #</th>
                                    <th className="p-1.5 border border-black">Associated Ledger Entity Title Account Name</th>
                                    <th className="p-1.5 border border-black text-center w-28">Processing Date</th>
                                    <th className="p-1.5 border border-black text-center w-24">Payment Term</th>
                                    <th className="p-1.5 border border-black text-right pr-3 w-40">Gross Invoice Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportRows.map((row, i) => (
                                    <tr key={row.id} className="border-b border-black hover:bg-gray-50 font-semibold font-mono text-xs">
                                        <td className="p-1.5 border border-black text-center text-gray-400">{i + 1}</td>
                                        <td className="p-1.5 border border-black text-primary font-black uppercase">{row.purchase_no || row.id}</td>
                                        <td className="p-1.5 border border-black text-black font-sans font-bold">{row.customer_name || row.supplier_name || 'Generic Client Agent'}</td>
                                        <td className="p-1.5 border border-black text-center text-gray-600 font-mono">
                                            {String(row.sale_date || row.created_at || '').split('T')[0]}
                                        </td>
                                        <td className="p-1.5 border border-black text-center uppercase font-bold text-[10px]">{row.payment_term || 'Settle'}</td>
                                        <td className="p-1.5 border border-black text-right pr-3 text-success font-black">Rs. {Number(row.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-50 border-t border-black font-black font-mono text-xs">
                                    <td colSpan={5} className="p-2 border border-black text-right uppercase text-gray-500">Gross Account Aggregations Net Balance Summary (PKR):</td>
                                    <td className="p-2 border border-black text-right pr-3 text-success underline decoration-double text-sm font-black">
                                        Rs. {reportRows.reduce((sum, r) => sum + Number(r.total_amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    )}

                    {/* --- 📊 RENDER TABLE 5: ENTERPRISE INCOME STATEMENT / P&L (TAB 4) --- */}
                    {activeTab === 4 && reportRows.length > 0 && (() => {
                        const incomeData = reportRows.find(r => r.type === 'income')?.entries || [];
                        const expenseData = reportRows.find(r => r.type === 'expense')?.entries || [];
                        const returnSalesData = reportRows.find(r => r.type === 'return_sales')?.entries || [];
                        const receiptSalesData = reportRows.find(r => r.type === 'receipt_sales')?.entries || []; // ✅ Loaded safely

                        const grossRevenueSum = incomeData.reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0);
                        const costOfGoodsSoldSum = expenseData.reduce((sum: number, p: any) => sum + Number(p.total_amount || 0), 0);

                        // 1️⃣ Sum up all initial payouts from sales_returns (payout_amount_paid)
                        const initialReturnsCash = returnSalesData.reduce((sum: number, r: any) => sum + Number(r.payout_amount_paid || 0), 0);

                        // 2️⃣ Sum up all subsequent cash payouts from sales_return_receipts (amount_paid)
                        const subsequentReceiptsCash = receiptSalesData.reduce((sum: number, rc: any) => sum + Number(rc.amount_paid || 0), 0);

                        // ✅ THE BINGO COMBINATION: Total Cash Returned = Initial Payouts + Subsequent Receipts
                        const salesReturnsSum = initialReturnsCash + subsequentReceiptsCash;
                        const purchaseReturnsSum = 0;

                        // Net Margin Profit = Gross Sales - Total Cash Returned - Cost of Procurements
                        const netCorporateProfit = grossRevenueSum - salesReturnsSum - costOfGoodsSoldSum;

                        return (
                            <div className="w-full max-w-3xl mx-auto border border-black p-6 bg-white space-y-6 font-sans text-xs mt-4">
                                <h4 className="text-center text-sm font-black uppercase tracking-wider border-b pb-2 border-black font-mono">
                                    📊 ACCRUAL INCOME STATEMENT / PROFIT & LOSS REPORT
                                </h4>

                                <div className="space-y-4">
                                    {/* Gross Operating Revenue */}
                                    <div className="border-b pb-1.5 border-gray-100 flex justify-between font-black text-black uppercase">
                                        <span>1. Gross Operating Revenue (Sales Logs)</span>
                                        <span className="text-success">Rs. {grossRevenueSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>

                                    {/* Cost of Goods Returned */}
                                    <div className="border-b pb-1.5 border-gray-100 flex justify-between font-bold text-gray-600 uppercase pl-4">
                                        <span>Less: 3. Cost of Goods Returned (Sales Logs)</span>
                                        <span className="text-purple-600">Rs. {salesReturnsSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>

                                    {/* Cost of Goods Sold */}
                                    <div className="border-b pb-1.5 border-gray-100 flex justify-between font-black text-black uppercase">
                                        <span>4. Cost of Goods Sold (Procurements)</span>
                                        <span className="text-red-600">Rs. {costOfGoodsSoldSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>

                                    {/* Purchase Returns */}
                                    <div className="border-b pb-1.5 border-gray-100 flex justify-between font-bold text-gray-600 uppercase pl-4">
                                        <span>Less: 5. Cost of Goods Returned (Purchase Logs)</span>
                                        <span className="text-gray-400">Rs. {purchaseReturnsSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>

                                    {/* Profit Margin Box */}
                                    <div className="bg-gray-50 border border-black p-4 rounded-sm flex justify-between items-center font-mono mt-4">
                                        <span className="text-xs font-black uppercase tracking-wide text-gray-500">Net Calculated Enterprise Margin Profit</span>
                                        <span className={`text-lg font-black ${netCorporateProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                                            Rs. {netCorporateProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}




                    {/* --- 📊 RENDER TABLE 3: CHART OF ACCOUNTS & TRIAL BALANCE TRUE MAPPINGS (TABS 5, 11) --- */}
                    {/* --- 📊 RENDER TABLE 3: CHART OF ACCOUNTS & TRIAL BALANCE TRUE MAPPINGS (TABS 5, 11) --- */}
                    {(activeTab === 5 || activeTab === 11) && (
                        <table className="w-full table-auto border border-collapse border-black text-[11px] font-sans text-left print:w-full">
                            <thead className="bg-gray-100 border-b border-black font-black uppercase text-black font-mono text-[10px]">
                                <tr>
                                    <th className="p-1.5 border border-black text-center w-12">Index</th>
                                    <th className="p-1.5 border border-black w-28">Category Code</th>
                                    <th className="p-1.5 border border-black w-28">Control Code</th>
                                    <th className="p-1.5 border border-black w-32">Account Code</th>
                                    <th className="p-1.5 border border-black">Chart Account Ledger Title Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportRows.map((row, i) => (
                                    <tr key={row.id} className="border-b border-black hover:bg-gray-50 font-semibold font-mono text-xs text-black">
                                        <td className="p-1.5 border border-black text-center text-gray-400">{i + 1}</td>
                                        <td className="p-1.5 border border-black uppercase text-gray-500">{row.category_code}</td>
                                        <td className="p-1.5 border border-black uppercase text-purple-700">{row.control_code}</td>
                                        <td className="p-1.5 border border-black font-bold uppercase text-primary">{row.account_code}</td>
                                        <td className="p-1.5 border border-black font-sans uppercase font-bold">{row.account_title}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* --- 📊 RENDER TABLE 4: UNIFIED CAMELCASE VOUCHERS JOURNAL SUMMARY (TABS 8, 9, 10) --- */}
                    {(activeTab === 8 || activeTab === 9 || activeTab === 10) && (
                        <table className="w-full table-auto border border-collapse border-black text-[11px] font-sans text-left print:w-full">
                            <thead className="bg-gray-100 border-b border-black font-black uppercase text-black font-mono text-[10px]">
                                <tr>
                                    <th className="p-1.5 border border-black text-center w-12">Index</th>
                                    <th className="p-1.5 border border-black w-36">Document Reference #</th>
                                    <th className="p-1.5 border border-black w-40">Ledger Classification Type</th>
                                    <th className="p-1.5 border border-black text-center w-32">Processing Date Stamp</th>
                                    <th className="p-1.5 border border-black">Associated Remarks Narratives Block</th>
                                    <th className="p-1.5 border border-black text-right pr-3 w-40">Gross Subtotal Transacted</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportRows.map((row, i) => {
                                    const displayVoucherNo = row.voucherNo || row.purchase_no || `ID: 00${row.id}`;
                                    const displayVoucherType = row.voucherType || filters.saleType || 'Commercial Log';
                                    const displayDate = row.voucherDate || row.sale_date || String(row.created_at || '').split(' ')[0];
                                    const displayAmount = row.amountReceived || row.total_amount || 0;

                                    return (
                                        <tr key={row.id} className="border-b border-black hover:bg-gray-50 font-semibold font-mono text-xs">
                                            <td className="p-1.5 border border-black text-center text-gray-400">{i + 1}</td>
                                            <td className="p-1.5 border border-black text-primary font-black uppercase">{displayVoucherNo}</td>
                                            <td className="p-1.5 border border-black font-sans text-purple-700 font-bold uppercase">{displayVoucherType}</td>
                                            <td className="p-1.5 border border-black text-center text-gray-500">{displayDate}</td>
                                            <td className="p-1.5 border border-black font-sans text-gray-400 truncate max-w-xs">{row.remarks || row.scenario_type || 'System verified log'}</td>
                                            <td className="p-1.5 border border-black text-right pr-3 text-success font-black">Rs. {Number(displayAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                    {reportRows.length === 0 && (
                        <div className="p-12 text-center border font-bold italic text-gray-400 bg-gray-50/50 rounded-sm">No structural financial transaction records discovered matching chosen selection tokens.</div>
                    )}
                </div>

                <div className="mt-24 grid grid-cols-3 gap-12 text-center text-[9px] font-sans font-black uppercase tracking-widest text-gray-400">
                    <div className="border-t border-black pt-2">Prepared By: Financial Data Officer</div>
                    <div className="border-t border-black pt-2">Verified By: Corporate Accounts Auditor</div>
                    <div className="border-t border-black pt-2">Authorized Executive Director Signature Seal</div>
                </div>
            </div>
        </div>
    );
};

export default AccountReportPrint;
