import React from 'react';
import IconDark from '../../images/logo/icon-dark.png';
import {
  MdSpeed,
  MdCloudQueue,
  MdQrCodeScanner,
  MdSecurity,
  MdStorage,
  MdCheckCircle,
  MdLayers,
} from 'react-icons/md';

const CompanyLanding: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-blue-600 selection:text-white">
      {/* NAVBAR (100% Clean - No Developer links) */}
      <nav className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={IconDark} alt="NHT Logo" className="h-10 w-auto" />
            <div>
              <div className="flex items-center gap-1.5 font-black text-xl tracking-tight">
                <span className="text-blue-500">NOOR HORIZON</span>
                <span className="text-white">TECHNOLOGIES</span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                Enterprise Cloud Software Solutions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold text-slate-400">
            <span>Products & Solutions</span>
            <span>Digital Invoicing</span>
            <span>Support</span>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-20 flex flex-col items-center justify-center text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Enterprise Software Solutions • FBR Digital Invoicing Ready
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight max-w-4xl">
          Empowering Pakistani Enterprises with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400">Modern Digital Intelligence</span>.
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-2xl leading-relaxed">
          Noor Horizon Technologies architects high-performance software systems — including ERP, computerized distribution accounting, and real-time fiscal gateway synchronization.
        </p>

        {/* SOLUTIONS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-8 text-left">
          
          <div className="bg-slate-900/70 p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition shadow-xl space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-2xl">
              <MdLayers />
            </div>
            <h3 className="text-base font-bold text-white">Enterprise ERP System</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complete inventory control, purchase/sales workflows, delivery challans, stock transfers, and financial balance sheets.
            </p>
          </div>

          <div className="bg-slate-900/70 p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition shadow-xl space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl">
              <MdQrCodeScanner />
            </div>
            <h3 className="text-base font-bold text-white">FBR DI-Connect Gateway</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Direct API integration with the FBR Digital Invoicing server with instant QR codes, fiscal verification, and auto-sync.
            </p>
          </div>

          <div className="bg-slate-900/70 p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition shadow-xl space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-2xl">
              <MdSpeed />
            </div>
            <h3 className="text-base font-bold text-white">Custom Business Solutions</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              High-availability POS, automated customer recovery tracking, and scalable multi-branch infrastructure.
            </p>
          </div>

        </div>

        {/* TRUST BADGES */}
        <div className="pt-10 flex flex-wrap justify-center items-center gap-8 text-slate-500 text-xs font-semibold">
          <span className="flex items-center gap-1.5"><MdCheckCircle className="text-blue-400 text-base" /> Isolated Database Security</span>
          <span className="flex items-center gap-1.5"><MdCheckCircle className="text-emerald-400 text-base" /> Dedicated Static IP Infrastructure</span>
          <span className="flex items-center gap-1.5"><MdCheckCircle className="text-indigo-400 text-base" /> 99.9% Uptime Guarantee</span>
        </div>
      </main>

      {/* FOOTER (Clean - Removed Multi-Tenant words) */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Noor Horizon Technologies. All Rights Reserved.
      </footer>
    </div>
  );
};

export default CompanyLanding;
