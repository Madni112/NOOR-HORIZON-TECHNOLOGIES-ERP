import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import { useAuth } from '../../../Context/Auth';

interface UomItem {
  id: number;
  short_code: string;
  full_name: string;
  category: string;
  is_active: boolean;
}

const AddProduct = () => {
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(true);
  
  // States tracking live master database lists parameters
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);

  const [groupedUoms, setGroupedUoms] = useState<{ [key: string]: UomItem[] }>({});

  const location = useLocation();
  const navigate = useNavigate();

  const editData = location.state?.product;
  const isEditMode = !!editData;


  useEffect(() => {
    const fetchAllMasterMetadata = async () => {
      try {
        setMetadataLoading(true);
        const activeTenant = tenantId || 'bashir';
        
        // Fetch categories and brands from your custom tables asynchronously
        const { data: catData } = await supabase.from('inventory_categories').select('id, name').order('name', { ascending: true });
        const { data: brandData } = await supabase.from('inventory_brands').select('id, name').order('name', { ascending: true });
        
        // Strict safety checker filter: Only load international units toggled ON by the manager switchboard for this tenant
        const { data: uomData } = await supabase
          .from('inventory_uom')
          .select('*')
          .eq('tenant_id', activeTenant)
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('short_code', { ascending: true });

        if (catData) setCategories(catData);
        if (brandData) setBrands(brandData);
        
        if (uomData) {
          // Group active units dynamically by their uppercase headers
          const groups = uomData.reduce((acc: { [key: string]: UomItem[] }, curr: UomItem) => {
            if (!acc[curr.category]) acc[curr.category] = [];
            acc[curr.category].push(curr);
            return acc;
          }, {});
          setGroupedUoms(groups);
        }
      } catch (err: any) {
        console.error('Metadata layer aggregation failure: ', err.message);
        toast.error('Failed to load active setup configurations lists');
      } finally {
        setMetadataLoading(false);
      }
    };

    fetchAllMasterMetadata();
  }, []);

  const validationSchema = Yup.object().shape({
    productName: Yup.string().required('Required'),
    uom: Yup.string().required('Required'),
    retailPrice: Yup.number().typeError('Must be a number').min(0).required('Required'),
    mrp: Yup.number().typeError('Must be a number').min(0).required('Required'),
    purchasePrice: Yup.number().typeError('Must be a number').min(0).required('Required'),
    hsCode: Yup.string().required('Required'),
  });

  const blockInvalidChar = (e: React.KeyboardEvent<HTMLInputElement>) => 
    ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault();

  if (metadataLoading) {
    return (
      <div className="flex h-48 items-center justify-center bg-white dark:bg-boxdark rounded-sm border border-stroke dark:border-strokedark">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        
        <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark flex justify-between items-center">
          <h3 className="font-semibold text-black dark:text-white text-base">
            {isEditMode ? `Edit Product: ${editData.product_name}` : 'Add New Product'}
          </h3>
          <button
            onClick={() => navigate('/Administration/Products/List')}
            className="text-sm font-medium text-primary hover:underline"
          >
            Back to List
          </button>
        </div>

        <Formik
          initialValues={editData ? {
            productName: editData.product_name || '',
            category: editData.category || '',
            brand: editData.brand || '',
            uom: editData.uom || '',
            productDescription: editData.product_description || '',
            profit: editData.profit || 0,
            purchasePrice: editData.purchase_price || 0,
            scenarioName: editData.scenario_name || '',
            mrp: editData.mrp || 0,
            retailPrice: editData.retail_price || 0,
            hsCode: editData.hs_code || '',
            itemSrNo: editData.item_sr_no || '',
            sroScheduleNo: editData.sro_schedule_no || '',
          } : {
            productName: '',
            category: '',
            brand: '',
            uom: '',
            productDescription: '',
            profit: 0,
            purchasePrice: '',
            scenarioName: '',
            mrp: '',
            retailPrice: '',
            hsCode: '',
            itemSrNo: '',
            sroScheduleNo: '',
          }}
          enableReinitialize={true}
          validationSchema={validationSchema}
          onSubmit={async (values) => {
            setLoading(true);
            const computedProfit = (Number(values.retailPrice) || 0) - (Number(values.purchasePrice) || 0);

            const databasePayload = {
              product_name: values.productName.trim(),
              category: values.category,
              brand: values.brand,
              uom: values.uom,
              product_description: values.productDescription.trim(),
              profit: computedProfit,
              purchase_price: Number(values.purchasePrice) || 0,
              scenario_name: values.scenarioName,
              mrp: Number(values.mrp) || 0,
              retail_price: Number(values.retailPrice) || 0,
              hs_code: values.hsCode.trim(),
              item_sr_no: values.itemSrNo.trim(),
              sro_schedule_no: values.sroScheduleNo.trim(),
            };

            try {
              if (isEditMode) {
                const { error } = await supabase
                  .from('products')
                  .update(databasePayload)
                  .eq('id', editData.id);

                if (error) throw error;
                toast.success('Product updated successfully!');
              } else {
                const { error } = await supabase
                  .from('products')
                  .insert([databasePayload]);

                if (error) throw error;
                toast.success('Product profile saved successfully!');
              }
              navigate('/Administration/Products/List');
            } catch (err: any) {
              toast.error('Database Operation Failure: ' + err.message);
            } finally {
              setLoading(false);
            }
          }}
        >
          {({ handleChange, values, errors, touched, setFieldValue }) => {
            
            useEffect(() => {
              const rPrice = Number(values.retailPrice) || 0;
              const pPrice = Number(values.purchasePrice) || 0;
              setFieldValue('profit', (rPrice - pPrice).toFixed(2));
            }, [values.retailPrice, values.purchasePrice, setFieldValue]);

            return (
              <Form className="p-6.5 text-xs text-gray-600 dark:text-gray-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
                  
                  {/* LEFT INPUT COLUMN CLUSTER */}
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block font-medium text-black dark:text-white">Product Name *</label>
                      <input type="text" name="productName" onChange={handleChange} value={values.productName} className={`w-full rounded border p-2 bg-transparent outline-none focus:border-primary ${touched.productName && errors.productName ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`} placeholder="Enter Product Name" />
                    </div>

                    <div>
                      <label className="mb-1 block font-medium text-black dark:text-white">Product Category *</label>
                      <select name="category" onChange={handleChange} value={values.category} className={`w-full rounded border p-2 bg-transparent outline-none focus:border-primary font-bold text-black dark:text-white ${touched.category && errors.category ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`}>
                        <option value="" className="bg-white dark:bg-boxdark font-semibold text-black dark:text-white text-xs normal-case tracking-normal py-1">Select Category</option>
                        {categories.map(c => <option key={c.id} value={c.name} className="bg-white dark:bg-boxdark font-semibold text-black dark:text-white text-xs normal-case tracking-normal py-1">{c.name}</option>)}
                      </select>
                    </div>

                    <div>
                      {/* DYNAMIC PACKAGING ACCORDION DROPDOWN VIEW FILTERED BY SWITCHBOARD ON/OFF STATUS */}
                      <label className="mb-1 block font-medium text-black dark:text-white">UOM *</label>
                      <select name="uom" onChange={handleChange} value={values.uom} className={`w-full rounded border p-2 bg-transparent outline-none focus:border-primary font-bold text-primary ${touched.uom && errors.uom ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`}>
                        <option value="" className="font-normal text-gray-400">Select UOM</option>
                        {Object.keys(groupedUoms).map((categoryName) => (
                          <optgroup key={categoryName} label={categoryName} className="bg-gray-100 dark:bg-meta-4 text-[10px] tracking-wide uppercase font-extrabold text-primary py-1">
                            {groupedUoms[categoryName].map((uom) => (
                              <option key={uom.id} value={uom.short_code} className="bg-white dark:bg-boxdark font-semibold text-black dark:text-white text-xs normal-case tracking-normal py-1">
                                {`${uom.short_code} = ${uom.full_name}`}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block font-medium text-black dark:text-white">Brand *</label>
                      <select name="brand" onChange={handleChange} value={values.brand} className={`w-full rounded border p-2 bg-transparent outline-none focus:border-primary font-bold text-black dark:text-white ${touched.brand && errors.brand ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`}>
                        <option value="" className="bg-white dark:bg-boxdark font-semibold text-black dark:text-white text-xs normal-case tracking-normal py-1">Select Brand</option>
                        {brands.map(b => <option key={b.id} value={b.name} className="bg-white dark:bg-boxdark font-semibold text-black dark:text-white text-xs normal-case tracking-normal py-1">{b.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block font-medium text-black dark:text-white">Product Description</label>
                      <input type="text" name="productDescription" onChange={handleChange} value={values.productDescription} className="w-full rounded border border-stroke dark:border-strokedark p-2 bg-transparent outline-none focus:border-primary" placeholder="Enter Description details" />
                    </div>

                    <div>
                      <label className="mb-1 block font-medium text-black dark:text-white">Profit</label>
                      <input type="text" name="profit" readOnly value={values.profit} className="w-full rounded border border-stroke dark:bg-meta-4/20 bg-gray-100 p-2 outline-none font-bold text-success" />
                    </div>

                    <div>
                      <label className="mb-1 block font-medium text-black dark:text-white">Purchase Price *</label>
                      <input type="number" name="purchasePrice" onKeyDown={blockInvalidChar} onChange={handleChange} value={values.purchasePrice} className={`w-full rounded border p-2 bg-transparent outline-none focus:border-primary ${touched.purchasePrice && errors.purchasePrice ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`} placeholder="0.00" />
                    </div>
                  </div>

                  {/* RIGHT INPUT COLUMN CLUSTER */}
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block font-medium text-black dark:text-white">Scenario Name</label>
                      <input type="text" name="scenarioName" onChange={handleChange} value={values.scenarioName} className="w-full rounded border border-stroke dark:border-strokedark p-2 bg-transparent outline-none focus:border-primary" placeholder="Enter scenario reference" />
                    </div>

                    <div>
                      <label className="mb-1 block font-medium text-black dark:text-white">MRP Price *</label>
                      <input type="number" name="mrp" onKeyDown={blockInvalidChar} onChange={handleChange} value={values.mrp} className={`w-full rounded border p-2 bg-transparent outline-none focus:border-primary ${touched.mrp && errors.mrp ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`} placeholder="0.00" />
                    </div>

                    <div>
                      <label className="mb-1 block font-medium text-black dark:text-white">Retail Price *</label>
                      <input type="number" name="retailPrice" onKeyDown={blockInvalidChar} onChange={handleChange} value={values.retailPrice} className={`w-full rounded border p-2 bg-transparent outline-none focus:border-primary ${touched.retailPrice && errors.retailPrice ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`} placeholder="0.00" />
                    </div>

                    <div>
                      <label className="mb-1 block font-medium text-black dark:text-white">HS Code *</label>
                      <input type="text" name="hsCode" onChange={handleChange} value={values.hsCode} className={`w-full rounded border p-2 bg-transparent outline-none focus:border-primary ${touched.hsCode && errors.hsCode ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`} placeholder="Enter HS Code reference" />
                    </div>

                    <div>
                      <label className="mb-1 block font-medium text-black dark:text-white">Item Sr. No</label>
                      <input type="text" name="itemSrNo" onChange={handleChange} value={values.itemSrNo} className="w-full rounded border border-stroke dark:border-strokedark p-2 bg-transparent outline-none focus:border-primary" placeholder="Enter Serial number" />
                    </div>

                    <div>
                      <label className="mb-1 block font-medium text-black dark:text-white">SRO / Schedule No</label>
                      <input type="text" name="sroScheduleNo" onChange={handleChange} value={values.sroScheduleNo} className="w-full rounded border border-stroke dark:border-strokedark p-2 bg-transparent outline-none focus:border-primary" placeholder="Enter SRO or Schedule details" />
                    </div>

                    <div>
                      <label className="mb-1 block font-medium text-black dark:text-white">Product Image</label>
                      <input type="file" disabled className="w-full rounded border border-stroke dark:border-strokedark p-1 bg-transparent text-gray-400 cursor-not-allowed text-xs" />
                    </div>
                  </div>

                </div>

                {/* CREATE FORM ACTIONS STRIP */}
                <div className="mt-8 flex justify-end gap-3 border-t border-stroke dark:border-strokedark pt-4">
                  <button
                    type="button"
                    onClick={() => navigate('/Administration/Products/List')}
                    className="rounded bg-danger py-2 px-6 font-medium text-white hover:bg-opacity-90 transition shadow-sm text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`rounded ${isEditMode ? "bg-success" : "bg-primary"} py-2 px-6 font-medium text-white hover:bg-opacity-90 transition disabled:bg-opacity-40 shadow-sm text-xs`}>
                    {loading ? <Spinner /> : isEditMode ? 'Update Product' : 'Save Product'}
                  </button>
                </div>

              </Form>
            );
          }}
        </Formik>

      </div>
    </div>
  );
};

export default AddProduct;
