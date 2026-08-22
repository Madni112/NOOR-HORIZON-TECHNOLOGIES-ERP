-- ====================================================================
-- NOOR HORIZON TECHNOLOGIES ERP - PERFORMANCE INDEXES & TRIGGERS
-- Migration: 03_indexes_and_triggers.sql
-- Description: High-speed B-Tree indexes on tenant_id, created_at, and automated timestamps
-- ====================================================================

-- 1. Performance Indexes for Multi-Tenant Query Filtering
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id, "customerName");
CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id, vendor_name);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id, barcode, product_name);
CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_tenant ON warehouse_inventory(tenant_id, product_id, location_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_tenant_date ON sales_invoices(tenant_id, created_at DESC, invoice_no);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_fbr ON sales_invoices(tenant_id, fbr_fiscal_number);
CREATE INDEX IF NOT EXISTS idx_financial_vouchers_tenant ON financial_vouchers(tenant_id, voucher_date DESC, voucher_type);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_tenant ON chart_of_accounts(tenant_id, account_code);
CREATE INDEX IF NOT EXISTS idx_supplier_purchases_tenant ON supplier_purchases(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_tenant ON stock_transfers(tenant_id, transfer_no);

-- 2. Trigger function to automatically update 'updated_at' column
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply automatic timestamp triggers
DROP TRIGGER IF EXISTS trg_update_tenants_timestamp ON tenants;
CREATE TRIGGER trg_update_tenants_timestamp BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_update_customers_timestamp ON customers;
CREATE TRIGGER trg_update_customers_timestamp BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_update_vendors_timestamp ON vendors;
CREATE TRIGGER trg_update_vendors_timestamp BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_update_products_timestamp ON products;
CREATE TRIGGER trg_update_products_timestamp BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_update_banks_timestamp ON banks;
CREATE TRIGGER trg_update_banks_timestamp BEFORE UPDATE ON banks FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_update_sales_invoices_timestamp ON sales_invoices;
CREATE TRIGGER trg_update_sales_invoices_timestamp BEFORE UPDATE ON sales_invoices FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_update_supplier_purchases_timestamp ON supplier_purchases;
CREATE TRIGGER trg_update_supplier_purchases_timestamp BEFORE UPDATE ON supplier_purchases FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
