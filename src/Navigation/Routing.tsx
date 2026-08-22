import { useEffect, useState } from 'react';
import { Route, Routes, useLocation, Navigate, useParams } from 'react-router-dom';
import Loader from '../common/Loader';
import CompanyLanding from '../pages/Landing/CompanyLanding';
import SignIn from '../pages/Authentication/SignIn';
import DeveloperDashboard from '../pages/Developer/DeveloperDashboard';
import DefaultLayout from '../layout/DefaultLayout';
import Dashboard from '../pages/Dashboard/Dashboard';
import NotFound from '../pages/Error/NotFound';
import { useAuth } from '../Context/Auth';
import { verifyTenantSlug } from '../service/clientService';

/**
 * Gate for tenant dedicated sign-in pages (e.g. /bashir/signin)
 * Validates tenant against database. If tenant does not exist, shows 404.
 */
const TenantSignInGate = () => {
  const { tenantPath } = useParams<{ tenantPath: string }>();
  const { currentUser, tenantId } = useAuth();
  const [isValidating, setIsValidating] = useState(true);
  const [isValidTenant, setIsValidTenant] = useState(false);

  const rawPath = String(tenantPath || '').trim();
  const cleanSlug = rawPath
    .replace(/^tenant=/, '')
    .replace(/^tenant-/, '')
    .toLowerCase()
    .trim();

  useEffect(() => {
    let isMounted = true;
    verifyTenantSlug(cleanSlug).then((valid) => {
      if (isMounted) {
        setIsValidTenant(valid);
        setIsValidating(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [cleanSlug]);

  if (isValidating) {
    return <Loader />;
  }

  if (!isValidTenant) {
    return (
      <NotFound
        title="404 - Organization Portal Not Found"
        message={`The client organization "${cleanSlug}" does not exist or has not been registered.`}
      />
    );
  }

  // If user is already authenticated with a valid Supabase User ID for this tenant, redirect to dashboard!
  const currentTenant = String(tenantId || '').toLowerCase().trim();
  if (currentUser?.id && currentTenant && currentTenant === cleanSlug) {
    return <Navigate to={`/${cleanSlug}`} replace />;
  }

  return <SignIn />;
};


/**
 * Guard for Tenant Root URL: /:tenantPath (e.g. /bashir)
 * If tenant doesn't exist -> 404.
 * If not logged in -> redirects to /:cleanSlug/signin.
 * If logged in for this tenant -> loads ERP dashboard.
 */
const TenantGate = () => {
  const { tenantPath } = useParams<{ tenantPath: string }>();
  const { isAuthenticated, tenantId } = useAuth();
  const [isValidating, setIsValidating] = useState(true);
  const [isValidTenant, setIsValidTenant] = useState(false);

  const rawPath = String(tenantPath || '').trim();
  const cleanSlug = rawPath
    .replace(/^tenant=/, '')
    .replace(/^tenant-/, '')
    .toLowerCase()
    .trim();

  useEffect(() => {
    let isMounted = true;
    verifyTenantSlug(cleanSlug).then((valid) => {
      if (isMounted) {
        setIsValidTenant(valid);
        setIsValidating(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [cleanSlug]);

  if (isValidating) {
    return <Loader />;
  }

  if (!isValidTenant) {
    return (
      <NotFound
        title="404 - Organization Portal Not Found"
        message={`The client organization "${cleanSlug}" does not exist or has not been registered.`}
      />
    );
  }

  // 1. If user is not logged in -> redirect to tenant sign in
  if (!isAuthenticated) {
    return <Navigate to={`/${cleanSlug}/signin`} replace />;
  }

  const currentTenant = String(tenantId || '').toLowerCase().trim();

  // 2. If user is logged in for another tenant -> redirect to this tenant's sign in
  if (cleanSlug && currentTenant && currentTenant !== cleanSlug) {
    return <Navigate to={`/${cleanSlug}/signin`} replace />;
  }

  // 3. Authorized for this tenant -> Render ERP Dashboard
  return (
    <DefaultLayout>
      <Dashboard />
    </DefaultLayout>
  );
};

/**
 * Guard for any nested ERP route under a tenant (e.g. /bashir/Administration/Categories/List)
 */
const TenantRouteGuard = ({ children }: { children: React.ReactNode }) => {
  const { tenantPath } = useParams<{ tenantPath: string }>();
  const location = useLocation();
  const { isAuthenticated, tenantId, loading } = useAuth();
  const [isValidating, setIsValidating] = useState(true);
  const [isValidTenant, setIsValidTenant] = useState(false);

  const rawPath = String(tenantPath || '').trim();
  const cleanSlug = rawPath
    .replace(/^tenant=/, '')
    .replace(/^tenant-/, '')
    .toLowerCase()
    .trim();

  // If URL didn't have tenant prefix in path, fallback to active logged-in tenant
  const currentLoggedTenant = String(tenantId || '').toLowerCase().trim();
  const effectiveTenant = cleanSlug || currentLoggedTenant || detectPortalTenant() || '';

  useEffect(() => {
    let isMounted = true;
    if (effectiveTenant) {
      verifyTenantSlug(effectiveTenant).then((valid) => {
        if (isMounted) {
          setIsValidTenant(valid);
          setIsValidating(false);
        }
      });
    } else {
      if (!loading) {
        setIsValidTenant(false);
        setIsValidating(false);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [effectiveTenant, loading]);

  if (isValidating || loading) {
    return <Loader />;
  }

  if (!isValidTenant) {
    return (
      <NotFound
        title="404 - Organization Portal Not Found"
        message={`The client organization "${effectiveTenant || 'Portal'}" does not exist.`}
      />
    );
  }

  // If user is not authenticated -> redirect to tenant sign in
  if (!isAuthenticated) {
    return <Navigate to={`/${effectiveTenant}/signin`} replace />;
  }

  // Strict tenant isolation verification
  if (cleanSlug && currentLoggedTenant && currentLoggedTenant !== cleanSlug) {
    return <Navigate to={`/${cleanSlug}/signin`} replace />;
  }

  return <>{children}</>;
};


function Navigation() {
  const { pathname } = useLocation();
  const { role, getRoleBasedRoutes, loading: authLoading } = useAuth();

  const roleRoutes = getRoleBasedRoutes();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (authLoading) {
    return <Loader />;
  }

  const renderRoutes = (routes: any[]): any => {
    return routes.flatMap((route, index) => {
      const flat: any[] = [];

      if (route.path && route.component) {
        const cleanSub = route.path.replace(/^\//, '');

        // 1. Tenant-scoped route: e.g. /:tenantPath/Administration/Categories/List
        if (cleanSub) {
          flat.push(
            <Route
              key={`tenant-${index}-${route.path}`}
              path={`/:tenantPath/${cleanSub}`}
              element={
                <TenantRouteGuard>
                  <DefaultLayout>{route.component}</DefaultLayout>
                </TenantRouteGuard>
              }
            />
          );
        }

        // 2. Direct route fallback
        flat.push(
          <Route
            key={`direct-${index}-${route.path}`}
            path={route.path}
            element={
              <TenantRouteGuard>
                <DefaultLayout>{route.component}</DefaultLayout>
              </TenantRouteGuard>
            }
          />
        );
      }

      if (route.children) {
        flat.push(...renderRoutes(route.children));
      }

      return flat;
    });
  };

  return (
    <Routes>
      {/* 1. ROOT URL: ALWAYS NHT COMPANY SHOWCASE & LANDING PAGE */}
      <Route path="/" element={<CompanyLanding />} />

      {/* 2. DEVELOPER SAAS CONTROL CENTER: STRICTLY & EXCLUSIVELY /dev/master */}
      <Route path="/dev/master" element={<DeveloperDashboard />} />


      {/* 3. DEDICATED CLIENT TENANT SIGN-IN & LOGIN ROUTES (e.g. /bashir/signin) */}
      <Route path="/:tenantPath/signin" element={<TenantSignInGate />} />
      <Route path="/:tenantPath/login" element={<TenantSignInGate />} />

      {/* 4. DEDICATED TENANT ROOT / DASHBOARD GATE (e.g. /bashir) */}
      <Route path="/:tenantPath" element={<TenantGate />} />

      {/* 5. ALL TENANT ERP SUBPAGES (e.g. /bashir/Administration/Categories/List) */}
      {renderRoutes(roleRoutes)}

      {/* 6. FALLBACK FOR UNRECOGNIZED ROUTES -> 404 NOT FOUND */}
      <Route
        path="*"
        element={
          <NotFound
            title="404 - Page Not Found"
            message="The requested page could not be found."
          />
        }
      />
    </Routes>
  );
}

export default Navigation;
