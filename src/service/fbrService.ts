import { supabase } from '../Context/supabaseClient';

export interface FBRItemPayload {
  hsCode: string;
  productDescription: string;
  rate: string;
  uoM: string;
  quantity: number;
  totalValues: number;
  valueSalesExcludingST: number;
  fixedNotifiedValueOrRetailPrice: number;
  salesTaxApplicable: number;
  salesTaxWithheldAtSource: number;
  extraTax: number | string;
  furtherTax: number;
  sroScheduleNo: string;
  fedPayable: number;
  discount: number;
  saleType: string;
  sroItemSerialNo: string;
}

export interface FBRInvoicePayload {
  invoiceType: 'Sale Invoice' | 'Debit Note';
  invoiceDate: string;
  sellerNTNCNIC: string;
  sellerBusinessName: string;
  sellerProvince: string;
  sellerAddress: string;
  buyerNTNCNIC: string;
  buyerBusinessName: string;
  buyerProvince: string;
  buyerAddress: string;
  buyerRegistrationType: 'Registered' | 'Unregistered';
  invoiceRefNo: string;
  scenarioId: string;
  items: FBRItemPayload[];
}

const FBR_SANDBOX_URL = 'https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata_sb';
const FBR_PRODUCTION_URL = 'https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata';

/**
 * Transforms an ERP Sales Invoice into FBR DI API v1.12 Payload Format
 */
