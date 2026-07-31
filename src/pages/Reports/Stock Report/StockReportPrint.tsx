import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import { MdPrint, MdArrowBack } from 'react-icons/md';

const StockReportPrint = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [reportRows, setReportRows] = useState<any[]>([]);

    const config = location.state || { tab: 1, filters: {} };
    const { tab: activeTab, filters } = config;

    useEffect(() => {
        const compileTrueDynamicStockDataset = async () => {
            try {
                setLoading(true);

                // 1. Fetch base product list mapping
                let prodQuery = supabase.from('products').select('*');
                if (filters.brand && filters.brand !== 'All') prodQuery = prodQuery.eq('brand', filters.brand);
                if (filters.category && filters.category !== 'All') prodQuery = prodQuery.eq('category', filters.category);

                const { data: baseProducts, error: prodError } = await prodQuery;
                if (prodError) throw prodError;

                // 2. Fetch live data streams from all transaction tables
                const { data: openStocks } = await supabase.from('opening_stocks').select('*');
                const { data: purchases } = await supabase.from('supplier_purchases').select('*');
                const { data: sales } = await supabase.from('sales_invoices').select('*');
                const { data: pReturns } = await supabase.from('purchase_returns').select('*');
                const { data: sReturns } = await supabase.from('sales_returns').select('*');

                const calculatedAggregatedRows = (baseProducts || []).map(product => {
                    const name = String(product.product_name || '').trim().toLowerCase();
                    const targetLocation = String(filters.location || 'All').trim().toLowerCase();

                    // A. Calculate Opening Stock for the specific selected location
                    const totalOpening = (openStocks || [])
                        .filter((os: any) => {
                            const osName = String(os.product_name || os.item_name || os.itemName || '').trim().toLowerCase();
                            const osLoc = String(os.location || os.target_warehouse || '').trim().toLowerCase();
                            const matchName = (osName === name || osName.includes(name));
                            const matchLoc = (targetLocation === 'all' || osLoc === targetLocation);
                            return matchName && matchLoc;
                        })
                        .reduce((sum: number, os: any) => sum + (Number(os.quantity || os.qty || 0)), 0);

                    // B. Calculate Purchased Stock (Ignores deleted or cancelled rows)
                    let totalPurchased = 0;
                    (purchases || []).forEach((p: any) => {
                        const pLoc = String(p.target_warehouse || p.location || '').trim().toLowerCase();
                        const matchLoc = (targetLocation === 'all' || pLoc === targetLocation);

                        if (matchLoc && String(p.status).toLowerCase() !== 'cancel' && String(p.status).toLowerCase() !== 'deleted') {
                            const itemsArray = Array.isArray(p.items) ? p.items : JSON.parse(p.items || '[]');
                            itemsArray.forEach((item: any) => {
                                const pName = String(item.product_name || item.itemName || item.item_name || '').trim().toLowerCase();
                                if (pName === name || pName.includes(name)) {
                                    totalPurchased += (Number(item.qty || item.quantity || 0));
                                }
                            });
                        }
                    });

                    // C. Calculate Sold Stock (Ignores unposted, deleted, or cancelled transactions)
                    let totalSold = 0;
                    (sales || []).forEach((s: any) => {
                        const sLoc = String(s.dispatch_warehouse || s.location || '').trim().toLowerCase();
                        const matchLoc = (targetLocation === 'all' || sLoc === targetLocation);
                        const statusClean = String(s.sale_status || '').trim().toLowerCase();
                        const receiptClean = String(s.receipt_status || '').trim().toLowerCase();

                        if (matchLoc && statusClean !== 'cancel' && statusClean !== 'deleted' && receiptClean !== 'unposted') {
                            const itemsArray = Array.isArray(s.items) ? s.items : JSON.parse(s.items || '[]');
                            itemsArray.forEach((item: any) => {
                                const sName = String(item.product_name || item.itemName || item.item_name || '').trim().toLowerCase();
                                if (sName === name || sName.includes(name)) {
                                    totalSold += (Number(item.qty || item.quantity || 0));
                                }
                            });
                        }
                    });

                    // D. Calculate Purchase Returns (Stock leaving the warehouse)
                    let totalPurchaseReturned = 0;
                    (pReturns || []).forEach((pr: any) => {
                        const prLoc = String(pr.source_warehouse || pr.location || '').trim().toLowerCase();
                        const matchLoc = (targetLocation === 'all' || prLoc === targetLocation);

                        if (matchLoc && String(pr.status).toLowerCase() !== 'cancel') {
                            const itemsArray = Array.isArray(pr.items) ? pr.items : JSON.parse(pr.items || '[]');
                            itemsArray.forEach((item: any) => {
                                const prName = String(item.product_name || item.itemName || item.item_name || '').trim().toLowerCase();
                                if (prName === name || prName.includes(name)) {
                                    totalPurchaseReturned += (Number(item.qty || item.quantity || 0));
                                }
                            });
                        }
                    });

                    // E. Calculate Sales Returns (Stock returning back to the warehouse)
                    let totalSalesReturned = 0;
                    (sReturns || []).forEach((sr: any) => {
                        const srLoc = String(sr.dispatch_warehouse || sr.location || '').trim().toLowerCase();
                        const matchLoc = (targetLocation === 'all' || srLoc === targetLocation);

                        if (matchLoc && String(sr.status).toLowerCase() !== 'cancel') {
                            const itemsArray = Array.isArray(sr.items) ? sr.items : JSON.parse(sr.items || '[]');
                            itemsArray.forEach((item: any) => {
                                const srName = String(item.product_name || item.itemName || item.item_name || '').trim().toLowerCase();
                                if (srName === name || srName.includes(name)) {
                                    totalSalesReturned += (Number(item.qty || item.quantity || 0));
                                }
                            });
                        }
                    });

                    // ✅ THE PERFECT DYNAMIC STOCK FORMULA FOR SPECIFIC LOCATIONS
                    const trueRemainingStock = (totalOpening + totalPurchased + totalSalesReturned) - (totalSold + totalPurchaseReturned);

                    return {
                        ...product,
                        computed_true_stock: trueRemainingStock,
                        calculated_valuation: trueRemainingStock * Number(product.retail_price || product.sale_price || 0)
                    };
                });

                let finalFilteredPool = calculatedAggregatedRows;

                if (filters.product && filters.product !== 'All') {
                    finalFilteredPool = finalFilteredPool.filter(p => p.product_name === filters.product);
                }

                setReportRows(finalFilteredPool);
            } catch (err: any) {
                toast.error('Dynamic inventory matching trace failed: ' + err.message);
            } finally {
                setLoading(false);
            }
        };
        compileTrueDynamicStockDataset();
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
                    <button type="button" onClick={() => navigate('/Reports/Stock-Report')} className="flex items-center gap-1.5 font-bold hover:underline cursor-pointer"><MdArrowBack size={16} /> Return to Auditing Center</button>
                    <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 bg-primary text-white py-1.5 px-5 rounded font-black cursor-pointer hover:bg-opacity-90 transition shadow-sm"><MdPrint size={16} /> Print Workbook Report</button>
                </div>

                <div className="text-center space-y-1 py-4 border-b border-double border-black">
                    <h1 className="text-xl font-black uppercase tracking-widest font-serif">AL-SYED SOFTWARE ERP LOGISTICS</h1>
                    <p className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">Master Dynamic Inventory Valuation & Real-Time Stock Balance Ledger</p>
                    <div className="text-[10px] pt-1 font-mono flex justify-between px-2 text-gray-600">
                        <span>Workbook Subtype: <b className="text-black uppercase underline">
                            {activeTab === 1 && 'Stock Activity Report'}
                            {activeTab === 2 && 'Stock Balance Report'}
                            {activeTab === 3 && 'Stock Status Report'}
                            {activeTab === 4 && 'Stock Transfer Statement'}
                            {activeTab === 5 && 'Detailed Pricing Metrics Sheet'}
                            {activeTab === 6 && 'Core Product Specification Log'}
                            {activeTab === 7 && 'Status Detail Valuation Ledger'}
                        </b></span>
                        <span>Live Audit Evaluation Date: {new Date().toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="w-full overflow-x-auto">
                    {/* --- 📊 RENDER CHANNEL 1: STANDARD TRUE LEDGER BALANCES MATRIX (TABS 1, 2, 3, 6) --- */}
                    {(activeTab === 1 || activeTab === 2 || activeTab === 3 || activeTab === 6) && (
                        <table className="w-full table-auto border border-collapse border-black text-[11px] font-sans text-left">
                            <thead className="bg-gray-100 border-b border-black font-black uppercase text-black font-mono text-[10px]">
                                <tr>
                                    <th className="p-1.5 border border-black text-center w-12">Index</th>
                                    <th className="p-1.5 border border-black">Product Stock Asset Identifier</th>
                                    <th className="p-1.5 border border-black">Group (UOM)</th>
                                    <th className="p-1.5 border border-black">Brand Link</th>
                                    <th className="p-1.5 border border-black">Category</th>
                                    <th className="p-1.5 border border-black text-right pr-3">Dynamic Remaining Quantity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportRows.map((row, idx) => (
                                    <tr key={row.id} className="border-b border-black hover:bg-gray-50 font-semibold font-mono text-xs">
                                        <td className="p-1.5 border border-black text-center text-gray-400">{idx + 1}</td>
                                        <td className="p-1.5 border border-black font-bold text-black font-sans uppercase">{row.product_name}</td>
                                        <td className="p-1.5 border border-black uppercase">{row.uom || 'PC'}</td>
                                        <td className="p-1.5 border border-black text-purple-700 font-sans">{row.brand || 'Generic'}</td>
                                        <td className="p-1.5 border border-black font-sans text-gray-500">{row.category || 'General'}</td>
                                        <td className="p-1.5 border border-black text-right pr-3 text-success font-black">{Number(row.computed_true_stock || 0).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {/* --- 📊 RENDER CHANNEL 2: REAL-TIME ADAPTIVE PRICING COLUMNS VISIBILITY SHEET (TAB 5) --- */}
                    {activeTab === 5 && (
                        <table className="w-full table-auto border border-collapse border-black text-[11px] font-sans text-left">
                            <thead className="bg-gray-100 border-b border-black font-black uppercase text-black font-mono text-[10px]">
                                <tr>
                                    <th className="p-1.5 border border-black text-center w-12">Index</th>
                                    <th className="p-1.5 border border-black">Product Stock Asset Name</th>
                                    <th className="p-1.5 border border-black text-center w-16">Bal Qty</th>
                                    {filters.showSalePrice && <th className="p-1.5 border border-black text-right w-28">Retail Sale (PKR)</th>}
                                    {filters.showPurchasePrice && <th className="p-1.5 border border-black text-right w-28">Purchase Cost (PKR)</th>}
                                    {filters.showFinalPrice && <th className="p-1.5 border border-black text-right w-32 pr-3">Net Asset Valuation</th>}
                                    {filters.showSpecifications && <th className="p-1.5 border border-black font-sans text-gray-500">Technical Specifications Sheet Overview</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {reportRows.map((row, idx) => {
                                    const qty = Number(row.computed_true_stock || 0);
                                    const sPrice = Number(row.retail_price || row.sale_price || 0);
                                    const pPrice = Number(row.purchase_price || row.cost_price || 0);
                                    const netValue = qty * sPrice;

                                    return (
                                        <tr key={row.id} className="border-b border-black hover:bg-gray-50 font-semibold font-mono text-xs">
                                            <td className="p-1.5 border border-black text-center text-gray-400">{idx + 1}</td>
                                            <td className="p-1.5 border border-black font-bold text-black font-sans uppercase">{row.product_name}</td>
                                            <td className="p-1.5 border border-black text-center text-primary font-black">{qty.toLocaleString()}</td>
                                            {filters.showSalePrice && <td className="p-1.5 border border-black text-right text-gray-600">Rs. {sPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                                            {filters.showPurchasePrice && <td className="p-1.5 border border-black text-right text-purple-700">Rs. {pPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                                            {filters.showFinalPrice && <td className="p-1.5 border border-black text-right text-success font-black pr-3">Rs. {netValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                                            {filters.showSpecifications && <td className="p-1.5 border border-black font-sans text-[10px] text-gray-500 max-w-xs truncate">{row.specifications || row.description || 'N/A'}</td>}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                    {/* --- 📊 RENDER CHANNEL 3: FINANCIAL REAL-TIME VALUE TIERS SUMMARY STATEMENT (TAB 7) --- */}
                    {activeTab === 7 && (
                        <table className="w-full table-auto border border-collapse border-black text-[11px] font-sans text-left">
                            <thead className="bg-gray-100 border-b border-black font-black uppercase text-black font-mono text-[10px]">
                                <tr>
                                    <th className="p-1.5 border border-black text-center w-12">Index</th>
                                    <th className="p-1.5 border border-black">Stock Asset Description</th>
                                    <th className="p-1.5 border border-black">Brand Link</th>
                                    <th className="p-1.5 border border-black text-center w-20">Units Count</th>
                                    <th className="p-1.5 border border-black text-right w-24">Unit Rate</th>
                                    <th className="p-1.5 border border-black text-right w-36 pr-4 bg-green-50/30 text-success">Aggregated StockValue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportRows.map((row, idx) => {
                                    const qty = Number(row.computed_true_stock || 0);
                                    const rate = Number(row.retail_price || row.sale_price || 0);

                                    return (
                                        <tr key={row.id} className="border-b border-black hover:bg-gray-50 font-semibold font-mono text-xs">
                                            <td className="p-1.5 border border-black text-center text-gray-400">{idx + 1}</td>
                                            <td className="p-1.5 border border-black font-bold text-black font-sans uppercase">{row.product_name}</td>
                                            <td className="p-1.5 border border-black uppercase text-purple-700">{row.brand || 'Generic'}</td>
                                            <td className="p-1.5 border border-black text-center text-primary font-black">{qty.toLocaleString()}</td>
                                            <td className="p-1.5 border border-black text-right">Rs. {rate.toLocaleString()}</td>
                                            <td className="p-1.5 border border-black text-right pr-4 text-success font-black bg-success/5">Rs. {row.calculated_valuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-50 border-t border-black font-black font-mono text-xs">
                                    <td colSpan={5} className="p-2 border border-black text-right uppercase tracking-wider text-gray-500">Gross Consolidated StockValue Assets Allocation Sum (PKR):</td>
                                    <td className="p-2 border border-black text-right pr-4 text-success underline decoration-double text-sm bg-success/10 font-black">
                                        Rs. {reportRows.reduce((sum, r) => sum + r.calculated_valuation, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    )}

                    {reportRows.length === 0 && (
                        <div className="p-12 text-center border font-bold italic text-gray-400 bg-gray-50/50">No true live ledger ledger rows discovered matching chosen criteria tokens.</div>
                    )}
                </div>

                <div className="mt-20 grid grid-cols-2 gap-20 text-center text-[10px] font-sans font-bold uppercase tracking-wider text-gray-400">
                    <div className="border-t border-black pt-2">Warehouse Master Count Verifier</div>
                    <div className="border-t border-black pt-2">Corporate Internal Management Audit Release</div>
                </div>
            </div>
        </div>
    );
};

export default StockReportPrint;
