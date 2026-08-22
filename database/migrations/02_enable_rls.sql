-- ====================================================================
-- NOOR HORIZON TECHNOLOGIES ERP - ROW-LEVEL SECURITY (RLS) POLICIES
-- Migration: 02_enable_rls.sql
-- Description: Enforces 100% data isolation between different clients/tenants
-- ====================================================================

-- 1. Helper function to extract tenant_id from the authenticated user session
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        -- Check JWT user_metadata
        (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID,
        -- Check JWT app_metadata
        (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID,
        -- Fallback to user_profiles table
        (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. ENABLE RLS ON ALL CORE TABLES
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_recoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE opening_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_return_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_return_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesmen ENABLE ROW LEVEL SECURITY;

-- 3. CREATE ISOLATION POLICIES (Users only see and touch their company's data)

-- Tenants Policy (Users only see their own tenant details)
CREATE POLICY "tenant_access" ON tenants
    FOR ALL TO authenticated
    USING (id = current_tenant_id());

-- User Profiles
CREATE POLICY "user_profiles_tenant_isolation" ON user_profiles
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Customers
CREATE POLICY "customers_tenant_isolation" ON customers
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Customer Recoveries
CREATE POLICY "customer_recoveries_tenant_isolation" ON customer_recoveries
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Vendors
CREATE POLICY "vendors_tenant_isolation" ON vendors
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Inventory Categories
CREATE POLICY "inventory_categories_tenant_isolation" ON inventory_categories
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Inventory Brands
CREATE POLICY "inventory_brands_tenant_isolation" ON inventory_brands
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Inventory Locations
CREATE POLICY "inventory_locations_tenant_isolation" ON inventory_locations
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Products
CREATE POLICY "products_tenant_isolation" ON products
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Warehouse Inventory
CREATE POLICY "warehouse_inventory_tenant_isolation" ON warehouse_inventory
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Opening Stocks
CREATE POLICY "opening_stocks_tenant_isolation" ON opening_stocks
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Stock Transfers
CREATE POLICY "stock_transfers_tenant_isolation" ON stock_transfers
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Banks
CREATE POLICY "banks_tenant_isolation" ON banks
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Chart of Accounts
CREATE POLICY "chart_of_accounts_tenant_isolation" ON chart_of_accounts
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Financial Vouchers
CREATE POLICY "financial_vouchers_tenant_isolation" ON financial_vouchers
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Sales Invoices
CREATE POLICY "sales_invoices_tenant_isolation" ON sales_invoices
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Sales Returns
CREATE POLICY "sales_returns_tenant_isolation" ON sales_returns
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Sales Return Receipts
CREATE POLICY "sales_return_receipts_tenant_isolation" ON sales_return_receipts
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Supplier Purchases
CREATE POLICY "supplier_purchases_tenant_isolation" ON supplier_purchases
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Purchase Returns
CREATE POLICY "purchase_returns_tenant_isolation" ON purchase_returns
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Purchase Return Receipts
CREATE POLICY "purchase_return_receipts_tenant_isolation" ON purchase_return_receipts
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());

-- Salesmen
CREATE POLICY "salesmen_tenant_isolation" ON salesmen
    FOR ALL TO authenticated
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());
