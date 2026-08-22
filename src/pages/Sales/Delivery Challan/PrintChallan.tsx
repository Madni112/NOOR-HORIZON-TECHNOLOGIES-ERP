import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import { useAuth } from '../../../Context/Auth';



interface ChallanItem {
  pDescription: string;
  qty: number;
  location?: string;
  [key: string]: any;
}

interface ChallanData {
  id: number;
  customer_name: string;
  transportation: string;
  po_no: string;
  po_date: string;
  dc_date: string;
  vehicle_no: string;
  remarks: string;
  items: ChallanItem[];
  created_at: string;
}

const PrintChallan = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { businessName, tenantId } = useAuth();
  const [challan, setChallan] = useState<ChallanData | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChallanDetails = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('delivery_challans')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (data) setChallan(data);
      } catch (err: any) {
        toast.error('Error loading print data: ' + err.message);
        navigate('/Delivery-Challan/List');
      } finally {
        setLoading(false);
      }
    };

    fetchChallanDetails();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Spinner />
      </div>
    );
  }

  if (!challan) return null;

  const formatPrintDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8 bg-white text-black font-sans min-h-screen relative">
      
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          aside, nav, header, .no-print, button {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
          }
          html, body, #root, .flex, main, div {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            position: static !important;
            overflow: visible !important;
            background: white !important;
            color: black !important;
            transform: none !important;
            box-shadow: none !important;
          }
          .print-voucher {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            min-height: 250mm !important;
            justify-content: space-between !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          table {
            width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
            margin-top: 15px !important;
          }
          th, td {
            padding: 10px 8px !important;
            border: 1px solid #000000 !important;
            font-size: 13px !important;
            text-align: center !important;
          }
        }
      `}</style>

      <div className="no-print flex justify-between items-center mb-6 bg-slate-50 p-4 rounded border border-stroke">
        <button
          onClick={() => navigate(`${tenantId ? `/${tenantId}` : ''}/Delivery-Challan/List`)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black transition"
        >
          ← Return to History
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded bg-primary py-2 px-5 text-sm font-medium text-white hover:bg-opacity-90 transition shadow-sm"
        >
          Print Document
        </button>
      </div>

      <div className="print-voucher bg-white">
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-gray-300 pb-4 mb-6 text-xs uppercase tracking-wider font-semibold">
            <div>
              <span className="text-gray-500 block mb-0.5">Challan No:</span>
              <strong className="text-sm font-black text-black">
                {`DC-${String(challan.id).padStart(4, '0')}`}
              </strong>
            </div>
            <div>
              <span className="text-gray-500 block mb-0.5">Challan Date:</span>
              <span className="text-black text-sm font-bold">{formatPrintDate(challan.dc_date || challan.created_at)}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-0.5">P.O. Number:</span>
              <span className="text-black text-sm font-bold">{challan.po_no || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-0.5">Vehicle Number:</span>
              <strong className="text-black text-sm font-bold">{challan.vehicle_no || 'N/A'}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-gray-300 pb-6 mb-6 text-xs">
            <div>
              <h4 className="font-bold text-gray-500 mb-2 uppercase tracking-wide text-[11px]">Supplier Details:</h4>
              <div className="space-y-1 text-black font-medium">
                <p className="text-sm font-extrabold text-primary">{businessName ? businessName.toUpperCase() : 'NOOR HORIZON TECHNOLOGIES ERP'}</p>
                <p>Enterprise Logistics & Delivery Dispatch</p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-gray-500 mb-2 uppercase tracking-wide text-[11px]">Consignee / Consigned To:</h4>
              <div className="space-y-1 text-black font-medium">
                <p className="text-sm font-extrabold text-black">{challan.customer_name}</p>
                <p className="italic text-gray-600">Transit Method: {challan.transportation || 'By Road Delivery'}</p>
                {challan.remarks && <p className="mt-2 text-gray-700 bg-gray-50 p-2 rounded">Remarks: {challan.remarks}</p>}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <table className="w-full border-collapse border border-gray-300 text-xs text-left">
              <thead>
                <tr className="bg-gray-100 text-black font-bold uppercase tracking-wider border-b border-gray-300 text-center">
                  <th className="border border-gray-300 p-2.5 w-12">S#</th>
                  <th className="border border-gray-300 p-2.5 text-left">Product Details / Item Descriptions</th>
                  <th className="border border-gray-300 p-2.5 w-24">Location</th>
                  <th className="border border-gray-300 p-2.5 w-24">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {challan.items && challan.items.map((item, idx) => (
                  <tr key={idx} className="font-medium">
                    <td className="border border-gray-300 p-2.5 text-center bg-gray-50/50">{idx + 1}</td>
                    <td className="border border-gray-300 p-2.5 text-black font-semibold text-left">{item.pDescription}</td>
                    <td className="border border-gray-300 p-2.5 text-center text-gray-600">{item.location || 'Main WH'}</td>
                    <td className="border border-gray-300 p-2.5 text-center font-bold text-sm text-black">
                      {Number(item.qty).toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold border-t-2 border-gray-400">
                  <td colSpan={3} className="border border-gray-300 p-2.5 text-right uppercase tracking-wider text-gray-600">
                    Total Dispatched Quantity:
                  </td>
                  <td className="border border-gray-300 p-2.5 text-center text-sm font-black text-black bg-gray-100">
                    {challan.items?.reduce((sum, item) => sum + (Number(item.qty) || 0), 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* COMPLIANT SPACED OUT SIGNATURE LINES GRID BLOCK */}
        <div className="grid grid-cols-3 gap-8 pt-24 text-center text-[11px] font-bold uppercase tracking-wider text-gray-600 mt-auto">
          <div><div className="border-t border-black pt-2">Prepared By</div></div>
          <div><div className="border-t border-black pt-2">Checked By</div></div>
          <div><div className="border-t border-black pt-2">Receiver's Signature</div></div>
        </div>

      </div>
    </div>
  );
};

export default PrintChallan;
