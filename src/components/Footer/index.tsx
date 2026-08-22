import React from 'react';
import { MdPhone, MdWhatsapp, MdBusiness, MdShield, MdCloudDone } from 'react-icons/md';
import { useAuth } from '../../Context/Auth';

const Footer: React.FC = () => {
  const { businessName } = useAuth();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="print:hidden w-full border-t border-stroke bg-white px-4 py-4 dark:border-strokedark dark:bg-boxdark md:px-6 2xl:px-10 duration-200">
      <div className="mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        
        {/* Left: Company & Tenant Branding */}
        <div className="flex flex-wrap items-center gap-2 text-center md:text-left">
          <div className="flex items-center gap-1.5 font-bold text-black dark:text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
              <MdBusiness size={14} />
            </span>
            <span className="font-extrabold tracking-wide uppercase">Noor Horizon Technologies</span>
          </div>

          {businessName && (
            <span className="hidden sm:inline-flex items-center rounded bg-gray-100 dark:bg-meta-4/40 px-2 py-0.5 font-mono text-[10px] font-bold text-gray-700 dark:text-gray-300">
              {businessName}
            </span>
          )}

          <span className="hidden lg:inline text-gray-400 dark:text-gray-600">•</span>
          <span className="hidden lg:inline text-gray-500 dark:text-gray-400">
            Noor Horizon Technologies ERP System
          </span>
        </div>

        {/* Center: System Status Indicator */}
        <div className="flex items-center gap-3 font-medium text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse"></span>
            Cloud Synced
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-gray-400">
            <MdShield size={13} className="text-primary" /> FBR Compliant
          </span>
        </div>

        {/* Right: Contact Hotline & Quick WhatsApp Actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="text-gray-400 dark:text-gray-500 font-normal">Hotline / Support:</span>
            <a
              href="tel:03128039911"
              className="flex items-center gap-1 font-extrabold text-primary hover:underline transition"
              title="Call Support Hotline"
            >
              <MdPhone size={13} />
              <span>03128039911</span>
            </a>
          </div>

          <a
            href="https://wa.me/923128039911"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded bg-[#25D366]/10 px-2 py-1 text-[11px] font-bold text-[#25D366] hover:bg-[#25D366] hover:text-white transition duration-150"
            title="Chat on WhatsApp"
          >
            <MdWhatsapp size={14} />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
        </div>

      </div>

      {/* Bottom Sub-line */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-strokedark/40 flex flex-col sm:flex-row items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
        <span>© {currentYear} Noor Horizon Technologies. All rights reserved.</span>
        <span className="font-mono">v1.3.8 • Secure Business Management Infrastructure</span>
      </div>
    </footer>
  );
};

export default Footer;
