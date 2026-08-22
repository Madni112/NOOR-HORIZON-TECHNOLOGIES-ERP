import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import { useAuth } from '../../../Context/Auth';

const AddCustomer = () => {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const { tenantId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Extract customer data if passed via navigation (Edit Mode) 
  const editData = location.state?.customer;
  const isEditMode = !!editData;

  useEffect(() => {
    const fetchCompanies = async () => {
      const { data } = await supabase.from('companies').select('id, name');
      if (data) setCompanies(data);
    };
    fetchCompanies();
  }, []);

  const validationSchema = Yup.object().shape({
    customerName: Yup.string().required('Customer / Business Name is required'),
    registrationType: Yup.string().required('Registration Type is required'),
    ntnNo: Yup.string().when('registrationType', {
      is: 'Registered',
      then: (schema) => schema.required('NTN Number is required for Registered corporate buyers'),
      otherwise: (schema) => schema.notRequired(),
    }),
    primaryPhone: Yup.string().required('Primary Contact Phone is required'),
    province: Yup.string().required('Province / Tax Jurisdiction is required'),
  });

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      // --- DYNAMIC DUPLICATE VALIDATION CHECK ENGINE ---
      let query = supabase
        .from('customers')
        .select('id')
        .eq('customerName', values.customerName.trim())
        .eq('company', values.company || '');

      if (isEditMode) {
        query = query.neq('id', editData.id);
      }

      const { data: existingRecords, error: checkError } = await query;
      if (checkError) throw checkError;

      if (existingRecords && existingRecords.length > 0) {
        toast.error('A customer with this exact name and company selection already exists!');
        setLoading(false);
        return;
      }

      const payload = {
        ...values,
        customerName: values.customerName.trim(),
        ntnNo: values.ntnNo ? values.ntnNo.trim() : '',
        cnicNo: values.cnicNo ? values.cnicNo.trim() : '',
        stRegNo: values.stRegNo ? values.stRegNo.trim() : '',
        address: values.address ? values.address.trim() : '',
      };

      if (isEditMode) {
        const { error } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', editData.id);

        if (error) throw error;
        toast.success('Customer profile updated successfully!');
        navigate(`${tenantId ? `/${tenantId}` : ''}/Customers/list`);
      } else {
        const { error } = await supabase.from('customers').insert([payload]);
        if (error) throw error;
        toast.success('Customer registered successfully!');
        navigate(`${tenantId ? `/${tenantId}` : ''}/Customers/list`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-270">
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark flex justify-between items-center">
          <h3 className="font-semibold text-black dark:text-white text-base">
            {isEditMode ? `Edit Customer: ${editData.customerName}` : 'New Customer Registration (FBR Digital Invoicing Compliant)'}
          </h3>
          <button
            type="button"
            onClick={() => navigate(`${tenantId ? `/${tenantId}` : ''}/Customers/list`)}
            className="text-sm text-primary hover:underline font-medium cursor-pointer"
          >
            {isEditMode ? 'Back to List' : 'See List'}
          </button>
        </div>

        <Formik
          initialValues={editData || {
            customerName: '',
            registrationType: 'Registered',
            ntnNo: '',
            cnicNo: '',
            stRegNo: '',
            primaryPhone: '',
            email: '',
            address: '',
            province: 'Sindh',
            company: '',
            website: '',
            notes: '',
            followUpDate: ''
          }}
          enableReinitialize={true}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ handleChange, values, errors, touched, setFieldValue }) => (
            <Form className="p-6.5">
              <div className="grid grid-cols-1 gap-x-12 gap-y-6 md:grid-cols-2">
                {/* Left Column */}
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                      Customer / Business Name *
                    </label>
                    <input
                      name="customerName"
                      onChange={handleChange}
                      value={values.customerName}
                      placeholder="e.g. Al-Madina Trading Co."
                      className={`w-full rounded border bg-transparent text-black dark:text-white p-3 outline-none text-xs font-semibold focus:border-primary ${touched.customerName && errors.customerName ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`}
                    />
                    {touched.customerName && errors.customerName && (
                      <p className="text-red-500 text-[11px] mt-1">{errors.customerName as string}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                      FBR Buyer Registration Type *
                    </label>
                    <select
                      name="registrationType"
                      onChange={(e) => {
                        handleChange(e);
                        if (e.target.value === 'Unregistered' && !values.cnicNo && values.ntnNo) {
                          setFieldValue('cnicNo', values.ntnNo);
                        }
                      }}
                      value={values.registrationType || 'Registered'}
                      className="w-full rounded border border-stroke dark:border-strokedark bg-transparent text-black dark:text-white p-3 outline-none text-xs font-semibold focus:border-primary dark:bg-boxdark"
                    >
                      <option value="Registered">Registered (Corporate / Business with NTN)</option>
                      <option value="Unregistered">Unregistered (Retail Customer / End Consumer with CNIC)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                      NTN Number {values.registrationType === 'Registered' ? '*' : '(Optional)'}
                    </label>
                    <input
                      name="ntnNo"
                      onChange={handleChange}
                      value={values.ntnNo}
                      placeholder="7 or 9 digit NTN (e.g. 1234567-8)"
                      className={`w-full rounded border bg-transparent text-black dark:text-white p-3 outline-none text-xs font-mono font-semibold focus:border-primary ${touched.ntnNo && errors.ntnNo ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`}
                    />
                    {touched.ntnNo && errors.ntnNo && (
                      <p className="text-red-500 text-[11px] mt-1">{errors.ntnNo as string}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-black dark:text-white flex items-center justify-between">
                      <span>Buyer STRN (Sales Tax Reg No.)</span>
                      <span className="text-[10px] text-gray-400 font-normal normal-case">Optional (FBR Sec 10)</span>
                    </label>
                    <input
                      name="stRegNo"
                      onChange={handleChange}
                      value={values.stRegNo || ''}
                      placeholder="e.g. 17-00-1234-567-89"
                      className="w-full rounded border border-stroke dark:border-strokedark bg-transparent text-black dark:text-white p-3 outline-none text-xs font-mono focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                      Physical Street Address *
                    </label>
                    <textarea
                      name="address"
                      rows={3}
                      onChange={handleChange}
                      value={values.address}
                      placeholder="Street address, Market, City, Pakistan"
                      className="w-full rounded border border-stroke dark:border-strokedark bg-transparent text-black dark:text-white p-3 outline-none text-xs focus:border-primary"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                      CNIC / National Identity No. (13 Digits)
                    </label>
                    <input
                      name="cnicNo"
                      onChange={handleChange}
                      value={values.cnicNo}
                      placeholder="e.g. 41303-1234567-1"
                      className="w-full rounded border border-stroke dark:border-strokedark bg-transparent text-black dark:text-white p-3 outline-none text-xs font-mono focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                      Primary Contact Phone *
                    </label>
                    <input
                      name="primaryPhone"
                      onChange={handleChange}
                      value={values.primaryPhone}
                      placeholder="0300-1234567"
                      className={`w-full rounded border bg-transparent text-black dark:text-white p-3 outline-none text-xs focus:border-primary ${touched.primaryPhone && errors.primaryPhone ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`}
                    />
                    {touched.primaryPhone && errors.primaryPhone && (
                      <p className="text-red-500 text-[11px] mt-1">{errors.primaryPhone as string}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                      FBR Province / Tax Jurisdiction *
                    </label>
                    <select
                      name="province"
                      onChange={handleChange}
                      value={values.province}
                      className={`w-full rounded border bg-transparent text-black dark:text-white p-3 outline-none text-xs font-semibold focus:border-primary dark:bg-boxdark ${touched.province && errors.province ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`}
                    >
                      <option value="Sindh">Sindh</option>
                      <option value="Punjab">Punjab</option>
                      <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                      <option value="Balochistan">Balochistan</option>
                      <option value="Islamabad">Islamabad (ICT)</option>
                      <option value="Azad Jammu and Kashmir">Azad Jammu and Kashmir (AJK)</option>
                      <option value="Gilgit-Baltistan">Gilgit-Baltistan (GB)</option>
                    </select>
                    {touched.province && errors.province && (
                      <p className="text-red-500 text-[11px] mt-1">{errors.province as string}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                      Client Business Entity / Branch
                    </label>
                    <select
                      name="company"
                      onChange={handleChange}
                      value={values.company}
                      className="w-full rounded border border-stroke dark:border-strokedark bg-transparent text-black dark:text-white p-3 outline-none text-xs focus:border-primary dark:bg-boxdark"
                    >
                      <option value="">-- General Customer --</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      name="followUpDate"
                      onChange={handleChange}
                      value={values.followUpDate}
                      className="w-full rounded border border-stroke dark:border-strokedark bg-transparent text-black dark:text-white p-3 outline-none text-xs focus:border-primary dark:bg-boxdark"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-6 border-t border-stroke dark:border-strokedark flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`${tenantId ? `/${tenantId}` : ''}/Customers/list`)}
                  className="bg-danger text-white py-2.5 px-8 rounded font-semibold text-xs hover:bg-opacity-90 transition shadow-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`rounded ${isEditMode ? 'bg-success' : 'bg-primary'} py-2.5 px-10 font-semibold text-xs text-white hover:bg-opacity-90 transition shadow-sm cursor-pointer disabled:bg-opacity-50`}
                >
                  {loading ? <Spinner /> : isEditMode ? 'Update Customer Profile' : 'Save Customer Profile'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default AddCustomer;

