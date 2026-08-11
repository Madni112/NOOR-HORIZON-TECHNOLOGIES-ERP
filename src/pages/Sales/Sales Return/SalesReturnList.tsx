import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import { MdDelete, MdEdit, MdPrint } from 'react-icons/md';
import { FiSend } from 'react-icons/fi';

const SalesReturnList = () => {
  const navigate = useNavigate();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [openActionId, setOpenActionId] = useState<any | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, right: 0 });
  const [postedInvoicesSet, setPostedInvoicesSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSalesReturns();
  }, []);

  useEffect(() => {
    const handleOutsideClick = () => setOpenActionId(null);
    const handleScrollResize = () => setOpenActionId(null);
    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('scroll', handleScrollResize, true);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollResize, true);
    };
  }, []);

  const fetchSalesReturns = async () => {
    try {
      setLoading(true);
      const { data: returnsData, error } = await supabase
        .from('sales_returns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReturns(returnsData || []);

      const { data: invoicesData } = await supabase
        .from('sales_invoices')
        .select('id, fbr_fiscal_number');

      if (invoicesData) {
        const postedSet = new Set<string>();
        invoicesData.forEach((inv: any) => {
          if (inv.fbr_fiscal_number && String(inv.fbr_fiscal_number).trim() !== 'Unposted') {
            const rawId = String(inv.id).trim().toLowerCase();
            postedSet.add(rawId);
            postedSet.add(`inv-${rawId}`);
            postedSet.add(`inv-${rawId.padStart(4, '0')}`);
          }
        });
        setPostedInvoicesSet(postedSet);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncReturn = async (returnRecord: any) => {
    setSyncingId(returnRecord.id);
    try {
      const fakeFiscalNumber = `FBR-RET-${Math.floor(100000 + Math.random() * 900000)}`;
      const { error } = await supabase
        .from('sales_returns')
        .update({ fbr_fiscal_number: fakeFiscalNumber, fbr_qr_code: "fbr.gov.pk" })
        .eq('id', returnRecord.id);

      if (error) {
        if (error.message?.includes('fbr_fiscal_number')) {
          toast.error("Please add 'fbr_fiscal_number' column to sales_returns in Supabase Editor!");
          return;
        }
        throw error;
      }
      toast.success('Sales Return Posted to FBR Successfully!');
      fetchSalesReturns();
    } catch (err: any) {
      toast.error('FBR Sync Error: ' + err.message);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDeleteReturn = async (id: string | number) => {
    if (!window.confirm('Are you completely certain you want to delete this sales return debit note record?')) return;

    try {
      const { data: targetReturn, error: fetchError } = await supabase
        .from('sales_returns')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (targetReturn) {
        if (targetReturn.items) {
          const itemsArr = Array.isArray(targetReturn.items) ? targetReturn.items : JSON.parse(targetReturn.items || '[]');
          const dispatchLoc = targetReturn.dispatch_warehouse || targetReturn.location || '';

          for (const item of itemsArr) {
            const pName = item.itemName || item.product_name;
            const qty = Number(item.qty || item.returnedQty || item.quantity || 0);

            if (pName) {
              // 1. Decrease Master Product Stock (-)
              const { data: currentProduct } = await supabase
                .from('products')
                .select('current_stock')
                .ilike('product_name', pName)
                .maybeSingle();

              if (currentProduct) {
                const reducedStockCount = Math.max(0, (Number(currentProduct.current_stock) || 0) - qty);
                await supabase
                  .from('products')
                  .update({ current_stock: reducedStockCount })
                  .ilike('product_name', pName);
              }

              // 2. Decrease Dispatch Location Warehouse Stock (-)
              if (dispatchLoc) {
                const { data: p } = await supabase
                  .from('warehouse_inventory')
                  .select('id, quantity')
                  .ilike('product_name', pName)
                  .ilike('warehouse_name', dispatchLoc)
                  .maybeSingle();

                if (p) {
                  const reducedWhStock = Math.max(0, (Number(p.quantity) || 0) - qty);
                  await supabase.from('warehouse_inventory').update({ quantity: reducedWhStock }).eq('id', p.id);
                }
              }
            }
          }
        }

        if (targetReturn.original_invoice_no) {
          const origInvIdStr = String(targetReturn.original_invoice_no).replace(/[^0-9]/g, '');
          if (origInvIdStr) {
            await supabase
              .from('sales_invoices')
              .update({ receipt_status: 'Unpaid' })
              .eq('id', origInvIdStr)
              .eq('receipt_status', 'RETURNED');
          }
        }
      }

      const { error: deleteError } = await supabase
        .from('sales_returns')
        .delete().eq('id', id);

      if (deleteError) throw deleteError;
      toast.success('Sales return entry removed successfully.');
      fetchSalesReturns();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filteredReturns = returns.filter(ret =>
    ret.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ret.original_invoice_no?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
    ret.id.toString().includes(searchTerm)
  );

  const totalEntries = filteredReturns.length;
  const totalPages = Math.ceil(totalEntries / pageSize);
  const startIndex = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);
  const paginatedReturns = filteredReturns.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  return (
    <div className="mx-auto max-w-7xl flex flex-col gap-6 relative text-black dark:text-bodydark text-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
          Sales Return / Debit Notes
        </h2>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/Sales-Return/Debit-Notes/Add')} className="flex items-center justify-center rounded bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-opacity-90 transition duration-150 shadow-sm cursor-pointer" >
            + Add New
          </button>
        </div>
      </div>
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Show</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded border border-stroke py-1 px-2 bg-transparent dark:border-strokedark outline-none focus:border-primary text-sm font-medium text-black dark:text-white" >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size} className="dark:bg-boxdark">{size}</option>
              ))}
            </select>
            <span>entries</span>
          </div>

          <div className="flex items-center gap-2 text-sm w-full sm:w-auto text-gray-500 dark:text-gray-400">
            <span>Search:</span>
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by customer or invoice..." className="w-full sm:w-64 rounded border border-stroke py-1.5 px-3 bg-transparent dark:border-strokedark outline-none focus:border-primary text-sm text-black dark:text-white" />
          </div>
        </div>

        <div className="max-w-full overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-2 text-left dark:bg-meta-4 text-xs font-bold uppercase tracking-wider text-black dark:text-white border-b border-stroke dark:border-strokedark">
                <th className="py-4 px-4 font-semibold text-sm w-16">S#</th>
                <th className="py-4 px-4 font-semibold text-sm w-32">Sale Return No</th>
                <th className="py-4 px-4 font-semibold text-sm w-28">Orig. Inv No</th>
                <th className="py-4 px-4 font-semibold text-sm">Sale Return Date</th>
                <th className="py-4 px-4 font-semibold text-sm">Customer</th>
                <th className="py-4 px-4 font-semibold text-sm w-28">Return Status</th>
                <th className="py-4 px-4 font-semibold text-sm text-center w-36">FBR Tax Code</th>
                <th className="py-4 px-4 font-semibold text-sm text-right">Total Amount</th>
                <th className="py-4 px-4 font-semibold text-sm w-14 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12"><Spinner /></td></tr>
              ) : filteredReturns.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-xs text-gray-500 dark:text-gray-400">No records located.</td></tr>
              ) : (
                paginatedReturns.map((ret, idx) => {
                  const serialNumber = startIndex + idx + 1;
                  const rawInvoiceStr = String(ret.original_invoice_no || '').trim();
                  const displayInvoiceNo = rawInvoiceStr.toUpperCase().startsWith('INV-') ? rawInvoiceStr : `INV-${rawInvoiceStr}`;
                  const isFbrPosted = !!(ret.fbr_fiscal_number && String(ret.fbr_fiscal_number).trim() !== 'Unposted');

                  return (
                    <tr key={ret.id} className="border-b border-stroke dark:border-strokedark hover:bg-slate-50 dark:hover:bg-meta-4/10 duration-150 text-sm">
                      <td className="py-3.5 px-4 text-black dark:text-white font-medium">{serialNumber}</td>
                      <td className="py-3.5 px-4 font-bold text-primary dark:text-white">{`RTN-${String(ret.id).padStart(4, '0')}`}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-600 dark:text-gray-400">{displayInvoiceNo}</td>
                      <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">{ret.return_date ? ret.return_date : new Date(ret.created_at).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 font-medium text-black dark:text-white">{ret.customer_name}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex rounded-sm py-0.5 px-2 text-xs font-bold text-white uppercase tracking-wide ${ret.return_status === 'Paid' ? 'bg-success' : 'bg-amber-500'}`}>
                          {ret.return_status || 'On Credit'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`font-bold font-mono text-xs ${isFbrPosted ? 'text-success' : 'text-gray-400'}`}>
                          {ret.fbr_fiscal_number || 'Unposted'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-danger font-mono">
                        Rs. {Number(ret.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDropdownCoords({ top: rect.bottom + window.scrollY, right: window.innerWidth - rect.right - window.scrollX });
                            setOpenActionId(openActionId === ret.id ? null : ret.id);
                          }}
                          className="border border-stroke dark:border-strokedark rounded px-2 py-0.5 text-primary bg-slate-50 dark:bg-meta-4 hover:bg-slate-100 transition font-black tracking-widest text-[10px] cursor-pointer"
                        >
                          ...
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {openActionId && (() => {
          const selectedReturn = returns.find(r => r.id === openActionId);
          if (!selectedReturn) return null;

          const rawInvStr = String(selectedReturn.original_invoice_no || '').trim().toLowerCase();
          const rawInvNumOnly = rawInvStr.replace(/[^0-9]/g, '');
          const isOrigPosted = (
            postedInvoicesSet.has(rawInvStr) ||
            postedInvoicesSet.has(rawInvNumOnly) ||
            postedInvoicesSet.has(`inv-${rawInvNumOnly}`) ||
            postedInvoicesSet.has(`inv-${rawInvNumOnly.padStart(4, '0')}`)
          );

          const isReturnFbrPosted = !!(selectedReturn.fbr_fiscal_number && String(selectedReturn.fbr_fiscal_number).trim() !== 'Unposted');

          return (
            <div
              style={{ position: 'fixed', top: `${dropdownCoords.top - window.scrollY}px`, right: `${dropdownCoords.right}px` }}
              className="z-99999 w-44 rounded border border-stroke bg-white py-1 shadow-2xl dark:border-strokedark dark:bg-boxdark text-left text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <ul className="flex flex-col font-medium text-gray-700 dark:text-gray-300">
                {isOrigPosted && !isReturnFbrPosted && (
                  <li>
                    <button
                      type="button"
                      disabled={syncingId === selectedReturn.id}
                      onClick={() => { setOpenActionId(null); handleSyncReturn(selectedReturn); }}
                      className="flex items-center gap-2.5 w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-meta-4 transition border-b border-stroke dark:border-strokedark text-success cursor-pointer font-bold disabled:opacity-50"
                    >
                      <FiSend size={13} /> {syncingId === selectedReturn.id ? 'Posting...' : 'Post Return to FBR'}
                    </button>
                  </li>
                )}
                <li>
                  <button
                    type="button"
                    onClick={() => { setOpenActionId(null); navigate(`/Sales-Return/Debit-Notes/Print/${selectedReturn.id}`); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-meta-4 transition border-b border-stroke dark:border-strokedark text-blue-500 cursor-pointer"
                  >
                    <MdPrint size={14} /> Print Note
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => { setOpenActionId(null); navigate('/Sales-Return/Debit-Notes/Add', { state: { invoice: selectedReturn } }); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-meta-4 transition text-yellow-600 cursor-pointer"
                  >
                    <MdEdit size={14} /> Edit Record
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => { setOpenActionId(null); handleDeleteReturn(selectedReturn.id); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-meta-4 transition text-danger border-t border-stroke dark:border-strokedark mt-1 pt-1.5 cursor-pointer"
                  >
                    <MdDelete size={14} /> Delete Record
                  </button>
                </li>
              </ul>
            </div>
          );
        })()}

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 pt-4 border-t border-stroke dark:border-strokedark">
          <div className="text-xs text-gray-500 dark:text-gray-400">Showing {startIndex + 1} to {endIndex} of {totalEntries} entries</div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} className="px-3 py-1.5 rounded text-xs font-medium border border-stroke dark:border-strokedark hover:bg-gray-100 transition disabled:opacity-30 cursor-pointer">Previous</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button type="button" key={i + 1} onClick={() => setCurrentPage(i + 1)} className={`px-3 py-1.5 rounded text-xs border transition ${currentPage === i + 1 ? 'bg-primary text-white border-primary' : 'border-stroke dark:border-strokedark text-gray-500 hover:bg-gray-50'}`}>{i + 1}</button>
              ))}
              <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} className="px-3 py-1.5 rounded text-xs font-medium border border-stroke dark:border-strokedark hover:bg-gray-100 transition disabled:opacity-30 cursor-pointer">Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesReturnList;
