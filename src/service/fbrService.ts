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

// TODO: Configure the client's actual FBR API URLs and Token here when going live.
export const FBR_CONFIG = {
  // Authentication Token provided by FBR Iris
  BEARER_TOKEN: 'YOUR_FBR_IRIS_BEARER_TOKEN', // Replace when going live

  // Main Invoice Posting APIs
  INVOICE: {
    SANDBOX: 'https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata_sb',
    PRODUCTION: 'https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata',
  },

  // Invoice Validation APIs (Checks data without officially posting)
  VALIDATION: {
    SANDBOX: 'https://gw.fbr.gov.pk/di_data/v1/di/validateinvoicedata_sb',
    PRODUCTION: 'https://gw.fbr.gov.pk/di_data/v1/di/validateinvoicedata',
  },

  // Reference Data APIs (Lookup FBR tables)
  REFERENCE: {
    PROVINCES: 'https://gw.fbr.gov.pk/pdi/v1/provinces',
    DOCUMENT_TYPE: 'https://gw.fbr.gov.pk/pdi/v1/doctypecode',
    ITEM_CODE: 'https://gw.fbr.gov.pk/pdi/v1/itemdesccode',
    SRO_ITEM_ID: 'https://gw.fbr.gov.pk/pdi/v1/sroitemcode',
    TRANSACTION_TYPE: 'https://gw.fbr.gov.pk/pdi/v1/transtypecode',
    UOM: 'https://gw.fbr.gov.pk/pdi/v1/uom',
    SRO_SCHEDULE: 'https://gw.fbr.gov.pk/pdi/v1/SroSchedule', // Requires query params
    TAX_RATES: 'https://gw.fbr.gov.pk/pdi/v2/SaleTypeToRate', // Requires query params
    HS_UOM: 'https://gw.fbr.gov.pk/pdi/v2/HS_UOM', // Requires query params
    STATL: 'https://gw.fbr.gov.pk/dist/v1/statl',
    STATL_REG_TYPE: 'https://gw.fbr.gov.pk/dist/v1/Get_Reg_Type',
  }
};

const mapFBRScenario = (scenarioStr: string, isRegistered: boolean) => {
  const s = String(scenarioStr || '').toLowerCase();
  if (s.includes('3rd schedule')) {
    return { scenarioId: 'SN008', saleType: '3rd Schedule Goods' };
  }
  if (s.includes('reduced')) {
    return { scenarioId: 'SN005', saleType: 'Reduced rate goods' };
  }
  if (s.includes('exempt')) {
    return { scenarioId: 'SN006', saleType: 'Exempt goods' };
  }
  if (s.includes('zero rated')) {
    return { scenarioId: 'SN007', saleType: 'Zero rated goods' };
  }
  if (s.includes('sro 297')) {
    return { scenarioId: 'SN004', scenarioIdText: 'SN004', saleType: 'Goods listed in SRO 297(1)/2023' };
  }
  if (s.includes('unregistered')) {
    return { scenarioId: 'SN002', saleType: 'Goods at standard rate (default)' };
  }
  if (isRegistered) {
    return { scenarioId: 'SN001', saleType: 'Goods at standard rate (default)' };
  }
  return { scenarioId: 'SN002', saleType: 'Goods at standard rate (default)' };
};

/**
 * Transforms an ERP Sales Invoice into FBR DI API v1.12 Payload Format
 */
