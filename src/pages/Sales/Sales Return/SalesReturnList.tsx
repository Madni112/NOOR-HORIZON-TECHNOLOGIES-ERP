import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import { MdDelete, MdEdit, MdPrint } from 'react-icons/md';

const SalesReturnList = () => {
  const navigate = useNavigate();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchSalesReturns();
  }, []);

  const fetchSalesReturns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales_returns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReturns(data || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReturn = async (id: string | number) => {
    if (!window.confirm('Are you completely certain you want to delete this sales return debit note record?')) return;

    try {
      const { data: targetReturn, error: fetchError } = await supabase
        .from('sales_returns')
        .select('items')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (targetReturn && targetReturn.items) {
        for (const item of targetReturn.items) {
          const { data: currentProduct } = await supabase
            .from('products')
            .select('current_stock')
            .eq('product_name', item.itemName)
            .single();

          if (currentProduct) {
            const reducedStockCount = (Number(currentProduct.current_stock) || 0) - Number(item.qty || item.returnedQty || 0);
            await supabase
              .from('products')
              .update({ current_stock: reducedStockCount })
              .eq('product_name', item.itemName);
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
                <th className="py-4 px-4 font-semibold text-sm w-20">S#</th>
                <th className="py-4 px-4 font-semibold text-sm w-36">Sale Return No</th>
                <th className="py-4 px-4 font-semibold text-sm w-32">Orig. Inv No</th>
                <th className="py-4 px-4 font-semibold text-sm">Sale Return Date</th>
                <th className="py-4 px-4 font-semibold text-sm">Customer</th>
                <th className="py-4 px-4 font-semibold text-sm w-36">Return Status</th>
                <th className="py-4 px-4 font-semibold text-sm text-right">Total Amount</th>
                <th className="py-4 px-4 font-semibold text-sm w-36 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12"><Spinner /></td></tr>
              ) : filteredReturns.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-xs text-gray-500 dark:text-gray-400">No records located.</td></tr>
              ) : (
                paginatedReturns.map((ret, idx) => {
                  const serialNumber = startIndex + idx + 1;
                  const rawInvoiceStr = String(ret.original_invoice_no || '').trim();
                  const displayInvoiceNo = rawInvoiceStr.toUpperCase().startsWith('INV-') ? rawInvoiceStr : `INV-${rawInvoiceStr}`;

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

                      {/* ✅ FIXED: Wipes out the dynamic items recalculator loop and reads strictly from your saved database field total_amount (7,200) */}
                      <td className="py-3.5 px-4 text-right font-black text-danger font-mono">
                        Rs. {Number(ret.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-sm">
                        <div className="flex items-center justify-center space-x-3">
                          <button type="button" onClick={() => navigate(`/Sales-Return/Debit-Notes/Print/${ret.id}`)} className="text-gray-500 hover:text-secondary transition p-0.5 cursor-pointer" title="Print Note" >
                            <MdPrint size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/Sales-Return/Debit-Notes/Add', { state: { invoice: ret } })}
                            className="text-gray-500 hover:text-primary transition p-0.5 cursor-pointer"
                            title="Edit Record"
                          >
                            <MdEdit size={14} />
                          </button>
                          <button type="button" onClick={() => handleDeleteReturn(ret.id)} className="text-gray-500 hover:text-danger transition p-0.5 cursor-pointer" title="Delete Record" >
                            <MdDelete size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 pt-4 border-t border-stroke dark:border-strokedark">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {startIndex + 1} to {endIndex} of {totalEntries} entries
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button disabled={currentPage === 1} type="button" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} className="px-3 py-1.5 rounded text-xs font-medium border border-stroke dark:border-strokedark hover:bg-gray-100 dark:hover:bg-meta-4 transition disabled:opacity-30 cursor-pointer" >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i + 1} type="button" onClick={() => setCurrentPage(i + 1)} className={`px-3 py-1.5 rounded text-xs border transition cursor-pointer ${currentPage === i + 1 ? 'bg-primary text-white border-primary' : 'border-stroke dark:border-strokedark text-gray-500 hover:bg-gray-50'}`} >
                  {i + 1}
                </button>
              ))}
              <button disabled={currentPage === totalPages} type="button" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} className="px-3 py-1.5 rounded text-xs font-medium border border-stroke dark:border-strokedark hover:bg-gray-100 dark:hover:bg-meta-4 transition disabled:opacity-30 cursor-pointer" >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesReturnList;
