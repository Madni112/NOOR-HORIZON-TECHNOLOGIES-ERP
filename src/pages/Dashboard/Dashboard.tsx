import React, { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useNavigate } from 'react-router-dom';
import { fetchFinancialMetrics, FinancialSummary } from '../../service/financialCalculations';
import Spinner from '../../ui/Spinner';
import {
  MdShoppingCart,
  MdLocalMall,
  MdAddBox,
  MdCompareArrows,
  MdAssessment,
  MdAccountBalanceWallet,
  MdAccountBalance,
  MdTrendingUp,
  MdArrowUpward,
  MdArrowDownward,
  MdReceiptLong
} from 'react-icons/md';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      const data = await fetchFinancialMetrics();
      setMetrics(data);
      setLoading(false);
    };
    loadDashboard();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // --- ApexCharts Configurations ---
  // 1. Sales vs Purchases Trend Chart
  const salesVsPurchasesOptions: any = {
    chart: {
      type: 'area',
      height: 310,
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    colors: ['#3C50E0', '#10B981'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      categories: metrics.monthlySalesTrend.map((m) => m.month),
      labels: { style: { colors: '#64748B', fontSize: '11px' } }
    },
    yaxis: {
      labels: {
        formatter: (val: number) => `Rs. ${(val / 1000).toFixed(0)}k`,
        style: { colors: '#64748B', fontSize: '11px' }
      }
    },
    tooltip: {
      y: { formatter: (val: number) => `Rs. ${val.toLocaleString()}` }
    },
    legend: { position: 'top', horizontalAlign: 'right' }
  };

  const salesVsPurchasesSeries = [
    { name: 'Gross Sales', data: metrics.monthlySalesTrend.map((m) => m.sales) },
    { name: 'Procurement Purchases', data: metrics.monthlySalesTrend.map((m) => m.purchases) }
  ];

  // 2. Cash Flow Chart (Inflow vs Outflow)
  const cashFlowOptions: any = {
    chart: { type: 'bar', height: 310, toolbar: { show: false } },
    colors: ['#10B981', '#FF5733'],
    plotOptions: { bar: { columnWidth: '40%', borderRadius: 4 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: metrics.cashFlowTrend.map((m) => m.month),
      labels: { style: { colors: '#64748B', fontSize: '11px' } }
    },
    yaxis: {
      labels: {
        formatter: (val: number) => `Rs. ${(val / 1000).toFixed(0)}k`,
        style: { colors: '#64748B', fontSize: '11px' }
      }
    },
    tooltip: { y: { formatter: (val: number) => `Rs. ${val.toLocaleString()}` } }
  };

  const cashFlowSeries = [
    { name: 'Cash Received (Inflow)', data: metrics.cashFlowTrend.map((m) => m.inflow) },
    { name: 'Cash Paid (Outflow)', data: metrics.cashFlowTrend.map((m) => m.outflow) }
  ];

  // 3. Bank Balance Distribution Donut Chart
  const bankDonutOptions: any = {
    chart: { type: 'donut' },
    colors: ['#3C50E0', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'],
    labels: metrics.bankAccounts.length > 0 ? metrics.bankAccounts.map((b) => b.accountTitle) : ['Default Bank'],
    legend: { position: 'bottom' },
    tooltip: { y: { formatter: (val: number) => `Rs. ${val.toLocaleString()}` } }
  };

  const bankDonutSeries = metrics.bankAccounts.length > 0
    ? metrics.bankAccounts.map((b) => Math.max(0, b.netBalance))
    : [1];

  return (
    <div className="mx-auto max-w-7xl flex flex-col gap-6 text-black dark:text-white text-xs">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-boxdark p-4 rounded-sm border border-stroke dark:border-strokedark shadow-default">
        <div>
          <h2 className="text-xl font-black text-black dark:text-white uppercase tracking-wider flex items-center gap-2">
            Softhub-PK ERP Software
          </h2>
          <p className="text-gray-400 mt-0.5 text-xs font-medium">
            Live Corporate Financial Dashboard & Real-Time Calculated App Ledgers
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-gray-100 dark:bg-meta-4 px-3 py-1.5 rounded font-bold text-gray-600 dark:text-gray-300">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <button
            onClick={() => navigate('/Reports/Balance-Sheet')}
            className="bg-primary text-white py-1.5 px-4 rounded font-bold hover:bg-opacity-90 transition shadow-sm cursor-pointer"
          >
            Balance Sheet Statement →
          </button>
        </div>
      </div>

      {/* --- TOP ACTION TILES GRID (Matching Reference Interface) --- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        {/* ADD SALE */}
        <div
          onClick={() => navigate('/sales/invoice/add')}
          className="bg-[#5B63D3] text-white p-4 rounded shadow hover:opacity-95 transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <span className="block font-extrabold uppercase tracking-wider text-[11px]">ADD SALE</span>
            <span className="text-[10px] text-white/80">New Customer Bill</span>
          </div>
          <MdShoppingCart size={32} className="text-white/80" />
        </div>

        {/* ADD PURCHASE */}
        <div
          onClick={() => navigate('/Purchase/Purchases/Add')}
          className="bg-[#E74C3C] text-white p-4 rounded shadow hover:opacity-95 transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <span className="block font-extrabold uppercase tracking-wider text-[11px]">ADD PURCHASE</span>
            <span className="text-[10px] text-white/80">Stock Procurement</span>
          </div>
          <MdLocalMall size={32} className="text-white/80" />
        </div>

        {/* ADD PRODUCT */}
        <div
          onClick={() => navigate('/Administration/Products/Add')}
          className="bg-[#F39C12] text-white p-4 rounded shadow hover:opacity-95 transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <span className="block font-extrabold uppercase tracking-wider text-[11px]">ADD PRODUCT</span>
            <span className="text-[10px] text-white/80">Catalog Item</span>
          </div>
          <MdAddBox size={32} className="text-white/80" />
        </div>

        {/* STOCK TRANSFER */}
        <div
          onClick={() => navigate('/Administration/StockTransfer/Add')}
          className="bg-[#0088CC] text-white p-4 rounded shadow hover:opacity-95 transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <span className="block font-extrabold uppercase tracking-wider text-[11px]">STOCK TRANSFER</span>
            <span className="text-[10px] text-white/80">Bin to Warehouse</span>
          </div>
          <MdCompareArrows size={32} className="text-white/80" />
        </div>

        {/* STOCK REPORT */}
        <div
          onClick={() => navigate('/Reports/Stock-Report')}
          className="bg-[#2ECC71] text-white p-4 rounded shadow hover:opacity-95 transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <span className="block font-extrabold uppercase tracking-wider text-[11px]">STOCK REPORT</span>
            <span className="text-[10px] text-white/80">Inventory Audit</span>
          </div>
          <MdAssessment size={32} className="text-white/80" />
        </div>

        {/* TODAY'S SALE */}
        <div className="bg-[#17A2B8] text-white p-4 rounded shadow flex items-center justify-between">
          <div>
            <span className="block font-extrabold uppercase tracking-wider text-[11px]">TODAY'S SALE</span>
            <b className="text-lg font-black font-mono">Rs. {metrics.todaysSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
          </div>
          <MdTrendingUp size={32} className="text-white/80" />
        </div>

        {/* THIS MONTH SALES */}
        <div className="bg-[#6F42C1] text-white p-4 rounded shadow flex items-center justify-between">
          <div>
            <span className="block font-extrabold uppercase tracking-wider text-[11px]">THIS MONTH SALES</span>
            <b className="text-lg font-black font-mono">Rs. {metrics.thisMonthSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
          </div>
          <MdArrowUpward size={32} className="text-white/80" />
        </div>

        {/* THIS MONTH PURCHASES */}
        <div className="bg-[#00C0EF] text-white p-4 rounded shadow flex items-center justify-between">
          <div>
            <span className="block font-extrabold uppercase tracking-wider text-[11px]">THIS MONTH PURCHASES</span>
            <b className="text-lg font-black font-mono">Rs. {metrics.thisMonthPurchases.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
          </div>
          <MdArrowDownward size={32} className="text-white/80" />
        </div>
      </div>

      {/* --- APP CALCULATED CASH & BANK BALANCES METRICS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* APP CALCULATED CASH BALANCE */}
        <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark flex items-center justify-between">
          <div>
            <span className="text-gray-400 font-bold block uppercase text-[10px]">Calculated Cash Balance</span>
            <b className="text-emerald-600 text-lg font-black font-mono">Rs. {metrics.cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
            <span className="block text-[10px] text-gray-400 font-sans mt-0.5">Counter Cash-Box Liquidity</span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded">
            <MdAccountBalanceWallet size={26} />
          </div>
        </div>

        {/* APP CALCULATED MONTHLY BANK BALANCE */}
        <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark flex items-center justify-between">
          <div>
            <span className="text-gray-400 font-bold block uppercase text-[10px]">Monthly Bank Balance</span>
            <b className="text-primary text-lg font-black font-mono">Rs. {metrics.totalBankBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
            <span className="block text-[10px] text-gray-400 font-sans mt-0.5">{metrics.bankAccounts.length} Corporate Ledgers</span>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded">
            <MdAccountBalance size={26} />
          </div>
        </div>

        {/* ACCOUNTS RECEIVABLE */}
        <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark flex items-center justify-between">
          <div>
            <span className="text-gray-400 font-bold block uppercase text-[10px]">Customer Receivables</span>
            <b className="text-blue-600 text-lg font-black font-mono">Rs. {metrics.totalReceivables.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
            <span className="block text-[10px] text-gray-400 font-sans mt-0.5">Outstanding Credit Debt</span>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded">
            <MdReceiptLong size={26} />
          </div>
        </div>

        {/* BALANCE SHEET NET ASSET VALUE */}
        <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark flex items-center justify-between">
          <div>
            <span className="text-gray-400 font-bold block uppercase text-[10px]">Balance Sheet Assets</span>
            <b className="text-purple-600 text-lg font-black font-mono">Rs. {metrics.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
            <span className="block text-[10px] text-gray-400 font-sans mt-0.5">Total Assets Liquidity</span>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/20 text-purple-600 rounded">
            <MdAccountBalance size={26} />
          </div>
        </div>
      </div>

      {/* --- CHARTS SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Sales vs Purchases Trend */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-5">
          <div className="flex justify-between items-center mb-4 border-b border-stroke dark:border-strokedark pb-3">
            <h3 className="font-bold text-sm text-black dark:text-white uppercase tracking-wider">
              Sales Volume vs Procurement Trend
            </h3>
            <span className="text-xs text-gray-400 font-mono">Monthly Comparative</span>
          </div>
          <ReactApexChart options={salesVsPurchasesOptions} series={salesVsPurchasesSeries} type="area" height={310} />
        </div>

        {/* Chart 2: Cash Flow Inflow vs Outflow */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-5">
          <div className="flex justify-between items-center mb-4 border-b border-stroke dark:border-strokedark pb-3">
            <h3 className="font-bold text-sm text-black dark:text-white uppercase tracking-wider">
              Cash Drawer Cash Flow Dynamics
            </h3>
            <span className="text-xs text-gray-400 font-mono">Inflows vs Payments</span>
          </div>
          <ReactApexChart options={cashFlowOptions} series={cashFlowSeries} type="bar" height={310} />
        </div>
      </div>

      {/* --- BANK ACCOUNT BALANCE DISTRIBUTION & BALANCE SHEET SUMMARY GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bank Allocation Donut Chart */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-5">
          <h3 className="font-bold text-sm text-black dark:text-white uppercase tracking-wider border-b border-stroke dark:border-strokedark pb-3 mb-4">
            Bank Ledgers Balance Allocation
          </h3>
          <ReactApexChart options={bankDonutOptions} series={bankDonutSeries} type="donut" height={260} />
        </div>

        {/* Corporate Bank Ledgers List Table */}
        <div className="lg:col-span-2 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-5">
          <div className="flex justify-between items-center mb-4 border-b border-stroke dark:border-strokedark pb-3">
            <h3 className="font-bold text-sm text-black dark:text-white uppercase tracking-wider">
              Corporate Bank Account Balances (Calculated from App)
            </h3>
            <button
              onClick={() => navigate('/Reports/Account-Report')}
              className="text-primary font-bold hover:underline text-xs"
            >
              View Full Accounts Report →
            </button>
          </div>

          <div className="max-w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-meta-4 text-[10px] font-black uppercase text-black dark:text-white border-b border-stroke">
                  <th className="py-2.5 px-3">Bank Profile</th>
                  <th className="py-2.5 px-3">Account Title</th>
                  <th className="py-2.5 px-3 text-right">Opening</th>
                  <th className="py-2.5 px-3 text-right">Inflow (+)</th>
                  <th className="py-2.5 px-3 text-right">Outflow (-)</th>
                  <th className="py-2.5 px-3 text-right pr-4">Calculated Net Balance</th>
                </tr>
              </thead>
              <tbody>
                {metrics.bankAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-gray-400 italic">No bank profiles currently logged in system.</td>
                  </tr>
                ) : (
                  metrics.bankAccounts.map((b) => (
                    <tr key={b.id} className="border-b border-stroke dark:border-strokedark font-mono font-semibold hover:bg-slate-50 dark:hover:bg-meta-4/10">
                      <td className="py-2.5 px-3 font-sans font-bold text-black dark:text-white">{b.bankName}</td>
                      <td className="py-2.5 px-3 font-sans">{b.accountTitle}</td>
                      <td className="py-2.5 px-3 text-right text-gray-500">Rs. {b.openingBalance.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-success">+ Rs. {b.totalInflow.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-danger">- Rs. {b.totalOutflow.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right pr-4 font-black text-primary">Rs. {b.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-meta-4/20 font-mono font-black border-t-2 border-stroke text-black dark:text-white text-xs">
                  <td colSpan={5} className="py-3 px-3 uppercase font-sans">Total Monthly Bank Balance Across Ledgers:</td>
                  <td className="py-3 px-3 text-right pr-4 text-primary text-sm">Rs. {metrics.totalBankBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
