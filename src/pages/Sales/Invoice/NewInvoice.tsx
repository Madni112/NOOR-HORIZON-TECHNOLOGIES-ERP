import React, { useState, useEffect } from 'react';
import { Formik, Form, FieldArray } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiTrash2 } from 'react-icons/fi';

const NewInvoice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.invoice || location.state?.record || null;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  const [customersList, setCustomersList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [salesmenList, setSalesmenList] = useState<any[]>([]);
  const [transportList, setTransportList] = useState<any[]>([]);
  const [warehousesList, setWarehousesList] = useState<any[]>([]);
  const [banksList, setBanksList] = useState<any[]>([]);

  useEffect(() => {
    const fetchCompleteEnterpriseCatalog = async () => {
      try {
        setInitialLoading(true);
        const { data: cust } = await supabase.from('customers').select('id, customerName');
        const { data: prod } = await supabase.from('products').select('product_name, current_stock, retail_price');
        const { data: sm } = await supabase.from('salesmen').select('id, name');
        const { data: trans } = await supabase.from('logistics_transportation').select('id, name');
        const { data: locMaster } = await supabase.from('inventory_locations').select('name');
        const { data: wh } = await supabase.from('opening_stocks').select('location');
        const { data: invWh } = await supabase.from('warehouse_inventory').select('warehouse_name');
        const { data: bnk } = await supabase.from('banks').select('id, bankName, accountTitle');

        if (cust) setCustomersList(cust);
        if (prod) setProductsList(prod);
        if (sm) setSalesmenList(sm);
        if (trans) setTransportList(trans);

        const combinedLocs = [
          ...(locMaster || []).map((l: any) => l.name),
          ...(wh || []).map((w: any) => w.location),
          ...(invWh || []).map((iw: any) => iw.warehouse_name)
        ];
        const uniqueLocations = Array.from(new Set(combinedLocs.map((loc: any) => String(loc || '').trim()).filter(Boolean)));
        setWarehousesList(uniqueLocations);

        if (bnk) setBanksList(bnk);
      } catch (err: any) {
        toast.error('Failed to aggregate core infrastructure registries: ' + err.message);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchCompleteEnterpriseCatalog();
  }, []);
  const getFormInitialValues = () => {
    if (editData) {
      const parsedItems = Array.isArray(editData.items)
        ? editData.items
        : JSON.parse(editData.items || '[]');
      return {
        customerName: editData.customer_name || editData.customerName || '',
        saleDate: editData.sale_date || new Date().toISOString().split('T')[0],
        paymentTerm: editData.payment_term || 'Cash',
        dispatchWarehouse: editData.dispatch_warehouse || '',
        fbrScenario: editData.scenario_type || 'Goods at Standard Rate to Registered Buyers',
        salesman: editData.salesman || '',
        transportType: editData.transport_name || 'No Transport (Handover)',
        transportCharges: Number(editData.transport_charges || 0),
        settlementMode: editData.selected_bank ? 'Bank' : 'Cash',
        selectedBankTitle: editData.selected_bank || '',
        cashAmountPaid: Number(editData.cash_amount_paid || editData.bank_amount || 0),
        dcNo: editData.dc_no || '',
        items: parsedItems.map((it: any) => ({
          ...it,
          discountPer: Number(it.discountPer ?? it.discount_per ?? 0),
          discountAmt: Number(it.discountAmt ?? it.discount_amt ?? it.discount ?? 0)
        }))
      };
    }
    return {
      customerName: '', saleDate: new Date().toISOString().split('T')[0], paymentTerm: 'Cash',
      dispatchWarehouse: '', fbrScenario: 'Goods at Standard Rate to Registered Buyers', salesman: '',
      transportType: 'No Transport (Handover)', transportCharges: 0, settlementMode: 'Cash',
      selectedBankTitle: '', cashAmountPaid: 0, dcNo: '',
      items: [{ itemName: '', qty: 1, rp: 0, discountPer: 0, discountAmt: 0, gstRate: 18, fTaxPer: 0, amount: 0, availableQty: 0 }]
    };
  };

  const validationSchema = Yup.object().shape({
    customerName: Yup.string().required('Required Field'),
    saleDate: Yup.string().required('Required Field'),
    paymentTerm: Yup.string().oneOf(['Cash', 'Credit']).required('Required Field'),
    dispatchWarehouse: Yup.string().required('Required Field'),
    fbrScenario: Yup.string().required('Required Field'),
    salesman: Yup.string().required('Required Field'),
    transportType: Yup.string().required('Required Field'),
    transportCharges: Yup.number().min(0).required('Required Field'),
    settlementMode: Yup.string().oneOf(['Cash', 'Bank']).required('Required Field'),
    cashAmountPaid: Yup.number().min(0).required('Required Field'),
    selectedBankTitle: Yup.string().when('settlementMode', {
      is: 'Bank',
      then: (schema) => schema.required('Required Field'),
      otherwise: (schema) => schema.notRequired()
    }),
    items: Yup.array().of(
      Yup.object().shape({
        itemName: Yup.string().required('Required Field'),
        qty: Yup.number().min(1, 'Min Qty 1').required('Required Field'),
        rp: Yup.number().min(0, 'Min Price 0').required('Required Field'),
        discountPer: Yup.number().min(0).nullable(),
        discountAmt: Yup.number().min(0).nullable(),
        gstRate: Yup.number().min(0).required('Required Field'),
        fTaxPer: Yup.number().min(0).required('Required Field')
      })
    ).min(1)
  });

  const handleProductSelectionWithWH = async (selectedName: string, index: number, chosenWarehouse: string, setFieldValue: any, currentItem?: any) => {
    const matchingProduct = productsList.find(p => p.product_name === selectedName);
    if (!matchingProduct) {
      setFieldValue(`items.${index}.itemName`, '');
      setFieldValue(`items.${index}.availableQty`, 0);
      return;
    }
    const newRp = Number(matchingProduct.retail_price) || 0;
    setFieldValue(`items.${index}.itemName`, matchingProduct.product_name);
    setFieldValue(`items.${index}.rp`, newRp);
    setFieldValue(`items.${index}.hsCode`, matchingProduct.hs_code || matchingProduct.hscode || matchingProduct.hsCodeNo || matchingProduct.hs_Code || '');

    if (currentItem && currentItem.discountPer) {
      const gross = newRp * (Number(currentItem.qty) || 1);
      const calculatedAmt = (gross * Number(currentItem.discountPer)) / 100;
      setFieldValue(`items.${index}.discountAmt`, Number(calculatedAmt.toFixed(2)));
    }

    if (!chosenWarehouse) {
      setFieldValue(`items.${index}.availableQty`, 0);
      return;
    }
    try {
      const { data: whStock, error } = await supabase
        .from('warehouse_inventory')
        .select('quantity')
        .ilike('product_name', selectedName)
        .ilike('warehouse_name', chosenWarehouse)
        .maybeSingle();

      if (error) throw error;
      setFieldValue(`items.${index}.availableQty`, whStock ? Number(whStock.quantity) : 0);
    } catch (err: any) {
      setFieldValue(`items.${index}.availableQty`, 0);
    }
  };

  const blockInvalidChar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['-', 'e', 'E', '+'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const calculateFbrLineTotals = (item: any, scenario: string) => {
    const qty = Math.max(0, Number(item.qty) || 0);
    const rp = Math.max(0, Number(item.rp) || 0);
    const grossBase = rp * qty;
    const discountAmt = Math.max(0, Number(item.discountAmt) || 0);

    let activeGstRate = Number(item.gstRate || 18);
    let activeFTaxPer = Number(item.fTaxPer || 0);

    if (scenario === 'Reduced Rate Sale') {
      activeGstRate = item.gstRate !== undefined && item.gstRate !== null && item.gstRate !== '' ? Number(item.gstRate) : 0;
      activeFTaxPer = item.fTaxPer !== undefined && item.fTaxPer !== null && item.fTaxPer !== '' ? Number(item.fTaxPer) : 0;
    } else {
      switch (scenario) {
        case 'Goods at Standard Rate to Unregistered Buyers':
          activeGstRate = 18;
          activeFTaxPer = 4;
          break;
        case 'Exempt Goods Sale':
        case 'Zero Rated Sale':
          activeGstRate = 0;
          activeFTaxPer = 0;
          break;
        case 'Goods Sold that are Listed in SRO 297(1)/2023':
          activeGstRate = 25;
          activeFTaxPer = 0;
          break;
        case 'Sale of 3rd Schedule Goods':
          activeGstRate = 18;
          activeFTaxPer = 0;
          break;
        case 'Goods at Standard Rate to Registered Buyers':
        default:
          activeGstRate = 18;
          activeFTaxPer = 0;
          break;
      }
    }

    const isRetailBasedTax =
      scenario === 'Sale of 3rd Schedule Goods' ||
      scenario === 'Goods Sold that are Listed in SRO 297(1)/2023';

    // 3rd Schedule Goods & SRO 297(1)/2023: GST is calculated on full printed retail price (grossBase).
    // All other scenarios: GST is calculated on retail price after deducting discount (grossBase - discountAmt).
    const gstTaxBase = isRetailBasedTax ? grossBase : Math.max(0, grossBase - discountAmt);

    const gstAmt = (gstTaxBase / 100) * activeGstRate;
    const fTaxAmt = (gstTaxBase / 100) * activeFTaxPer;

    const remainingRetail = grossBase - discountAmt;
    const netTotal = remainingRetail + gstAmt + fTaxAmt;

    return { grossBase, activeGstRate, activeFTaxPer, gstAmt, fTaxAmt, discountAmt, remainingRetail, netTotal };
  };

  if (initialLoading) return <div className="flex h-48 items-center justify-center"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-7xl text-black dark:text-bodydark text-xs font-sans relative">
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">
        <div className="flex items-center justify-between border-b border-stroke pb-4 mb-6 dark:border-strokedark">
          <h3 className="font-semibold text-black dark:text-white text-base">
            {editData ? `Modify Historical Sales Invoice Reference # ${editData.id}` : 'Generate Commercial Sales Invoice'}
          </h3>
          <button type="button" onClick={() => navigate('/sales/invoice/list')} className="text-sm font-medium text-primary hover:underline">See Logs List</button>
        </div>

        <Formik
          initialValues={getFormInitialValues()}
          enableReinitialize={true}
          validationSchema={validationSchema}
          onSubmit={async (values) => {
            try {
              setLoading(true);
              let calculatedGrandTotal = values.items.reduce((acc: number, item: any) => {
                return acc + calculateFbrLineTotals(item, values.fbrScenario).netTotal;
              }, 0) + Number(values.transportCharges || 0);

              const paidCash = Number(values.cashAmountPaid || 0);
              const runningBalanceTerm = paidCash >= calculatedGrandTotal ? 'Cash' : 'Credit';

              const databasePayload = {
                customer_name: values.customerName, sale_date: values.saleDate, payment_term: runningBalanceTerm,
                dispatch_warehouse: values.dispatchWarehouse, salesman: values.salesman, transport_name: values.transportType,
                transport_charges: Number(values.transportCharges || 0), selected_bank: values.settlementMode === 'Bank' ? values.selectedBankTitle : null,
                bank_amount: values.settlementMode === 'Bank' ? String(values.cashAmountPaid) : '0', cash_amount_paid: values.settlementMode === 'Cash' ? paidCash : 0,
                total_amount: String(calculatedGrandTotal), receipt_status: paidCash >= calculatedGrandTotal ? 'Paid' : 'On Credit',
                sale_status: 'Confirm', items: values.items, scenario_type: values.fbrScenario
              };

              if (editData && editData.id) {
                const { error: invoiceUpdateError } = await supabase
                  .from('sales_invoices')
                  .update(databasePayload)
                  .eq('id', editData.id);

                if (invoiceUpdateError) throw invoiceUpdateError;
                toast.success('Sales Invoice changes compiled successfully!');
              } else {
                const { error: invoiceError } = await supabase.from('sales_invoices').insert([databasePayload]);
                if (invoiceError) throw invoiceError;

                for (const item of values.items) {
                  const { data: p } = await supabase.from('warehouse_inventory').select('id, quantity').ilike('product_name', item.itemName).ilike('warehouse_name', values.dispatchWarehouse).maybeSingle();
                  if (p) await supabase.from('warehouse_inventory').update({ quantity: Number(p.quantity) - Number(item.qty) }).eq('id', p.id);
                }
                toast.success('Sales Invoice logged successfully!');
              }
              navigate('/sales/invoice/list');
            } catch (err: any) { toast.error('Submission failure: ' + err.message); } finally { setLoading(false); }
          }}
        >
          {({ values, handleChange, setFieldValue, errors, touched, submitCount }) => {
            const hasAttempted = submitCount > 0;
            const currentSubtotalValue = values.items.reduce((acc: number, item: any) => {
              return acc + calculateFbrLineTotals(item, values.fbrScenario).netTotal;
            }, 0) + Number(values.transportCharges || 0);
            return (
              <Form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-meta-4/5 p-4 rounded-sm border border-stroke dark:border-strokedark">
                  <div>
                    <label className="block font-bold text-gray-500 mb-1">Customer / Account Title: *</label>
                    <select
                      name="customerName"
                      value={values.customerName}
                      onChange={handleChange}
                      className={`w-full rounded border p-2 text-sm bg-white dark:bg-boxdark font-bold outline-none text-black dark:text-white ${hasAttempted && errors.customerName ? 'border-red-500 bg-red-50/10' : 'border-stroke dark:border-strokedark focus:border-primary'}`}
                    >
                      <option value="">-- Select Active Customer Account --</option>
                      {customersList.map(c => <option key={c.id} value={c.customerName}>{c.customerName}</option>)}
                    </select>
                    {hasAttempted && errors.customerName && <p className="text-red-500 text-[10px] font-bold mt-1">Required Field</p>}
                  </div>

                  <div>
                    <label className="block font-bold text-gray-500 mb-1">Billing Date: *</label>
                    <input type="date" name="saleDate" value={values.saleDate} onChange={handleChange} className={`w-full rounded border p-2 text-sm bg-transparent font-bold outline-none text-black dark:text-white ${hasAttempted && errors.saleDate ? 'border-red-500 bg-red-50/10' : 'border-stroke dark:border-strokedark focus:border-primary'}`} />
                    {hasAttempted && errors.saleDate && <p className="text-red-500 text-[10px] font-bold mt-1">Required Field</p>}
                  </div>

                  <div>
                    <label className="block font-bold text-gray-500 mb-1">Assigned salesman link: *</label>
                    <select name="salesman" value={values.salesman} onChange={handleChange} className={`w-full rounded border p-2 text-sm bg-white dark:bg-boxdark font-bold outline-none text-black dark:text-white ${hasAttempted && errors.salesman ? 'border-red-500 bg-red-50/10' : 'border-stroke dark:border-strokedark focus:border-primary'}`}>
                      <option value="">-- Select Officer --</option>
                      {salesmenList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    {hasAttempted && errors.salesman && <p className="text-red-500 text-[10px] font-bold mt-1">Required Field</p>}
                  </div>

                  <div>
                    <label className="block font-bold text-gray-500 mb-1">Warehouse Zone Source: *</label>
                    <select name="dispatchWarehouse" value={values.dispatchWarehouse} onChange={async (e) => {
                      const selectedWH = e.target.value;
                      setFieldValue('dispatchWarehouse', selectedWH);
                      if (values.items && values.items.length > 0) {
                        for (let idx = 0; idx < values.items.length; idx++) {
                          const rowItem = values.items[idx];
                          if (rowItem.itemName) {
                            const { data: stockRecord } = await supabase.from('warehouse_inventory').select('quantity').eq('product_name', rowItem.itemName).eq('warehouse_name', selectedWH).maybeSingle();
                            setFieldValue(`items.${idx}.availableQty`, stockRecord ? Number(stockRecord.quantity) : 0);
                          }
                        }
                      }
                    }} className={`w-full rounded border p-2 text-sm bg-white dark:bg-boxdark font-bold outline-none text-black dark:text-white ${hasAttempted && errors.dispatchWarehouse ? 'border-red-500 bg-red-50/10' : 'border-stroke dark:border-strokedark focus:border-primary'}`}>
                      <option value="">-- Choose Dispatch Bin --</option>
                      {warehousesList.map((loc, i) => <option key={i} value={loc}>{loc}</option>)}
                    </select>
                    {hasAttempted && errors.dispatchWarehouse && <p className="text-red-500 text-[10px] font-bold mt-1">Required Field</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-bold text-primary mb-1">Taxation & Sales Tax Statutory Transaction Scenario: *</label>
                    <select name="fbrScenario" value={values.fbrScenario} onChange={(e) => {
                      const newScen = e.target.value;
                      handleChange(e);
                      if (newScen === 'Reduced Rate Sale') {
                        values.items.forEach((_: any, idx: number) => {
                          setFieldValue(`items.${idx}.gstRate`, 0);
                          setFieldValue(`items.${idx}.fTaxPer`, 0);
                        });
                      }
                    }} className="w-full rounded border border-primary p-2 text-sm bg-white dark:bg-boxdark font-black text-primary outline-none">
                      <option value="Goods at Standard Rate to Registered Buyers">Goods at Standard Rate to Registered Buyers</option>
                      <option value="Goods at Standard Rate to Unregistered Buyers">Goods at Standard Rate to Unregistered Buyers (+4% Further Tax)</option>
                      <option value="Reduced Rate Sale">Reduced Rate Sale (Concession slab)</option>
                      <option value="Exempt Goods Sale">Exempt Goods Sale (0% Tax)</option>
                      <option value="Zero Rated Sale">Zero Rated Sale (0% Tax)</option>
                      <option value="Sale of 3rd Schedule Goods">Sale of 3rd Schedule Goods</option>
                      <option value="Goods Sold that are Listed in SRO 297(1)/2023">Goods Sold listed in SRO 297(1)/2023 (25% Premium slab)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-500 mb-1">Logistics Transport Mode: *</label>
                    <select name="transportType" value={values.transportType} onChange={(e) => {
                      const modeName = e.target.value; setFieldValue('transportType', modeName);
                      if (modeName === 'No Transport (Handover)' || modeName === "Customer's Own Transport") {
                        setFieldValue('transportCharges', 0);
                      } else {
                        const match = transportList.find(t => t.name === modeName);
                        setFieldValue('transportCharges', match ? Number(match.base_charges || 0) : 0);
                      }
                    }} className="w-full rounded border border-stroke p-2 text-sm bg-white dark:bg-boxdark font-bold outline-none text-black dark:text-white">
                      <option value="No Transport (Handover)">No Transport (Handover)</option>
                      <option value="Customer's Own Transport">Customer's Own Transport</option>
                      {transportList.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-500 mb-1">Freight Transport Charges (PKR): *</label>
                    <input type="number" onKeyDown={blockInvalidChar} name="transportCharges" value={values.transportCharges} onChange={handleChange} disabled={values.transportType === 'No Transport (Handover)' || values.transportType === "Customer's Own Transport"} className={`w-full rounded border p-2 text-sm bg-transparent font-mono text-right font-black text-black dark:text-white outline-none ${values.transportType === 'No Transport (Handover)' || values.transportType === "Customer's Own Transport" ? 'bg-gray-100 dark:bg-meta-4/20 cursor-not-allowed border-stroke text-gray-400' : 'border-stroke focus:border-primary'}`} />
                  </div>
                </div>
                <div className="border border-stroke dark:border-strokedark rounded-sm overflow-hidden mt-6">
                  <FieldArray name="items">
                    {({ push, remove }) => {
                      const showDiscount = true;
                      return (
                        <div className="w-full overflow-x-auto">
                          <table className={`w-full table-auto border-collapse text-left whitespace-nowrap ${showDiscount ? 'min-w-[1450px]' : 'min-w-[1250px]'}`}>
                            <thead className="bg-gray-100 dark:bg-meta-4 text-[10px] font-black uppercase text-black dark:text-white border-b">
                              <tr>
                                <th className="p-2 w-12 text-center">S#</th>
                                <th className="p-2">Item Product Description</th>
                                <th className="p-2 w-44 text-center bg-blue-50/50 dark:bg-meta-4/20 text-primary font-bold">{values.dispatchWarehouse ? `Stock in ${values.dispatchWarehouse}` : 'Stock in'}</th>
                                <th className="p-2 w-24 text-center">Qty</th>
                                <th className="p-2 w-32 text-right">Unit Retail Price</th>
                                {showDiscount && (
                                  <>
                                    <th className="p-2 w-24 text-center bg-amber-50/80 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">Discount %</th>
                                    <th className="p-2 w-32 text-right bg-amber-50/80 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">Discount Amt</th>
                                  </>
                                )}
                                <th className="p-2 w-16 text-center">GST %</th>
                                <th className="p-2 w-16 text-center">F.Tax %</th>
                                <th className="p-2 w-24 text-right">GST Amt</th>
                                <th className="p-2 w-24 text-right">F.Tax Amt</th>
                                <th className="p-2 w-36 text-right pr-4">Net Total Line</th>
                                <th className="p-2 w-12 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {values.items.map((item: any, idx: number) => {
                                const fbr = calculateFbrLineTotals(item, values.fbrScenario);
                                const hasItemError = hasAttempted && errors.items && (errors.items as any)[idx]?.itemName;
                                return (
                                  <tr key={idx} className={`border-b border-stroke dark:border-strokedark font-mono font-semibold text-black dark:text-white ${hasItemError ? 'bg-red-50/5' : ''}`}>
                                    <td className="p-2 text-center font-sans text-gray-400">{idx + 1}</td>
                                    <td className="p-2">
                                      <select
                                        name={`items.${idx}.itemName`}
                                        value={item.itemName}
                                        onChange={(e) => handleProductSelectionWithWH(e.target.value, idx, values.dispatchWarehouse, setFieldValue, item)}
                                        className={`w-full bg-transparent font-sans font-bold border rounded p-1 outline-none text-xs text-black dark:text-white ${hasItemError ? 'border-red-500 bg-red-50/10' : 'border-transparent'}`}
                                      >
                                        <option value="">-- Choose Product Stock Asset --</option>
                                        {productsList.map((p, i) => <option key={i} value={p.product_name}>{p.product_name}</option>)}
                                      </select>
                                      {hasItemError && <p className="text-red-500 text-[9px] font-bold mt-0.5">Required Field</p>}
                                    </td>
                                    <td className="p-2 text-center font-mono font-black text-success bg-success/5 text-xs w-[130px]">{Number(item.availableQty || 0).toLocaleString()}</td>
                                    <td className="p-2">
                                       <input
                                         type="number"
                                         min="1"
                                         onKeyDown={blockInvalidChar}
                                         onInput={(e: any) => { if (Number(e.target.value) < 1 && e.target.value !== '') e.target.value = 1; }}
                                         name={`items.${idx}.qty`}
                                         value={item.qty}
                                         onChange={(e) => {
                                           const newQty = Math.max(0, Number(e.target.value) || 0);
                                           setFieldValue(`items.${idx}.qty`, newQty);
                                           const currentRp = Math.max(0, Number(item.rp) || 0);
                                           const gross = newQty * currentRp;
                                           const disPer = Math.max(0, Number(item.discountPer) || 0);
                                           if (disPer > 0) {
                                             setFieldValue(`items.${idx}.discountAmt`, Number(((gross * disPer) / 100).toFixed(2)));
                                           }
                                         }}
                                         className={`w-full bg-transparent text-center font-bold text-primary outline-none border rounded p-1 ${hasAttempted && (errors.items as any)?.[idx] && (!item.qty || item.qty < 1) ? 'border-red-500 bg-red-50/10' : 'border-transparent'}`}
                                       />
                                     </td>
                                     <td className="p-2">
                                       <input
                                         type="number"
                                         min="0"
                                         onKeyDown={blockInvalidChar}
                                         onInput={(e: any) => { if (Number(e.target.value) < 0) e.target.value = 0; }}
                                         name={`items.${idx}.rp`}
                                         value={item.rp}
                                         onChange={(e) => {
                                           const newRp = Math.max(0, Number(e.target.value) || 0);
                                           setFieldValue(`items.${idx}.rp`, newRp);
                                           const currentQty = Math.max(0, Number(item.qty) || 0);
                                           const gross = newRp * currentQty;
                                           const disPer = Math.max(0, Number(item.discountPer) || 0);
                                           if (disPer > 0) {
                                             setFieldValue(`items.${idx}.discountAmt`, Number(((gross * disPer) / 100).toFixed(2)));
                                           }
                                         }}
                                         className={`w-full bg-transparent text-right font-bold outline-none border rounded p-1 ${hasAttempted && (errors.items as any)?.[idx] && (!item.rp || item.rp < 0) ? 'border-red-500 bg-red-50/10' : 'border-transparent'}`}
                                       />
                                     </td>

                                     {showDiscount && (
                                       <>
                                         <td className="p-2">
                                           <input
                                             type="number"
                                             min="0"
                                             onKeyDown={blockInvalidChar}
                                             onInput={(e: any) => { if (Number(e.target.value) < 0) e.target.value = 0; }}
                                             name={`items.${idx}.discountPer`}
                                             value={item.discountPer ?? 0}
                                             onChange={(e) => {
                                               const val = Math.max(0, Number(e.target.value) || 0);
                                               setFieldValue(`items.${idx}.discountPer`, val);
                                               const gross = Math.max(0, Number(item.qty) || 0) * Math.max(0, Number(item.rp) || 0);
                                               const amt = (gross * val) / 100;
                                               setFieldValue(`items.${idx}.discountAmt`, Number(amt.toFixed(2)));
                                             }}
                                             placeholder="0"
                                             className="w-full bg-amber-50/40 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 text-center font-black outline-none border border-amber-300 dark:border-amber-700 rounded p-1 text-xs focus:border-amber-500"
                                           />
                                         </td>
                                         <td className="p-2">
                                           <input
                                             type="number"
                                             min="0"
                                             onKeyDown={blockInvalidChar}
                                             onInput={(e: any) => { if (Number(e.target.value) < 0) e.target.value = 0; }}
                                             name={`items.${idx}.discountAmt`}
                                             value={item.discountAmt ?? 0}
                                             onChange={(e) => {
                                               const val = Math.max(0, Number(e.target.value) || 0);
                                               setFieldValue(`items.${idx}.discountAmt`, val);
                                               const gross = Math.max(0, Number(item.qty) || 0) * Math.max(0, Number(item.rp) || 0);
                                               const per = gross > 0 ? (val / gross) * 100 : 0;
                                               setFieldValue(`items.${idx}.discountPer`, Number(per.toFixed(2)));
                                             }}
                                             placeholder="0"
                                             className="w-full bg-amber-50/40 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 text-right font-black outline-none border border-amber-300 dark:border-amber-700 rounded p-1 text-xs focus:border-amber-500"
                                           />
                                         </td>
                                       </>
                                     )}

                                      {values.fbrScenario === 'Reduced Rate Sale' ? (
                                        <>
                                          <td className="p-2 w-20">
                                            <input
                                              type="number"
                                              min="0"
                                              onKeyDown={blockInvalidChar}
                                              onInput={(e: any) => { if (Number(e.target.value) < 0) e.target.value = 0; }}
                                              name={`items.${idx}.gstRate`}
                                              value={item.gstRate ?? 0}
                                              onChange={(e) => setFieldValue(`items.${idx}.gstRate`, Math.max(0, Number(e.target.value) || 0))}
                                              placeholder="0"
                                              className="w-full bg-blue-50/40 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 text-center font-black outline-none border border-blue-300 dark:border-blue-700 rounded p-1 text-xs focus:border-blue-500"
                                            />
                                          </td>
                                          <td className="p-2 w-20">
                                            <input
                                              type="number"
                                              min="0"
                                              onKeyDown={blockInvalidChar}
                                              onInput={(e: any) => { if (Number(e.target.value) < 0) e.target.value = 0; }}
                                              name={`items.${idx}.fTaxPer`}
                                              value={item.fTaxPer ?? 0}
                                              onChange={(e) => setFieldValue(`items.${idx}.fTaxPer`, Math.max(0, Number(e.target.value) || 0))}
                                              placeholder="0"
                                              className="w-full bg-blue-50/40 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 text-center font-black outline-none border border-blue-300 dark:border-blue-700 rounded p-1 text-xs focus:border-blue-500"
                                            />
                                          </td>
                                        </>
                                      ) : (
                                        <>
                                          <td className="p-2 text-center text-gray-400 font-sans">{fbr.activeGstRate}%</td>
                                          <td className="p-2 text-center text-gray-400 font-sans">{fbr.activeFTaxPer}%</td>
                                        </>
                                      )}
                                    <td className="p-2 text-right pr-2 text-gray-400">Rs. {fbr.gstAmt.toFixed(2)}</td>
                                    <td className="p-2 text-right pr-2 text-gray-400">Rs. {fbr.fTaxAmt.toFixed(2)}</td>
                                    <td className="p-2 text-right pr-4 text-success font-black">Rs. {fbr.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="p-2 text-center">{values.items.length > 1 && <button type="button" onClick={() => remove(idx)} className="text-gray-400 hover:text-danger cursor-pointer"><FiTrash2 size={14} /></button>}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          <div className="p-2 bg-gray-50/50 dark:bg-meta-4/10 border-t"><button type="button" onClick={() => push({ itemName: '', qty: 1, rp: 0, discountPer: 0, discountAmt: 0, gstRate: 18, fTaxPer: 0, amount: 0, availableQty: 0 })} className="inline-flex items-center gap-1 bg-primary text-white font-bold py-1 px-3 rounded text-[10px] cursor-pointer">+ Add Row Line</button></div>
                        </div>
                      );
                    }}
                  </FieldArray>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 border border-stroke p-4 rounded-sm bg-slate-50/10 mt-6">
                  <div className="w-full md:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="font-bold text-gray-500 block mb-1">Counter Cash-Box Settlement Mode: *</span>
                      <select name="settlementMode" value={values.settlementMode} onChange={(e) => { handleChange(e); if (e.target.value === 'Cash') setFieldValue('selectedBankTitle', ''); }} className={`w-full border rounded p-2 text-xs bg-white dark:bg-boxdark font-black outline-none text-black dark:text-white ${hasAttempted && errors.settlementMode ? 'border-red-500 bg-red-50/10' : 'border-stroke dark:border-strokedark focus:border-primary'}`}><option value="Cash">By Cash</option><option value="Bank">By Bank (Online)</option></select>
                      {hasAttempted && errors.settlementMode && <p className="text-red-500 text-[10px] font-bold mt-1">{String(errors.settlementMode)}</p>}
                    </div>

                    {values.settlementMode === 'Bank' && (
                      <div>
                        <span className="font-bold text-gray-500 block mb-1">Corporate Bank Ledger Profile: *</span>
                        <select name="selectedBankTitle" value={values.selectedBankTitle} onChange={handleChange} className={`w-full border rounded p-2 text-xs bg-white dark:bg-boxdark font-bold outline-none text-black dark:text-white ${hasAttempted && errors.selectedBankTitle ? 'border-red-500 bg-red-50/10' : 'border-stroke dark:border-strokedark focus:border-primary'}`}><option value="">-- Choose Account Wire Registry --</option>{banksList.map(b => <option key={b.id} value={b.accountTitle}>{b.bankName} - {b.accountTitle}</option>)}</select>
                        {hasAttempted && errors.selectedBankTitle && <p className="text-red-500 text-[10px] font-bold mt-1">{String(errors.selectedBankTitle)}</p>}
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <span className="font-bold text-danger block mb-1">Counter Incoming Cash Flow Amount Paid Now (PKR): *</span>
                      <input type="number" onKeyDown={blockInvalidChar} name="cashAmountPaid" value={values.cashAmountPaid} onChange={handleChange} placeholder="Type amount customer is handing over..." className={`w-full rounded border p-2 bg-transparent text-right font-black text-danger text-sm outline-none text-black dark:text-white ${hasAttempted && errors.cashAmountPaid ? 'border-red-500 bg-red-50/10' : 'border-stroke dark:border-strokedark focus:border-primary'}`} />
                      {hasAttempted && errors.cashAmountPaid && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.cashAmountPaid}</p>}
                    </div>
                  </div>
                  <div className="w-full md:w-1/3 space-y-2 font-mono font-bold text-xs text-black dark:text-white">
                    <div className="flex justify-between border-b pb-1 dark:border-strokedark"><span>Net Invoice Value Total:</span><span>Rs. {currentSubtotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between border-b pb-1 dark:border-strokedark text-success"><span>Received Cash flow:</span><span>Rs. {Number(values.cashAmountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between pt-1 border-double border-b-4 border-stroke dark:border-strokedark"><span className="font-sans text-[11px]">Un-invoiced Remaining Balance (On Credit Debt):</span><b className={`text-sm ${currentSubtotalValue - Number(values.cashAmountPaid || 0) > 0 ? 'text-danger' : 'text-success'}`}>Rs. {Math.max(0, currentSubtotalValue - Number(values.cashAmountPaid || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></div>
                  </div>
                </div>

                <div className="pt-4 border-t border-stroke dark:border-strokedark flex justify-between items-center bg-gray-50 dark:bg-meta-4/5 p-4 rounded-sm mt-6">
                  <button type="button" onClick={() => navigate('/sales/invoice/list')} className="rounded border border-stroke py-2 px-10 font-semibold text-black dark:text-white hover:bg-gray-100 transition cursor-pointer">Cancel</button>
                  <button type="submit" disabled={loading} className="bg-success text-white py-2 px-12 rounded font-black text-sm hover:bg-opacity-90 transition shadow-sm cursor-pointer">
                    {loading ? 'Saving Changes...' : editData ? 'Apply Updates' : 'Log Invoice'}
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

export default NewInvoice;
