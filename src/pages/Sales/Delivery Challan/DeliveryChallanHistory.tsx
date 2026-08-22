import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import { MdEdit, MdDelete, MdPrint } from 'react-icons/md';
import { useAuth } from '../../../Context/Auth';

const DeliveryChallanHistory = () => {
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const [challans, setChallans] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  // Datatable layout state controllers
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchChallans();
  }, []);

  const fetchChallans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('delivery_challans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChallans(data || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (window.confirm('Are you completely sure you want to delete this delivery challan? This cannot be undone.')) {
      try {
        const { error } = await supabase.from('delivery_challans').delete().eq('id', id);
        if (error) throw error;
        toast.success('Challan deleted successfully');
        fetchChallans();
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  // Live filter query rule logic
  const filteredChallans = challans.filter(c =>
    c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.challan_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.vehicle_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination bounds vector calculation math
  const totalEntries = filteredChallans.length;
  const totalPages = Math.ceil(totalEntries / pageSize);
  const startIndex = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);
  const paginatedChallans = filteredChallans.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5">
      
      {/* Top Header Controls row */}
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-xl font-semibold text-black dark:text-white">Delivery Challan / Gate Pass Registry</h4>
        <button
          onClick={() => navigate('/Delivery-Challan/Details')}
          className="bg-primary text-white py-2 px-4 rounded text-sm font-medium hover:bg-opacity-90 transition shadow-sm"
        >
          + Add New
        </button>
      </div>

      {/* Datatable Filters Wrapper */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded border border-stroke py-1 px-2 bg-transparent dark:border-strokedark outline-none focus:border-primary text-sm font-medium text-black dark:text-white"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size} className="dark:bg-boxdark">{size}</option>
            ))}
          </select>
          <span>entries</span>
        </div>

        <div className="flex items-center gap-2 text-sm w-full sm:w-auto text-gray-500 dark:text-gray-400">
          <span>Search:</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search challans, vehicle..."
            className="w-full sm:w-64 rounded border border-stroke py-1.5 px-3 bg-transparent dark:border-strokedark outline-none focus:border-primary text-sm text-black dark:text-white"
          />
        </div>
      </div>

      {/* Core Table Layout Grid context */}
      <div className="max-w-full overflow-x-auto">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              <th className="py-4 px-4 font-medium text-black dark:text-white text-sm w-16">S#</th>
              <th className="py-4 px-4 font-medium text-black dark:text-white text-sm">Challan / Date</th>
              <th className="py-4 px-4 font-medium text-black dark:text-white text-sm">Customer</th>
              <th className="py-4 px-4 font-medium text-black dark:text-white text-sm">Vehicle / Driver</th>
              <th className="py-4 px-4 font-medium text-black dark:text-white text-sm">Status</th>
              <th className="py-4 px-4 font-medium text-black dark:text-white text-sm text-center w-36">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center"><Spinner /></td></tr>
            ) : paginatedChallans.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">No matching transit record entries found.</td></tr>
            ) : (
              paginatedChallans.map((c, idx) => {
                const serialNumber = startIndex + idx + 1;

                return (
                  <tr key={c.id} className="border-b border-stroke dark:border-strokedark hover:bg-slate-50 dark:hover:bg-meta-4/10 duration-150">
                    <td className="py-3.5 px-4 text-sm text-black dark:text-white">{serialNumber}</td>
                    <td className="py-3.5 px-4 text-sm">
                      <p className="font-bold text-primary dark:text-white">{c.challan_no || `DC-${c.id}`}</p>
                      <p className="text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="py-3.5 px-4 text-sm font-medium text-black dark:text-white">
                      {c.customer_name}
                    </td>
                    <td className="py-3.5 px-4 text-sm">
                      <p className="text-black dark:text-white font-medium">{c.vehicle_no || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{c.driver_name || 'No Driver Set'}</p>
                    </td>
                    <td className="py-3.5 px-4 text-sm">
                      <span className={`inline-flex rounded-full py-1 px-3 text-xs font-semibold ${
                        c.status === 'Dispatched' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                      }`}>
                        {c.status || 'Draft'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-sm">
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={() => navigate(`${tenantId ? `/${tenantId}` : ''}/Delivery-Challan/Print/${c.id}`)}
                          className="text-gray-500 hover:text-secondary transition p-0.5"
                          title="Print Gate Pass Receipt"
                        >
                          <MdPrint size={18} />
                        </button>
                        <button
                          onClick={() => navigate(`${tenantId ? `/${tenantId}` : ''}/Delivery-Challan/Details`, { state: { challan: c } })}
                          className="text-gray-500 hover:text-primary transition p-0.5"
                          title="Edit Document"
                        >
                          <MdEdit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-gray-500 hover:text-danger transition p-0.5"
                          title="Delete Record"
                        >
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

      {/* Footer statistics logic pagination arrays mapping */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-stroke dark:border-strokedark">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Showing {startIndex + 1} to {endIndex} of {totalEntries} entries
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              className="px-3 py-1.5 rounded text-xs font-medium border border-stroke dark:border-strokedark hover:bg-gray-100 dark:hover:bg-meta-4 transition disabled:opacity-30"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1.5 rounded text-xs border transition ${
                  currentPage === i + 1 ? 'bg-primary text-white border-primary' : 'border-stroke dark:border-strokedark text-gray-500 hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              className="px-3 py-1.5 rounded text-xs font-medium border border-stroke dark:border-strokedark hover:bg-gray-100 dark:hover:bg-meta-4 transition disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default DeliveryChallanHistory;
