import React, { useState, ReactNode, useEffect } from 'react';
import Header from '../components/Header/index';
import Sidebar from '../components/Sidebar/index';
import Footer from '../components/Footer/index';

const DefaultLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 750) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="dark:bg-boxdark-2 dark:text-bodydark bg-whiten min-h-screen">
      <div className="flex h-screen overflow-hidden relative w-full">
        
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        {/* Content Area with exact width alignment boundaries */}
        <div 
          className={`relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden duration-300 ease-in-out w-full
            ${sidebarOpen ? 'min-[751px]:pl-0 pl-0' : 'min-[751px]:pl-0 pl-0'}`}
        >
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="flex-1 bg-whiten dark:bg-boxdark-2 w-full">
            <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10 w-full">
              {children}
            </div>
          </main>

          <Footer />
        </div>

      </div>
    </div>
  );
};

export default DefaultLayout;