export const buildFBRInvoicePayload = (inv: any): FBRInvoicePayload => {
  const invoiceItems = inv.items || inv.products || [];
  const rawBuyerId = String(inv.buyer_ntn || inv.cnic || inv.ntn || '').trim();
  const isRegisteredBuyer = rawBuyerId.length >= 7 && rawBuyerId !== '1000000000000';
  const scenarioInfo = mapFBRScenario(inv.scenario_type || inv.fbrScenario, isRegisteredBuyer);

  const formattedItems: FBRItemPayload[] = invoiceItems.map((item: any) => {
    const qty = Number(item.qty || item.quantity || 1);
    const rp = Number(item.rp || item.rate || item.unit_price || 0);
    const gstRate = Number(item.gstRate || item.gst_rate || 18);
    const fTax = Number(item.fTaxPer || item.f_tax_per || 0);

    const discount = Number(item.discount || item.discountAmt || item.discount_amt || 0);
    const baseExcl = rp * qty;
    const isRetailBasedTax =
      String(scenarioInfo.saleType || '').toLowerCase().includes('3rd schedule') ||
      String(scenarioInfo.saleType || '').toLowerCase().includes('sro 297');
    const is3rdSch = String(scenarioInfo.saleType || '').toLowerCase().includes('3rd schedule');
    const taxableBase = isRetailBasedTax ? baseExcl : Math.max(0, baseExcl - discount);

    const salesTaxAmount = (taxableBase * gstRate) / 100;
    const furtherTaxAmount = (taxableBase * fTax) / 100;
    const totalItemValue = (baseExcl - discount) + salesTaxAmount + furtherTaxAmount;

    const extractedHsCode = String(item.hsCode || item.hs_code || item.hsCodeNo || item.hscode || item.hs_Code || item.hsNo || '').trim();

    return {
      hsCode: extractedHsCode,
      productDescription: item.itemName || item.product_name || item.name || 'Commercial Product',
      rate: `${gstRate}%`,
      uoM: item.uom || 'Numbers, pieces, units',
      quantity: qty,
      totalValues: Math.round(totalItemValue * 100) / 100,
      valueSalesExcludingST: Math.round(taxableBase * 100) / 100,
      fixedNotifiedValueOrRetailPrice: is3rdSch ? rp : 0,
      salesTaxApplicable: Math.round(salesTaxAmount * 100) / 100,
      salesTaxWithheldAtSource: 0,
      extraTax: 0,
      furtherTax: Math.round(furtherTaxAmount * 100) / 100,
      sroScheduleNo: '',
      fedPayable: 0,
      discount: discount,
      saleType: scenarioInfo.saleType,
      sroItemSerialNo: ''
    };
  });

  const configuredSellerNTN = inv.seller_ntn || (typeof window !== 'undefined' && localStorage.getItem('fbr_seller_ntn')) || '4130686580237';

  return {
    invoiceType: 'Sale Invoice',
    invoiceDate: inv.created_at ? new Date(inv.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    sellerNTNCNIC: configuredSellerNTN,
    sellerBusinessName: inv.seller_name || 'NOOR HORIZON TECHNOLOGIES',
    sellerProvince: inv.seller_province || 'Sindh',
    sellerAddress: inv.seller_address || 'Karachi, Pakistan',
    buyerNTNCNIC: isRegisteredBuyer ? rawBuyerId : '',
    buyerBusinessName: inv.customer_name || 'Unregistered Customer',
    buyerProvince: inv.buyer_province || 'Sindh',
    buyerAddress: inv.buyer_address || 'Karachi',
    buyerRegistrationType: isRegisteredBuyer ? 'Registered' : 'Unregistered',
    invoiceRefNo: String(inv.invoice_no || inv.invoiceNo || inv.id || ''),
    scenarioId: scenarioInfo.scenarioId,
    items: formattedItems
  };
};

/**
 * Transforms an ERP Sales Return Debit Note into FBR DI API v1.12 Payload Format
 */
export const buildFBRReturnPayload = (ret: any): FBRInvoicePayload => {
  const returnItems = ret.items || [];
  const cleanInvRef = String(ret.original_invoice_no || '').replace('INV-', '').trim();
  const rawBuyerId = String(ret.buyer_ntn || ret.cnic || '').trim();
  const isRegisteredBuyer = rawBuyerId.length >= 7 && rawBuyerId !== '1000000000000';
  const scenarioInfo = mapFBRScenario(ret.scenario_type || ret.fbrScenario, isRegisteredBuyer);

  const formattedItems: FBRItemPayload[] = returnItems.map((item: any) => {
    const qty = Number(item.qty || item.returnedQty || 1);
    const rp = Number(item.rp || item.rate || 0);
    const gstRate = Number(item.gstRate || item.gst_rate || 18);
    const fTax = Number(item.fTaxPer || item.f_tax_per || 0);

    const baseExcl = rp * qty;
    const salesTaxAmount = (baseExcl * gstRate) / 100;
    const furtherTaxAmount = (baseExcl * fTax) / 100;
    const totalItemValue = baseExcl + salesTaxAmount + furtherTaxAmount;

    const extractedHsCode = String(item.hsCode || item.hs_code || item.hsCodeNo || item.hscode || item.hs_Code || item.hsNo || '').trim();

    return {
      hsCode: extractedHsCode,
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
      saleType: scenarioInfo.saleType,
      sroItemSerialNo: ''
    };
  });

  const configuredSellerNTN = ret.seller_ntn || (typeof window !== 'undefined' && localStorage.getItem('fbr_seller_ntn')) || '4130686580237';

  return {
    invoiceType: 'Debit Note',
    invoiceDate: ret.return_date || new Date().toISOString().split('T')[0],
    sellerNTNCNIC: configuredSellerNTN,
    sellerBusinessName: ret.seller_name || 'NOOR HORIZON TECHNOLOGIES',
    sellerProvince: ret.seller_province || 'Sindh',
    sellerAddress: ret.seller_address || 'Karachi, Pakistan',
    buyerNTNCNIC: isRegisteredBuyer ? rawBuyerId : '',
    buyerBusinessName: ret.customer_name || 'Unregistered Customer',
    buyerProvince: ret.buyer_province || 'Sindh',
    buyerAddress: ret.buyer_address || 'Karachi',
    buyerRegistrationType: isRegisteredBuyer ? 'Registered' : 'Unregistered',
    invoiceRefNo: ret.original_fbr_fiscal_number || ret.fbr_fiscal_number || (cleanInvRef ? `${configuredSellerNTN}DI${cleanInvRef.padStart(16, '0')}` : ''),
    scenarioId: scenarioInfo.scenarioId,
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

  const targetUrl = isSandbox ? FBR_CONFIG.INVOICE.SANDBOX : FBR_CONFIG.INVOICE.PRODUCTION;

  if (!targetUrl) {
    throw new Error('FBR API URL is not configured. Please set INVOICE.SANDBOX or INVOICE.PRODUCTION in the FBR_CONFIG object in fbrService.ts');
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FBR_CONFIG.BEARER_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedErr = errorText;
      try {
        const jsonErr = JSON.parse(errorText);
        parsedErr = jsonErr.validationResponse?.error || jsonErr.message || jsonErr.error || JSON.stringify(jsonErr);
      } catch (_) { }

      if (parsedErr?.includes('seller registration number') || parsedErr?.includes('0401') || response.status === 401) {
        throw new Error('FBR Authorization Error (401): The Seller NTN/CNIC in your invoice does not match the NTN/CNIC registered on your FBR Iris Security Token.');
      }

      throw new Error(`FBR Gateway Error (${response.status}): ${parsedErr}`);
    }

    const rawText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(rawText);
    } catch (_) {
      throw new Error(`FBR Server Raw Response Error: ${rawText.slice(0, 200)}`);
    }

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

      if (errCode === '0401' || errMsg?.includes('seller registration number')) {
        throw new Error('FBR Authorization Error (401): Seller NTN/CNIC does not match the NTN/CNIC registered on your FBR Iris Bearer Token.');
      }

      throw new Error(`FBR Validation Error [${errCode}]: ${errMsg}`);
    }
  } catch (err: any) {
    if (err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      throw new Error('FBR Server Unreachable: Network request to https://gw.fbr.gov.pk was blocked or offline.');
    }
    throw err;
  }
};
