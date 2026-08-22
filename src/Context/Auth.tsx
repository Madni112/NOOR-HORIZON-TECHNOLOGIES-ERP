import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import * as RoleRoutes from '../Navigation/Roles';
import { UserRole } from '../constant/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  role: string | null;
  tenantId: string | null;
  businessName: string | null;
  userEmail: string | null;
  currentUser: any;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  getRoleBasedRoutes: () => any[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Detects the active portal/client slug from subdomain, URL parameter, or path.
 */
export const detectPortalTenant = (): string | null => {
  if (typeof window === 'undefined') return null;

  // 1. Check Subdomain (e.g. bashir.noorhorizontechnologies.com or bashir.localhost)
  const hostname = window.location.hostname.toLowerCase();
  const parts = hostname.split('.');
  if (parts.length > 1) {
    const firstPart = parts[0];
    if (firstPart !== 'www' && firstPart !== 'erp' && firstPart !== 'api' && firstPart !== 'app' && firstPart !== 'localhost') {
      return firstPart;
    }
  }

  // 2. Check URL search param (e.g. ?tenant=bashir or ?client=bashir)
  const params = new URLSearchParams(window.location.search);
  const paramTenant = params.get('tenant') || params.get('client');
  if (paramTenant) {
    return paramTenant.toLowerCase().trim();
  }

  // 3. Check Path Prefix (e.g. /tenant=bashir or /tenant=bashir/signin or /bashir)
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  for (const part of pathParts) {
    if (part.startsWith('tenant=')) {
      return part.replace('tenant=', '').toLowerCase().trim();
    }
    if (part.startsWith('tenant-')) {
      return part.replace('tenant-', '').toLowerCase().trim();
    }
  }

  if (pathParts.length > 0) {
    const first = pathParts[0].toLowerCase();
    if (first !== 'auth' && first !== 'dev' && first !== 'dashboard' && first !== 'administration' && first !== 'sales' && first !== 'purchase' && first !== 'reports' && first !== 'registration' && first !== 'inventory') {
      return first;
    }
  }

  return null;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [role, setRole] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Initialize allowedModules immediately from local storage cache if available to prevent 1-second flicker
  const [allowedModules, setAllowedModules] = useState<string[] | null>(() => {
    const portal = detectPortalTenant();
    if (portal) {
      try {
        const cached = localStorage.getItem(`nht_modules_${portal}`);
        if (cached) return JSON.parse(cached);
      } catch (_) {}
    }
    return null;
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthState(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthState(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthState = (session: any) => {
    if (session && session.user) {
      const metadata = session.user.user_metadata || {};
      const appMetadata = session.user.app_metadata || {};

      setIsAuthenticated(true);
      setCurrentUser(session.user);
      setUserEmail(session.user.email || null);
      setRole(metadata.role || appMetadata.role || UserRole.ADMIN);
      
      // Extract client tenant ID (e.g. 'bashir', 'client2')
      const resolvedTenant = metadata.tenant_id || appMetadata.tenant_id || metadata.tenantId || null;
      setTenantId(resolvedTenant);
      setBusinessName(metadata.business_name || metadata.businessName || metadata.full_name || null);

      if (resolvedTenant) {
        // 1. Immediately read cached permissions synchronously to ensure zero flicker
        try {
          const cached = localStorage.getItem(`nht_modules_${resolvedTenant}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              setAllowedModules(parsed);
            }
          } else if (metadata.allowed_modules) {
            setAllowedModules(metadata.allowed_modules);
          }
        } catch (_) {}

        // 2. Fetch fresh allowed_modules from database in background
        supabase
          .from('tenants')
          .select('allowed_modules, name')
          .eq('slug', resolvedTenant)
          .maybeSingle()
          .then(({ data }) => {
            if (data && Array.isArray(data.allowed_modules)) {
              setAllowedModules(data.allowed_modules);
              localStorage.setItem(`nht_modules_${resolvedTenant}`, JSON.stringify(data.allowed_modules));
            } else if (metadata.allowed_modules) {
              setAllowedModules(metadata.allowed_modules);
            }
          });
      } else {
        setAllowedModules(metadata.allowed_modules || appMetadata.allowed_modules || null);
      }
    } else {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setUserEmail(null);
      setRole(null);
      setTenantId(null);
      setAllowedModules(null);
      setBusinessName(null);
    }
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Strict Cross-Tenant Portal Security Check:
    const portalTenant = detectPortalTenant();
    if (data.user) {
      const metadata = data.user.user_metadata || {};
      const appMetadata = data.user.app_metadata || {};
      const userTenant = String(metadata.tenant_id || appMetadata.tenant_id || '').toLowerCase().trim();

      // If user's registered tenant does NOT match the portal being accessed, block immediately!
      if (portalTenant && userTenant && userTenant !== portalTenant) {
        await supabase.auth.signOut();
        throw new Error('Invalid email or password for this organization portal.');
      }

      const targetTenant = portalTenant || userTenant;
      if (targetTenant) {
        // Fetch tenant permissions synchronously before navigating
        const { data: tenantRow } = await supabase
          .from('tenants')
          .select('allowed_modules')
          .eq('slug', targetTenant)
          .maybeSingle();

        const modules = tenantRow?.allowed_modules || metadata.allowed_modules || appMetadata.allowed_modules || [];
        localStorage.setItem(`nht_modules_${targetTenant}`, JSON.stringify(modules));
        setAllowedModules(modules);

        navigate(`/${targetTenant}`);
        return;
      }
    }

    navigate('/Administration/Products/List');
  };

  const logout = async () => {
    const lastTenant = tenantId;
    await supabase.auth.signOut();
    if (lastTenant) {
      navigate(`/${lastTenant}/signin`);
    } else {
      navigate('/');
    }
  };

  const getRoleBasedRoutes = () => {
    let routes = RoleRoutes.adminRoutes;

    // Determine current effective modules (from state or cached per tenant)
    let currentAllowed = allowedModules;
    if (!currentAllowed && typeof window !== 'undefined') {
      const portal = detectPortalTenant() || tenantId;
      if (portal) {
        try {
          const cached = localStorage.getItem(`nht_modules_${portal}`);
          if (cached) currentAllowed = JSON.parse(cached);
        } catch (_) {}
      }
    }

    if (currentAllowed && Array.isArray(currentAllowed)) {
      const lowerAllowed = currentAllowed.map(m => String(m).toLowerCase().trim());

      routes = routes
        .map((route: any) => {
          // 1. All hidden action, print, and sub-modal routes (hideFromSidebar: true) are always preserved for React Router
          if (route.hideFromSidebar) {
            return route;
          }

          const label = String(route.label || '').toLowerCase().trim();
          const routePath = String(route.path || '').toLowerCase().trim();

          // 2. Standalone pages (like Dashboard)
          if (routePath === '/' || label === 'dashboard') {
            const isAllowed = lowerAllowed.includes('dashboard') || lowerAllowed.includes('/');
            return isAllowed ? route : null;
          }

          // 3. Parent Categories with Children (Administration, Registration, Sales, Purchase, Reports)
          if (route.children && Array.isArray(route.children)) {
            // Strictly filter sub-pages by exact permitted child path or label
            const filteredChildren = route.children.filter((child: any) => {
              if (child.hideFromSidebar) return true;
              const childPath = String(child.path || '').toLowerCase().trim();
              const childLabel = String(child.label || '').toLowerCase().trim();

              return lowerAllowed.includes(childPath) || lowerAllowed.includes(childLabel);
            });

            // If at least one sub-page is permitted, render the parent category with ONLY allowed sub-pages
            if (filteredChildren.length > 0) {
              return { ...route, children: filteredChildren };
            }
            // If zero sub-pages are permitted under this category, hide the entire category header
            return null;
          }

          // Direct top-level action routes
          if (routePath) {
            return lowerAllowed.includes(routePath) ? route : null;
          }

          return route;
        })
        .filter(Boolean);
    } else if (tenantId || detectPortalTenant()) {
      // If client tenant is known but permissions are still loading, default to minimal view + action routes
      return routes.filter((r: any) => r.hideFromSidebar || r.path === '/' || String(r.label).toLowerCase() === 'dashboard');
    }


    return routes;
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      role,
      tenantId,
      businessName,
      userEmail,
      currentUser,
      loading,
      login,
      logout,
      getRoleBasedRoutes,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
