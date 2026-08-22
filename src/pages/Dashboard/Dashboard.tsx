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
import StatCard from '../../ui/StatCard';
import ActionCard from '../../ui/ActionCard';

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
  const hasMonthlyTrend = Boolean(metrics.monthlySalesTrend && metrics.monthlySalesTrend.length > 0);
  const monthlyCategories = hasMonthlyTrend ? metrics.monthlySalesTrend.map((m) => m.month) : ['Jan', 'Feb', 'Mar'];
  const grossSalesData = hasMonthlyTrend ? metrics.monthlySalesTrend.map((m) => m.sales) : [0, 0, 0];
  const procurementData = hasMonthlyTrend ? metrics.monthlySalesTrend.map((m) => m.purchases) : [0, 0, 0];

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
      categories: monthlyCategories,
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
    { name: 'Gross Sales', data: grossSalesData },
    { name: 'Procurement Purchases', data: procurementData }
  ];

  // 2. Cash Flow Chart (Inflow vs Outflow)
  const hasCashFlow = Boolean(metrics.cashFlowTrend && metrics.cashFlowTrend.length > 0);
  const cashCategories = hasCashFlow ? metrics.cashFlowTrend.map((m) => m.month) : ['Jan', 'Feb', 'Mar'];
  const cashInflowData = hasCashFlow ? metrics.cashFlowTrend.map((m) => m.inflow) : [0, 0, 0];
  const cashOutflowData = hasCashFlow ? metrics.cashFlowTrend.map((m) => m.outflow) : [0, 0, 0];

  const cashFlowOptions: any = {
    chart: { type: 'bar', height: 310, toolbar: { show: false } },
    colors: ['#10B981', '#FF5733'],
    plotOptions: { bar: { columnWidth: '40%', borderRadius: 4 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: cashCategories,
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
    { name: 'Cash Received (Inflow)', data: cashInflowData },
    { name: 'Cash Paid (Outflow)', data: cashOutflowData }
  ];

  // 3. Bank Balance Distribution Donut Chart
  const bankDonutOptions: any = {
    chart: { type: 'donut' },
    colors: ['#3C50E0', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'],
    labels: metrics.bankAccounts && metrics.bankAccounts.length > 0 ? metrics.bankAccounts.map((b) => b.accountTitle) : ['Default Bank'],
    legend: { position: 'bottom' },
    tooltip: { y: { formatter: (val: number) => `Rs. ${val.toLocaleString()}` } }
  };

  const bankDonutSeries = metrics.bankAccounts && metrics.bankAccounts.length > 0
    ? metrics.bankAccounts.map((b) => Math.max(0, b.netBalance))
    : [1];

  return (

    <div className="mx-auto max-w-7xl flex flex-col gap-6 text-black dark:text-white text-xs">
      {/* Top Header Actions */}
      <div className="flex justify-end items-center gap-3 font-mono text-xs">
        <div className="bg-white dark:bg-boxdark border border-stroke dark:border-strokedark px-3 py-1.5 rounded font-bold text-gray-600 dark:text-gray-300 shadow-default">
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <button
          onClick={() => navigate('/Reports/Balance-Sheet')}
          className="bg-primary text-white py-1.5 px-4 rounded font-bold hover:bg-opacity-90 transition shadow-sm cursor-pointer"
        >
          Balance Sheet Statement →
        </button>
      </div>      {/* --- TOP ACTION TILES GRID (Matching Reference Interface) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-6">
        <ActionCard title="Add Sale" subtitle="New Customer Bill" Icon={MdShoppingCart} bgGradient="bg-gradient-to-br from-indigo-500 to-indigo-700" onClick={() => navigate('/sales/invoice/add')} />
        <ActionCard title="Add Purchase" subtitle="Stock Procurement" Icon={MdLocalMall} bgGradient="bg-gradient-to-br from-rose-500 to-rose-600" onClick={() => navigate('/Purchase/Purchases/Add')} />
        <ActionCard title="Add Product" subtitle="Catalog Item" Icon={MdAddBox} bgGradient="bg-gradient-to-br from-amber-500 to-amber-600" onClick={() => navigate('/Administration/Products/Add')} />
        <ActionCard title="Stock Transfer" subtitle="Bin to Warehouse" Icon={MdCompareArrows} bgGradient="bg-gradient-to-br from-blue-500 to-blue-600" onClick={() => navigate('/Administration/StockTransfer/Add')} />
        <ActionCard title="Stock Report" subtitle="Inventory Audit" Icon={MdAssessment} bgGradient="bg-gradient-to-br from-emerald-500 to-emerald-600" onClick={() => navigate('/Reports/Stock-Report')} />
        <ActionCard title="Today's Sale" subtitle={`Rs. ${metrics.todaysSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} Icon={MdTrendingUp} bgGradient="bg-gradient-to-br from-cyan-500 to-cyan-600" onClick={() => { }} />
        <ActionCard title="This Month Sales" subtitle={`Rs. ${metrics.thisMonthSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} Icon={MdArrowUpward} bgGradient="bg-gradient-to-br from-purple-500 to-purple-600" onClick={() => { }} />
        <ActionCard title="This Month Purchases" subtitle={`Rs. ${metrics.thisMonthPurchases.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} Icon={MdArrowDownward} bgGradient="bg-gradient-to-br from-teal-500 to-teal-600" onClick={() => { }} />
      </div>

      {/* --- APP CALCULATED CASH & BANK BALANCES METRICS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Calculated Cash Balance"
          value={metrics.cashBalance}
          Icon={MdAccountBalanceWallet}
          bgColor="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        <StatCard
          title="Monthly Bank Balance"
          value={metrics.totalBankBalance}
          Icon={MdAccountBalance}
          bgColor="bg-gradient-to-br from-primary-500 to-indigo-600"
        />
        <StatCard
          title="Customer Receivables"
          value={metrics.totalReceivables}
          Icon={MdReceiptLong}
          bgColor="bg-gradient-to-br from-blue-500 to-indigo-600"
        />
        <StatCard
          title="Total Assets"
          value={metrics.totalAssets}
          Icon={MdAssessment}
          bgColor="bg-gradient-to-br from-purple-500 to-pink-600"
        />
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
