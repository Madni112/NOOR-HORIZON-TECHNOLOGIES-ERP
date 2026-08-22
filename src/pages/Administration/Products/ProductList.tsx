import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import { MdEdit, MdDelete, MdWarning } from 'react-icons/md';

const ProductList = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchInventoryProducts();
  }, []);


  const fetchInventoryProducts = async () => {
    try {
      setLoading(true);

      // Query products
      let query = supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: baseProducts, error } = await query;

      if (error) throw error;

      if (baseProducts && baseProducts.length > 0) {
        const { data: openStocks } = await supabase.from('opening_stocks').select('*');
        const { data: purchases } = await supabase.from('supplier_purchases').select('items, payment_term');
        const { data: sales } = await supabase.from('sales_invoices').select('items, sale_status, receipt_status');

        // ✅ CORRECT TABLE LINK: Queries sales_returns exactly like StockReportPrint.tsx
        const { data: sReturns } = await supabase.from('sales_returns').select('*');

        const unifiedProductPayload = baseProducts.map(product => {
          const name = String(product.product_name || '').trim().toLowerCase();

          // 1. Opening stock calculation
          const totalOpening = (openStocks || [])
            .filter((os: any) => {
              const osName = String(os.product_name || os.item_name || os.itemName || os.item_details || os.itemDetails || '').trim().toLowerCase();
              return osName === name || osName.includes(name) || name.includes(osName);
            })
            .reduce((sum: number, os: any) => sum + (Number(os.quantity || os.qty || 0)), 0);

          // 2. Purchased stock calculation
          let totalPurchased = 0;
          (purchases || []).forEach((p: any) => {
            const termClean = String(p.payment_term || '').trim().toLowerCase();
            if (termClean !== 'cancel' && termClean !== 'deleted' && termClean !== 'draft') {
              const itemsArray = Array.isArray(p.items) ? p.items : JSON.parse(p.items || '[]');
              itemsArray.forEach((item: any) => {
                const pName = String(item.product_name || item.itemName || item.item_name || '').trim().toLowerCase();
                if (pName === name || pName.includes(name)) {
                  totalPurchased += (Number(item.qty || item.quantity || 0));
                }
              });
            }
          });

          // 3. Sold stock calculation
          let totalSold = 0;
          (sales || []).forEach((s: any) => {
            const statusClean = String(s.sale_status || '').trim().toLowerCase();
            if (statusClean !== 'cancel' && statusClean !== 'deleted') {
              const itemsArray = Array.isArray(s.items) ? s.items : JSON.parse(s.items || '[]');
              itemsArray.forEach((item: any) => {
                const sName = String(item.product_name || item.itemName || item.item_name || '').trim().toLowerCase();
                if (sName === name || sName.includes(name)) {
                  totalSold += (Number(item.qty || item.quantity || 0));
                }
              });
            }
          });

          // 4. Sales returns calculation (Stock coming back into warehouse)
          let totalSalesReturned = 0;
          (sReturns || []).forEach((sr: any) => {
            if (String(sr.status || '').trim().toLowerCase() !== 'cancel') {
              const itemsArray = Array.isArray(sr.items) ? sr.items : JSON.parse(sr.items || '[]');
              itemsArray.forEach((item: any) => {
                const srName = String(item.product_name || item.itemName || item.item_name || '').trim().toLowerCase();
                if (srName === name || srName.includes(name)) {
                  totalSalesReturned += (Number(item.qty || item.quantity || 0));
                }
              });
            }
          });

          // ✅ THE MATHEMATHICALLY PERFECT FORMULA MATCHING YOUR REPORTS
          const trueRemainingStock = (totalOpening + totalPurchased + totalSalesReturned) - totalSold;

          return {
            ...product,
            current_stock: trueRemainingStock
          };
        });

        setProducts(unifiedProductPayload);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      toast.error('Data Fetching Failure: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteProduct = async (id: string | number) => {
    if (!window.confirm('Are you certain you want to delete this product catalog entry?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success('Product removed from database catalog successfully.');
      fetchInventoryProducts();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filteredProducts = products.filter(p =>
    p.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  );



  const totalEntries = filteredProducts.length;
  const totalPages = Math.ceil(totalEntries / pageSize);
  const startIndex = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  return (
    <div className="mx-auto max-w-7xl flex flex-col gap-6 relative text-black dark:text-bodydark">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">Product Stock Inventory</h2>
        <button type="button" onClick={() => navigate('/Administration/Products/Add')} className="flex items-center justify-center rounded bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-opacity-90 transition duration-150 shadow-sm cursor-pointer">+ Add New</button>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Show</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded border border-stroke py-1 px-2 bg-transparent dark:border-strokedark outline-none focus:border-primary text-sm font-medium text-black dark:text-white">
              {[10, 25, 50, 100].map((size) => <option key={size} value={size} className="dark:bg-boxdark">{size}</option>)}
            </select>
            <span>entries</span>
          </div>
          <div className="flex items-center gap-2 text-sm w-full sm:w-auto text-gray-500 dark:text-gray-400">
            <span>Search:</span>
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search inventory rows..." className="w-full sm:w-64 rounded border border-stroke py-1.5 px-3 bg-transparent dark:border-strokedark outline-none focus:border-primary text-sm text-black dark:text-white" />
          </div>
        </div>

        <div className="max-w-full overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-2 text-left dark:bg-meta-4 text-xs font-bold uppercase tracking-wider text-black dark:text-white border-b border-stroke dark:border-strokedark">
                <th className="py-4 px-4 font-semibold text-sm w-20">S#</th>
                <th className="py-4 px-4 font-semibold text-sm">Product Name</th>
                <th className="py-4 px-4 font-semibold text-sm">Category</th>
                <th className="py-4 px-4 font-semibold text-sm">Brand</th>
                <th className="py-4 px-4 font-semibold text-sm w-24 text-center">UOM</th>
                <th className="py-4 px-4 font-semibold text-sm text-right">Purchase Rate</th>
                <th className="py-4 px-4 font-semibold text-sm text-right">R.P Rate</th>
                <th className="py-4 px-4 font-semibold text-sm text-right">MRP Rate</th>
                <th className="py-4 px-4 font-semibold text-sm text-center w-36">Available Stock</th>
                <th className="py-4 px-4 font-semibold text-sm w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-12 text-sm"><Spinner /></td></tr>
              ) : paginatedProducts.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">No product items registered.</td></tr>
              ) : (
                paginatedProducts.map((product, idx) => {
                  const serialNumber = startIndex + idx + 1;
                  const isLowStock = Number(product.current_stock) <= Number(product.min_stock_alert || 0);
                  return (
                    <tr key={product.id} className="border-b border-stroke dark:border-strokedark hover:bg-slate-50 dark:hover:bg-meta-4/10 duration-150 text-sm">
                      <td className="py-3.5 px-4 text-black dark:text-white font-medium">{serialNumber}</td>
                      <td className="py-3.5 px-4 font-bold text-black dark:text-white">{product.product_name}</td>
                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400">{product.category || 'General'}</td>
                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400">{product.brand || 'Local'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-slate-100 dark:bg-meta-4 px-2 py-0.5 rounded text-xs font-semibold text-gray-600 dark:text-gray-300">{product.uom}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-gray-700 dark:text-gray-300">{Number(product.purchase_price || 0).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-gray-700 dark:text-gray-300">{Number(product.retail_price || 0).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-gray-700 dark:text-gray-300">{Number(product.mrp || 0).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`font-bold text-sm ${isLowStock ? 'text-danger' : 'text-success'}`}>{Number(product.current_stock).toLocaleString()}</span>
                          {isLowStock && <MdWarning size={16} className="text-danger" />}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center space-x-3.5">
                          <button onClick={() => navigate('/Administration/Products/Add', { state: { product } })} className="text-gray-500 hover:text-primary transition p-0.5 cursor-pointer" title="Edit Product"><MdEdit size={18} /></button>
                          <button onClick={() => handleDeleteProduct(product.id)} className="text-gray-500 hover:text-danger transition p-0.5 cursor-pointer" title="Delete Product"><MdDelete size={18} /></button>
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
          <div className="text-sm text-gray-500 dark:text-gray-400">Showing {startIndex + 1} to {endIndex} of {totalEntries} entries</div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} className="px-3 py-1.5 rounded text-xs font-medium border border-stroke dark:border-strokedark hover:bg-gray-100 dark:hover:bg-meta-4 transition disabled:opacity-30 cursor-pointer">Previous</button>
              {Array.from({ length: totalPages }, (_, i) => <button key={i + 1} onClick={() => setCurrentPage(i + 1)} className={`px-3 py-1.5 rounded text-xs border transition cursor-pointer ${currentPage === i + 1 ? 'bg-primary text-white border-primary' : 'border-stroke dark:border-strokedark text-gray-500 hover:bg-gray-50'}`}>{i + 1}</button>)}
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} className="px-3 py-1.5 rounded text-xs font-medium border border-stroke dark:border-strokedark hover:bg-gray-100 dark:hover:bg-meta-4 transition disabled:opacity-30 cursor-pointer">Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductList;
