-- ====================================================================
-- NOOR HORIZON TECHNOLOGIES ERP - MASTER DATABASE SCHEMA
-- Migration: 01_init_schema.sql
-- Description: Complete tables for Multi-Tenant SaaS with FBR Integration
-- ====================================================================

-- 1. Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TENANTS / COMPANIES TABLE (For Multi-Client SaaS)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,            -- e.g. 'client1', 'al-madina-traders'
    name VARCHAR(255) NOT NULL,                   -- Company Legal Name
    seller_ntn VARCHAR(32),                       -- FBR Seller NTN / CNIC
    seller_strn VARCHAR(32),                      -- Sales Tax Registration No
    business_type VARCHAR(64) DEFAULT 'Commercial',
    province VARCHAR(64) DEFAULT 'Sindh',
    address TEXT,
    phone VARCHAR(32),
    email VARCHAR(128),
    fbr_bearer_token TEXT,                        -- FBR Iris Bearer Token
    fbr_is_sandbox BOOLEAN DEFAULT TRUE,          -- Sandbox vs Production
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. USER TENANT MAPPING
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    role VARCHAR(32) DEFAULT 'Admin',             -- 'Admin', 'Manager', 'Cashier', 'Accountant', 'Salesman'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CUSTOMERS & RECOVERIES
CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "customerName" VARCHAR(255) NOT NULL,
    "ntnNo" VARCHAR(32),
    "cnicNo" VARCHAR(32),
    "primaryPhone" VARCHAR(32),
    address TEXT,
    province VARCHAR(64) DEFAULT 'Sindh',
    company VARCHAR(255),
    website VARCHAR(255),
    "stRegNo" VARCHAR(32),
    notes TEXT,
    "followUpDate" DATE,
    "currentBalance" NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_recoveries (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    recovery_date DATE DEFAULT CURRENT_DATE,
    bank_id BIGINT,
    receipt_no VARCHAR(64),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. VENDORS / SUPPLIERS
CREATE TABLE IF NOT EXISTS vendors (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vendor_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(32),
    email VARCHAR(128),
    address TEXT,
    province VARCHAR(64) DEFAULT 'Sindh',
    ntn VARCHAR(32),
    cnic VARCHAR(32),
    strn VARCHAR(32),
    "currentBalance" NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INVENTORY: CATEGORIES, BRANDS, LOCATIONS & PRODUCTS
CREATE TABLE IF NOT EXISTS inventory_categories (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_brands (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_locations (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    category_id BIGINT REFERENCES inventory_categories(id) ON DELETE SET NULL,
    brand_id BIGINT REFERENCES inventory_brands(id) ON DELETE SET NULL,
    category VARCHAR(128),
    brand VARCHAR(128),
    uom VARCHAR(64) DEFAULT 'Numbers, pieces, units',
    purchase_price NUMERIC(15, 2) DEFAULT 0.00,
    retail_price NUMERIC(15, 2) DEFAULT 0.00,
    mrp NUMERIC(15, 2) DEFAULT 0.00,
    current_stock NUMERIC(15, 2) DEFAULT 0.00,
    barcode VARCHAR(64),
    hs_code VARCHAR(32),                          -- FBR Harmonized System Tariff Code
    gst_rate NUMERIC(5, 2) DEFAULT 18.00,         -- FBR Standard GST Rate
    further_tax_rate NUMERIC(5, 2) DEFAULT 0.00,
    extra_tax_rate NUMERIC(5, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouse_inventory (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id BIGINT NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
    quantity NUMERIC(15, 2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opening_stocks (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id BIGINT NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
    quantity NUMERIC(15, 2) DEFAULT 0.00,
    cost_price NUMERIC(15, 2) DEFAULT 0.00,
    retail_price NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_transfers (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transfer_no VARCHAR(64) NOT NULL,
    source_location_id BIGINT REFERENCES inventory_locations(id),
    destination_location_id BIGINT REFERENCES inventory_locations(id),
    items JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    status VARCHAR(32) DEFAULT 'Completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BANKING & CHART OF ACCOUNTS
CREATE TABLE IF NOT EXISTS banks (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    "bankName" VARCHAR(255) NOT NULL,
    "accountTitle" VARCHAR(255) NOT NULL,
    "accountNumber" VARCHAR(64) NOT NULL,
    branch VARCHAR(128),
    iban VARCHAR(64),
    "initialBalance" NUMERIC(15, 2) DEFAULT 0.00,
    "currentBalance" NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_code VARCHAR(32) NOT NULL,
    account_title VARCHAR(255) NOT NULL,
    control_code VARCHAR(32),
    category_code VARCHAR(32),
    account_type VARCHAR(64),                     -- 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_vouchers (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    voucher_no VARCHAR(64) NOT NULL,
    voucher_type VARCHAR(32) NOT NULL,            -- 'CRV', 'CPV', 'BRV', 'BPV', 'JV'
    voucher_date DATE DEFAULT CURRENT_DATE,
    account_code VARCHAR(32),
    account_title VARCHAR(255),
    debit NUMERIC(15, 2) DEFAULT 0.00,
    credit NUMERIC(15, 2) DEFAULT 0.00,
    narration TEXT,
    salesman_id BIGINT,
    bank_id BIGINT REFERENCES banks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SALES & INVOICES (WITH FBR INTEGRATION COLUMNS)
CREATE TABLE IF NOT EXISTS sales_invoices (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_no VARCHAR(64) NOT NULL,
    customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    buyer_ntn VARCHAR(32),
    buyer_cnic VARCHAR(32),
    buyer_province VARCHAR(64) DEFAULT 'Sindh',
    buyer_address TEXT,
    buyer_registration_type VARCHAR(32) DEFAULT 'Unregistered',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,     -- JSON array of products, rates, GST, taxes
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    discount_amt NUMERIC(15, 2) DEFAULT 0.00,
    sales_tax_amt NUMERIC(15, 2) DEFAULT 0.00,
    further_tax_amt NUMERIC(15, 2) DEFAULT 0.00,
    extra_tax_amt NUMERIC(15, 2) DEFAULT 0.00,
    net_amount NUMERIC(15, 2) DEFAULT 0.00,
    amount_paid NUMERIC(15, 2) DEFAULT 0.00,
    balance_due NUMERIC(15, 2) DEFAULT 0.00,
    sale_status VARCHAR(32) DEFAULT 'Completed',
    receipt_status VARCHAR(32) DEFAULT 'Paid',
    fbr_scenario VARCHAR(64) DEFAULT 'Goods at standard rate (default)',
    fbr_fiscal_number VARCHAR(128),               -- Verified Invoice No from FBR Iris Gateway
    fbr_qr_code TEXT,                             -- Generated FBR QR Code string
    fbr_status VARCHAR(32) DEFAULT 'Pending',     -- 'Pending', 'Verified', 'Rejected', 'Offline'
    fbr_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_returns (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    return_no VARCHAR(64) NOT NULL,
    original_invoice_no VARCHAR(64),
    customer_name VARCHAR(255) NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    amount_paid NUMERIC(15, 2) DEFAULT 0.00,
    return_date DATE DEFAULT CURRENT_DATE,
    fbr_fiscal_number VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_return_receipts (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    return_no VARCHAR(64) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    amount_refunded NUMERIC(15, 2) DEFAULT 0.00,
    bank_id BIGINT REFERENCES banks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PURCHASES & SUPPLIER TRANSACTIONS
CREATE TABLE IF NOT EXISTS supplier_purchases (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    purchase_no VARCHAR(64) NOT NULL,
    vendor_id BIGINT REFERENCES vendors(id) ON DELETE SET NULL,
    vendor_name VARCHAR(255) NOT NULL,
    target_warehouse BIGINT REFERENCES inventory_locations(id),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    tax_amt NUMERIC(15, 2) DEFAULT 0.00,
    discount_amt NUMERIC(15, 2) DEFAULT 0.00,
    net_amount NUMERIC(15, 2) DEFAULT 0.00,
    amount_paid NUMERIC(15, 2) DEFAULT 0.00,
    payment_term VARCHAR(64) DEFAULT 'Cash',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_returns (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    return_no VARCHAR(64) NOT NULL,
    purchase_no VARCHAR(64),
    vendor_name VARCHAR(255) NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    amount_paid NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_return_receipts (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    return_no VARCHAR(64) NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    amount_paid NUMERIC(15, 2) DEFAULT 0.00,
    bank_id BIGINT REFERENCES banks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SALESMEN / AGENTS
CREATE TABLE IF NOT EXISTS salesmen (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    commission_rate NUMERIC(5, 2) DEFAULT 0.00,
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
