import React, { useState, useEffect, useRef } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../Context/supabaseClient';
import Spinner from '../../../ui/Spinner';
import { useNavigate, useLocation } from 'react-router-dom';

const SaleReturnReceiptAdd = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const routeReceiptRow = location.state?.receiptRecord || location.state?.item || location.state?.record;
    const isEditMode = !!routeReceiptRow;

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);
    const [onCreditReturns, setOnCreditReturns] = useState<any[]>([]);
    const [filteredReturns, setFilteredReturns] = useState<any[]>([]);
    const [banksList, setBanksList] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [selectedReturnDetails, setSelectedReturnDetails] = useState<any>({
        totalAmount: 0,
        alreadyPaid: 0,
        remainingDue: 0
    });

    const [initialFormValues, setInitialFormValues] = useState<any>({
        processingDate: new Date().toISOString().split('T')[0],
        returnRowId: '',
        invoiceNoRef: '',
        customerName: '',
        settlementMode: 'Cash',
        selectedBankTitle: '',
        amountPaid: 0,
        remainingBalanceMax: 99999999
    });

    useEffect(() => {
        const fetchVoucherMetadata = async () => {
            try {
                setInitialLoading(true);

                // 1. Fetch raw returns data from your database table
                const { data: returnsData } = await supabase
                    .from('sales_returns')
                    .select('id, original_invoice_no, customer_name, total_amount, total_net_amount, payout_amount_paid, return_status');

                // 2. Fetch sales_invoices to inspect cash_amount_paid
                const { data: invoicesData } = await supabase
                    .from('sales_invoices')
                    .select('id, cash_amount_paid, payment_term, total_amount');

                // 3. Fetch all existing receipts to dynamically aggregate them on the fly
                const { data: allReceiptsData } = await supabase
                    .from('sales_return_receipts')
                    .select('sales_return_id, amount_paid');

                const { data: bankAccounts } = await supabase
                    .from('banks')
                    .select('id, bankName, accountTitle');

                if (bankAccounts) setBanksList(bankAccounts);

                if (returnsData) {
                    const compiledReturnsPool = returnsData.map(r => {
                        const invRefClean = String(r.original_invoice_no || '').replace('INV-', '').trim().toLowerCase();
                        const matchedInv = (invoicesData || []).find(inv => String(inv.id).trim().toLowerCase() === invRefClean);

                        const invoiceCashCollected = matchedInv ? Number(matchedInv.cash_amount_paid || 0) : 0;
                        const trueNetItemsReturnVal = Number(r.total_net_amount || r.total_amount || 0);

                        // Max cash refundable to customer cannot exceed cash actually collected for this invoice!
                        const maxCashRefundablePool = Math.min(trueNetItemsReturnVal, invoiceCashCollected);

                        const associatedReceipts = (allReceiptsData || []).filter(rec => String(rec.sales_return_id) === String(r.id));
                        const totalReceiptsSum = associatedReceipts.reduce((sum, rec) => sum + Number(rec.amount_paid || 0), 0);

                        const trueTotalAccumulatedPaid = Number(r.payout_amount_paid || 0) + totalReceiptsSum;
                        const dynamicRemainingOwed = Math.max(0, maxCashRefundablePool - trueTotalAccumulatedPaid);

                        const isSettledOrZeroCash = maxCashRefundablePool === 0 || dynamicRemainingOwed <= 0;

                        return {
                            ...r,
                            max_refundable_pool: maxCashRefundablePool,
                            invoice_cash_collected: invoiceCashCollected,
                            computed_total_paid: trueTotalAccumulatedPaid,
                            computed_remaining_due: dynamicRemainingOwed,
                            is_fully_settled: isSettledOrZeroCash,
                            statusBadge: maxCashRefundablePool === 0 ? 'CREDIT SETTLED (0 CASH OWED)' : (dynamicRemainingOwed <= 0 ? 'FULLY REFUNDED' : 'OPEN')
                        };
                    });

                    setOnCreditReturns(compiledReturnsPool);
                    setFilteredReturns(compiledReturnsPool);

                    if (isEditMode && routeReceiptRow) {
                        const currentActiveReturn = compiledReturnsPool.find(r => String(r.id) === String(routeReceiptRow.sales_return_id));
                        if (currentActiveReturn) {
                            // Back out the current receipt value during edits to calculate the true baseline
                            const isolatedPaidPool = Math.max(0, Number(currentActiveReturn.computed_total_paid) - Number(routeReceiptRow.amount_paid || 0));
                            const trueNetItemsReturnVal = Number(currentActiveReturn.total_net_amount || currentActiveReturn.total_amount || 0);
                            const isolatedRemainingDue = Math.max(0, trueNetItemsReturnVal - isolatedPaidPool);

                            setSearchQuery(`${routeReceiptRow.original_invoice_no} (${routeReceiptRow.customer_name})`);
                            setSelectedReturnDetails({
                                totalAmount: trueNetItemsReturnVal,
                                alreadyPaid: isolatedPaidPool,
                                remainingDue: isolatedRemainingDue
                            });

                            setInitialFormValues({
                                processingDate: routeReceiptRow.processing_date || new Date().toISOString().split('T')[0],
                                returnRowId: routeReceiptRow.sales_return_id || '',
                                invoiceNoRef: routeReceiptRow.original_invoice_no || '',
                                customerName: routeReceiptRow.customer_name || '',
                                settlementMode: routeReceiptRow.settlement_mode || 'Cash',
                                selectedBankTitle: routeReceiptRow.bank_account_title || '',
                                amountPaid: routeReceiptRow.amount_paid || 0,
                                remainingBalanceMax: isolatedRemainingDue
                            });
                        }
                    }
                }
            } catch (err: any) {
                toast.error('Failed to load credit return registers: ' + err.message);
            } finally {
                setInitialLoading(false);
            }
        };
        fetchVoucherMetadata();
    }, [routeReceiptRow, isEditMode]);


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
        if (isEditMode) return;
        const term = searchQuery.trim().toLowerCase();
        if (!term) {
            setFilteredReturns(onCreditReturns.slice(0, 3));
            return;
        }
        const filtered = onCreditReturns.filter(r =>
            String(r.original_invoice_no).toLowerCase().includes(term) ||
            String(r.customer_name).toLowerCase().includes(term)
        );
        setFilteredReturns(filtered);
    }, [searchQuery, onCreditReturns, isEditMode]);

    const validationSchema = Yup.object().shape({
        returnRowId: Yup.string().required('Required'),
        customerName: Yup.string().required('Required'),
        invoiceNoRef: Yup.string().required('Required'),
        settlementMode: Yup.string().oneOf(['Cash', 'Bank']).required('Required'),
        selectedBankTitle: Yup.string().when('settlementMode', {
            is: 'Bank',
            then: (schema) => schema.required('Required'),
            otherwise: (schema) => schema.notRequired()
        }),
        amountPaid: Yup.number()
            .typeError('Must be a number')
            .required('Required')
            .min(1, 'Min 1')
    });

    const blockInvalidChar = (e: React.KeyboardEvent<HTMLInputElement>) =>
        ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault();

    if (initialLoading) return <div className="flex h-48 items-center justify-center"><Spinner /></div>;

    return (
        <div className="mx-auto max-w-7xl flex flex-col gap-6 text-black dark:text-white text-xs">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="flex items-center justify-between border-b border-stroke py-4 px-6.5 dark:border-strokedark">
                    <h3 className="font-semibold text-black dark:text-white text-base">
                        {isEditMode ? 'Modify Return Note Cash-Back Settlement Entry' : 'Authorize Remaining Return Cash-Back Settlement Note'}
                    </h3>
                    <button onClick={() => navigate('/sales/sales-return-receipt/list')} className="text-sm font-medium text-primary hover:underline">Cancel & Return</button>
                </div>

                <Formik
                    initialValues={initialFormValues}
                    validationSchema={validationSchema}
                    enableReinitialize={true}
                    onSubmit={async (values) => {
                        try {
                            setLoading(true);

                            if (isEditMode) {
                                // ✅ ISOLATED UPDATE: Modifies ONLY the receipt log entry row. Zero interaction with sales_returns columns!
                                const { error: updateReceiptError } = await supabase
                                    .from('sales_return_receipts')
                                    .update({
                                        processing_date: values.processingDate,
                                        settlement_mode: values.settlementMode,
                                        bank_account_title: values.settlementMode === 'Bank' ? values.selectedBankTitle : null,
                                        amount_paid: Number(values.amountPaid)
                                    })
                                    .eq('id', routeReceiptRow.id);

                                if (updateReceiptError) throw updateReceiptError;
                                toast.success('Collection receipt modification authorized!');
                            } else {
                                // ✅ ISOLATED INSERT: Creates a new receipt log entry row. Zero interaction with sales_returns columns!
                                const { error: insertError } = await supabase.from('sales_return_receipts').insert([{
                                    processing_date: values.processingDate,
                                    sales_return_id: values.returnRowId,
                                    original_invoice_no: values.invoiceNoRef,
                                    customer_name: values.customerName,
                                    settlement_mode: values.settlementMode,
                                    bank_account_title: values.settlementMode === 'Bank' ? values.selectedBankTitle : null,
                                    amount_paid: Number(values.amountPaid)
                                }]);
                                if (insertError) throw insertError;
                                toast.success('Cash-back collection voucher approved!');
                            }
                            navigate('/sales/sales-return-receipt/list');
                        } catch (err: any) {
                            toast.error('Remittance processing failure: ' + err.message);
                        } finally {
                            setLoading(false);
                        }
                    }}
                >
                    {({ values, handleChange, handleBlur, setFieldValue, errors, touched, submitCount }) => {
                        const hasAttempted = submitCount > 0;
                        return (
                            <Form className="p-6 grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
                                <div>
                                    <label className="block font-bold text-gray-500 mb-1">Receipt Date:</label>
                                    <input type="date" name="processingDate" onChange={handleChange} value={values.processingDate} className="w-full rounded border border-stroke p-2 text-sm bg-white dark:bg-boxdark outline-none font-semibold text-black dark:text-white" />
                                </div>

                                <div className="relative space-y-1" ref={dropdownRef}>
                                    <label className="block font-bold text-primary mb-1">Search Outstanding Return Invoice: *</label>
                                    <input
                                        type="text"
                                        placeholder="🔍 Type Invoice # or Name..."
                                        value={searchQuery}
                                        onFocus={() => { if (!isEditMode) setIsDropdownOpen(true); }}
                                        onChange={(e) => {
                                            if (!isEditMode) {
                                                setSearchQuery(e.target.value);
                                                setIsDropdownOpen(true);
                                            }
                                        }}
                                        className={`w-full rounded border p-2 text-xs font-bold outline-none focus:border-primary ${isEditMode ? 'bg-gray-100 dark:bg-meta-4/20 text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-boxdark text-black dark:text-white'} ${hasAttempted && errors.returnRowId ? 'border-red-500' : 'border-stroke dark:border-stroke'}`}
                                    />
                                    {isDropdownOpen && !isEditMode && (
                                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded shadow-2xl z-99999 max-h-44 overflow-y-auto scrollbar-thin">
                                            {filteredReturns.length === 0 ? (
                                                <div className="p-3 text-center text-xs text-gray-400 font-medium italic">No pending return options profiles.</div>
                                            ) : (
                                                filteredReturns.map(r => {
                                                    const isDisabled = r.is_fully_settled;

                                                    return (
                                                        <div
                                                            key={r.id}
                                                            onClick={() => {
                                                                if (isDisabled) {
                                                                    toast.error(`Return note ${r.original_invoice_no} is ${r.statusBadge} and cannot be selected.`);
                                                                    return;
                                                                }

                                                                setFieldValue('returnRowId', r.id);
                                                                setFieldValue('invoiceNoRef', r.original_invoice_no);
                                                                setFieldValue('customerName', r.customer_name);
                                                                setFieldValue('remainingBalanceMax', r.computed_remaining_due);
                                                                setSearchQuery(`${r.original_invoice_no} (${r.customer_name})`);

                                                                setSelectedReturnDetails({
                                                                    totalAmount: Number(r.total_net_amount || r.total_amount || 0),
                                                                    alreadyPaid: Number(r.computed_total_paid),
                                                                    remainingDue: Number(r.computed_remaining_due)
                                                                });
                                                                setIsDropdownOpen(false);
                                                            }}
                                                            className={`p-2.5 duration-100 flex justify-between items-center text-xs border-b border-stroke dark:border-strokedark last:border-0 ${
                                                                isDisabled
                                                                    ? 'bg-gray-100 dark:bg-meta-4/30 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-75'
                                                                    : 'hover:bg-slate-100 dark:hover:bg-meta-4 cursor-pointer text-black dark:text-white font-bold'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span>📄 {r.original_invoice_no} - {r.customer_name}</span>
                                                                {isDisabled && (
                                                                    <span className="text-[9px] font-black uppercase tracking-wide bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded">
                                                                        {r.statusBadge}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-mono opacity-80 ml-2">
                                                                {isDisabled ? `Rs. 0` : `Cash Owed: Rs. ${Number(r.computed_remaining_due).toLocaleString()}`}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}

                                </div>
                                <div>
                                    <label className="block font-bold text-gray-500 mb-1">Customer / Account Title:</label>
                                    <input type="text" name="customerName" disabled value={values.customerName} className="w-full rounded border border-stroke p-2 text-sm bg-gray-100 dark:bg-meta-4/20 text-gray-500 font-bold outline-none cursor-not-allowed" placeholder="Customer reference..." />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-500 mb-1">Invoice Reference No:</label>
                                    <input type="text" name="invoiceNoRef" disabled value={values.invoiceNoRef} className="w-full rounded border border-stroke p-2 text-sm bg-gray-100 dark:bg-meta-4/20 text-gray-500 font-bold outline-none cursor-not-allowed" placeholder="Invoice trace..." />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-500 mb-1">Settlement Mode Selector: *</label>
                                    <select name="settlementMode" value={values.settlementMode} onChange={handleChange} className="w-full border border-stroke dark:border-strokedark rounded p-2 bg-white dark:bg-boxdark outline-none font-black text-xs text-black dark:text-white focus:border-primary">
                                        <option value="Cash">Cash Ledger Account</option>
                                        <option value="Bank">Bank Account Wire Transfer</option>
                                    </select>
                                </div>

                                {values.settlementMode === 'Bank' && (
                                    <div className="md:col-span-2">
                                        <label className="block font-bold text-gray-500 mb-1">Choose Target Financial Bank Account: *</label>
                                        <select name="selectedBankTitle" value={values.selectedBankTitle} onChange={handleChange} className="w-full border border-stroke dark:border-strokedark rounded p-2 bg-white dark:bg-boxdark outline-none font-bold text-xs text-black dark:text-white focus:border-primary">
                                            <option value="">-- Choose Account Wire Registry --</option>
                                            {banksList.map(b => <option key={b.id} value={b.accountTitle}>{b.bankName} - {b.accountTitle}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="md:col-span-2">
                                    <label className="block font-bold text-danger mb-1">Remitted Cash Back Amount Paid (PKR): *</label>
                                    <input type="number" name="amountPaid" value={values.amountPaid} onKeyDown={blockInvalidChar} onChange={handleChange} placeholder="Type payment..." className={`w-full rounded border p-2 bg-transparent text-right font-black text-danger text-sm focus:border-primary outline-none text-black dark:text-white ${hasAttempted && errors.amountPaid ? 'border-red-500 bg-red-50' : 'border-stroke'}`} />
                                    {hasAttempted && errors.amountPaid && <p className="text-red-500 font-bold text-[10px] mt-1">⚠️ {String(errors.amountPaid)}</p>}
                                </div>

                                {values.returnRowId && (
                                    <div className="md:col-span-4 bg-gray-50 dark:bg-meta-4/20 p-3 rounded border border-stroke dark:border-strokedark font-mono text-[11px] grid grid-cols-3 text-center text-gray-500 dark:text-white">
                                        <div>Total Return Value: <b className="block text-xs text-black dark:text-white">Rs. {Number(selectedReturnDetails.totalAmount).toLocaleString()}</b></div>
                                        <div>Already Refunded: <b className="block text-xs text-success">Rs. {Number(selectedReturnDetails.alreadyPaid).toLocaleString()}</b></div>
                                        <div>
                                            Remaining Return Cash Owed:
                                            <b className="block text-xs text-danger font-black">
                                                Rs. {Math.max(0, Number(selectedReturnDetails.remainingDue) - Number(values.amountPaid || 0)).toLocaleString()}
                                            </b>
                                        </div>
                                    </div>
                                )}

                                <div className="md:col-span-4 pt-4 mt-2 border-t border-stroke dark:border-strokedark flex justify-between items-center bg-gray-50 dark:bg-meta-4/5 p-4 rounded-sm">
                                    <button type="button" onClick={() => navigate('/sales/sales-return-receipt/list')} className="rounded border border-stroke dark:border-strokedark py-2 px-10 font-semibold text-sm text-black dark:text-white hover:bg-gray-100 transition cursor-pointer">Cancel</button>
                                    <button type="submit" disabled={loading} className="bg-success text-white py-2 px-12 rounded font-black text-sm hover:bg-opacity-90 transition shadow-sm cursor-pointer">{loading ? <Spinner /> : (isEditMode ? 'Modify Entry' : 'Save Record')}</button>
                                </div>
                            </Form>
                        );
                    }}
                </Formik>
            </div>
        </div>
    );
};

export default SaleReturnReceiptAdd;
