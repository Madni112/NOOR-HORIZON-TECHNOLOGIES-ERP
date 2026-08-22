import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../ui/Spinner';
import DarkModeSwitcher from '../../components/Header/DarkModeSwitcher';
import IconDark from '../../images/logo/icon-dark.png';
import IconLight from '../../images/logo/icon-light.png';
import {
  MdDashboard,
  MdPeople,
  MdAddBusiness,
  MdSecurity,
  MdCheckCircle,
  MdLaunch,
  MdRefresh,
  MdLock,
  MdStorage,
  MdCloudDone,
  MdVpnKey,
  MdLockOutline,
  MdPowerSettingsNew,
  MdContentCopy,
  MdEdit,
  MdCheck,
  MdKeyboardArrowDown,
  MdKeyboardArrowRight,
  MdAdminPanelSettings,
  MdLogout,
  MdLayers,
  MdBusiness,
  MdAddCircle,
  MdAccountBalance,
  MdLocationOn,
  MdVpnLock,
} from 'react-icons/md';

export interface PermissionSubNode {
  id: string;
  label: string;
}

export interface PermissionNode {
  id: string;
  label: string;
  children?: PermissionSubNode[];
}

export const PERMISSION_TREE: PermissionNode[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
  },
  {
    id: 'administration',
    label: 'Administration',
    children: [
      { id: '/Administration/Categories/List', label: 'Categories' },
      { id: '/Administration/UOM/List', label: 'UOM' },
      { id: '/Administration/Brands', label: 'Brands' },
      { id: '/Administration/Products/List', label: 'Products' },
      { id: '/Administration/Designations/List', label: 'Designations' },
      { id: '/Administration/Employees/List', label: 'Employees' },
      { id: '/Administration/Locations/List', label: 'Locations' },
      { id: '/Administration/Transportation/List', label: 'Transportation' },
      { id: '/Administration/StockTransfer/List', label: 'Stock Transfer' },
      { id: '/company', label: 'Company' },
    ],
  },
  {
    id: 'registration',
    label: 'Registration',
    children: [
      { id: '/Registration/Chart-of-Account/List', label: 'Chart of Account' },
      { id: '/Registration/Vouchers/List', label: 'Vouchers' },
      { id: '/Registration/Bank-Account/BankAccountList', label: 'Bank Account' },
      { id: '/Inventory/OpeningStock/List', label: 'Opening Stock' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    children: [
      { id: '/sales/invoice/list', label: 'Invoice' },
      { id: '/Registration/InvoiceReceipt/List', label: 'Invoice Receipt' },
      { id: '/Sales-Return/Debit-Notes/List', label: 'Sales Return' },
      { id: '/sales/sales-return-receipt/list', label: 'Sales Return Receipt' },
      { id: '/Customers/list', label: 'Customers' },
      { id: '/Salesman/list', label: 'Salesman' },
      { id: '/Delivery-Challan/List', label: 'Delivery Challan' },
    ],
  },
  {
    id: 'purchase',
    label: 'Purchase',
    children: [
      { id: '/Purchase/Purchases/List', label: 'Purchases' },
      { id: '/Purchase/Purchase-Receipt/List', label: 'Purchase Receipt' },
      { id: '/Purchase/Purchase-Return/List', label: 'Purchase Return' },
      { id: '/Purchase/Purchase-Return-Receipt/List', label: 'Purchase Return Receipt' },
      { id: '/Purchase/Vendor/List', label: 'Vendor' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    children: [
      { id: '/Reports/Reports-Dashboard', label: 'Report Dashboard' },
      { id: '/Reports/Sales-Report', label: 'Sales Reports' },
      { id: '/Reports/Purchase-Report', label: 'Purchase Reports' },
      { id: '/Reports/Stock-Report', label: 'Stock Reports' },
      { id: '/Reports/Account-Report', label: 'Account Reports' },
      { id: '/Reports/Balance-Sheet', label: 'Balance Sheet' },
    ],
  },
];

export const getAllPermissionIds = (): string[] => {
  const ids: string[] = [];
  PERMISSION_TREE.forEach(node => {
    ids.push(node.id);
    if (node.children) {
      node.children.forEach(child => ids.push(child.id));
    }
  });
  return ids;
};

// Official FBR PRAL DI API v1.12 Reference Master Data
export const FBR_PROVINCES = [
  { code: 8, name: 'SINDH' },
  { code: 7, name: 'PUNJAB' },
  { code: 6, name: 'KHYBER PAKHTUNKHWA' },
  { code: 5, name: 'BALOCHISTAN' },
  { code: 1, name: 'ISLAMABAD' },
  { code: 2, name: 'GILGIT BALTISTAN' },
  { code: 3, name: 'AZAD KASHMIR' },
];

export const FBR_BUSINESS_ACTIVITIES = [
  'Wholesale / Retails',
  'Distributor',
  'Manufacturer',
  'Importer',
  'Exporter',
  'Retailer',
  'Service Provider',
  'Other',
];

export const FBR_BUSINESS_SECTORS = [
  'All Other Sectors',
  'FMCG',
  'Steel',
  'Textile',
  'Pharmaceuticals',
  'Automobile',
  'Services',
  'Petroleum',
  'Telecom',
  'Electricity Distribution',
  'Gas Distribution',
  'CNG Stations',
];

export interface ClientTenant {
  id: string;
  name: string;
  slug: string;
  email?: string;
  seller_ntn_cnic?: string;
  seller_province?: string;
  seller_address?: string;
  fbr_bearer_token?: string;
  fbr_environment?: 'sandbox' | 'production';
  business_activity?: string;
  business_sector?: string;
  allowed_modules: string[];
  user_count?: number;
  created_at: string;
}

// Required Hardcoded Developer Credentials
const DEV_EMAIL = 'developer@noorhorizontechnologies.com';
const DEV_PASSWORD = 'NoorHorizon@5923';

/**
 * Hierarchical Permission Tree Selector Component with Group Expand/Collapse & Toggle All
 */
const PermissionTreeEditor: React.FC<{
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}> = ({ selectedIds, onChange }) => {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    administration: true,
    registration: false,
    sales: false,
    purchase: false,
    reports: false,
  });

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleToggleParent = (node: PermissionNode) => {
    if (!node.children) {
      const isSelected = selectedIds.includes(node.id);
      onChange(isSelected ? selectedIds.filter(id => id !== node.id) : [...selectedIds, node.id]);
      return;
    }

    const childIds = node.children.map(c => c.id);
    const allSelected = childIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      onChange(selectedIds.filter(id => id !== node.id && !childIds.includes(id)));
    } else {
      const newIds = Array.from(new Set([...selectedIds, node.id, ...childIds]));
      onChange(newIds);
    }
  };

  const handleToggleChild = (childId: string, parentNode: PermissionNode) => {
    const isSelected = selectedIds.includes(childId);
    let nextIds = isSelected
      ? selectedIds.filter(id => id !== childId)
      : [...selectedIds, childId];

    if (parentNode.children) {
      const anyChildActive = parentNode.children.some(c => nextIds.includes(c.id));
      if (anyChildActive) {
        if (!nextIds.includes(parentNode.id)) {
          nextIds.push(parentNode.id);
        }
      } else {
        nextIds = nextIds.filter(id => id !== parentNode.id);
      }
    }

    onChange(nextIds);
  };

  return (
    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
      {PERMISSION_TREE.map(node => {
        const hasChildren = Boolean(node.children && node.children.length > 0);
        const isExpanded = expandedNodes[node.id];

        if (!hasChildren) {
          const isChecked = selectedIds.includes(node.id);
          return (
            <div
              key={node.id}
              onClick={() => handleToggleParent(node)}
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                isChecked
                  ? 'bg-primary/10 border-primary text-primary dark:text-blue-300'
                  : 'bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-gray-600 dark:text-gray-400 hover:border-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="font-bold text-black dark:text-white">{node.label}</span>
                <span className="text-[10px] text-gray-400">(Standalone page)</span>
              </div>
              {isChecked ? (
                <MdCheckCircle className="text-primary text-base" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-stroke dark:border-strokedark" />
              )}
            </div>
          );
        }

        const childIds = node.children!.map(c => c.id);
        const selectedChildrenCount = childIds.filter(id => selectedIds.includes(id)).length;
        const totalChildren = childIds.length;
        const allSelected = selectedChildrenCount === totalChildren && totalChildren > 0;
        const partiallySelected = selectedChildrenCount > 0 && selectedChildrenCount < totalChildren;

        return (
          <div
            key={node.id}
            className="rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark overflow-hidden shadow-xs"
          >
            {/* PARENT CATEGORY HEADER */}
            <div className="p-3 bg-gray-100 dark:bg-meta-4/40 flex items-center justify-between border-b border-stroke dark:border-strokedark">
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="flex items-center gap-2 text-xs font-bold text-black dark:text-white hover:text-primary transition cursor-pointer"
              >
                {isExpanded ? (
                  <MdKeyboardArrowDown className="text-lg text-gray-500" />
                ) : (
                  <MdKeyboardArrowRight className="text-lg text-gray-500" />
                )}
                <span>{node.label}</span>
                <span className="text-[10px] bg-gray-200 dark:bg-meta-4 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full font-mono">
                  {selectedChildrenCount} / {totalChildren} active
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleParent(node)}
                className={`text-[11px] px-2.5 py-1 rounded font-semibold transition cursor-pointer flex items-center gap-1 ${
                  allSelected
                    ? 'bg-primary/20 text-primary dark:text-blue-300 border border-primary/30'
                    : partiallySelected
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                    : 'bg-white dark:bg-boxdark text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white border border-stroke dark:border-strokedark'
                }`}
              >
                {allSelected ? (
                  <>
                    <MdCheckCircle className="text-xs text-primary" /> All Selected
                  </>
                ) : (
                  'Toggle All'
                )}
              </button>
            </div>

            {/* EXPANDED SUB-PAGES / CATEGORIES */}
            {isExpanded && (
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50/50 dark:bg-meta-4/10">
                {node.children!.map(child => {
                  const isChildChecked = selectedIds.includes(child.id);
                  return (
                    <div
                      key={child.id}
                      onClick={() => handleToggleChild(child.id, node)}
                      className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                        isChildChecked
                          ? 'bg-primary/10 border-primary text-primary dark:text-blue-300'
                          : 'bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-gray-700 dark:text-gray-300 hover:border-primary'
                      }`}
                    >
                      <span className="truncate">{child.label}</span>
                      {isChildChecked ? (
                        <MdCheckCircle className="text-primary text-sm shrink-0 ml-2" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-stroke dark:border-strokedark shrink-0 ml-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const DeveloperDashboard: React.FC = () => {
  const { devId } = useParams<{ devId: string }>();
  const navigate = useNavigate();

  // Developer Session State
  const [isDevAuthorized, setIsDevAuthorized] = useState<boolean>(() => {
    return sessionStorage.getItem('nht_dev_auth_session') === 'authorized';
  });

  // Login Form State
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'create'>('overview');

  // Stats
  const [loading, setLoading] = useState(true);
  const [totalClients, setTotalClients] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  // Client Data
  const [clients, setClients] = useState<ClientTenant[]>([]);

  // Newly Created Client Result for Sharing
  const [createdTenantLink, setCreatedTenantLink] = useState<{ name: string; url: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit Permissions & FBR Modal State
  const [editingClient, setEditingClient] = useState<ClientTenant | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    seller_ntn_cnic: string;
    seller_province: string;
    seller_address: string;
    fbr_bearer_token: string;
    fbr_environment: 'sandbox' | 'production';
    business_activity: string;
    business_sector: string;
  }>({
    name: '',
    seller_ntn_cnic: '',
    seller_province: 'SINDH',
    seller_address: '',
    fbr_bearer_token: '',
    fbr_environment: 'sandbox',
    business_activity: 'Wholesale / Retails',
    business_sector: 'All Other Sectors',
  });
  const [editModules, setEditModules] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Create Client Form State with complete FBR DI Seller Fields
  const [newClient, setNewClient] = useState({
    name: '',
    slug: '',
    email: '',
    password: '',
    sellerNTNCNIC: '',
    sellerProvince: 'SINDH',
    sellerAddress: '',
    fbrBearerToken: '',
    fbrEnvironment: 'sandbox' as 'sandbox' | 'production',
    businessActivity: 'Wholesale / Retails',
    businessSector: 'All Other Sectors',
    modules: getAllPermissionIds(),
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isDevAuthorized) {
      fetchDevData();
    }
  }, [isDevAuthorized]);

  const handleDevLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (emailInput.trim().toLowerCase() === DEV_EMAIL.toLowerCase() && passwordInput === DEV_PASSWORD) {
      sessionStorage.setItem('nht_dev_auth_session', 'authorized');
      setIsDevAuthorized(true);
      toast.success('Developer Master Access Granted');
    } else {
      setAuthError('Invalid developer email or master password.');
    }
  };

  const handleDevLogout = () => {
    sessionStorage.removeItem('nht_dev_auth_session');
    setIsDevAuthorized(false);
    setEmailInput('');
    setPasswordInput('');
    toast('Developer Session Terminated');
  };

  const fetchDevData = async () => {
    try {
      setLoading(true);

      const { count: prodCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
      setTotalProducts(prodCount || 0);

      const { count: invCount } = await supabase.from('sales_invoices').select('*', { count: 'exact', head: true });
      setTotalInvoices(invCount || 0);

      // Fetch saved client tenants with complete FBR metadata
      const { data: tenantData } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
      
      let formattedTenants: ClientTenant[] = [];
      if (tenantData && tenantData.length > 0) {
        formattedTenants = tenantData.map((t: any) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          email: t.email,
          seller_ntn_cnic: t.seller_ntn_cnic || t.seller_ntn || '',
          seller_province: t.seller_province || 'SINDH',
          seller_address: t.seller_address || '',
          fbr_bearer_token: t.fbr_bearer_token || '',
          fbr_environment: t.fbr_environment || 'sandbox',
          business_activity: t.business_activity || 'Wholesale / Retails',
          business_sector: t.business_sector || 'All Other Sectors',
          allowed_modules: Array.isArray(t.allowed_modules) && t.allowed_modules.length > 0 ? t.allowed_modules : getAllPermissionIds(),
          created_at: t.created_at || new Date().toISOString(),
        }));
      } else {
        formattedTenants = [
          {
            id: '1',
            name: 'Bashir Traders',
            slug: 'bashir',
            email: 'bashir@test.com',
            seller_ntn_cnic: '0786909',
            seller_province: 'SINDH',
            seller_address: 'Main Market, Karachi',
            fbr_environment: 'sandbox',
            business_activity: 'Wholesale / Retails',
            business_sector: 'All Other Sectors',
            allowed_modules: getAllPermissionIds(),
            created_at: new Date().toISOString(),
          },
        ];
      }

      setClients(formattedTenants);
      setTotalClients(formattedTenants.length);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to load developer stats');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.slug || !newClient.email || !newClient.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsCreating(true);
      const cleanSlug = newClient.slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-');

      // 1. Create User in Supabase Auth with complete FBR metadata & allowed modules
      const { error: authError } = await supabase.auth.signUp({
        email: newClient.email.trim(),
        password: newClient.password,
        options: {
          data: {
            role: 'Admin',
            tenant_id: cleanSlug,
            business_name: newClient.name.trim(),
            seller_ntn_cnic: newClient.sellerNTNCNIC.trim(),
            seller_province: newClient.sellerProvince,
            seller_address: newClient.sellerAddress.trim(),
            fbr_environment: newClient.fbrEnvironment,
            business_activity: newClient.businessActivity,
            business_sector: newClient.businessSector,
            allowed_modules: newClient.modules,
          },
        },
      });

      if (authError) throw authError;

      // 2. Record tenant in tenants table with all FBR fields
      try {
        await supabase.from('tenants').upsert([
          {
            name: newClient.name.trim(),
            slug: cleanSlug,
            email: newClient.email.trim(),
            seller_ntn_cnic: newClient.sellerNTNCNIC.trim(),
            seller_province: newClient.sellerProvince,
            seller_address: newClient.sellerAddress.trim(),
            fbr_bearer_token: newClient.fbrBearerToken.trim(),
            fbr_environment: newClient.fbrEnvironment,
            business_activity: newClient.businessActivity,
            business_sector: newClient.businessSector,
            allowed_modules: newClient.modules,
          },
        ], { onConflict: 'slug' });
      } catch (err) {
        console.warn('Tenants table upsert:', err);
      }

      // Generate Shareable Link
      const origin = window.location.origin;
      const shareUrl = `${origin}/${cleanSlug}/signin`;

      setCreatedTenantLink({
        name: newClient.name.trim(),
        url: shareUrl,
        email: newClient.email.trim(),
      });

      toast.success(`Client "${newClient.name}" created with FBR Profile!`);
      
      setNewClient({
        name: '',
        slug: '',
        email: '',
        password: '',
        sellerNTNCNIC: '',
        sellerProvince: 'SINDH',
        sellerAddress: '',
        fbrBearerToken: '',
        fbrEnvironment: 'sandbox',
        businessActivity: 'Wholesale / Retails',
        businessSector: 'All Other Sectors',
        modules: getAllPermissionIds(),
      });
      fetchDevData();
    } catch (err: any) {
      toast.error('Creation failed: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEditModal = (c: ClientTenant) => {
    setEditingClient(c);
    setEditForm({
      name: c.name || '',
      seller_ntn_cnic: c.seller_ntn_cnic || '',
      seller_province: c.seller_province || 'SINDH',
      seller_address: c.seller_address || '',
      fbr_bearer_token: c.fbr_bearer_token || '',
      fbr_environment: c.fbr_environment || 'sandbox',
      business_activity: c.business_activity || 'Wholesale / Retails',
      business_sector: c.business_sector || 'All Other Sectors',
    });
    setEditModules(c.allowed_modules || getAllPermissionIds());
  };

  const handleSaveClientAndModules = async () => {
    if (!editingClient) return;
    try {
      setIsSavingEdit(true);
      
      const { error } = await supabase
        .from('tenants')
        .update({
          name: editForm.name.trim(),
          seller_ntn_cnic: editForm.seller_ntn_cnic.trim(),
          seller_province: editForm.seller_province,
          seller_address: editForm.seller_address.trim(),
          fbr_bearer_token: editForm.fbr_bearer_token.trim(),
          fbr_environment: editForm.fbr_environment,
          business_activity: editForm.business_activity,
          business_sector: editForm.business_sector,
          allowed_modules: editModules,
        })
        .eq('slug', editingClient.slug);

      if (error) throw error;

      toast.success(`Profile & Permissions for ${editForm.name} updated!`);
      setEditingClient(null);
      fetchDevData();
    } catch (e: any) {
      toast.error('Update failed: ' + e.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Tenant link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  // IF NOT AUTHENTICATED AS DEVELOPER -> SHOW SECURE DEVELOPER LOGIN FORM
  if (!isDevAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 text-body dark:bg-boxdark-2 dark:text-bodydark flex flex-col items-center justify-center p-6 font-sans transition-colors duration-200">
        
        {/* Floating Theme Switcher */}
        <div className="absolute top-6 right-6">
          <ul className="flex items-center gap-2 list-none m-0">
            <DarkModeSwitcher />
          </ul>
        </div>

        <div className="w-full max-w-md bg-white dark:bg-boxdark border border-stroke dark:border-strokedark p-8 sm:p-10 rounded-2xl shadow-default space-y-6 transition-colors duration-200">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 mx-auto flex items-center justify-center text-3xl shadow-xs">
              <MdSecurity />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-black dark:text-white">NHT Master Developer Access</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Restricted system controller for Noor Horizon Technologies SaaS</p>
          </div>

          {authError && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-danger text-xs p-3 rounded-lg flex items-center gap-2">
              <MdLockOutline /> {authError}
            </div>
          )}

          <form onSubmit={handleDevLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-black dark:text-white mb-1.5">Developer Email</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="developer@noorhorizontechnologies.com"
                className="w-full bg-transparent dark:bg-form-input border border-stroke dark:border-form-strokedark rounded-lg p-3 text-xs text-black dark:text-white outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black dark:text-white mb-1.5">Master Password</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-transparent dark:bg-form-input border border-stroke dark:border-form-strokedark rounded-lg p-3 text-xs text-black dark:text-white outline-none focus:border-primary"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-opacity-90 text-white font-bold text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <MdVpnKey /> Authenticate Developer Master
            </button>
          </form>

          <div className="pt-2 text-center">
            <a href="/" className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-primary transition">
              ← Return to Main Homepage
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-body dark:bg-boxdark-2 dark:text-bodydark font-sans p-6 md:p-10 flex flex-col items-center transition-colors duration-200">
      
      {/* DEVELOPER HEADER */}
      <header className="w-full max-w-6xl bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded-2xl p-6 shadow-default flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 transition-colors duration-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-2xl">
            <MdAdminPanelSettings />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-black dark:text-white tracking-tight">NHT Master Developer Center</h1>
              <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                SuperAdmin Live
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
              Authenticated: <span className="text-black dark:text-gray-200 font-medium">{DEV_EMAIL}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* TABS SWITCHER */}
          <div className="bg-gray-100 dark:bg-meta-4/30 p-1 rounded-xl border border-stroke dark:border-strokedark flex text-xs font-semibold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-1.5 px-3 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'overview' ? 'bg-white dark:bg-boxdark text-primary dark:text-white shadow-xs font-bold' : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <MdDashboard /> SaaS Overview
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`py-1.5 px-3 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'clients' ? 'bg-primary text-white shadow-xs font-bold' : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <MdPeople /> Clients & Roles ({clients.length})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`py-1.5 px-3 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'create' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <MdAddCircle /> Add New Client
            </button>
          </div>

          {/* THEME TOGGLE SWITCHER */}
          <ul className="flex items-center gap-2 list-none m-0">
            <DarkModeSwitcher />
          </ul>

          {/* LOGOUT */}
          <button
            onClick={handleDevLogout}
            title="Sign Out of Developer Portal"
            className="p-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-danger border border-red-200 dark:border-red-500/30 transition cursor-pointer"
          >
            <MdLogout />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="w-full max-w-6xl space-y-6">
        
        {/* TAB 1: SAAS OVERVIEW METRICS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white dark:bg-boxdark p-6 rounded-xl border border-stroke dark:border-strokedark shadow-default transition-colors duration-200">
                <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Active Clients</span>
                  <MdBusiness className="text-primary text-xl" />
                </div>
                <div className="text-3xl font-black text-black dark:text-white">{totalClients}</div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Multi-tenant isolated organizations</p>
              </div>

              <div className="bg-white dark:bg-boxdark p-6 rounded-xl border border-stroke dark:border-strokedark shadow-default transition-colors duration-200">
                <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Global Products</span>
                  <MdLayers className="text-indigo-500 text-xl" />
                </div>
                <div className="text-3xl font-black text-black dark:text-white">{totalProducts}</div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Catalog items across all clients</p>
              </div>

              <div className="bg-white dark:bg-boxdark p-6 rounded-xl border border-stroke dark:border-strokedark shadow-default transition-colors duration-200">
                <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Processed Invoices</span>
                  <MdSecurity className="text-emerald-500 text-xl" />
                </div>
                <div className="text-3xl font-black text-black dark:text-white">{totalInvoices}</div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Total sales transactions recorded</p>
              </div>
            </div>

            {/* QUICK CLIENT ACCESS CARDS */}
            <div className="bg-white dark:bg-boxdark p-6 rounded-xl border border-stroke dark:border-strokedark shadow-default transition-colors duration-200">
              <h3 className="text-sm font-bold text-black dark:text-white mb-4 uppercase tracking-wider">Quick Client Portals</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {clients.map(c => (
                  <div key={c.slug} className="bg-gray-50 dark:bg-meta-4/20 p-4 rounded-xl border border-stroke dark:border-strokedark flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-black dark:text-white text-sm">{c.name}</span>
                        <span className="text-[10px] bg-primary/10 text-primary dark:text-blue-300 px-2 py-0.5 rounded font-mono font-bold">
                          {c.slug}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.email}</p>
                      {c.seller_ntn_cnic && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">NTN/CNIC: {c.seller_ntn_cnic}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={`/${c.slug}/signin`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary dark:text-blue-300 text-xs font-semibold py-2 px-3 rounded-lg transition border border-primary/20"
                      >
                        <MdLaunch /> Open Portal
                      </a>
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/${c.slug}/signin`)}
                        title="Copy Share Link"
                        className="bg-white dark:bg-boxdark hover:bg-gray-100 dark:hover:bg-meta-4 text-gray-600 dark:text-gray-300 p-2 rounded-lg border border-stroke dark:border-strokedark transition cursor-pointer"
                      >
                        <MdContentCopy />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CLIENT LIST & ROLE ACCESS */}
        {activeTab === 'clients' && (
          <div className="bg-white dark:bg-boxdark rounded-xl border border-stroke dark:border-strokedark overflow-hidden shadow-default transition-colors duration-200">
            <div className="p-6 border-b border-stroke dark:border-strokedark flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-black dark:text-white">Client Organizations & Role Permissions</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Control which specific categories and sub-pages each client can see</p>
              </div>
              <button
                onClick={() => setActiveTab('create')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition shadow-xs cursor-pointer"
              >
                + Register Client
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-black dark:text-slate-300">
                <thead className="bg-gray-100 dark:bg-meta-4/40 text-gray-600 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-stroke dark:border-strokedark">
                  <tr>
                    <th className="p-4">Business Name</th>
                    <th className="p-4">Tenant Code</th>
                    <th className="p-4">Admin Email</th>
                    <th className="p-4">FBR Seller NTN</th>
                    <th className="p-4">Active Pages / Categories</th>
                    <th className="p-4 text-center">Manage Roles & FBR</th>
                    <th className="p-4 text-center">Client Share Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke dark:divide-strokedark">
                  {clients.map(c => (
                    <tr key={c.slug} className="hover:bg-gray-50 dark:hover:bg-meta-4/20 transition">
                      <td className="p-4 font-bold text-black dark:text-white">{c.name}</td>
                      <td className="p-4">
                        <span className="bg-primary/10 text-primary dark:text-blue-300 px-2 py-0.5 rounded font-mono text-[11px] font-bold">
                          {c.slug}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600 dark:text-slate-300">{c.email || 'N/A'}</td>
                      <td className="p-4 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {c.seller_ntn_cnic || '—'}
                      </td>
                      <td className="p-4">
                        <span className="bg-gray-100 dark:bg-meta-4 text-primary dark:text-blue-300 px-2.5 py-1 rounded-md text-[11px] font-mono border border-stroke dark:border-strokedark">
                          {c.allowed_modules?.length || 0} pages permitted
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          className="inline-flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition shadow-xs"
                        >
                          <MdEdit /> Edit Roles & FBR
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => copyToClipboard(`${window.location.origin}/${c.slug}/signin`)}
                          className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-semibold cursor-pointer"
                        >
                          <MdContentCopy /> Copy Portal Link
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CREATE NEW CLIENT WITH FBR SELLER PROFILE */}
        {activeTab === 'create' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* SUCCESS BANNER WITH SHARE LINK */}
            {createdTenantLink && (
              <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/50 rounded-2xl p-6 shadow-default space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                  <MdCheckCircle className="text-xl" />
                  <span>Client Created Successfully! Here is the dedicated portal link:</span>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-slate-950 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900">
                  <input
                    type="text"
                    readOnly
                    value={createdTenantLink.url}
                    className="w-full bg-transparent text-xs font-mono text-emerald-800 dark:text-emerald-300 outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(createdTenantLink.url)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition flex-shrink-0 cursor-pointer"
                  >
                    {copied ? <MdCheck /> : <MdContentCopy />} {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>

                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  Send this link to the client along with their login email (<code>{createdTenantLink.email}</code>).
                </p>
              </div>
            )}

            <div className="bg-white dark:bg-boxdark p-8 rounded-2xl border border-stroke dark:border-strokedark shadow-default transition-colors duration-200">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-stroke dark:border-strokedark">
                <div>
                  <h3 className="text-xl font-extrabold text-black dark:text-white">Create New Client Organization</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Register tenant credentials, official FBR Seller Profile (PRAL v1.12), and role permissions.
                  </p>
                </div>
                <span className="bg-primary/10 text-primary dark:text-blue-300 text-xs px-3 py-1 rounded-full border border-primary/20 font-semibold flex items-center gap-1.5">
                  <MdSecurity /> FBR DI v1.12 Ready
                </span>
              </div>

              <form onSubmit={handleCreateClient} className="space-y-6">
                
                {/* SECTION 1: TENANT BASIC & LOGIN DETAILS */}
                <div className="bg-gray-50 dark:bg-meta-4/20 p-5 rounded-xl border border-stroke dark:border-strokedark space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary dark:text-blue-400 flex items-center gap-1.5">
                    <MdBusiness /> 1. Client Business & Login Credentials
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-black dark:text-white mb-1">
                        Seller Business Trade Name * <span className="text-gray-400 font-normal">(sellerBusinessName)</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Bashir Traders (Pvt) Ltd"
                        value={newClient.name}
                        onChange={e => {
                          const name = e.target.value;
                          const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                          setNewClient(prev => ({ ...prev, name, slug: prev.slug ? prev.slug : slug }));
                        }}
                        className="w-full bg-white dark:bg-form-input border border-stroke dark:border-form-strokedark rounded-lg p-2.5 text-black dark:text-white text-xs outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-black dark:text-white mb-1">
                        Tenant ID Slug * <span className="text-gray-400 font-normal">(Used in URL e.g. /bashir)</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. bashir"
                        value={newClient.slug}
                        onChange={e => setNewClient({ ...newClient, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                        className="w-full bg-white dark:bg-form-input border border-stroke dark:border-form-strokedark rounded-lg p-2.5 text-black dark:text-white font-mono text-xs outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-black dark:text-white mb-1">Client Admin Login Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="admin@bashirtraders.com"
                        value={newClient.email}
                        onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                        className="w-full bg-white dark:bg-form-input border border-stroke dark:border-form-strokedark rounded-lg p-2.5 text-black dark:text-white text-xs outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-black dark:text-white mb-1">Initial Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="8+ Characters"
                        value={newClient.password}
                        onChange={e => setNewClient({ ...newClient, password: e.target.value })}
                        className="w-full bg-white dark:bg-form-input border border-stroke dark:border-form-strokedark rounded-lg p-2.5 text-black dark:text-white text-xs outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: OFFICIAL FBR DIGITAL INVOICING SELLER METADATA */}
                <div className="bg-gray-50 dark:bg-meta-4/20 p-5 rounded-xl border border-stroke dark:border-strokedark space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <MdSecurity /> 2. FBR Digital Invoicing Seller Profile (PRAL v1.12 Requirements)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-black dark:text-white mb-1">
                        Seller NTN / CNIC * <span className="text-gray-400 font-normal">(7/9 or 13 digits)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 0786909 or 4130686580237"
                        value={newClient.sellerNTNCNIC}
                        onChange={e => setNewClient({ ...newClient, sellerNTNCNIC: e.target.value })}
                        className="w-full bg-white dark:bg-form-input border border-stroke dark:border-form-strokedark rounded-lg p-2.5 text-black dark:text-white font-mono text-xs outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-black dark:text-white mb-1">
                        Seller Province * <span className="text-gray-400 font-normal">(Ref API 5.1)</span>
                      </label>
                      <select
                        value={newClient.sellerProvince}
                        onChange={e => setNewClient({ ...newClient, sellerProvince: e.target.value })}
                        className="w-full bg-white dark:bg-form-input border border-stroke dark:border-form-strokedark rounded-lg p-2.5 text-black dark:text-white text-xs outline-none focus:border-emerald-500"
                      >
                        {FBR_PROVINCES.map(p => (
                          <option key={p.code} value={p.name}>
                            {p.name} (Code: {p.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-black dark:text-white mb-1">FBR Gateway Environment</label>
                      <select
                        value={newClient.fbrEnvironment}
                        onChange={e => setNewClient({ ...newClient, fbrEnvironment: e.target.value as any })}
                        className="w-full bg-white dark:bg-form-input border border-stroke dark:border-form-strokedark rounded-lg p-2.5 text-black dark:text-white text-xs outline-none focus:border-emerald-500"
                      >
                        <option value="sandbox">Sandbox Testing (postinvoicedata_sb)</option>
                        <option value="production">Production Live (postinvoicedata)</option>
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-black dark:text-white mb-1">
                        Seller Business Physical Address * <span className="text-gray-400 font-normal">(sellerAddress)</span>
                      </label>
                      <input
                        type="text"
                        autoComplete="off"
                        placeholder="e.g. Plot 12, Sector 15, Korangi Industrial Area, Karachi"
                        value={newClient.sellerAddress}
                        onChange={e => setNewClient({ ...newClient, sellerAddress: e.target.value })}
                        className="w-full bg-white dark:bg-form-input border border-stroke dark:border-form-strokedark rounded-lg p-2.5 text-black dark:text-white text-xs outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-black dark:text-white mb-1">
                        PRAL / FBR Security Bearer Token <span className="text-gray-400 font-normal">(5-Year Token for HTTP Authorization)</span>
                      </label>
                      <input
                        type="text"
                        autoComplete="off"
                        placeholder="e.g. 904e4e727-d927-3a9b-b894-101f92b47f32"
                        value={newClient.fbrBearerToken}
                        onChange={e => setNewClient({ ...newClient, fbrBearerToken: e.target.value })}
                        className="w-full bg-white dark:bg-form-input border border-stroke dark:border-form-strokedark rounded-lg p-2.5 text-black dark:text-white font-mono text-xs outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-black dark:text-white mb-1">Business Activity (Sec 10)</label>
                      <select
                        value={newClient.businessActivity}
                        onChange={e => setNewClient({ ...newClient, businessActivity: e.target.value })}
                        className="w-full bg-white dark:bg-form-input border border-stroke dark:border-form-strokedark rounded-lg p-2.5 text-black dark:text-white text-xs outline-none focus:border-emerald-500"
                      >
                        {FBR_BUSINESS_ACTIVITIES.map(a => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-black dark:text-white mb-1">Business Sector</label>
                      <select
                        value={newClient.businessSector}
                        onChange={e => setNewClient({ ...newClient, businessSector: e.target.value })}
                        className="w-full bg-white dark:bg-form-input border border-stroke dark:border-form-strokedark rounded-lg p-2.5 text-black dark:text-white text-xs outline-none focus:border-emerald-500"
                      >
                        {FBR_BUSINESS_SECTORS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: ROLE & SUB-PAGE PERMISSION TREE */}
                <div>
                  <label className="block text-xs font-bold text-black dark:text-white mb-2">
                    3. Select What Pages & Sub-Categories To Show This Client:
                  </label>
                  <PermissionTreeEditor
                    selectedIds={newClient.modules}
                    onChange={ids => setNewClient(prev => ({ ...prev, modules: ids }))}
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isCreating ? <Spinner /> : 'Create Client & Generate Portal Link'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT PERMISSIONS & FBR SELLER MODAL */}
        {editingClient && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto transition-colors duration-200">
              
              <div className="flex justify-between items-start border-b border-stroke dark:border-strokedark pb-3">
                <div>
                  <h4 className="text-lg font-bold text-black dark:text-white">Edit Client & FBR Seller Profile</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Tenant Code: <strong className="text-primary dark:text-blue-400">{editingClient.slug}</strong> | Admin: {editingClient.email}
                  </p>
                </div>
                <span className="bg-primary/10 text-primary dark:text-blue-300 text-[11px] px-2.5 py-1 rounded-md font-mono font-bold">
                  {editModules.length} Sub-Pages Active
                </span>
              </div>

              {/* FBR SELLER DETAILS EDIT SECTION */}
              <div className="bg-gray-50 dark:bg-meta-4/20 p-4 rounded-xl border border-stroke dark:border-strokedark space-y-3">
                <h5 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <MdSecurity /> FBR Digital Invoicing Seller Information
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-black dark:text-white mb-1">Business Trade Name *</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-white dark:bg-form-input border border-stroke dark:border-form-strokedark rounded-lg p-2 text-black dark:text-white text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-black dark:text-white mb-1">Seller NTN / CNIC *</label>
                    <input
                      type="text"
                      value={editForm.seller_ntn_cnic}
                      onChange={e => setEditForm({ ...editForm, seller_ntn_cnic: e.target.value })}
                      placeholder="e.g. 0786909 or 4130686580237"
                      className="w-full bg-white dark:bg-form-input border border-stroke dark:border-form-strokedark rounded-lg p-2 text-black dark:text-white font-mono text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-black dark:text-white mb-1">Seller Province *</label>
                    <select
                      value={editForm.seller_province}
                      onChange={e => setEditForm({ ...editForm, seller_province: e.target.value })}
                      className="w-full bg-white dark:bg-form-input border border-stroke dark:border-form-strokedark rounded-lg p-2 text-black dark:text-white text-xs outline-none focus:border-primary"
                    >
                      {FBR_PROVINCES.map(p => (
                        <option key={p.code} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-black dark:text-white mb-1">FBR Gateway Environment</label>
                    <select
                      value={editForm.fbr_environment}
                      onChange={e => setEditForm({ ...editForm, fbr_environment: e.target.value as any })}
                      className="w-full bg-white dark:bg-form-input border border-stroke dark:border-form-strokedark rounded-lg p-2 text-black dark:text-white text-xs outline-none focus:border-primary"
                    >
                      <option value="sandbox">Sandbox Testing (postinvoicedata_sb)</option>
                      <option value="production">Production Live (postinvoicedata)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-black dark:text-white mb-1">Seller Business Physical Address *</label>
                    <input
                      type="text"
                      value={editForm.seller_address}
                      onChange={e => setEditForm({ ...editForm, seller_address: e.target.value })}
                      placeholder="e.g. Plot 12, Industrial Area, Karachi"
                      className="w-full bg-white dark:bg-form-input border border-stroke dark:border-form-strokedark rounded-lg p-2 text-black dark:text-white text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-black dark:text-white mb-1">PRAL / FBR Security Bearer Token</label>
                    <input
                      type="text"
                      value={editForm.fbr_bearer_token}
                      onChange={e => setEditForm({ ...editForm, fbr_bearer_token: e.target.value })}
                      placeholder="e.g. 904e4e727-d927-3a9b-b894-101f92b47f32"
                      className="w-full bg-white dark:bg-form-input border border-stroke dark:border-form-strokedark rounded-lg p-2 text-black dark:text-white font-mono text-xs outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* HIERARCHICAL PERMISSION TREE SELECTOR */}
              <div>
                <label className="block text-xs font-bold text-black dark:text-white mb-2">
                  Permitted Categories & Sub-Pages:
                </label>
                <PermissionTreeEditor
                  selectedIds={editModules}
                  onChange={ids => setEditModules(ids)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stroke dark:border-strokedark">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 rounded-lg border border-stroke dark:border-strokedark text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-meta-4 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={handleSaveClientAndModules}
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-opacity-90 text-white text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingEdit ? <Spinner /> : 'Save Client Profile & Permissions'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default DeveloperDashboard;