export const buildFBRInvoicePayload = (inv: any): FBRInvoicePayload => {
  const invoiceItems = inv.items || inv.products || [];

  const formattedItems: FBRItemPayload[] = invoiceItems.map((item: any) => {
    const qty = Number(item.qty || item.quantity || 1);
    const rp = Number(item.rp || item.rate || item.unit_price || 0);
    const gstRate = Number(item.gstRate || item.gst_rate || 18);
    const fTax = Number(item.fTaxPer || item.f_tax_per || 0);

    const baseExcl = rp * qty;
    const salesTaxAmount = (baseExcl * gstRate) / 100;
    const furtherTaxAmount = (baseExcl * fTax) / 100;
    const totalItemValue = baseExcl + salesTaxAmount + furtherTaxAmount;

    return {
      hsCode: item.hsCode || item.hs_code || '8471.3000',
      productDescription: item.itemName || item.product_name || item.name || 'General Item',
      rate: `${gstRate}%`,
      uoM: item.uom || 'Numbers, pieces, units',
      quantity: qty,
      totalValues: Math.round(totalItemValue * 100) / 100,
      valueSalesExcludingST: Math.round(baseExcl * 100) / 100,
      fixedNotifiedValueOrRetailPrice: 0,
      salesTaxApplicable: Math.round(salesTaxAmount * 100) / 100,
      salesTaxWithheldAtSource: 0,
      extraTax: 0,
      furtherTax: Math.round(furtherTaxAmount * 100) / 100,
      sroScheduleNo: '',
      fedPayable: 0,
      discount: Number(item.discount || 0),
      saleType: 'Goods at standard rate (default)',
      sroItemSerialNo: ''
    };
  });

  return {
    invoiceType: 'Sale Invoice',
    invoiceDate: inv.created_at ? new Date(inv.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    sellerNTNCNIC: inv.seller_ntn || '0786909',
    sellerBusinessName: inv.seller_name || 'Softhub-PK ERP Systems',
    sellerProvince: inv.seller_province || 'Sindh',
    sellerAddress: inv.seller_address || 'Karachi, Pakistan',
    buyerNTNCNIC: inv.buyer_ntn || inv.cnic || '1000000000000',
    buyerBusinessName: inv.customer_name || 'General Client',
    buyerProvince: inv.buyer_province || 'Sindh',
    buyerAddress: inv.buyer_address || 'Karachi',
    buyerRegistrationType: inv.buyer_ntn ? 'Registered' : 'Unregistered',
    invoiceRefNo: '',
    scenarioId: 'SN001',
    items: formattedItems
  };
};

/**
 * Transforms an ERP Sales Return Debit Note into FBR DI API v1.12 Payload Format
 */
export const buildFBRReturnPayload = (ret: any): FBRInvoicePayload => {
  const returnItems = ret.items || [];
  const cleanInvRef = String(ret.original_invoice_no || '').replace('INV-', '').trim();

  const formattedItems: FBRItemPayload[] = returnItems.map((item: any) => {
    const qty = Number(item.qty || item.returnedQty || 1);
    const rp = Number(item.rp || item.rate || 0);
    const gstRate = Number(item.gstRate || item.gst_rate || 18);
    const fTax = Number(item.fTaxPer || item.f_tax_per || 0);

    const baseExcl = rp * qty;
    const salesTaxAmount = (baseExcl * gstRate) / 100;
    const furtherTaxAmount = (baseExcl * fTax) / 100;
    const totalItemValue = baseExcl + salesTaxAmount + furtherTaxAmount;

    return {
      hsCode: item.hsCode || item.hs_code || '8471.3000',
      productDescription: item.itemName || item.product_name || 'Returned Product',
      rate: `${gstRate}%`,
      uoM: item.uom || 'Numbers, pieces, units',
      quantity: qty,
      totalValues: Math.round(totalItemValue * 100) / 100,
      valueSalesExcludingST: Math.round(baseExcl * 100) / 100,
      fixedNotifiedValueOrRetailPrice: 0,
      salesTaxApplicable: Math.round(salesTaxAmount * 100) / 100,
      salesTaxWithheldAtSource: 0,
      extraTax: 0,
      furtherTax: Math.round(furtherTaxAmount * 100) / 100,
      sroScheduleNo: '',
      fedPayable: 0,
      discount: 0,
      saleType: 'Goods at standard rate (default)',
      sroItemSerialNo: ''
    };
  });

  return {
    invoiceType: 'Debit Note',
    invoiceDate: ret.return_date || new Date().toISOString().split('T')[0],
    sellerNTNCNIC: ret.seller_ntn || '0786909',
    sellerBusinessName: ret.seller_name || 'Softhub-PK ERP Systems',
    sellerProvince: ret.seller_province || 'Sindh',
    sellerAddress: ret.seller_address || 'Karachi, Pakistan',
    buyerNTNCNIC: ret.buyer_ntn || '1000000000000',
    buyerBusinessName: ret.customer_name || 'General Client',
    buyerProvince: ret.buyer_province || 'Sindh',
    buyerAddress: ret.buyer_address || 'Karachi',
    buyerRegistrationType: ret.buyer_ntn ? 'Registered' : 'Unregistered',
    invoiceRefNo: cleanInvRef ? `7327556DI${cleanInvRef.padStart(16, '0')}` : '7327556DI1744111990654',
    scenarioId: 'SN001',
    items: formattedItems
  };
};

/**
 * Sends Invoice or Debit Note Payload to FBR DI System.
 * Throws explicit error messages for network issues, HTTP failures, or FBR validation rejections.
 */
export const syncWithFBR = async (payload: FBRInvoicePayload, isSandbox: boolean = true) => {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    throw new Error('Offline Error: Internet connection lost. Please reconnect and try posting again.');
  }

  const targetUrl = isSandbox ? FBR_SANDBOX_URL : FBR_PRODUCTION_URL;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 3abdd5c9-08cb-3f81-9a8b-331e9282f911' // FBR Iris Sandbox Security Token
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedErr = errorText;
      try {
        const jsonErr = JSON.parse(errorText);
        parsedErr = jsonErr.message || jsonErr.error || JSON.stringify(jsonErr);
      } catch (_) {}
      throw new Error(`FBR Gateway Error (${response.status}): ${parsedErr || 'Invalid API Token or Unauthorized access.'}`);
    }

    const data = await response.json();

    // Check FBR Validation Status
    const valResp = data.validationResponse;
    const isSuccess = valResp?.statusCode === '00' || valResp?.status === 'Valid' || !!data.invoiceNumber;

    if (isSuccess && (data.invoiceNumber || payload.invoiceRefNo)) {
      const finalInvoiceNo = data.invoiceNumber || payload.invoiceRefNo;
      return {
        success: true,
        fbrFiscalNumber: finalInvoiceNo,
        fbrQrCode: `FBR_DI_VERIFIED|${finalInvoiceNo}|${payload.sellerNTNCNIC}|${payload.invoiceDate}`,
        rawResponse: data
      };
    } else {
      const errCode = valResp?.statusCode || 'VAL_ERR';
      const errMsg = valResp?.error || valResp?.invoiceStatuses?.[0]?.error || 'Invoice payload failed FBR validation checks.';
      throw new Error(`FBR Validation Error [${errCode}]: ${errMsg}`);
    }
  } catch (err: any) {
    if (err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      throw new Error('FBR Server Unreachable: Network request to https://gw.fbr.gov.pk was blocked or offline.');
    }
    throw err;
  }
};
