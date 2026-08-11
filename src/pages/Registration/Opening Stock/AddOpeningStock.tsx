import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';

const AddOpeningStock = () => {
    const [loading, setLoading] = useState(false);
    const [locations, setLocations] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    const location = useLocation();
    const navigate = useNavigate();

    const editData = location.state?.stock;
    const isEditMode = !!editData;

    const blockInvalidChar = (e: React.KeyboardEvent<HTMLInputElement>) =>
        ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault();

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const { data: locData } = await supabase.from('inventory_locations').select('*');
                if (locData) setLocations(locData);

                const { data: prodData } = await supabase.from('products').select('id, product_name, retail_price, mrp');
                if (prodData) setProducts(prodData);
            } catch (err: any) {
                console.error('Metadata fetch error:', err.message);
            }
        };
        fetchMetadata();
    }, []);

    const validationSchema = Yup.object().shape({
        itemName: Yup.string().required('Required'),
        batchNumber: Yup.string().required('Required'),
        location: Yup.string().required('Required'),
        qty: Yup.number().min(1, 'Min 1').required('Required'),
        rp: Yup.number().min(0, 'Min 0').required('Required'),
        mrp: Yup.number().min(0, 'Min 0').required('Required'),
        openingDate: Yup.string().required('Required'),
        expiryDate: Yup.string().nullable(),
    });
    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            const finalValues = {
                ...values,
                amount: Number(values.qty) * Number(values.rp),
                expiryDate: values.expiryDate === "" ? null : values.expiryDate
            };

            if (isEditMode) {
                const oldQty = Number(editData.qty) || 0;
                const newQty = Number(values.qty) || 0;
                const qtyDifference = newQty - oldQty;

                const { error: stockError } = await supabase
                    .from('opening_stocks')
                    .update(finalValues)
                    .eq('id', editData.id);

                if (stockError) throw stockError;

                if (qtyDifference !== 0) {
                    const { data: currentProduct } = await supabase
                        .from('products')
                        .select('current_stock')
                        .eq('product_name', values.itemName)
                        .single();

                    if (currentProduct) {
                        await supabase
                            .from('products')
                            .update({ current_stock: (Number(currentProduct.current_stock) || 0) + qtyDifference })
                            .eq('product_name', values.itemName);
                    }

                    const { data: locStock } = await supabase
                        .from('warehouse_inventory')
                        .select('id, quantity')
                        .ilike('product_name', values.itemName)
                        .ilike('warehouse_name', values.location)
                        .maybeSingle();

                    if (locStock) {
                        await supabase
                            .from('warehouse_inventory')
                            .update({ quantity: (Number(locStock.quantity) || 0) + qtyDifference })
                            .eq('id', locStock.id);
                    } else {
                        await supabase
                            .from('warehouse_inventory')
                            .insert([{ product_name: values.itemName, warehouse_name: values.location, quantity: newQty }]);
                    }
                }

                toast.success('Stock profile updated and warehouse partitions synchronized!');
                navigate('/Inventory/OpeningStock/List');

            } else {
                const { error: stockError } = await supabase
                    .from('opening_stocks')
                    .insert([finalValues]);

                if (stockError) throw stockError;

                const { data: currentProduct } = await supabase
                    .from('products')
                    .select('current_stock')
                    .eq('product_name', values.itemName)
                    .single();

                if (currentProduct) {
                    await supabase
                        .from('products')
                        .update({ current_stock: (Number(currentProduct.current_stock) || 0) + Number(values.qty) })
                        .eq('product_name', values.itemName);
                }

                const { data: locStock } = await supabase
                    .from('warehouse_inventory')
                    .select('id, quantity')
                    .ilike('product_name', values.itemName)
                    .ilike('warehouse_name', values.location)
                    .maybeSingle();

                if (locStock) {
                    await supabase
                        .from('warehouse_inventory')
                        .update({ quantity: (Number(locStock.quantity) || 0) + Number(values.qty) })
                        .eq('id', locStock.id);
                } else {
                    await supabase
                        .from('warehouse_inventory')
                        .insert([{ product_name: values.itemName, warehouse_name: values.location, quantity: Number(values.qty) }]);
                }

                toast.success('Opening stock initialized and warehouse quantity updated successfully!');
                navigate('/Inventory/OpeningStock/List');
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const generateUniqueStockNo = () => {
        const timestamp = Date.now().toString().slice(-6);
        const randomCode = Math.floor(1000 + Math.random() * 9000);
        return `STK-${timestamp}-${randomCode}`;
    };
    return (
        <div className="mx-auto max-w-270 text-black dark:text-bodydark text-xs">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark flex justify-between items-center">
                    <h3 className="font-medium text-black dark:text-white text-base">
                        {isEditMode ? `Modify Stock: ${editData.stockNo}` : 'Initialize Opening Stock'}
                    </h3>
                    <span onClick={() => navigate('/Inventory/OpeningStock/List')} className="text-sm text-primary font-medium hover:underline cursor-pointer">
                        {isEditMode ? '← Back to List' : '👁 See List'}
                    </span>
                </div>

                <Formik
                    initialValues={editData || {
                        stockNo: generateUniqueStockNo(),
                        itemName: '', batchNumber: '', location: '',
                        qty: 1, rp: 0, mrp: 0, amount: 0,
                        openingDate: new Date().toISOString().split('T'),
                        expiryDate: ''
                    }}
                    enableReinitialize={false}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                >
                    {({ handleChange, setFieldValue, values, errors, touched }) => {
                        const calculatedAmount = (Number(values.qty) * Number(values.rp)).toFixed(2);

                        return (
                            <Form className="p-6.5">
                                <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-xs font-semibold text-gray-500">Stock Number (Auto Generated)</label>
                                        <input name="stockNo" readOnly value={values.stockNo} className="w-full rounded border border-stroke bg-gray-50 dark:bg-meta-4/10 px-3 h-10 text-xs font-bold outline-none text-black dark:text-white" />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-semibold text-gray-500">Item Name (Product) *</label>
                                        <select
                                            name="itemName"
                                            value={values.itemName}
                                            onChange={(e) => {
                                                const selectedProd = products.find(p => p.product_name === e.target.value);
                                                setFieldValue('itemName', e.target.value);
                                                if (selectedProd) {
                                                    setFieldValue('rp', selectedProd.retail_price || 0);
                                                    setFieldValue('mrp', selectedProd.mrp || 0);
                                                }
                                            }}
                                            className={`w-full rounded border px-3 h-10 bg-transparent text-xs font-bold outline-none focus:border-primary dark:bg-boxdark text-black dark:text-white ${touched.itemName && errors.itemName ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`}
                                        >
                                            <option value="" className="dark:bg-boxdark">-- Select Existing Product --</option>
                                            {products.map((p) => <option key={p.id} value={p.product_name} className="dark:bg-boxdark">{p.product_name}</option>)}
                                        </select>
                                        {touched.itemName && errors.itemName && <p className="text-red-500 text-[10px] mt-1 font-semibold">{String(errors.itemName)}</p>}
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-semibold text-gray-500">Batch Number *</label>
                                        <input name="batchNumber" onChange={handleChange} value={values.batchNumber} placeholder="e.g., BN-001" className={`w-full rounded border px-3 h-10 bg-transparent text-xs text-black dark:text-white ${touched.batchNumber && errors.batchNumber ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`} />
                                        {touched.batchNumber && errors.batchNumber && <p className="text-red-500 text-[10px] mt-1 font-semibold">{String(errors.batchNumber)}</p>}
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-semibold text-gray-500">Location / Warehouse *</label>
                                        <select
                                            name="location"
                                            onChange={handleChange}
                                            value={values.location}
                                            className={`w-full rounded border px-3 h-10 bg-transparent text-xs font-bold outline-none focus:border-primary dark:bg-boxdark text-black dark:text-white ${touched.location && errors.location ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`}
                                        >
                                            <option value="" className="dark:bg-boxdark">-- Select Warehouse --</option>
                                            {locations.map((loc) => {
                                                const label = loc.name || loc.locationName || loc.location_name;
                                                return <option key={loc.id} value={label} className="dark:bg-boxdark">{label}</option>;
                                            })}
                                        </select>
                                        {touched.location && errors.location && <p className="text-red-500 text-[10px] mt-1 font-semibold">{String(errors.location)}</p>}
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-semibold text-gray-500">Quantity *</label>
                                        <input type="number" name="qty" min="1" onKeyDown={blockInvalidChar} onChange={handleChange} value={values.qty} className={`w-full rounded border px-3 h-10 bg-transparent text-xs text-right font-bold text-black dark:text-white ${touched.qty && errors.qty ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`} />
                                        {touched.qty && errors.qty && <p className="text-red-500 text-[10px] mt-1 font-semibold">{String(errors.qty)}</p>}
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-semibold text-gray-500">Retail Price (R.P) *</label>
                                        <input type="number" name="rp" min="0" onKeyDown={blockInvalidChar} onChange={handleChange} value={values.rp} className={`w-full rounded border px-3 h-10 bg-transparent text-xs text-right font-bold text-black dark:text-white ${touched.rp && errors.rp ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`} />
                                        {touched.rp && errors.rp && <p className="text-red-500 text-[10px] mt-1 font-semibold">{String(errors.rp)}</p>}
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-semibold text-gray-500">Maximum Retail Price (MRP) *</label>
                                        <input type="number" name="mrp" min="0" onKeyDown={blockInvalidChar} onChange={handleChange} value={values.mrp} className={`w-full rounded border px-3 h-10 bg-transparent text-xs text-right font-bold text-black dark:text-white ${touched.mrp && errors.mrp ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`} />
                                        {touched.mrp && errors.mrp && <p className="text-red-500 text-[10px] mt-1 font-semibold">{String(errors.mrp)}</p>}
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-semibold text-gray-500">Opening Date *</label>
                                        <input type="date" name="openingDate" onChange={handleChange} value={values.openingDate} className={`w-full rounded border px-3 h-10 bg-transparent text-xs text-black dark:text-white ${touched.openingDate && errors.openingDate ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`} />
                                        {touched.openingDate && errors.openingDate && <p className="text-red-500 text-[10px] mt-1 font-semibold">{String(errors.openingDate)}</p>}
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-semibold text-gray-500">Expiry Date</label>
                                        <input type="date" name="expiryDate" onChange={handleChange} value={values.expiryDate || ''} className="w-full rounded border border-stroke dark:border-strokedark px-3 h-10 bg-transparent text-xs text-black dark:text-white" />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="mb-2 block text-xs font-semibold text-gray-500">Total Value Amount (PKR)</label>
                                        <input readOnly value={`Rs. ${Number(calculatedAmount).toLocaleString()}`} className="w-full rounded border border-stroke bg-gray-100 dark:bg-meta-4/20 px-3 h-11 text-sm font-extrabold text-success outline-none text-right" />
                                    </div>
                                </div>

                                <div className="pt-4 mt-4 border-t border-stroke dark:border-strokedark flex justify-end gap-3">
                                    <button type="button" onClick={() => navigate('/Inventory/OpeningStock/List')} className="bg-danger text-white py-2 px-8 rounded font-medium hover:bg-opacity-90 transition shadow-sm cursor-pointer"
                                    >Cancel</button>
                                    <button type="submit" disabled={loading} className="bg-success text-white py-2.5 px-12 rounded font-semibold text-sm hover:bg-opacity-90 transition shadow-sm disabled:opacity-40 cursor-pointer">{loading ? <Spinner /> : isEditMode ? 'Update Stock' : 'Save Stock'}</button>
                                </div>
                            </Form>
                        );
                    }}
                </Formik>
            </div>
        </div>
    );
};

export default AddOpeningStock;
