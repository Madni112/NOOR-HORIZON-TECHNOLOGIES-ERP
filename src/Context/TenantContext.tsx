import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabaseClient';

export interface Tenant {
  id: string | number;
  name: string;
  slug: string;
}

interface TenantContextType {
  currentTenant: Tenant;
  tenants: Tenant[];
  setTenant: (tenant: Tenant) => void;
  loading: boolean;
  refreshTenants: () => Promise<void>;
}

const DEFAULT_TENANT: Tenant = {
  id: 'bashir',
  name: 'Bashir Traders',
  slug: 'bashir',
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tenants, setTenants] = useState<Tenant[]>([DEFAULT_TENANT]);
  const [currentTenant, setCurrentTenantState] = useState<Tenant>(() => {
    // 1. Check Subdomain (e.g. bashir.localhost or bashir.noorhorizontechnologies.com)
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      if (parts.length > 1 && parts[0] !== 'www' && parts[0] !== 'localhost' && parts[0] !== 'erp') {
        const slug = parts[0].toLowerCase();
        return { id: slug, name: slug.toUpperCase(), slug };
      }

      // 2. Check URL search param (e.g. ?tenant=bashir)
      const urlParams = new URLSearchParams(window.location.search);
      const urlTenant = urlParams.get('tenant');
      if (urlTenant) {
        return { id: urlTenant.toLowerCase(), name: urlTenant.toUpperCase(), slug: urlTenant.toLowerCase() };
      }

      // 3. Check LocalStorage
      const saved = localStorage.getItem('nht_active_tenant');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (_) { }
      }
    }
    return DEFAULT_TENANT;
  });

  const [loading, setLoading] = useState(false);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('companies').select('id, name');
      if (!error && data && data.length > 0) {
        const formatted: Tenant[] = data.map(c => ({
          id: String(c.id),
          name: c.name,
          slug: c.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        }));
        
        // Ensure Bashir is in the list for demonstration
        if (!formatted.some(t => t.slug === 'bashir' || t.name.toLowerCase().includes('bashir'))) {
          formatted.unshift(DEFAULT_TENANT);
        }

        setTenants(formatted);

        // If current tenant is not set, pick the first one
        if (!currentTenant || currentTenant.slug === 'default') {
          setCurrentTenantState(formatted[0]);
          localStorage.setItem('nht_active_tenant', JSON.stringify(formatted[0]));
        }
      }
    } catch (e) {
      console.warn('Tenant sync notice:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const setTenant = (tenant: Tenant) => {
    setCurrentTenantState(tenant);
    localStorage.setItem('nht_active_tenant', JSON.stringify(tenant));
    // Trigger page data reload by reloading or dispatching event
    window.dispatchEvent(new Event('tenant-changed'));
  };

  return (
    <TenantContext.Provider value={{ currentTenant, tenants, setTenant, loading, refreshTenants: fetchTenants }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
