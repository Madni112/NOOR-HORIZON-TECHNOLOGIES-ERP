import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Formik, Form, FieldArray } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import { useAuth } from '../../../Context/Auth';

const AddPurchases = () => {
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(false);

  const [metadataLoading, setMetadataLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [productList, setProductList] = useState<any[]>([]);
  const [bankAccountsList, setBankAccountsList] = useState<any[]>([]);

  const location = useLocation();
  const navigate = useNavigate();

  const editData = location.state?.purchaseRecord;
  const isEditMode = !!editData;

  useEffect(() => {
    const fetchPurchaseMetadata = async () => {
      try {
        setMetadataLoading(true);
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendors')
          .select('id, vendor_name')
          .order('vendor_name', { ascending: true });

        if (vendorError) throw vendorError;

        const { data: locData } = await supabase.from('inventory_locations').select('id, name').order('name', { ascending: true });
        const { data: prodData } = await supabase.from('products').select('id, product_name, purchase_price, uom');
        const { data: bankData } = await supabase.from('banks').select('id, bankName, accountTitle, accountNumber');

        if (vendorData) setSuppliers(vendorData);
        if (locData) setLocations(locData);
        if (prodData) setProductList(prodData);
        if (bankData) setBankAccountsList(bankData);
      } catch (err: any) {
        toast.error('Failed to load system procurement metadata lookup profiles: ' + err.message);
      } finally {
        setMetadataLoading(false);
      }
    };
    fetchPurchaseMetadata();
  }, []);

  const validationSchema = Yup.object().shape({
    supplierName: Yup.string().required('Vendor identity corporate name selection is mandatory'),
    targetWarehouse: Yup.string().required('Destination stock receiving warehouse selection is mandatory'),
    purchaseDate: Yup.string().required('Required'),
    purchaseType: Yup.string().required('Required'),
    paymentTerm: Yup.string().required('Required'),
    amountPaid: Yup.number().typeError('Must be a number').min(0, 'Cannot be negative').required('Required'),
    selectedBankId: Yup.string().when('paymentTerm', {
      is: 'By Bank',
      then: () => Yup.string().required('Please select the corresponding active operational bank account profile link to map records'),
      otherwise: () => Yup.string().nullable()
    }),
    items: Yup.array().of(
      Yup.object().shape({
        itemName: Yup.string().required('Required'),
        qty: Yup.number().typeError('Numeric lines only').min(1, 'Min 1').required('Required'),
        rate: Yup.number().typeError('Numeric lines only').min(0, 'Min 0').required('Required'),
        gstRate: Yup.number().min(0).nullable(),
        gstAmt: Yup.number().min(0).nullable(),
        discountPer: Yup.number().min(0).nullable(),
        discountAmt: Yup.number().min(0).nullable()
      })
    ).min(1)
  });

  const calculatePurchaseLineTotals = (item: any, purchaseType: string) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const grossTotal = qty * rate;

    if (purchaseType === 'No Tax') {
      return { grossTotal, gstAmt: 0, discountAmt: 0, netTotal: grossTotal };
    }

    const gstAmt = Number(item.gstAmt) || 0;
    const discountAmt = Number(item.discountAmt) || 0;

    const remainingCost = Math.max(0, grossTotal - discountAmt);
    const netTotal = Math.max(0, remainingCost + gstAmt);

    return { grossTotal, gstAmt, discountAmt, netTotal };
  };

  const blockInvalidChar = (e: React.KeyboardEvent<HTMLInputElement>) =>
    ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault();

  if (metadataLoading) return <div className="flex h-48 items-center justify-center"><Spinner /></div>;

  const getFormInitialValues = () => {
    if (isEditMode && editData) {
      const rawItems = Array.isArray(editData.items) ? editData.items : JSON.parse(editData.items || '[]');
      return {
        purchaseNo: editData.purchase_no || '',
        supplierName: editData.supplier_name || '',
        targetWarehouse: editData.target_warehouse || '',
        purchaseDate: editData.purchase_date || new Date().toISOString().split('T')[0],
        purchaseType: editData.purchase_type || editData.metadata?.purchaseType || 'No Tax',
        paymentTerm: editData.payment_term || 'By Cash',
        selectedBankId: editData.metadata?.selectedBankId || '',
        amountPaid: editData.amount_paid || 0,
        remarks: editData.remarks || '',
        items: rawItems.map((it: any) => ({
          ...it,
          gstRate: Number(it.gstRate ?? it.gst_rate ?? 0),
          gstAmt: Number(it.gstAmt ?? it.gst_amt ?? 0),
          discountPer: Number(it.discountPer ?? it.discount_per ?? 0),
          discountAmt: Number(it.discountAmt ?? it.discount_amt ?? 0)
        }))
      };
    }
    return {
      purchaseNo: `PUR-${Date.now().toString().slice(-6)}`,
      supplierName: '',
      targetWarehouse: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseType: 'No Tax',
      paymentTerm: 'By Cash',
      selectedBankId: '',
      amountPaid: 0,
      remarks: '',
      items: [{ itemName: '', qty: 1, rate: 0, uom: 'Nos', gstRate: 0, gstAmt: 0, discountPer: 0, discountAmt: 0 }]
    };
  };

  return (
    <div className="mx-auto max-w-full text-black dark:text-bodydark text-xs">
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark flex justify-between items-center">
          <h3 className="font-semibold text-black dark:text-white text-base">
            {isEditMode ? 'Modify Supplier Purchase Record Slip' : 'Log New Supplier Stock Procurement Arrival'}
          </h3>
          <button type="button" onClick={() => navigate(`${tenantId ? `/${tenantId}` : ''}/Purchase/Purchases/List`)} className="text-sm font-medium text-primary hover:underline cursor-pointer">
            Back to Dashboard
          </button>

        </div>

        <Formik
          initialValues={getFormInitialValues()}
          enableReinitialize={true}
          validationSchema={validationSchema}
          onSubmit={async (values) => {
            try {
              setLoading(true);
              let totalBillAmountSum = 0;
              values.items.forEach((i: any) => {
                totalBillAmountSum += calculatePurchaseLineTotals(i, values.purchaseType).netTotal;
              });

              const actualAmountPaidNum = Number(values.amountPaid) || 0;
              let computedDynamicTerm = values.paymentTerm;

              if (actualAmountPaidNum < totalBillAmountSum) {
                computedDynamicTerm = 'On Credit';
              }

              const databasePayload = {
                purchase_no: values.purchaseNo,
                supplier_name: values.supplierName,
                target_warehouse: values.targetWarehouse,
                purchase_date: values.purchaseDate,
                purchase_type: values.purchaseType,
                payment_term: computedDynamicTerm,
                remarks: values.remarks.trim(),
                total_amount: totalBillAmountSum,
                amount_paid: actualAmountPaidNum,
                items: values.items,
                metadata: {
                  selectedBankId: values.paymentTerm === 'By Bank' ? values.selectedBankId : null,
                  purchaseType: values.purchaseType
                }
              };

              if (isEditMode) {
                const { data: oldPur } = await supabase.from('supplier_purchases').select('items, target_warehouse').eq('id', editData.id).single();
                if (oldPur?.items) {
                  for (const oldItem of oldPur.items) {
                    const { data: p } = await supabase.from('warehouse_inventory').select('id, quantity').ilike('product_name', oldItem.itemName).ilike('warehouse_name', oldPur.target_warehouse).maybeSingle();
                    if (p) await supabase.from('warehouse_inventory').update({ quantity: Math.max(0, Number(p.quantity) - Number(oldItem.qty)) }).eq('id', p.id);
                  }
                }
                const { error } = await supabase.from('supplier_purchases').update(databasePayload).eq('id', editData.id);
                if (error) throw error;
                for (const newItem of values.items) {
                  const { data: p } = await supabase.from('warehouse_inventory').select('id, quantity').ilike('product_name', newItem.itemName).ilike('warehouse_name', values.targetWarehouse).maybeSingle();
                  if (p) await supabase.from('warehouse_inventory').update({ quantity: Number(p.quantity) + Number(newItem.qty) }).eq('id', p.id);
                }
              } else {
                const { error } = await supabase.from('supplier_purchases').insert([databasePayload]);
                if (error) throw error;
                for (const item of values.items) {
                  const { data: p } = await supabase.from('warehouse_inventory').select('id, quantity').ilike('product_name', item.itemName).ilike('warehouse_name', values.targetWarehouse).maybeSingle();
                  if (p) {
                    await supabase.from('warehouse_inventory').update({ quantity: Number(p.quantity) + Number(item.qty) }).eq('id', p.id);
                  } else {
                    await supabase.from('warehouse_inventory').insert([{ product_name: item.itemName, warehouse_name: values.targetWarehouse, quantity: Number(item.qty) }]);
                  }
                }
              }

              toast.success('Procurement inventory batch arrival mapped successfully!');
              navigate(`${tenantId ? `/${tenantId}` : ''}/Purchase/Purchases/List`);

            } catch (err: any) {
              toast.error('Submission Interrupted: ' + err.message);
            } finally {
              setLoading(false);
            }
          }}
        >
          {({ handleChange, values, errors, touched, setFieldValue }) => (
            <Form className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-gray-500 mb-1.5 font-bold">Purchase Order Ref #:</label>
                    <input type="text" readOnly value={values.purchaseNo} className="w-full border border-stroke dark:border-strokedark rounded p-2 bg-gray-50 dark:bg-meta-4/20 font-bold font-mono text-primary outline-none text-xs" />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1.5 font-bold">Wholesale Vendor: *</label>
                    <select name="supplierName" onChange={handleChange} value={values.supplierName} className={`w-full border rounded p-2 bg-transparent outline-none text-black dark:text-white font-semibold focus:border-primary text-xs ${touched.supplierName && errors.supplierName ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`}>
                      <option value="">-- Choose Vendor --</option>
                      {suppliers.map(s => <option key={s.id} value={s.vendor_name}>{s.vendor_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1.5 font-bold">Receiving Warehouse: *</label>
                    <select name="targetWarehouse" onChange={handleChange} value={values.targetWarehouse} className={`w-full border rounded p-2 bg-transparent outline-none text-black dark:text-white font-semibold focus:border-primary text-xs ${touched.targetWarehouse && errors.targetWarehouse ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`}>
                      <option value="">-- Choose Stock Destination Bin --</option>
                      {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1.5 font-bold">Payment Method Gateway: *</label>
                    <select name="paymentTerm" onChange={handleChange} value={values.paymentTerm} className="w-full rounded border border-stroke p-2 bg-transparent text-xs text-black dark:text-white font-bold outline-none focus:border-primary dark:bg-boxdark">
                      <option value="By Cash">By Cash</option>
                      <option value="By Bank">By Bank</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1.5 font-bold">Inbound Entry Date: *</label>
                    <input type="date" name="purchaseDate" onChange={handleChange} value={values.purchaseDate} className="w-full border border-stroke dark:border-strokedark rounded p-2 bg-transparent outline-none font-bold text-black dark:text-white focus:border-primary text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-primary mb-1.5 font-bold">Taxation & Purchase Statutory Type: *</label>
                    <select
                      name="purchaseType"
                      onChange={(e) => {
                        const val = e.target.value;
                        setFieldValue('purchaseType', val);
                        if (val === 'No Tax') {
                          values.items.forEach((_: any, idx: number) => {
                            setFieldValue(`items.${idx}.gstRate`, 0);
                            setFieldValue(`items.${idx}.gstAmt`, 0);
                            setFieldValue(`items.${idx}.discountPer`, 0);
                            setFieldValue(`items.${idx}.discountAmt`, 0);
                          });
                        }
                      }}
                      value={values.purchaseType}
                      className="w-full rounded border border-primary p-2 bg-white dark:bg-boxdark text-xs text-primary font-black outline-none focus:border-primary"
                    >
                      <option value="No Tax">No Tax</option>
                      <option value="GST First, Then Discount">3rd Schedule Item</option>
                      <option value="Discount First, Then GST">GST Standard Item</option>
                    </select>
                  </div>
                </div>
              </div>

              {values.paymentTerm === 'By Bank' && (
                <div className="p-4 bg-primary/5 rounded border border-primary/20 animate-fade-in md:w-1/2">
                  <label className="block text-primary dark:text-white font-bold mb-1.5 uppercase text-[11px]">Select Source Account Vault Bank: *</label>
                  <select name="selectedBankId" onChange={handleChange} value={values.selectedBankId} className={`w-full rounded border p-2 bg-white dark:bg-boxdark font-bold text-black dark:text-white outline-none text-xs focus:border-primary ${touched.selectedBankId && errors.selectedBankId ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`}>
                    <option value="">-- Choose Account Wire Origin --</option>
                    {bankAccountsList.map(b => <option key={b.id} value={b.bankName}>{b.bankName} - {b.accountTitle} ({b.accountNumber || '-'})</option>)}
                  </select>
                  {touched.selectedBankId && errors.selectedBankId && <p className="text-red-500 font-bold text-[10px] mt-1">⚠️ {String(errors.selectedBankId)}</p>}
                </div>
              )}

              <div className="border border-stroke dark:border-strokedark rounded p-4 overflow-x-auto">
                <table className="w-full border-collapse border border-stroke dark:border-strokedark text-center min-w-[1200px]">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-meta-4 font-bold text-black dark:text-white text-xs uppercase border-b border-stroke dark:border-strokedark">
                      <th className="p-2 border w-12">S#</th>
                      <th className="p-2 border text-left pl-4">Product Item Catalog Selection</th>
                      <th className="p-2 border w-20">UOM</th>
                      <th className="p-2 border w-24">Arrived Qty</th>
                      <th className="p-2 border w-28 text-right pr-2">Cost Price (Unit)</th>
                      <th className="p-2 border w-20 text-center">GST %</th>
                      <th className="p-2 border w-28 text-right pr-2">GST Amt</th>
                      <th className="p-2 border w-20 text-center">Discount %</th>
                      <th className="p-2 border w-28 text-right pr-2">Discount Amt</th>
                      <th className="p-2 border w-36 text-right pr-4">Net Value Amount</th>
                      <th className="p-2 border w-12"></th>
                    </tr>
                  </thead>
                  <FieldArray name="items">
                    {({ push, remove }) => {
                      const isNoTax = values.purchaseType === 'No Tax';
                      return (
                        <tbody>
                          {values.items.map((item: any, index: number) => {
                            const matchedProduct = productList.find(p => p.product_name === item.itemName);
                            const currentUomString = matchedProduct ? matchedProduct.uom : 'Nos';
                            const lineTotals = calculatePurchaseLineTotals(item, values.purchaseType);

                            return (
                              <tr key={index} className="bg-white dark:bg-boxdark text-xs border-b border-stroke dark:border-strokedark text-black dark:text-white">
                                <td className="p-2 border font-medium">{index + 1}</td>
                                <td className="p-2 border">
                                  <select
                                    name={`items.${index}.itemName`}
                                    value={item.itemName}
                                    onChange={(e) => {
                                      handleChange(e);
                                      const match = productList.find(p => p.product_name === e.target.value);
                                      if (match) {
                                        setFieldValue(`items.${index}.rate`, match.purchase_price || 0);
                                        setFieldValue(`items.${index}.uom`, match.uom || 'Nos');
                                      }
                                    }}
                                    className="w-full rounded border p-2 bg-transparent outline-none focus:border-primary font-bold text-black dark:text-white border-stroke dark:border-strokedark text-xs"
                                  >
                                    <option value="">-- Choose Product --</option>
                                    {productList.map(p => <option key={p.id} value={p.product_name}>{p.product_name}</option>)}
                                  </select>
                                </td>
                                <td className="p-2 border text-gray-400 font-semibold uppercase">{currentUomString}</td>
                                <td className="p-2 border w-24">
                                  <input
                                    type="number"
                                    name={`items.${index}.qty`}
                                    onKeyDown={blockInvalidChar}
                                    onChange={(e) => {
                                      handleChange(e);
                                      const newQty = Number(e.target.value) || 0;
                                      const cost = Number(item.rate) || 0;
                                      const gross = newQty * cost;
                                      if (!isNoTax) {
                                        if (values.purchaseType === 'GST First, Then Discount') {
                                          const gAmt = (gross * (Number(item.gstRate) || 0)) / 100;
                                          setFieldValue(`items.${index}.gstAmt`, Number(gAmt.toFixed(2)));
                                          const afterGst = Math.max(0, gross - gAmt);
                                          const dAmt = (afterGst * (Number(item.discountPer) || 0)) / 100;
                                          setFieldValue(`items.${index}.discountAmt`, Number(dAmt.toFixed(2)));
                                        } else if (values.purchaseType === 'Discount First, Then GST') {
                                          const dAmt = (gross * (Number(item.discountPer) || 0)) / 100;
                                          setFieldValue(`items.${index}.discountAmt`, Number(dAmt.toFixed(2)));
                                          const afterDis = Math.max(0, gross - dAmt);
                                          const gAmt = (afterDis * (Number(item.gstRate) || 0)) / 100;
                                          setFieldValue(`items.${index}.gstAmt`, Number(gAmt.toFixed(2)));
                                        }
                                      }
                                    }}
                                    value={item.qty}
                                    className="w-full text-center outline-none border border-stroke rounded p-1 font-bold text-black dark:text-white bg-transparent focus:border-primary dark:border-strokedark text-xs"
                                  />
                                </td>
                                <td className="p-2 border w-28">
                                  <input
                                    type="number"
                                    name={`items.${index}.rate`}
                                    onKeyDown={blockInvalidChar}
                                    onChange={(e) => {
                                      handleChange(e);
                                      const newCost = Number(e.target.value) || 0;
                                      const qty = Number(item.qty) || 0;
                                      const gross = qty * newCost;
                                      if (!isNoTax) {
                                        if (values.purchaseType === 'GST First, Then Discount') {
                                          const gAmt = (gross * (Number(item.gstRate) || 0)) / 100;
                                          setFieldValue(`items.${index}.gstAmt`, Number(gAmt.toFixed(2)));
                                          const afterGst = Math.max(0, gross - gAmt);
                                          const dAmt = (afterGst * (Number(item.discountPer) || 0)) / 100;
                                          setFieldValue(`items.${index}.discountAmt`, Number(dAmt.toFixed(2)));
                                        } else if (values.purchaseType === 'Discount First, Then GST') {
                                          const dAmt = (gross * (Number(item.discountPer) || 0)) / 100;
                                          setFieldValue(`items.${index}.discountAmt`, Number(dAmt.toFixed(2)));
                                          const afterDis = Math.max(0, gross - dAmt);
                                          const gAmt = (afterDis * (Number(item.gstRate) || 0)) / 100;
                                          setFieldValue(`items.${index}.gstAmt`, Number(gAmt.toFixed(2)));
                                        }
                                      }
                                    }}
                                    value={item.rate}
                                    className="w-full text-right pr-2 outline-none border border-stroke rounded p-1 font-bold text-black dark:text-white bg-transparent focus:border-primary dark:border-strokedark text-xs"
                                  />
                                </td>

                                 {/* GST % Column */}
                                <td className="p-2 border w-20">
                                  <input
                                    type="number"
                                    disabled={isNoTax}
                                    onKeyDown={blockInvalidChar}
                                    name={`items.${index}.gstRate`}
                                    value={isNoTax ? 0 : item.gstRate ?? 0}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFieldValue(`items.${index}.gstRate`, val);
                                      const rateVal = Number(val) || 0;
                                      const gross = (Number(item.qty) || 0) * (Number(item.rate) || 0);
                                      if (values.purchaseType === 'GST First, Then Discount') {
                                        const gAmt = (gross * rateVal) / 100;
                                        setFieldValue(`items.${index}.gstAmt`, Number(gAmt.toFixed(2)));
                                      } else if (values.purchaseType === 'Discount First, Then GST') {
                                        const dAmt = Number(item.discountAmt) || 0;
                                        const afterDis = Math.max(0, gross - dAmt);
                                        const gAmt = (afterDis * rateVal) / 100;
                                        setFieldValue(`items.${index}.gstAmt`, Number(gAmt.toFixed(2)));
                                      }
                                    }}
                                    className={`w-full text-center outline-none border rounded p-1 text-xs font-bold ${isNoTax ? 'bg-gray-100 dark:bg-meta-4/20 text-gray-400 cursor-not-allowed border-stroke' : 'bg-transparent text-black dark:text-white focus:border-primary border-stroke dark:border-strokedark'}`}
                                  />
                                </td>

                                {/* GST Amt Column */}
                                <td className="p-2 border w-28">
                                  <input
                                    type="number"
                                    disabled={isNoTax}
                                    onKeyDown={blockInvalidChar}
                                    name={`items.${index}.gstAmt`}
                                    value={isNoTax ? 0 : item.gstAmt ?? 0}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFieldValue(`items.${index}.gstAmt`, val);
                                      const amtVal = Number(val) || 0;
                                      const gross = (Number(item.qty) || 0) * (Number(item.rate) || 0);
                                      if (values.purchaseType === 'GST First, Then Discount') {
                                        const calcRate = gross > 0 ? (amtVal / gross) * 100 : 0;
                                        setFieldValue(`items.${index}.gstRate`, Number(calcRate.toFixed(2)));
                                      } else if (values.purchaseType === 'Discount First, Then GST') {
                                        const dAmt = Number(item.discountAmt) || 0;
                                        const afterDis = Math.max(0, gross - dAmt);
                                        const calcRate = afterDis > 0 ? (amtVal / afterDis) * 100 : 0;
                                        setFieldValue(`items.${index}.gstRate`, Number(calcRate.toFixed(2)));
                                      }
                                    }}
                                    className={`w-full text-right pr-2 outline-none border rounded p-1 text-xs font-bold ${isNoTax ? 'bg-gray-100 dark:bg-meta-4/20 text-gray-400 cursor-not-allowed border-stroke' : 'bg-transparent text-black dark:text-white focus:border-primary border-stroke dark:border-strokedark'}`}
                                  />
                                </td>

                                {/* Discount % Column */}
                                <td className="p-2 border w-20">
                                  <input
                                    type="number"
                                    disabled={isNoTax}
                                    onKeyDown={blockInvalidChar}
                                    name={`items.${index}.discountPer`}
                                    value={isNoTax ? 0 : item.discountPer ?? 0}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFieldValue(`items.${index}.discountPer`, val);
                                      const perVal = Number(val) || 0;
                                      const gross = (Number(item.qty) || 0) * (Number(item.rate) || 0);
                                      const dAmt = (gross * perVal) / 100;
                                      setFieldValue(`items.${index}.discountAmt`, Number(dAmt.toFixed(2)));
                                      if (values.purchaseType === 'Discount First, Then GST') {
                                        const afterDis = Math.max(0, gross - dAmt);
                                        const gAmt = (afterDis * (Number(item.gstRate) || 0)) / 100;
                                        setFieldValue(`items.${index}.gstAmt`, Number(gAmt.toFixed(2)));
                                      }
                                    }}
                                    className={`w-full text-center outline-none border rounded p-1 text-xs font-bold ${isNoTax ? 'bg-gray-100 dark:bg-meta-4/20 text-gray-400 cursor-not-allowed border-stroke' : 'bg-transparent text-black dark:text-white focus:border-primary border-stroke dark:border-strokedark'}`}
                                  />
                                </td>

                                {/* Discount Amt Column */}
                                <td className="p-2 border w-28">
                                  <input
                                    type="number"
                                    disabled={isNoTax}
                                    onKeyDown={blockInvalidChar}
                                    name={`items.${index}.discountAmt`}
                                    value={isNoTax ? 0 : item.discountAmt ?? 0}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFieldValue(`items.${index}.discountAmt`, val);
                                      const amtVal = Number(val) || 0;
                                      const gross = (Number(item.qty) || 0) * (Number(item.rate) || 0);
                                      const calcPer = gross > 0 ? (amtVal / gross) * 100 : 0;
                                      setFieldValue(`items.${index}.discountPer`, Number(calcPer.toFixed(2)));
                                      if (values.purchaseType === 'Discount First, Then GST') {
                                        const afterDis = Math.max(0, gross - amtVal);
                                        const gAmt = (afterDis * (Number(item.gstRate) || 0)) / 100;
                                        setFieldValue(`items.${index}.gstAmt`, Number(gAmt.toFixed(2)));
                                      }
                                    }}
                                    className={`w-full text-right pr-2 outline-none border rounded p-1 text-xs font-bold ${isNoTax ? 'bg-gray-100 dark:bg-meta-4/20 text-gray-400 cursor-not-allowed border-stroke' : 'bg-transparent text-black dark:text-white focus:border-primary border-stroke dark:border-strokedark'}`}
                                  />
                                </td>

                                <td className="p-2 border text-right pr-4 font-mono font-black text-success text-sm">Rs. {lineTotals.netTotal.toFixed(2)}</td>
                                <td className="p-2 border text-center w-12">
                                  {values.items.length > 1 && (
                                    <button type="button" onClick={() => remove(index)} className="text-red-500 font-bold hover:scale-110 duration-100 cursor-pointer">✕</button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          <tr>
                            <td colSpan={11} className="p-2 text-left bg-gray-50/10">
                              <button type="button" onClick={() => push({ itemName: '', qty: 1, rate: 0, uom: 'Nos', gstRate: 0, gstAmt: 0, discountPer: 0, discountAmt: 0 })} className="text-success font-bold hover:underline cursor-pointer">+ Append Restock Row</button>
                            </td>
                          </tr>
                        </tbody>
                      );
                    }}
                  </FieldArray>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div className="md:col-span-2">
                  <label className="block text-gray-500 mb-1 font-bold">Purchase Order Memo Description Notes:</label>
                  <input type="text" name="remarks" onChange={handleChange} value={values.remarks} className="w-full border border-stroke dark:border-strokedark rounded p-2 bg-transparent outline-none focus:border-primary text-black dark:text-white text-xs" placeholder="Enter transit descriptions or consignment references..." />
                </div>
                {(() => {
                  const inlineBillTotal = values.items.reduce((sum: number, curr: any) => sum + calculatePurchaseLineTotals(curr, values.purchaseType).netTotal, 0);
                  const calculatedDebtRemaining = Math.max(0, inlineBillTotal - (Number(values.amountPaid) || 0));

                  return (
                    <div className="p-4 border border-stroke dark:border-strokedark rounded-sm bg-gray-50/50 dark:bg-meta-4/10 space-y-2.5">
                      <div className="flex justify-between items-center text-gray-400 font-bold uppercase text-[10px]">
                        <span>Gross Bill Total Value:</span>
                        <b className="text-black dark:text-white font-mono text-xs">Rs. {inlineBillTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
                      </div>
                      <div>
                        <label className="block text-gray-500 mb-1 font-bold uppercase text-[10px]">Amount Paid Upfront (PKR): *</label>
                        <input 
                          type="number" 
                          min="0"
                          name="amountPaid" 
                          onKeyDown={blockInvalidChar} 
                          onChange={(e) => {
                            const enteredValue = Math.max(0, Number(e.target.value) || 0);
                            if (enteredValue > inlineBillTotal) {
                              toast.error(`Audit Alert: Payment cannot exceed total bill cost (Rs. ${inlineBillTotal.toLocaleString()})`);
                              setFieldValue('amountPaid', inlineBillTotal);
                            } else {
                              setFieldValue('amountPaid', enteredValue);
                            }
                          }} 
                          value={values.amountPaid} 
                          placeholder="0.00" 
                          className="w-full border border-stroke dark:border-strokedark p-2 rounded text-right font-black text-success text-xs outline-none bg-white dark:bg-boxdark focus:border-primary" 
                        />
                      </div>
                      <div className="flex justify-between items-center text-danger font-bold uppercase text-[10px] pt-1.5 border-t border-stroke dark:border-strokedark">
                        <span>Net Added Vendor Credit Debt:</span>
                        <b className="font-mono text-xs underline">Rs. {calculatedDebtRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="pt-4 border-t border-stroke dark:border-strokedark flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => navigate(`${tenantId ? `/${tenantId}` : ''}/Purchase/Purchases/List`)} 
                  className="rounded bg-[#cb3c53] py-2 px-8 font-semibold text-xs text-white hover:bg-opacity-90 transition shadow-sm h-9 min-w-32 cursor-pointer"
                >
                  Cancel
                </button>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className={`rounded ${isEditMode ? 'bg-success' : 'bg-[#4338ca]'} py-2 px-8 font-semibold text-xs text-white hover:bg-opacity-90 transition shadow-sm h-9 min-w-32 cursor-pointer`}
                >
                  {loading ? <Spinner /> : isEditMode ? 'Update Purchase' : 'Save Purchase'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default AddPurchases;
