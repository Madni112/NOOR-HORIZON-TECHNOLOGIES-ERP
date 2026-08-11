import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';

const StockReport = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(1);

  const [categories, setCategories] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const [criteria, setCriteria] = useState({
    uom: 'All', brand: 'All', product: 'All', location: 'All',
    employee: 'All', category: 'All', stockValueTier: 'All',
    dateFrom: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    asOfDate: new Date().toISOString().split('T')[0],
    showSalePrice: true,
    showPurchasePrice: true,
    showFinalPrice: true,
    showSpecifications: true
  });

  useEffect(() => {
    const fetchStockCriteriaLookups = async () => {
      try {
        setLoading(true);
        const { data: cat } = await supabase.from('inventory_categories').select('id, name');
        const { data: brnd } = await supabase.from('inventory_brands').select('id, name');
        const { data: prod } = await supabase.from('products').select('id, product_name, category, brand, uom');
        const { data: loc } = await supabase.from('inventory_locations').select('id, name');
        const { data: emp } = await supabase.from('salesmen').select('id, name');
        const { data: uomData } = await supabase.from('inventory_uom').select('id, short_code, full_name').eq('is_active', true);

        if (cat) setCategories(cat);
        if (brnd) setBrands(brnd);
        if (prod) setProducts(prod);
        if (loc) setLocations(loc);
        if (emp) setEmployees(emp);

        if (uomData) {
          const normalizedUoms = uomData.map((u: any) => ({
            id: u.id,
            name: `${u.short_code} = ${u.full_name}`
          }));
          setUoms(normalizedUoms);
        }
      } catch (err: any) {
        toast.error('Stock criteria aggregation error: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStockCriteriaLookups();
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setCriteria(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'brand') updated.product = 'All';
      return updated;
    });
  };

  const getContextualProductSelectionPool = () => {
    const selectedBrandClean = String(criteria.brand || '').trim().toLowerCase();
    if (!selectedBrandClean || selectedBrandClean === 'all') return products;
    return products.filter(p => String(p.brand || '').trim().toLowerCase() === selectedBrandClean);
  };

  const handleDispatchReportView = () => {
    navigate('/Reports/Stock-Report/Print', {
      state: { tab: activeTab, filters: criteria }
    });
  };

  if (loading) return <div className="flex h-48 items-center justify-center"><Spinner /></div>;
  return (
    <div className="mx-auto max-w-7xl flex flex-col gap-6 text-black dark:text-bodydark text-xs antialiased font-sans relative">
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white uppercase tracking-wider">Enterprise Stock Auditing Center</h2>
        <p className="text-xs text-gray-400">Track structural inventory asset flows, location metrics, and ledger balances valuation</p>
      </div>

      <div className="flex flex-wrap border-b border-stroke dark:border-strokedark gap-1 bg-white dark:bg-boxdark font-black tracking-wider text-[10px] uppercase text-gray-500">
        <button type="button" onClick={() => setActiveTab(1)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 1 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>Stock Activity</button>
        <button type="button" onClick={() => setActiveTab(2)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 2 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>Stock Balance</button>
        <button type="button" onClick={() => setActiveTab(3)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 3 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>Stock Status</button>
        <button type="button" onClick={() => setActiveTab(4)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 4 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>Stock Transfer</button>
        <button type="button" onClick={() => setActiveTab(5)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 5 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>Detail With Price</button>
        <button type="button" onClick={() => setActiveTab(6)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 6 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>Product Report</button>
        <button type="button" onClick={() => setActiveTab(7)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 7 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>Status Detail</button>
        <button type="button" onClick={() => setActiveTab(8)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 8 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>Location Stock</button>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">
        <h3 className="font-bold text-sm text-black dark:text-white mb-4 uppercase tracking-wider text-primary">Report Criteria Specification</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">

          {activeTab === 1 && (
            <>
              <div><label className="block font-bold text-gray-500 mb-1">Product Group (UOM):</label><select value={criteria.uom} onChange={(e) => handleInputChange('uom', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Groups</option>{uoms.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
              <div><label className="block font-bold text-gray-500 mb-1">Brand Name:</label><select value={criteria.brand} onChange={(e) => handleInputChange('brand', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Brands</option>{brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}</select></div>
              <div>
                <label className="block font-bold text-gray-500 mb-1">Select Product Asset:</label>
                <select value={criteria.product} onChange={(e) => handleInputChange('product', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark">
                  <option value="All">All Products ({getContextualProductSelectionPool().length} Options)</option>
                  {getContextualProductSelectionPool().map(p => <option key={p.id} value={p.product_name}>{p.product_name}</option>)}
                </select>
              </div>
            </>
          )}

          {activeTab === 2 && (
            <>
              <div><label className="block font-bold text-gray-500 mb-1">Product Group (UOM):</label><select value={criteria.uom} onChange={(e) => handleInputChange('uom', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Groups</option>{uoms.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
              <div><label className="block font-bold text-gray-500 mb-1">Brand Name:</label><select value={criteria.brand} onChange={(e) => handleInputChange('brand', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Brands</option>{brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}</select></div>
              <div>
                <label className="block font-bold text-gray-500 mb-1">Select Product Asset:</label>
                <select value={criteria.product} onChange={(e) => handleInputChange('product', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark">
                  <option value="All">All Products ({getContextualProductSelectionPool().length} Options)</option>
                  {getContextualProductSelectionPool().map(p => <option key={p.id} value={p.product_name}>{p.product_name}</option>)}
                </select>
              </div>
            </>
          )}
          {activeTab === 3 && (
            <>
              <div><label className="block font-bold text-gray-500 mb-1">Warehouse Location:</label><select value={criteria.location} onChange={(e) => handleInputChange('location', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Locations</option>{locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</select></div>
              <div><label className="block font-bold text-gray-500 mb-1">Target Product Asset:</label><select value={criteria.product} onChange={(e) => handleInputChange('product', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Products</option>{products.map(p => <option key={p.id} value={p.product_name}>{p.product_name}</option>)}</select></div>
              <div><label className="block font-bold text-gray-500 mb-1">As Of Date Balance:</label><input type="date" value={criteria.asOfDate} onChange={(e) => handleInputChange('asOfDate', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark outline-none" /></div>
            </>
          )}

          {activeTab === 4 && (
            <>
              <div><label className="block font-bold text-gray-500 mb-1">Transfer Location:</label><select value={criteria.location} onChange={(e) => handleInputChange('location', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Locations</option>{locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</select></div>
              <div><label className="block font-bold text-gray-500 mb-1">Target Product Asset:</label><select value={criteria.product} onChange={(e) => handleInputChange('product', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Products</option>{products.map(p => <option key={p.id} value={p.product_name}>{p.product_name}</option>)}</select></div>
              <div><label className="block font-bold text-gray-500 mb-1">Employee Logistics Link:</label><select value={criteria.employee} onChange={(e) => handleInputChange('employee', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Personnel Agents</option>{employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}</select></div>
              <div><label className="block font-bold text-gray-500 mb-1">Transfer Start Date:</label><input type="date" value={criteria.dateFrom} onChange={(e) => handleInputChange('dateFrom', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark outline-none" /></div>
              <div><label className="block font-bold text-gray-500 mb-1">Transfer End Date:</label><input type="date" value={criteria.dateTo} onChange={(e) => handleInputChange('dateTo', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark outline-none" /></div>
            </>
          )}
          {activeTab === 5 && (
            <>
              <div><label className="block font-bold text-gray-500 mb-1">Product Group (UOM):</label><select value={criteria.uom} onChange={(e) => handleInputChange('uom', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Groups</option>{uoms.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
              <div><label className="block font-bold text-gray-500 mb-1">Brand Name:</label><select value={criteria.brand} onChange={(e) => handleInputChange('brand', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Brands</option>{brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}</select></div>
              <div>
                <label className="block font-bold text-gray-500 mb-1">Select Product Asset:</label>
                <select value={criteria.product} onChange={(e) => handleInputChange('product', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark">
                  <option value="All">All Products ({getContextualProductSelectionPool().length} Options)</option>
                  {getContextualProductSelectionPool().map(p => <option key={p.id} value={p.product_name}>{p.product_name}</option>)}
                </select>
              </div>

              {/* --- ✅ PRICE DYNAMIC COLUMNS VISIBILITY SELECTION FIELD CHECKBOX MATRIX --- */}
              <div className="md:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 dark:bg-meta-4/20 p-3 rounded border border-stroke dark:border-strokedark mt-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="showSalePrice" checked={criteria.showSalePrice} onChange={(e) => handleInputChange('showSalePrice', e.target.checked)} className="h-4 w-4 rounded text-primary border-stroke cursor-pointer" />
                  <label htmlFor="showSalePrice" className="font-bold text-gray-600 dark:text-white cursor-pointer select-none">Include Retail Sale Price</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="showPurchasePrice" checked={criteria.showPurchasePrice} onChange={(e) => handleInputChange('showPurchasePrice', e.target.checked)} className="h-4 w-4 rounded text-primary border-stroke cursor-pointer" />
                  <label htmlFor="showPurchasePrice" className="font-bold text-gray-600 dark:text-white cursor-pointer select-none">Include Inbound Purchase Cost</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="showFinalPrice" checked={criteria.showFinalPrice} onChange={(e) => handleInputChange('showFinalPrice', e.target.checked)} className="h-4 w-4 rounded text-primary border-stroke cursor-pointer" />
                  <label htmlFor="showFinalPrice" className="font-bold text-gray-600 dark:text-white cursor-pointer select-none">Include Final Net Value</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="showSpecifications" checked={criteria.showSpecifications} onChange={(e) => handleInputChange('showSpecifications', e.target.checked)} className="h-4 w-4 rounded text-primary border-stroke cursor-pointer" />
                  <label htmlFor="showSpecifications" className="font-bold text-gray-600 dark:text-white cursor-pointer select-none">Include Data Technical Specs</label>
                </div>
              </div>
            </>
          )}
          {activeTab === 6 && (
            <>
              <div><label className="block font-bold text-gray-500 mb-1">Product Group (UOM):</label><select value={criteria.uom} onChange={(e) => handleInputChange('uom', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Groups</option>{uoms.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
              <div><label className="block font-bold text-gray-500 mb-1">Brand Name:</label><select value={criteria.brand} onChange={(e) => handleInputChange('brand', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Brands</option>{brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}</select></div>
              <div>
                <label className="block font-bold text-gray-500 mb-1">Select Product Asset:</label>
                <select value={criteria.product} onChange={(e) => handleInputChange('product', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark">
                  <option value="All">All Products ({getContextualProductSelectionPool().length} Options)</option>
                  {getContextualProductSelectionPool().map(p => <option key={p.id} value={p.product_name}>{p.product_name}</option>)}
                </select>
              </div>
            </>
          )}

          {activeTab === 7 && (
            <>
              <div><label className="block font-bold text-gray-500 mb-1">Product Group (UOM):</label><select value={criteria.uom} onChange={(e) => handleInputChange('uom', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Groups</option>{uoms.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
              <div><label className="block font-bold text-gray-500 mb-1">Brand Name:</label><select value={criteria.brand} onChange={(e) => handleInputChange('brand', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Brands</option>{brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}</select></div>
              <div><label className="block font-bold text-gray-500 mb-1">Product Category:</label><select value={criteria.category} onChange={(e) => handleInputChange('category', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Categories</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>

              {/* --- ✅ STOCK VALUE FINANCIAL VALUATION ALIGNED OPTION DRAWER --- */}
              <div>
                <label className="block font-bold text-gray-500 mb-1">StockValue Tier Filter:</label>
                <select value={criteria.stockValueTier} onChange={(e) => handleInputChange('stockValueTier', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark">
                  <option value="All">All Financial Valuations</option>
                  <option value="High">High Asset Value First (&gt; Rs. 100,000)</option>
                  <option value="Low">Low Cost Asset Pools (&lt; Rs. 10,000)</option>
                  <option value="Zero">Zero Valuation / Empty Inventory Sheets</option>
                </select>
              </div>
            </>
          )}

          {activeTab === 8 && (
            <>
              <div><label className="block font-bold text-gray-500 mb-1">Target Warehouse Location:</label><select value={criteria.location} onChange={(e) => handleInputChange('location', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Locations</option>{locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</select></div>
              <div><label className="block font-bold text-gray-500 mb-1">Brand Name:</label><select value={criteria.brand} onChange={(e) => handleInputChange('brand', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Brands</option>{brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}</select></div>
              <div>
                <label className="block font-bold text-gray-500 mb-1">Select Product Asset:</label>
                <select value={criteria.product} onChange={(e) => handleInputChange('product', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark">
                  <option value="All">All Products ({getContextualProductSelectionPool().length} Options)</option>
                  {getContextualProductSelectionPool().map(p => <option key={p.id} value={p.product_name}>{p.product_name}</option>)}
                </select>
              </div>
              <div><label className="block font-bold text-gray-500 mb-1">As Of Date Cutoff:</label><input type="date" value={criteria.asOfDate} onChange={(e) => handleInputChange('asOfDate', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark outline-none" /></div>
            </>
          )}

          {activeTab === 1 && (
            <>
              <div><label className="block font-bold text-gray-500 mb-1">Date Bracket From:</label><input type="date" value={criteria.dateFrom} onChange={(e) => handleInputChange('dateFrom', e.target.value)} className="w-full border border-stroke rounded p-2 bg-transparent font-semibold text-black dark:text-white text-xs outline-none dark:bg-boxdark" /></div>
              <div><label className="block font-bold text-gray-500 mb-1">Date Bracket To:</label><input type="date" value={criteria.dateTo} onChange={(e) => handleInputChange('dateTo', e.target.value)} className="w-full border border-stroke rounded p-2 bg-transparent font-semibold text-black dark:text-white text-xs outline-none dark:bg-boxdark" /></div>
            </>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-stroke dark:border-strokedark flex justify-end">
          <button
            type="button"
            onClick={handleDispatchReportView}
            className="rounded bg-primary py-2.5 px-12 font-black text-white hover:bg-opacity-90 transition text-xs shadow-sm h-9 cursor-pointer uppercase tracking-wider"
          >
            Show Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockReport;
