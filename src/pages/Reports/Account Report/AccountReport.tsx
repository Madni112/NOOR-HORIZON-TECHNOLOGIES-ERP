import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';

const AccountReport = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<number>(1);

  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [customerRecoveries, setCustomerRecoveries] = useState<any[]>([]);

  // Core Chart of Accounts Cache Array Lists
  const [chartOfAccounts, setChartOfAccounts] = useState<any[]>([]);
  const [uniqueCategoryCodes, setUniqueCategoryCodes] = useState<any[]>([]);
  const [uniqueControlCodes, setUniqueControlCodes] = useState<any[]>([]);

  const getPastWeekDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  };

  const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [filters, setFilters] = useState({
    categoryCode: 'All',
    controlCode: 'All',
    chartOfAccountCode: 'All',
    customer: 'All',
    vendor: 'All',
    company: 'All',
    voucherType: 'All',
    saleType: 'Sale',
    salesman: 'All',
    dateFrom: getPastWeekDateString(),
    dateTo: getTodayDateString()
  });

  useEffect(() => {
    const fetchAccountCriteriaLookups = async () => {
      try {
        setLoading(true);
        const { data: cust } = await supabase.from('customers').select('id, customerName');
        const { data: vend } = await supabase.from('vendors').select('id, vendor_name');
        const { data: sm } = await supabase.from('salesmen').select('id, name');
        const { data: comp } = await supabase.from('companies').select('id, name');
        const { data: rec } = await supabase.from('customer_recovery_logs').select('id, customer_name');

        // ✅ SCHEMA COMPLIANT: Fetches exact database columns from chart_of_accounts definitions
        const { data: coaData } = await supabase
          .from('chart_of_accounts')
          .select('id, category_code, control_code, account_code, account_title');

        // ✅ SCHEMA COMPLIANT: Fetches exact camelCase database columns from vouchers definitions
        const { data: vch } = await supabase
          .from('vouchers')
          .select('id, voucherNo, voucherType');

        if (cust) setCustomers(cust);
        if (vend) setVendors(vend);
        if (sm) setSalesmen(sm);
        if (comp) setCompanies(comp);
        if (rec) setCustomerRecoveries(rec);

        if (coaData) {
          setChartOfAccounts(coaData);

          // Maps unique category codes dynamically on mount list arrays
          const cats = Array.from(new Set(coaData.map((item: any) => item.category_code).filter(Boolean)));
          setUniqueCategoryCodes(cats);

          // Maps unique control codes dynamically on mount list arrays
          const ctrls = Array.from(new Set(coaData.map((item: any) => item.control_code).filter(Boolean)));
          setUniqueControlCodes(ctrls);
        }

        if (vch) {
          const normalizedVouchers = vch.map((v: any) => ({
            id: v.id,
            voucher_no: v.voucherNo,
            voucher_type: v.voucherType
          }));
          setVouchers(normalizedVouchers);
        }
      } catch (err: any) {
        toast.error('Financial registry lookup interruption: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAccountCriteriaLookups();
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setFilters(prev => {
      const updated = { ...prev, [field]: value };
      // Resets sub-dropdown dependencies cascading choices back to placeholders when upper layers swap
      if (field === 'categoryCode') {
        updated.controlCode = 'All';
        updated.chartOfAccountCode = 'All';
      } else if (field === 'controlCode') {
        updated.chartOfAccountCode = 'All';
      }
      return updated;
    });
  };
  // ✅ LIVE CONTEXTUAL INTERCEPTOR POOL FOR CONTROL CODES DROPDOWN
  const getFilteredControlCodesPool = () => {
    if (filters.categoryCode === 'All') return uniqueControlCodes;
    return Array.from(new Set(
      chartOfAccounts
        .filter((item: any) => item.category_code === filters.categoryCode)
        .map((item: any) => item.control_code)
        .filter(Boolean)
    ));
  };

  // ✅ LIVE CONTEXTUAL INTERCEPTOR POOL FOR CHART OF ACCOUNT CODES DROPDOWN
  const getFilteredChartOfAccountsPool = () => {
    let pool = chartOfAccounts;
    if (filters.categoryCode !== 'All') {
      pool = pool.filter((item: any) => item.category_code === filters.categoryCode);
    }
    if (filters.controlCode !== 'All') {
      pool = pool.filter((item: any) => item.control_code === filters.controlCode);
    }
    return pool;
  };

  const handleDispatchReportView = () => {
    navigate('/Reports/Account-Report/Print', {
      state: { tab: activeTab, criteria: filters }
    });
  };

  if (loading) return <div className="flex h-48 items-center justify-center"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-7xl flex flex-col gap-6 text-black dark:text-bodydark text-xs antialiased font-sans relative">
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white uppercase tracking-wider">Corporate Account Auditing Center</h2>
        <p className="text-xs text-gray-400">Compile general ledgers, trial balance summaries, and corporate financial aging statements</p>
      </div>

      <div className="flex flex-wrap border-b border-stroke dark:border-strokedark gap-1 bg-white dark:bg-boxdark font-black tracking-wider text-[10px] uppercase text-gray-500">
        <button type="button" onClick={() => setActiveTab(1)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 1 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>General Ledger</button>
        <button type="button" onClick={() => setActiveTab(2)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 2 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>Customer Summary</button>
        <button type="button" onClick={() => setActiveTab(3)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 3 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>Vendor Summary</button>
        <button type="button" onClick={() => setActiveTab(4)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 4 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>Income Statement</button>
        <button type="button" onClick={() => setActiveTab(5)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 5 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>Chart of Accounts</button>
        <button type="button" onClick={() => setActiveTab(6)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 6 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>Vendor Outstanding</button>
        <button type="button" onClick={() => setActiveTab(7)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 7 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>Customer Recovery</button>
        <button type="button" onClick={() => setActiveTab(8)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 8 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>Voucher Report</button>
        <button type="button" onClick={() => setActiveTab(9)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 9 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>Daily Activity</button>
        <button type="button" onClick={() => setActiveTab(10)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 10 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>Salesman Statement</button>
        <button type="button" onClick={() => setActiveTab(11)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 11 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>Trial Balance</button>
        <button type="button" onClick={() => setActiveTab(12)} className={`py-2.5 px-4 transition border-b-2 cursor-pointer ${activeTab === 12 ? 'border-primary text-primary font-black bg-primary/5' : 'border-transparent text-gray-400 hover:text-black'}`}>Aging Report</button>
      </div>
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">
        <h3 className="font-bold text-sm text-black dark:text-white mb-4 uppercase tracking-wider text-primary">Report Criteria Specification</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">

          {activeTab === 1 && (
            <>
              {/* 1. Category Code Input Select Drawer Field */}
              <div>
                <label className="block font-bold text-gray-500 mb-1">Category Code:</label>
                <select value={filters.categoryCode} onChange={(e) => handleInputChange('categoryCode', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark">
                  <option value="All">All Category Codes ({uniqueCategoryCodes.length} Found)</option>
                  {uniqueCategoryCodes.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
                </select>
              </div>

              {/* 2. Control Code Input Select Drawer Field */}
              <div>
                <label className="block font-bold text-gray-500 mb-1">Control Code:</label>
                <select value={filters.controlCode} onChange={(e) => handleInputChange('controlCode', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark">
                  <option value="All">All Control Codes ({getFilteredControlCodesPool().length} Options)</option>
                  {getFilteredControlCodesPool().map((ctrl, i) => <option key={i} value={ctrl}>{ctrl}</option>)}
                </select>
              </div>

              {/* 3. Chart of Account Code Input Select Drawer Field */}
              <div>
                <label className="block font-bold text-gray-500 mb-1">Chart of Account Code:</label>
                <select value={filters.chartOfAccountCode} onChange={(e) => handleInputChange('chartOfAccountCode', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark">
                  <option value="All">All Account Titles ({getFilteredChartOfAccountsPool().length} Options)</option>
                  {getFilteredChartOfAccountsPool().map(coa => <option key={coa.id} value={coa.account_code}>{coa.account_code} - {coa.account_title}</option>)}
                </select>
              </div>
            </>
          )}

          {activeTab === 2 && (
            <div><label className="block font-bold text-gray-500 mb-1">Select Customer Title:</label><select value={filters.customer} onChange={(e) => handleInputChange('customer', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Customer Accounts</option>{customers.map(c => <option key={c.id} value={c.customerName}>{c.customerName}</option>)}</select></div>
          )}

          {activeTab === 3 && (
            <div><label className="block font-bold text-gray-500 mb-1">Select Procurement Vendor:</label><select value={filters.vendor} onChange={(e) => handleInputChange('vendor', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Vendor Accounts</option>{vendors.map(v => <option key={v.id} value={v.vendor_name}>{v.vendor_name}</option>)}</select></div>
          )}

          {activeTab === 4 && (
            <div className="md:col-span-4 text-gray-400 italic font-mono">Generates dynamic operational statement parameters sheets on print compilation dispatch tracking pools.</div>
          )}

          {activeTab === 5 && (
            <div>
              <label className="block font-bold text-gray-500 mb-1">Category Code Selection:</label>
              <select value={filters.categoryCode} onChange={(e) => handleInputChange('categoryCode', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark">
                <option value="All">All Category Codes</option>
                {uniqueCategoryCodes.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
              </select>
            </div>
          )}

          {activeTab === 6 && (
            <div><label className="block font-bold text-gray-500 mb-1">Select Procurement Vendor:</label><select value={filters.vendor} onChange={(e) => handleInputChange('vendor', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Vendor Accounts</option>{vendors.map(v => <option key={v.id} value={v.vendor_name}>{v.vendor_name}</option>)}</select></div>
          )}

          {activeTab === 7 && (
            <>
              <div><label className="block font-bold text-gray-500 mb-1">Select Customer Title:</label><select value={filters.customer} onChange={(e) => handleInputChange('customer', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Customer Accounts</option>{customers.map(c => <option key={c.id} value={c.customerName}>{c.customerName}</option>)}</select></div>
              <div><label className="block font-bold text-gray-500 mb-1">Linked Principal Company:</label><select value={filters.company} onChange={(e) => handleInputChange('company', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Companies</option>{companies.map(comp => <option key={comp.id} value={comp.name}>{comp.name}</option>)}</select></div>
            </>
          )}
          {activeTab === 8 && (
            <div><label className="block font-bold text-gray-500 mb-1">Select Voucher Classification:</label><select value={filters.voucherType} onChange={(e) => handleInputChange('voucherType', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Vouchers</option><option value="Cash Receipt">Cash Receipt Voucher (CRV)</option><option value="Cash Payment">Cash Payment Voucher (CPV)</option><option value="Bank Receipt">Bank Receipt Voucher (BRV)</option><option value="Bank Payment">Bank Payment Voucher (BPV)</option></select></div>
          )}

          {activeTab === 9 && (
            <div><label className="block font-bold text-gray-500 mb-1">Allocation Activity Mode:</label><select value={filters.saleType} onChange={(e) => handleInputChange('saleType', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="Sale">Commercial Invoice Sales</option><option value="Purchase">Procurement Supplier Purchase</option><option value="Banks">Corporate Bank Registers</option><option value="Cashbook">Counter Cash Box Ledger</option></select></div>
          )}

          {activeTab === 10 && (
            <div><label className="block font-bold text-gray-500 mb-1">Linked Salesman Agent:</label><select value={filters.salesman} onChange={(e) => handleInputChange('salesman', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Salesmen</option>{salesmen.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
          )}

          {activeTab === 11 && (
            <div>
              <label className="block font-bold text-gray-500 mb-1">Category Code Selection:</label>
              <select value={filters.categoryCode} onChange={(e) => handleInputChange('categoryCode', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark">
                <option value="All">All Category Codes</option>
                {uniqueCategoryCodes.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
              </select>
            </div>
          )}

          {activeTab === 12 && (
            <div><label className="block font-bold text-gray-500 mb-1">Select Customer Title:</label><select value={filters.customer} onChange={(e) => handleInputChange('customer', e.target.value)} className="w-full border rounded p-2 bg-transparent font-semibold text-xs text-black dark:text-white dark:bg-boxdark"><option value="All">All Customer Accounts</option>{customers.map(c => <option key={c.id} value={c.customerName}>{c.customerName}</option>)}</select></div>
          )}

          {activeTab !== 5 && activeTab !== 11 && activeTab !== 12 && (
            <>
              <div><label className="block font-bold text-gray-500 mb-1">Date Bracket From:</label><input type="date" value={filters.dateFrom} onChange={(e) => handleInputChange('dateFrom', e.target.value)} className="w-full border border-stroke rounded p-2 bg-transparent font-semibold text-black dark:text-white text-xs outline-none dark:bg-boxdark" /></div>
              <div><label className="block font-bold text-gray-500 mb-1">Date Bracket To:</label><input type="date" value={filters.dateTo} onChange={(e) => handleInputChange('dateTo', e.target.value)} className="w-full border border-stroke rounded p-2 bg-transparent font-semibold text-black dark:text-white text-xs outline-none dark:bg-boxdark" /></div>
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

export default AccountReport;
