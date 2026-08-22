import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import IconDark from '../../images/logo/icon-dark.png';
import IconLight from '../../images/logo/icon-light.png';
import Spinner from '../../ui/Spinner';
import { useAuth, detectPortalTenant } from '../../Context/Auth';
import DarkModeSwitcher from '../../components/Header/DarkModeSwitcher';
import { MdLockOutline } from 'react-icons/md';

import { Navigate } from 'react-router-dom';

const SignIn: React.FC = () => {
  const { login, currentUser, tenantId } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check active tenant slug if coming from a tenant link (e.g. /bashir/signin)
  const activeTenantSlug = detectPortalTenant();

  // If user is already authenticated with a valid Supabase User ID for this tenant, redirect to dashboard!
  const currentTenant = String(tenantId || '').toLowerCase().trim();
  if (currentUser?.id && currentTenant && activeTenantSlug && currentTenant === activeTenantSlug.toLowerCase().trim()) {
    return <Navigate to={`/${currentTenant}`} replace />;
  }


  // Formik validation schema for login
  const validationSchema = Yup.object({
    email: Yup.string()
      .email('Invalid email format')
      .required('Email is required'),
    password: Yup.string()
      .min(6, 'Password must be at least 6 characters')
      .required('Password is required'),
  });

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        setAuthError(null);
        await login(values.email, values.password);
      } catch (error: any) {
        setAuthError(error.message || 'An error occurred during sign in');
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="rounded-sm dark:border-strokedark dark:bg-boxdark h-screen flex flex-col font-sans">
      {/* Navbar */}
      <header className="w-full bg-white dark:bg-boxdark drop-shadow-1">
        <div className="flex items-center justify-between px-4 py-4 md:px-6 2xl:px-11">
          <div className="flex items-center gap-4">
            <img className="hidden dark:block h-10 w-auto object-contain" src={IconDark} alt="NHT Logo" />
            <img className="block dark:hidden h-10 w-auto object-contain" src={IconLight} alt="NHT Logo" />
            <div className="flex items-center gap-1">
              <h1 className="text-lg font-extrabold text-blue-600"> NOOR <span className="text-black dark:text-gray-300">HORIZON</span></h1>
              <span className="text-sm text-blue-600 font-bold"> <span className="text-black dark:text-gray-300">TECHNOLOGIES</span></span>
              <span className="text-xs text-blue-600 font-bold">ERP</span>
            </div>
          </div>
          <ul className="flex items-center gap-2 m-0 list-none">
            <DarkModeSwitcher />
          </ul>
        </div>
      </header>

      {/* Main Content: Direct Sign In Form */}
      <div className="flex flex-1 justify-center items-center bg-gray-50 dark:bg-boxdark-2 p-4">
        <div className="w-full max-w-md bg-white dark:bg-boxdark rounded-2xl shadow-default dark:border-strokedark border border-stroke p-8 sm:p-10">
          
          <div className="text-center mb-6">
            {activeTenantSlug && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-meta-4/40 text-primary text-xs font-bold rounded-full mb-3 border border-blue-200 dark:border-strokedark">
                <MdLockOutline /> Protected Portal: <span className="uppercase text-blue-700 dark:text-blue-300">{activeTenantSlug}</span>
              </div>
            )}
            <h2 className="text-2xl font-bold text-black dark:text-white">
              Sign In
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter your authorized email and password to access the ERP.
            </p>
          </div>

          {/* Display Auth Errors */}
          {authError && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium text-center">
              {authError}
            </div>
          )}

          <form onSubmit={formik.handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-black dark:text-white">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                placeholder="Enter your email"
                className={`w-full rounded-lg border bg-transparent py-3 px-4 text-sm text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white ${
                  formik.touched.email && formik.errors.email ? 'border-red-500' : 'border-stroke'
                }`}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.email}
              />
              {formik.touched.email && formik.errors.email && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.email}</p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-black dark:text-white">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Enter your password"
                className={`w-full rounded-lg border bg-transparent py-3 px-4 text-sm text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white ${
                  formik.touched.password && formik.errors.password ? 'border-red-500' : 'border-stroke'
                }`}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.password}
              />
              {formik.touched.password && formik.errors.password && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`w-full cursor-pointer rounded-lg border p-3.5 text-sm font-bold text-white transition hover:bg-opacity-90 mt-2 ${
                loading ? 'bg-primary/80 border-primary/80 cursor-not-allowed' : 'bg-primary border-primary'
              }`}
              disabled={loading}
            >
              {loading ? <Spinner /> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
