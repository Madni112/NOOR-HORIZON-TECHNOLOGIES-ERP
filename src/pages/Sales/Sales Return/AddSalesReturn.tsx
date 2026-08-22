import React, { useState, useEffect, useRef } from 'react';
import { FieldArray, Formik, Form } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../Context/supabaseClient';
import Spinner from '../../../ui/Spinner';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../Context/Auth';

const AddSalesReturn = () => {
  const { tenantId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const routeStateData = location.state?.invoice || location.state?.item || location.state?.record || location.state?.returnRecord;
  const isEditMode = !!routeStateData && (
    routeStateData.hasOwnProperty('original_invoice_no') ||
    routeStateData.hasOwnProperty('return_no') ||
    routeStateData.hasOwnProperty('payout_amount_paid')
  );
  const isDirectInvoiceLink = !!routeStateData && !isEditMode;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [defaultInvoices, setDefaultInvoices] = useState<any[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<any[]>([]);
  const [isInvoiceAlreadyReturned, setIsInvoiceAlreadyReturned] = useState(false);
  const [banksList, setBanksList] = useState<any[]>([]);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState(
    isDirectInvoiceLink && routeStateData
      ? `INV-${routeStateData.id} (${routeStateData.customer_name || ''})`
      : (isEditMode && routeStateData ? `INV-${routeStateData.original_invoice_no?.replace('INV-', '')} (${routeStateData.customer_name || ''})` : '')
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSelectionMade, setIsSelectionMade] = useState(isEditMode || isDirectInvoiceLink);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [origInvoiceCashMetrics, setOrigInvoiceCashMetrics] = useState({
    grandTotal: isDirectInvoiceLink && routeStateData ? Number(routeStateData.total_amount || 0) : 0,
    cashReceivedBox: isDirectInvoiceLink && routeStateData ? Number(routeStateData.cash_amount_paid || 0) : 0
  });

  const syncInvoicePaymentMetrics = async (invoiceId: string | number, invObj?: any) => {
    const cleanId = String(invoiceId || '').replace(/\D/g, '');
    if (!cleanId) {
      setOrigInvoiceCashMetrics({ grandTotal: 0, cashReceivedBox: 0 });
      return;
    }

    try {
      let inv = invObj;
      if (!inv) {
        const { data } = await supabase.from('sales_invoices').select('*').eq('id', Number(cleanId)).maybeSingle();
        inv = data;
      }
      if (!inv) return;

      const upfrontCash = Number(inv.cash_amount_paid || 0);
      const upfrontBank = Number(inv.bank_amount || 0) + (Array.isArray(inv.bankPayments) ? inv.bankPayments.reduce((sum: number, b: any) => sum + (Number(b.bankAmount) || 0), 0) : 0);

      // Fetch subsequent receipt vouchers
      const { data: vouchers } = await supabase
        .from('financial_vouchers')
        .select('total_amount')
        .or('voucher_type.eq.Cash Receipt Voucher,voucher_type.eq.Bank Receipt Voucher')
        .or(`original_invoice_no.eq.${cleanId},original_invoice_no.eq.INV-${cleanId}`);

      const subsequentCollected = (vouchers || []).reduce((sum: number, v: any) => sum + (Number(v.total_amount) || 0), 0);
      const totalPaid = upfrontCash + upfrontBank + subsequentCollected;

      setOrigInvoiceCashMetrics({
        grandTotal: Number(inv.total_amount || 0),
        cashReceivedBox: totalPaid
      });

      if (inv.dispatch_warehouse) {
        setOrigInvoiceWarehouse(inv.dispatch_warehouse);
      }
    } catch (err) {
      console.error('Failed to sync invoice payment metrics:', err);
    }
  };

  const [origInvoiceWarehouse, setOrigInvoiceWarehouse] = useState<string>('Wearhouse A');


  const [returnInitData, setReturnInitData] = useState<any>({
    returnNo: isEditMode ? `RTN-${String(routeStateData.id).padStart(4, '0')}` : '(Auto Generated)',
    returnDate: routeStateData?.return_date || new Date().toISOString().split('T')[0],
    invoiceIdRef: isEditMode ? routeStateData.original_invoice_no?.replace('INV-', '') : (isDirectInvoiceLink ? String(routeStateData.id) : ''),
    customerName: routeStateData?.customer_name || '',
    settlementMode: routeStateData?.settlement_mode || 'Cash',
    selectedBankAccountId: routeStateData?.linked_bank_title || '',
    payoutAmountPaid: routeStateData?.payout_amount_paid || 0,
    items: routeStateData?.items || [{ itemName: '', qty: 1, rp: 0, gstRate: 18, amount: 0 }]
  });
  useEffect(() => {
    const fetchMetadataCatalog = async () => {
      try {
        setInitialLoading(true);
        const { data: invoicesData } = await supabase
          .from('sales_invoices')
          .select('id, customer_name, total_amount, cash_amount_paid, bank_amount, selected_bank, bankPayments, items, dispatch_warehouse')
          .order('id', { ascending: false });


        const { data: bankAccounts } = await supabase
          .from('banks')
          .select('id, bankName, accountTitle');

        if (bankAccounts) setBanksList(bankAccounts);
        if (invoicesData) {
          setDefaultInvoices(invoicesData);
          setFilteredInvoices(invoicesData.slice(0, 3));
        }

        const lookupId = isEditMode ? routeStateData.original_invoice_no?.replace('INV-', '') : (isDirectInvoiceLink ? routeStateData.id : null);
        if (lookupId && invoicesData) {
          const matchedInv = invoicesData.find(i => String(i.id) === String(lookupId));
          if (matchedInv) {
            await syncInvoicePaymentMetrics(lookupId, matchedInv);
          }
        }

        if (isEditMode && routeStateData) {
          const extractedCleanInvoiceId = String(routeStateData.original_invoice_no || '').replace('INV-', '');
          const formattedInvText = extractedCleanInvoiceId
            ? `INV-${extractedCleanInvoiceId}${routeStateData.customer_name ? ` (${routeStateData.customer_name})` : ''}`
            : String(routeStateData.original_invoice_no || '');
          setInvoiceSearchQuery(formattedInvText);
          setIsSelectionMade(true);
          setIsDropdownOpen(false);

          // Explicitly queries sales_returns table to capture real saved payout value
          const { data: actualReturnRecord } = await supabase
            .from('sales_returns')
            .select('payout_amount_paid, total_amount')
            .eq('id', routeStateData.id)
            .maybeSingle();

          const realPayout = actualReturnRecord ? Number(actualReturnRecord.payout_amount_paid || 0) : Number(routeStateData.payout_amount_paid || 0);

          setReturnInitData({
            returnNo: `RTN-${String(routeStateData.id).padStart(4, '0')}`,
            returnDate: routeStateData.return_date || new Date().toISOString().split('T')[0],
            invoiceIdRef: extractedCleanInvoiceId,
            customerName: routeStateData.customer_name || '',
            settlementMode: routeStateData.settlement_mode || 'Cash',
            selectedBankAccountId: routeStateData.linked_bank_title || '',
            payoutAmountPaid: realPayout,
            items: routeStateData.items || []
          });
        } else if (isDirectInvoiceLink && routeStateData) {
          setInvoiceSearchQuery(`INV-${routeStateData.id} (${routeStateData.customer_name || ''})`);
          setIsSelectionMade(true);
          await loadInvoiceAndComputeReturnableItems(routeStateData.id, routeStateData);
        }
      } catch (err: any) {
        toast.error('Failed to load tracking data registers: ' + err.message);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchMetadataCatalog();
  }, [routeStateData, isEditMode, isDirectInvoiceLink]);

  const loadInvoiceAndComputeReturnableItems = async (invoiceId: string | number, invObj?: any, setFieldValue?: any) => {
    const cleanId = String(invoiceId || '').replace(/\D/g, '');
    if (!cleanId) return;

    try {
      let inv = invObj;
      if (!inv) {
        const { data } = await supabase.from('sales_invoices').select('*').eq('id', Number(cleanId)).maybeSingle();
        inv = data;
      }
      if (!inv) return;

      // 1. Fetch previous returns for this invoice
      let query = supabase
        .from('sales_returns')
        .select('id, items')
        .or(`original_invoice_no.eq.${cleanId},original_invoice_no.eq.INV-${cleanId},original_invoice_no.eq.INV-${cleanId.padStart(4, '0')}`);

      if (isEditMode && routeStateData?.id) {
        query = query.neq('id', routeStateData.id);
      }

      const { data: previousReturns } = await query;

      // 2. Map already returned quantities per product
      const alreadyReturnedQtyMap: Record<string, number> = {};
      (previousReturns || []).forEach((ret: any) => {
        (ret.items || []).forEach((item: any) => {
          const key = String(item.itemName || item.product_name || item.name || '').trim().toLowerCase();
          if (key) {
            alreadyReturnedQtyMap[key] = (alreadyReturnedQtyMap[key] || 0) + (Number(item.qty) || 0);
          }
        });
      });

      // 3. Compute remaining returnable quantities
      const returnableItems: any[] = [];
      (inv.items || []).forEach((origItem: any) => {
        const key = String(origItem.itemName || origItem.product_name || origItem.name || '').trim().toLowerCase();
        const origQty = Number(origItem.qty) || 0;
        const returnedQtySoFar = alreadyReturnedQtyMap[key] || 0;
        const remainingQty = Math.max(0, origQty - returnedQtySoFar);

        if (remainingQty > 0 || isEditMode) {
          returnableItems.push({
            ...origItem,
            soldQty: isEditMode ? origQty : remainingQty,
            maxQty: isEditMode ? origQty : remainingQty,
            qty: isEditMode ? (Number(origItem.qty) || 1) : remainingQty
          });
        }
      });

      const isFullyReturned = !isEditMode && (returnableItems.length === 0 || returnableItems.every(i => (Number(i.qty) || 0) <= 0));
      setIsInvoiceAlreadyReturned(isFullyReturned);

      if (setFieldValue) {
        setFieldValue('invoiceIdRef', inv.id);
        setFieldValue('customerName', inv.customer_name);
        setFieldValue('items', returnableItems);

        const returnTotalVal = returnableItems.reduce((acc: number, item: any) => {
          const itemQty = Number(item.qty) || 0;
          const itemRp = Number(item.rp) || 0;
          const itemGst = Number(item.gstRate || item.gst_rate || 18);
          const itemFTax = Number(item.fTaxPer || item.f_tax_per || 0);
          const base = itemRp * itemQty;
          return acc + (base + (base / 100 * itemGst) + (base / 100 * itemFTax));
        }, 0);

        const upfrontCash = Number(inv.cash_amount_paid || 0);
        const upfrontBank = Number(inv.bank_amount || 0) + (Array.isArray(inv.bankPayments) ? inv.bankPayments.reduce((sum: number, b: any) => sum + (Number(b.bankAmount) || 0), 0) : 0);
        const totalPaid = upfrontCash + upfrontBank;
        if (totalPaid > 0) {
          setFieldValue('payoutAmountPaid', Number(Math.min(returnTotalVal, totalPaid).toFixed(2)));
          if (upfrontBank > 0 && inv.selected_bank) {
            setFieldValue('settlementMode', 'Bank');
            setFieldValue('selectedBankAccountId', inv.selected_bank);
          }
        }
      }

      await syncInvoicePaymentMetrics(inv.id, inv);
      return returnableItems;
    } catch (err) {
      console.error('Error loading returnable items:', err);
    }
  };


  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (isSelectionMade || isEditMode) return;
    const term = invoiceSearchQuery.trim().toLowerCase();
    if (!term || term.startsWith('inv-')) {
      setFilteredInvoices(defaultInvoices.slice(0, 3));
      return;
    }

    const filtered = defaultInvoices.filter(inv => {
      const cleanNum = term.replace(/\D/g, '');
      if (cleanNum && String(inv.id) === cleanNum) return true;
      return (
        String(inv.id).toLowerCase().includes(term) ||
        `inv-${inv.id}`.toLowerCase().includes(term) ||
        String(inv.customer_name).toLowerCase().includes(term)
      );
    });

    setFilteredInvoices(filtered);
  }, [invoiceSearchQuery, defaultInvoices, isSelectionMade, isEditMode]);


  const validationSchema = Yup.object().shape({
    invoiceIdRef: Yup.string().required('Required'),
    customerName: Yup.string().required('Required'),
    settlementMode: Yup.string().oneOf(['Cash', 'Bank']).required('Required'),
    selectedBankAccountId: Yup.string().when('settlementMode', {
      is: 'Bank',
      then: (schema) => schema.required('Required'),
      otherwise: (schema) => schema.notRequired()
    }),
    payoutAmountPaid: Yup.number().min(0).typeError('Must be a number').required('Required'),
    items: Yup.array().of(
      Yup.object().shape({
        itemName: Yup.string().required('Required'),
        qty: Yup.number().min(1).required('Required')
      })
    ).min(1)
  });

  const blockInvalidChar = (e: React.KeyboardEvent<HTMLInputElement>) =>
    ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault();

  if (initialLoading) return <div className="flex h-48 items-center justify-center"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-7xl flex flex-col gap-6 text-black dark:text-white text-xs">
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center justify-between border-b border-stroke py-4 px-6.5 dark:border-strokedark">
          <h3 className="font-semibold text-black dark:text-white text-base">
            {isEditMode ? 'Modify Sales Return Note Record' : 'Compile Sales Return Note Credit Slip'}
          </h3>
          <button onClick={() => navigate(`${tenantId ? `/${tenantId}` : ''}/Sales-Return/Debit-Notes/List`)} className="text-sm font-medium text-primary hover:underline">See Logs List</button>
        </div>

        <Formik
          initialValues={returnInitData}
          validationSchema={validationSchema}
          enableReinitialize={true}
          onSubmit={async (values) => {
            if (isInvoiceAlreadyReturned && !isEditMode) {
              toast.error('Audit Block: Submission denied. Already settles as returned.');
              return;
            }

            const itemsTotalSum = values.items.reduce((acc: number, item: any) => {
              const itemQty = Number(item.qty) || 0;
              const itemRp = Number(item.rp) || 0;
              const itemGst = Number(item.gstRate || item.gst_rate || 18);
              const itemFTax = Number(item.fTaxPer || item.f_tax_per || 0);
              const base = itemRp * itemQty;
              return acc + (base + (base / 100 * itemGst) + (base / 100 * itemFTax));
            }, 0);

            const payoutAmountPaid = (values.invoiceIdRef && origInvoiceCashMetrics.cashReceivedBox === 0)
              ? 0
              : (Number(values.payoutAmountPaid) || 0);

            const finalCalculatedReturnStatus = (values.invoiceIdRef && origInvoiceCashMetrics.cashReceivedBox === 0)
              ? 'Credit Settled'
              : (payoutAmountPaid >= itemsTotalSum ? 'Paid' : 'Credit Settled');


            const databasePayload = {
              original_invoice_no: `INV-${values.invoiceIdRef}`,
              customer_name: values.customerName,
              return_date: values.returnDate,
              settlement_mode: values.settlementMode,
              linked_bank_title: values.settlementMode === 'Bank' ? values.selectedBankAccountId : null,
              payout_amount_paid: payoutAmountPaid,
              total_amount: itemsTotalSum,
              return_status: finalCalculatedReturnStatus,
              return_warehouse_to: origInvoiceWarehouse || 'Wearhouse A',
              dispatch_warehouse: origInvoiceWarehouse || 'Wearhouse A',
              items: values.items
            };


            try {
              setLoading(true);
              if (isEditMode) {
                const { error } = await supabase
                  .from('sales_returns')
                  .update(databasePayload)
                  .eq('id', routeStateData.id);
                if (error) throw error;
                toast.success('Sales Return Entry Modified Successfully!');
              } else {
                const { error } = await supabase.from('sales_returns').insert([databasePayload]);
                if (error) throw error;

                for (const item of values.items) {
                  const qty = Number(item.qty) || 0;
                  if (!qty) continue;

                  const { data: activeProd } = await supabase.from('products').select('current_stock').eq('product_name', item.itemName).maybeSingle();
                  if (activeProd) {
                    await supabase.from('products').update({ current_stock: (Number(activeProd.current_stock) || 0) + qty }).eq('product_name', item.itemName);
                  }

                  const targetWh = origInvoiceWarehouse || 'Wearhouse A';
                  const { data: whRow } = await supabase
                    .from('warehouse_inventory')
                    .select('id, quantity')
                    .ilike('product_name', item.itemName)
                    .ilike('warehouse_name', targetWh)
                    .maybeSingle();

                  if (whRow) {
                    await supabase.from('warehouse_inventory').update({ quantity: (Number(whRow.quantity) || 0) + qty }).eq('id', whRow.id);
                  } else {
                    await supabase.from('warehouse_inventory').insert([{ product_name: item.itemName, warehouse_name: targetWh, quantity: qty }]);
                  }
                }
                toast.success('Sales Return Registered!');
              }
              navigate(`${tenantId ? `/${tenantId}` : ''}/Sales-Return/Debit-Notes/List`);

            } catch (err: any) {
              toast.error(err.message);
            } finally {
              setLoading(false);
            }
          }}
        >
          {({ values, handleChange, handleBlur, setFieldValue, errors, touched, submitCount }) => {
            const hasAttempted = submitCount > 0;
            return (
              <Form className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 items-end">
                  <div>
                    <label className="block font-medium mb-1">Return Memo ID Code #:</label>
                    <p className="text-danger font-bold text-sm">{values.returnNo}</p>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Processing Return Date:</label>
                    <input type="date" name="returnDate" onChange={handleChange} value={values.returnDate} className="w-full rounded border border-stroke p-2 text-sm bg-white dark:bg-boxdark font-semibold outline-none text-black dark:text-white" />
                  </div>

                  <div className="relative space-y-1" ref={dropdownRef}>
                    <label className="block font-medium text-primary font-bold">Search Invoice (Type ID or Customer): *</label>
                    <input
                      type="text"
                      disabled={isEditMode}
                      placeholder="🔍 Search Invoice sequence number..."
                      value={invoiceSearchQuery}
                      onFocus={() => {
                        if (!isEditMode) {
                          setIsSelectionMade(false);
                          setIsDropdownOpen(true);
                        }
                      }}
                      onChange={(e) => {
                        if (!isEditMode) {
                          setInvoiceSearchQuery(e.target.value);
                          setIsSelectionMade(false);
                          setIsDropdownOpen(true);
                          if (!e.target.value) {
                            setFieldValue('invoiceIdRef', '');
                            setFieldValue('customerName', '');
                            setFieldValue('items', []);
                            setIsInvoiceAlreadyReturned(false);
                            setOrigInvoiceCashMetrics({ grandTotal: 0, cashReceivedBox: 0 });
                          }
                        }
                      }}
                      className={`w-full rounded border p-2 text-xs font-bold outline-none focus:border-primary ${isEditMode ? 'bg-gray-100 dark:bg-meta-4/20 text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-boxdark text-black dark:text-white'} ${hasAttempted && errors.invoiceIdRef && !values.invoiceIdRef ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-stroke dark:border-strokedark'}`}
                    />

                    {isDropdownOpen && !isSelectionMade && !isEditMode && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded shadow-2xl z-99999 max-h-48 overflow-y-auto scrollbar-thin">
                        {filteredInvoices.length === 0 ? (
                          <div className="p-3 text-center text-xs text-gray-400 font-medium italic">No matching open invoices.</div>
                        ) : (
                          filteredInvoices.map(inv => (
                            <div
                              key={inv.id}
                              onClick={async () => {
                                setInvoiceSearchQuery(`INV-${inv.id} (${inv.customer_name})`);
                                setIsSelectionMade(true);
                                await loadInvoiceAndComputeReturnableItems(inv.id, inv, setFieldValue);
                                setIsDropdownOpen(false);
                              }}
                              className="p-2.5 hover:bg-slate-100 dark:hover:bg-meta-4 cursor-pointer text-xs font-bold text-black dark:text-white border-b border-stroke last:border-0 duration-100"
                            >
                              📄 INV-{String(inv.id).padStart(4, '0')} - {inv.customer_name} (Rs. {Number(inv.total_amount || 0).toLocaleString()})
                            </div>
                          ))
                        )}
                      </div>
                    )}


                    {hasAttempted && errors.invoiceIdRef && !values.invoiceIdRef && <p className="text-red-500 font-bold text-[10px] mt-0.5">⚠️ Required Field</p>}
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Customer / Account Title:</label>
                    <input type="text" name="customerName" disabled value={values.customerName} className="w-full rounded border border-stroke p-2 text-sm bg-gray-100 dark:bg-meta-4/20 text-gray-500 font-bold outline-none cursor-not-allowed" placeholder="Linked Account Name..." />
                  </div>
                </div>

                {values.invoiceIdRef && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-meta-4/20 border border-blue-200 dark:border-blue-800 rounded flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-black dark:text-white">
                    <div>
                      <span className="text-gray-500">Linked Invoice Ref:</span> <strong className="text-primary font-bold ml-1">INV-{String(values.invoiceIdRef).padStart(4, '0')}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Billed Invoice:</span> <strong className="text-black dark:text-white ml-1">Rs. {origInvoiceCashMetrics.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500">Amount Received (Cash/Bank):</span> <strong className="text-success font-black ml-1">Rs. {origInvoiceCashMetrics.cashReceivedBox.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500">Outstanding Credit Balance Due:</span> <strong className="text-danger font-black ml-1">Rs. {Math.max(0, origInvoiceCashMetrics.grandTotal - origInvoiceCashMetrics.cashReceivedBox).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                    </div>
                  </div>
                )}

                <div className="w-full overflow-x-auto rounded-sm border border-stroke dark:border-strokedark mb-6 whitespace-nowrap">
                  <table className="w-full table-auto border-collapse text-[12px] min-w-[1200px]">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-meta-4 text-center font-bold uppercase text-black dark:text-white border-b border-stroke">
                        <th className="p-2 w-12">S#</th>
                        <th className="p-2 text-left">Item Name Description</th>
                        <th className="p-2 w-28 text-right pr-2">Retail Unit Price</th>
                        <th className="p-2 w-24 text-center">Returned Qty</th>
                        <th className="p-2 w-28 text-right pr-2">Taxable Base Amount</th>
                        <th className="p-2 w-16 text-center">GST %</th>
                        <th className="p-2 w-24 text-right pr-2">GST Amt</th>
                        <th className="p-2 w-16 text-center">F.Tax %</th>
                        <th className="p-2 w-24 text-right pr-2">F.Tax Amt</th>
                        <th className="p-2 w-32 text-right pr-2 bg-red-50 dark:bg-meta-4/10">Net Return Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {values.items.map((item: any, index: number) => {
                        const rp = Number(item.rp) || 0;
                        const qty = Number(item.qty) || 0;
                        const gstRate = Number(item.gstRate || item.gst_rate || 18);
                        const fTaxPer = Number(item.fTaxPer || item.f_tax_per || 0);

                        const grossBaseAmount = rp * qty;
                        const calculatedGstAmount = (grossBaseAmount / 100) * gstRate;
                        const calculatedFurtherTaxAmount = (grossBaseAmount / 100) * fTaxPer;
                        const taxInclusiveLineTotal = grossBaseAmount + calculatedGstAmount + calculatedFurtherTaxAmount;

                        return (
                          <tr key={index} className="text-center bg-white dark:bg-boxdark border-b border-stroke text-black dark:text-white font-mono font-semibold">
                            <td className="p-2 font-semibold font-sans">{index + 1}</td>
                            <td className="p-2 text-left font-bold font-sans text-xs">{item.itemName || 'Product Description'}</td>
                            <td className="p-2 text-right pr-2">{rp.toFixed(2)}</td>
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                min="1"
                                max={item.soldQty || item.maxQty || 9999}
                                value={item.qty}
                                onKeyDown={blockInvalidChar}
                                onChange={(e) => {
                                  const inputVal = Number(e.target.value) || 0;
                                  const maxAllowed = (item.soldQty || item.maxQty || 9999);
                                  const finalVal = Math.min(Math.max(1, inputVal), maxAllowed);
                                  setFieldValue(`items[${index}].qty`, finalVal);

                                  if (origInvoiceCashMetrics.cashReceivedBox > 0) {
                                    const updatedItems = [...values.items];
                                    updatedItems[index] = { ...updatedItems[index], qty: finalVal };
                                    const newReturnVal = updatedItems.reduce((acc: number, i: any) => {
                                      const iQty = Number(i.qty) || 0;
                                      const iRp = Number(i.rp) || 0;
                                      const iGst = Number(i.gstRate || i.gst_rate || 18);
                                      const iFTax = Number(i.fTaxPer || i.f_tax_per || 0);
                                      const base = iRp * iQty;
                                      return acc + (base + (base / 100 * iGst) + (base / 100 * iFTax));
                                    }, 0);
                                    setFieldValue('payoutAmountPaid', Number(Math.min(newReturnVal, origInvoiceCashMetrics.cashReceivedBox).toFixed(2)));
                                  }
                                }}
                                className="w-16 rounded border border-stroke dark:border-strokedark py-1 px-1 text-center font-black text-xs text-primary bg-white dark:bg-boxdark outline-none focus:border-primary shadow-xs"
                              />
                              {item.soldQty ? (
                                <span className="block text-[9px] text-gray-400 font-sans font-normal mt-0.5">Max: {item.soldQty}</span>
                              ) : null}
                            </td>
                            <td className="p-2 text-right pr-2 text-gray-500">{grossBaseAmount.toFixed(2)}</td>
                            <td className="p-2 text-center text-xs text-gray-400 font-sans">{gstRate}%</td>
                            <td className="p-2 text-right pr-2 text-gray-400">{calculatedGstAmount.toFixed(2)}</td>
                            <td className="p-2 text-center text-xs text-gray-400 font-sans">{fTaxPer}%</td>
                            <td className="p-2 text-right pr-2 text-gray-400">{calculatedFurtherTaxAmount.toFixed(2)}</td>
                            <td className="p-2 text-right text-danger font-black pr-2 bg-red-50/30 dark:bg-meta-4/5 text-sm">Rs. {taxInclusiveLineTotal.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col md:flex-row justify-between gap-10 mt-6 px-4 pb-4">
                  <div className="flex flex-col gap-4 w-full md:w-1/2 border border-stroke p-4 rounded dark:border-strokedark bg-slate-50/10 space-y-1">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary dark:text-white mb-2">1. Refund Settlement Mode Select: *</h4>
                      <select
                        name="settlementMode"
                        value={values.settlementMode}
                        onChange={(e) => {
                          handleChange(e);
                          if (e.target.value === 'Cash') setFieldValue('selectedBankAccountId', '');
                        }}
                        className="w-full border border-stroke dark:border-strokedark rounded p-2 bg-white dark:bg-boxdark outline-none font-black text-xs text-black dark:text-white focus:border-primary"
                      >
                        <option value="Cash">Cash Ledger Account</option>
                        <option value="Bank">Bank Account Wire Transfer</option>
                      </select>
                    </div>

                    {values.settlementMode === 'Bank' && (
                      <div className="transition-all duration-200">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary dark:text-white mb-2">Select Target Settlement Corporate Bank Profile: *</h4>
                        <select
                          name="selectedBankAccountId"
                          value={values.selectedBankAccountId}
                          onChange={handleChange}
                          className={`w-full border rounded p-2 bg-white dark:bg-boxdark outline-none font-bold text-xs text-black dark:text-white focus:border-primary ${hasAttempted && errors.selectedBankAccountId ? 'border-red-500' : 'border-stroke dark:border-strokedark'}`}
                        >
                          <option value="">-- Choose Account Wire Registry --</option>
                          {banksList.map(b => (
                            <option key={b.id} value={b.accountTitle}>{b.bankName} - {b.accountTitle}</option>
                          ))}
                        </select>
                        {hasAttempted && errors.selectedBankAccountId && <p className="text-red-500 text-[10px] font-bold mt-1">⚠️ Required field</p>}
                      </div>
                    )}

                    <div className="border-t border-stroke dark:border-strokedark my-2"></div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-danger mb-2">2. Refund Payout Remitted Amount (PKR): *</h4>
                      
                      {values.invoiceIdRef && origInvoiceCashMetrics.cashReceivedBox === 0 ? (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded text-[11px] text-amber-800 dark:text-amber-300 font-semibold space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold uppercase tracking-wide text-danger text-xs">Payout: Rs. 0.00</span>
                            <span className="text-[9px] bg-amber-200 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded font-black tracking-wider">CREDIT ADJUSTMENT ONLY</span>
                          </div>
                          <p className="text-[10px] leading-relaxed text-gray-600 dark:text-gray-400 font-normal">
                            ℹ️ This invoice was billed <b>ON CREDIT</b> with <b>Rs. 0.00 cash/bank payment received</b>. Cash payout is locked to <b>Rs. 0.00</b>. The return item value will automatically credit & adjust the customer's account ledger balance.
                          </p>
                        </div>
                      ) : (
                        <input
                          type="number"
                          name="payoutAmountPaid"
                          onKeyDown={blockInvalidChar}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            const maxLimit = values.invoiceIdRef && origInvoiceCashMetrics.cashReceivedBox > 0
                              ? origInvoiceCashMetrics.cashReceivedBox
                              : 9999999;
                            const cappedVal = Math.min(val, maxLimit);
                            setFieldValue('payoutAmountPaid', cappedVal);
                          }}
                          value={values.payoutAmountPaid}
                          placeholder="Enter paid back amount..."
                          className="w-full rounded border border-stroke p-2 bg-transparent text-right font-black text-danger text-sm focus:border-primary outline-none text-black dark:text-white"
                        />
                      )}
                    </div>

                  </div>

                  <div className="w-full md:w-1/3 space-y-3 text-xs text-black dark:text-white font-semibold">
                    {values.invoiceIdRef && (
                      <div className="bg-blue-50/50 dark:bg-meta-4/20 border border-blue-200 rounded p-3 space-y-1.5 font-mono text-[11px] text-gray-500 dark:text-gray-300">
                        <h5 className="font-bold text-primary dark:text-white text-[10px] uppercase tracking-wide">📄 Source Invoice Audit Profile</h5>
                        <div className="flex justify-between"><span>Original Grand Total:</span><b className="text-black dark:text-white">Rs. {origInvoiceCashMetrics.grandTotal.toLocaleString()}</b></div>
                        <div className="flex justify-between border-t pt-1 border-blue-100 dark:border-strokedark"><span>Total Received (Cash/Bank):</span><b className="text-success font-black text-xs">Rs. {origInvoiceCashMetrics.cashReceivedBox.toLocaleString()}</b></div>
                      </div>
                    )}


                    <div className="flex justify-between border-b pb-1 dark:border-strokedark pt-1">
                      <span>Net Return Items Value:</span>
                      <b className="text-danger text-sm">
                        Rs. {values.items.reduce((acc: number, i: any) => {
                          const itemQty = Number(i.qty) || 0;
                          const itemRp = Number(i.rp) || 0;
                          const itemGst = Number(i.gstRate || i.gst_rate || 18);
                          const itemFTax = Number(i.fTaxPer || i.f_tax_per || 0);
                          const base = itemRp * itemQty;
                          return acc + (base + (base / 100 * itemGst) + (base / 100 * itemFTax));
                        }, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </b>
                    </div>

                    <div className="flex justify-between pt-1 font-mono text-[10px] text-gray-400">
                      <span>Calculated Return Strategy:</span>
                      <b className="uppercase underline text-black dark:text-white">
                        {(() => {
                          const payout = Number(values.payoutAmountPaid) || 0;
                          const returnTotalSum = values.items.reduce((acc: number, i: any) => {
                            const itemQty = Number(i.qty) || 0;
                            const itemRp = Number(i.rp) || 0;
                            const itemGst = Number(i.gstRate || i.gst_rate || 18);
                            const itemFTax = Number(i.fTaxPer || i.f_tax_per || 0);
                            const base = itemRp * itemQty;
                            return acc + (base + (base / 100 * itemGst) + (base / 100 * itemFTax));
                          }, 0);

                          if (payout >= returnTotalSum - 0.01 && payout > 0) {
                            return values.settlementMode === 'Bank' ? 'Bank Refund (Paid in Full)' : 'Cash Refund (Paid in Full)';
                          }
                          if (payout > 0) {
                            return `Partial Refund (Rs. ${payout.toFixed(2)} Paid, Balance on Credit)`;
                          }
                          return 'Credit Settled (0 Cash Owed)';
                        })()}
                      </b>
                    </div>

                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-stroke dark:border-strokedark flex flex-col md:flex-row justify-between items-center bg-gray-50 dark:bg-meta-4/5 p-4 rounded-sm gap-4">
                  <div>
                    {isInvoiceAlreadyReturned && !isEditMode && (
                      <p className="text-red-500 font-black text-xs tracking-wide bg-red-50 border border-red-200 py-1.5 px-4 rounded shadow-xs animate-pulse">
                        ⚠️ This Invoice has already been fully returned (No returnable quantity remaining)
                      </p>
                    )}

                  </div>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => navigate(`${tenantId ? `/${tenantId}` : ''}/Sales-Return/Debit-Notes/List`)} className="rounded border border-stroke dark:border-strokedark py-2 px-8 font-semibold text-sm text-black dark:text-white hover:bg-gray-100 transition cursor-pointer">Cancel</button>

                    <button
                      type="submit"
                      disabled={loading || (isInvoiceAlreadyReturned && !isEditMode)}
                      className={`py-2 px-10 rounded font-black text-sm transition shadow-sm font-bold text-white
                        ${(isInvoiceAlreadyReturned && !isEditMode)
                          ? 'bg-gray-400 opacity-40 cursor-not-allowed'
                          : 'bg-success hover:bg-opacity-90 cursor-pointer'
                        }`}
                    >
                      {loading ? <Spinner /> : (isEditMode ? 'Modify Entry' : 'Save Record')}
                    </button>
                  </div>
                </div>
              </Form>
            );
          }}
        </Formik>
      </div>
    </div>
  );
};

export default AddSalesReturn;
