import React, { useRef, useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import SidebarLinkGroup from './SidebarLinkGroup';
import { AiOutlineUp, AiOutlineDown, AiOutlineRight, AiOutlineArrowLeft } from 'react-icons/ai';
import { LuLogOut } from 'react-icons/lu';
import { useModal } from '../../Context/Modal';
import { useAuth } from '../../Context/Auth';
import LogoDark from '../../images/logo/logo-dark.png';
import LogoLight from '../../images/logo/logo-light.png';
import IconDark from '../../images/logo/icon-dark.png';
import IconLight from '../../images/logo/icon-light.png';
import { Weight } from 'lucide-react';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

const FlyoutSubMenu = ({ item, pathname, handleLinkClick, getTenantPath }: any) => {
  const [showSubFlyout, setShowSubFlyout] = useState(false);

  if (item.children) {
    return (
      <li
        className="relative"
        onMouseEnter={() => setShowSubFlyout(true)}
        onMouseLeave={() => setShowSubFlyout(false)}
      >
        <div className="flex items-center justify-between gap-2 rounded px-3 py-1.5 text-xs font-medium duration-150 hover:bg-gray-100 dark:hover:bg-meta-4 text-textColor dark:text-white cursor-pointer pr-6">
          <span className="truncate">{item.label}</span>
          <AiOutlineRight size={10} className="shrink-0 text-gray-400" />
        </div>

        {showSubFlyout && (
          <div
            className="absolute left-full top-0 -ml-1.5 z-99999 w-52 rounded border border-stroke bg-white p-2 shadow-xl dark:border-strokedark dark:bg-boxdark"
            style={{ animation: 'sidebarFlyoutFadeIn 0.15s ease-out forwards' }}
          >
            <div className="absolute top-0 -left-3 w-3 h-full bg-transparent" />
            <ul className="flex flex-col gap-1">
              {item.children.map((child: any, idx: number) => (
                <FlyoutSubMenu
                  key={idx}
                  item={child}
                  pathname={pathname}
                  handleLinkClick={handleLinkClick}
                  getTenantPath={getTenantPath}
                />
              ))}
            </ul>
          </div>
        )}
      </li>
    );
  }

  const destination = (item.path && getTenantPath ? getTenantPath(item.path) : item.path) || '#';

  return (
    <li>
      <NavLink
        to={destination}
        onClick={handleLinkClick}
        className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-medium duration-150 hover:bg-gray-100 dark:hover:bg-meta-4 ${
          pathname === destination || pathname === item.path ? 'text-primary bg-gray-50' : 'text-textColor dark:text-white'
        }`}
      >
        {item.label}
      </NavLink>
    </li>
  );
};

const SidebarItem = ({ item, pathname, depth = 0, sidebarOpen, setSidebarOpen, hideModal, openMenuId, setOpenMenuId, menuUniqueKey, getTenantPath }: any) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showFlyout, setShowFlyout] = useState(false);
  const [flyoutTop, setFlyoutTop] = useState<number>(0);

  // Helper check: Recursively verifies if any nested children match the active route URL
  const checkHasActiveChild = (routeItem: any): boolean => {
    if (!routeItem) return false;
    if (!routeItem.children || !Array.isArray(routeItem.children)) return false;

    return routeItem.children.some((child: any) => {
      const dest = child.path && getTenantPath ? getTenantPath(child.path) : child.path;
      const cleanChildPath = String(child.path || '').toLowerCase();
      const cleanDest = String(dest || '').toLowerCase();
      const cleanPathname = String(pathname || '').toLowerCase();

      if (cleanChildPath && (cleanPathname === cleanChildPath || cleanPathname === cleanDest)) return true;

      // Match sub-routes (e.g., /Add, /Edit, /Print, /customer-details) of this child
      const baseChild = cleanChildPath.replace(/\/(list|customer-details|add)$/i, '');
      if (baseChild && baseChild.length > 2 && cleanPathname.includes(baseChild)) {
        return true;
      }

      if (child.children) return checkHasActiveChild(child);
      return false;
    });
  };


  const itemDestination = item?.path && getTenantPath ? getTenantPath(item.path) : (item?.path || '');
  const isChildActive = checkHasActiveChild(item) || Boolean(item?.path && (pathname === item.path || pathname === itemDestination));



  // Local toggle state initializes accurately based on the active path to support hard refreshes
  const [open, setOpen] = useState(isChildActive);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // FIXED: Sync active route ONLY when pathname changes, breaking the infinite looping crash
  useEffect(() => {
    if (isChildActive) {
      setOpen(true);
      if (depth === 0) setOpenMenuId(menuUniqueKey);
    }
  }, [pathname, isChildActive, depth, menuUniqueKey, setOpenMenuId]);

  // FIXED: Closes other parent groups if a completely different parent node section is selected
  useEffect(() => {
    if (depth === 0 && openMenuId !== menuUniqueKey && !isChildActive) {
      setOpen(false);
    }
  }, [openMenuId, menuUniqueKey, depth, isChildActive]);

  const isMobile = windowWidth <= 750;
  const shouldShowLabels = sidebarOpen || isMobile;

  const handleLinkClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
    hideModal();
    setShowFlyout(false);
  };

  const handleMouseEnter = () => {
    if (!sidebarOpen && itemRef.current && !isMobile) {
      const rect = itemRef.current.getBoundingClientRect();
      setFlyoutTop(rect.top);
      setShowFlyout(true);
    }
  };

  const checkIsItemLinkHighlighted = () => {
    if (pathname === item.path) return true;

    if (item.path && item.path.includes('/')) {
      const segments = item.path.split('/');
      if (segments.length >= 3) {
        const baseFolder = segments[2].toLowerCase();
        return pathname.toLowerCase().includes(`/${baseFolder}/`);
      }
    }
    return false;
  };

  const isHighlighted = checkIsItemLinkHighlighted();

  if (item.children) {
    return (
      <div
        ref={itemRef}
        className="w-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => !sidebarOpen && !isMobile && setShowFlyout(false)}
      >
        <SidebarLinkGroup activeCondition={isChildActive}>
          {(handleClick, isGroupOpen) => (
            <>
              <NavLink
                to="#"
                className={`group relative flex items-center rounded-sm py-2.5 font-medium duration-300 ease-in-out hover:bg-gray-100 dark:hover:bg-meta-4 ${isChildActive && shouldShowLabels ? 'text-blue-800 dark:text-primary bg-gray-50 dark:bg-transparent' : 'text-textColor dark:text-white'
                  } ${shouldShowLabels ? 'px-4 justify-start' : 'justify-center mx-auto w-10 h-10 px-0'}`}
                style={{ paddingLeft: shouldShowLabels ? `${(depth + 1) * 1}rem` : undefined }}
                onClick={(e) => {
                  e.preventDefault();

                  // Gives back full, immediate manual toggle control to the user's mouse clicks!
                  const nextState = !open;
                  setOpen(nextState);
                  if (nextState && depth === 0) {
                    setOpenMenuId(menuUniqueKey);
                  } else if (!nextState && depth === 0 && openMenuId === menuUniqueKey) {
                    setOpenMenuId(null);
                  }

                  handleClick();
                }}
              >
                {item.icon && <item.icon className="text-xl shrink-0" />}
                {shouldShowLabels && (
                  <>
                    <span className="text-xs font-semibold uppercase tracking-wide ml-2 whitespace-nowrap overflow-hidden text-ellipsis flex flex-col gap-1">
                      {item.label}
                    </span>
                    <span className="ml-auto">
                      {open ? <AiOutlineUp size={12} /> : <AiOutlineDown size={12} />}
                    </span>
                  </>
                )}
              </NavLink>

              {/* SMOOTH ANIMATION COLLAPSE DRAWER */}
              {shouldShowLabels && (
                <div
                  className="transition-all duration-300 ease-in-out overflow-hidden transform"
                  style={{
                    maxHeight: open ? '1000px' : '0px',
                    opacity: open ? '100' : '0',
                    marginTop: open ? '4px' : '0px',
                    marginBottom: open ? '4px' : '0px',
                    pointerEvents: open ? 'auto' : 'none'
                  }}
                >
                  <ul className="flex flex-col gap-1">
                    {item.children.map((child: any, idx: number) => (
                      <SidebarItem
                        key={idx}
                        item={child}
                        pathname={pathname}
                        depth={depth + 1}
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                        hideModal={hideModal}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                        menuUniqueKey={`${menuUniqueKey}-${idx}`}
                        getTenantPath={getTenantPath}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </SidebarLinkGroup>

        {!sidebarOpen && showFlyout && !isMobile && (
          <div
            className="fixed left-[56px] z-99999 w-52 rounded border border-stroke bg-white p-2 shadow-xl dark:border-strokedark dark:bg-boxdark"
            style={{
              top: `${flyoutTop}px`,
              animation: 'sidebarFlyoutFadeIn 0.18s ease-out forwards'
            }}
          >
            <style>{`
              @keyframes sidebarFlyoutFadeIn {
                from { opacity: 0; transform: translateX(-6px); }
                to { opacity: 1; transform: translateX(0); }
              }
            `}</style>
            <div className="px-3 py-1 mb-1 border-b border-stroke dark:border-strokedark font-bold text-[10px] text-primary uppercase tracking-wider text-left">
              {item.label}
            </div>
            <ul className="flex flex-col gap-1">
              {item.children.map((child: any, idx: number) => (
                <FlyoutSubMenu key={idx} item={child} pathname={pathname} handleLinkClick={handleLinkClick} getTenantPath={getTenantPath} />
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const singleDestination = (item.path && getTenantPath ? getTenantPath(item.path) : item.path) || '#';

  return (
    <li onClick={handleLinkClick} className="w-full" title={!shouldShowLabels ? item.label : undefined}>
      <NavLink
        to={singleDestination}
        className={`group relative flex items-center rounded-sm py-2.5 font-medium duration-300 ease-in-out hover:bg-[#E0E5F2] dark:text-white dark:hover:bg-meta-4 ${
          (item.path && (pathname === singleDestination || pathname === item.path)) ? 'text-blue-800 dark:text-primary bg-[#E0E5F2]/40 font-bold' : 'text-textColor'
        } ${shouldShowLabels ? 'px-4 justify-start' : 'justify-center mx-auto w-10 h-10 px-0'}`}
        style={{ paddingLeft: shouldShowLabels ? `${(depth + 1) * 1.2}rem` : undefined }}
      >
        {item.icon && <item.icon className="text-xl shrink-0" />}
        {shouldShowLabels && <span className="text-sm ml-2 whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>}
      </NavLink>
    </li>
  );
};

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const { getRoleBasedRoutes, logout, tenantId } = useAuth();
  const roleRoutes = getRoleBasedRoutes();
  const location = useLocation();
  const { hideModal } = useModal();
  const { pathname } = location;
  const sidebar = useRef<any>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const rawTenant = tenantId || (pathname.split('/')[1] || '');
  const cleanSlug = rawTenant.replace(/^tenant=/, '').replace(/^tenant-/, '').toLowerCase().trim();
  const cleanPrefix = cleanSlug && !['auth', 'dev', 'assets', 'api'].includes(cleanSlug) ? `/${cleanSlug}` : '';

  const getTenantPath = (path?: string) => {
    if (!path || typeof path !== 'string') return '';
    if (!cleanPrefix) return path;
    if (path === '/') return cleanPrefix;
    const cleanSub = path.startsWith('/') ? path : `/${path}`;
    return `${cleanPrefix}${cleanSub}`;
  };




  // Master tracking ID to determine which global branch header is clicked open
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 750;

  return (
    <>
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-9999 backdrop-blur-xs transition-opacity duration-300" onClick={() => setSidebarOpen(false)} />
      )}

      <aside ref={sidebar} className={`fixed left-0 top-0 z-99999 flex h-screen flex-col bg-white duration-300 ease-in-out dark:bg-boxdark shadow-2xl ${isMobile ? 'block' : 'min-[751px]:sticky min-[751px]:top-0'} ${sidebarOpen ? 'w-72.5 translate-x-0 border-r border-stroke dark:border-strokedark visible' : 'w-0 -translate-x-full min-[751px]:w-18 min-[751px]:translate-x-0 min-[751px]:border-r min-[751px]:border-stroke min-[751px]:dark:border-strokedark max-[750px]:invisible'}`} >

        <div className={`flex items-center justify-between gap-2 py-6 border-b border-stroke dark:border-strokedark min-h-[76px] duration-300 ${sidebarOpen ? 'px-6' : 'px-0 min-[751px]:px-2 justify-center'}`} >
          {(sidebarOpen || isMobile) ? (
            <div className="flex items-center justify-between w-full">
              <NavLink className="flex items-center gap-1" to="/">
                <img src={IconDark} alt="NHT Icon" className="hidden dark:block h-8 w-auto object-contain shrink-0" />
                <img src={IconLight} alt="NHT Icon" className="block dark:hidden h-8 w-auto object-contain shrink-0" />
                <p className="text-primary dark:text-white truncate block text-left tracking-tight leading-tight margin-right-4">
                  <span className="text-lg font-extrabold text-blue-600">NOOR </span>
                  <span className="text-lg font-extrabold text-black dark:text-gray-300">HORIZON</span>
                  <br />
                  <span className="text-sm text-blue-600 font-bold">TECHNOLOGIES</span> <br></br>
                  <span className="text-xs text-blue-600 font-bold">ERP</span>
                </p>
              </NavLink>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSidebarOpen(false);
                }}
                className="p-2 hover:bg-gray-50 dark:hover:bg-meta-4/50 rounded-full text-gray-800 dark:text-gray-100 transition-colors"
                title="Close Sidebar"
              >
                <AiOutlineArrowLeft size={20} className="stroke-current stroke-[40px]" />
              </button>
            </div>
          ) : (
            <div
              className="w-full flex justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen(true);
              }}
              title="Open Sidebar"
            >
              <img src={IconDark} alt="NAM Icon" className="hidden dark:block h-7 w-auto object-contain mx-auto" />
              <img src={IconLight} alt="NAM Icon" className="block dark:hidden h-7 w-auto object-contain mx-auto" />
            </div>
          )}
        </div>

        <div className="no-scrollbar flex flex-col overflow-y-auto overflow-x-hidden flex-1">
          <nav className={`py-4 duration-300 ${sidebarOpen ? 'px-2' : 'px-0 min-[751px]:px-2'}`}>
            <ul className="mb-6 flex flex-col gap-1.5 w-full">
              {roleRoutes
                .filter((route: any) => !route.hideFromSidebar)
                .map((route: any, index: number) => (
                  <SidebarItem
                    key={index}
                    item={route}
                    pathname={pathname}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    hideModal={hideModal}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    menuUniqueKey={`root-${index}`}
                    getTenantPath={getTenantPath}
                  />

                ))
              }
              <li className={`group relative flex items-center rounded-sm py-2.5 font-medium text-textColor duration-300 ease-in-out hover:bg-meta-2 dark:hover:bg-meta-4 dark:text-white cursor-pointer mt-4 border-t border-stroke pt-4 ${sidebarOpen ? 'justify-start px-4' : 'justify-center mx-auto w-10 h-10 px-0'}`} onClick={() => logout()} title={!sidebarOpen ? 'LogOut' : undefined} >
                <LuLogOut className="text-xl shrink-0" />
                {(sidebarOpen || isMobile) && <span className="ml-2">LogOut</span>}
              </li>
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
