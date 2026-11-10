-- NOVA COMERCIAL — master-data foundation
-- Standalone SQL migration. It is intentionally outside Prisma's migration chain
-- until the Prisma/Supabase identity contract is reconciled and reviewed.
-- Target: PostgreSQL 17+, existing nova_core.organizations table.
-- This file has NOT been applied to the Supabase project.

CREATE SCHEMA IF NOT EXISTS nova_comercial;

CREATE TABLE nova_comercial.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(180) NOT NULL,
  branch_type VARCHAR(24) NOT NULL DEFAULT 'BRANCH'
    CHECK (branch_type IN ('HEAD_OFFICE', 'BRANCH')),
  address_line VARCHAR(240),
  municipality VARCHAR(120),
  province VARCHAR(120),
  country_code CHAR(2) NOT NULL DEFAULT 'AO',
  phone VARCHAR(40),
  email VARCHAR(254),
  is_headquarters BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT branches_organization_fk
    FOREIGN KEY (organization_id) REFERENCES nova_core.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT branches_org_id_unique UNIQUE (organization_id, id),
  CONSTRAINT branches_org_code_unique UNIQUE (organization_id, code)
);
CREATE UNIQUE INDEX branches_one_headquarters_per_org
  ON nova_comercial.branches (organization_id) WHERE is_headquarters;

CREATE TABLE nova_comercial.fiscal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(120) NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'CLOSING', 'CLOSED')),
  closed_at TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT fiscal_periods_dates_check CHECK (ends_on >= starts_on),
  CONSTRAINT fiscal_periods_closed_check CHECK (
    (status = 'CLOSED' AND closed_at IS NOT NULL) OR
    (status <> 'CLOSED' AND closed_at IS NULL)
  ),
  CONSTRAINT fiscal_periods_organization_fk
    FOREIGN KEY (organization_id) REFERENCES nova_core.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT fiscal_periods_org_id_unique UNIQUE (organization_id, id),
  CONSTRAINT fiscal_periods_org_code_unique UNIQUE (organization_id, code)
);
CREATE INDEX fiscal_periods_org_dates_idx
  ON nova_comercial.fiscal_periods (organization_id, starts_on, ends_on);

CREATE TABLE nova_comercial.currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  code CHAR(3) NOT NULL,
  name VARCHAR(80) NOT NULL,
  symbol VARCHAR(8) NOT NULL,
  decimal_places SMALLINT NOT NULL DEFAULT 2 CHECK (decimal_places BETWEEN 0 AND 4),
  is_base BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT currencies_code_format_check CHECK (code ~ '^[A-Z]{3}$'),
  CONSTRAINT currencies_organization_fk
    FOREIGN KEY (organization_id) REFERENCES nova_core.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT currencies_org_id_unique UNIQUE (organization_id, id),
  CONSTRAINT currencies_org_code_unique UNIQUE (organization_id, code)
);
CREATE UNIQUE INDEX currencies_one_base_per_org
  ON nova_comercial.currencies (organization_id) WHERE is_base;

CREATE TABLE nova_comercial.units_of_measure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(80) NOT NULL,
  symbol VARCHAR(16) NOT NULL,
  decimal_places SMALLINT NOT NULL DEFAULT 2 CHECK (decimal_places BETWEEN 0 AND 6),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT units_organization_fk
    FOREIGN KEY (organization_id) REFERENCES nova_core.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT units_org_id_unique UNIQUE (organization_id, id),
  CONSTRAINT units_org_code_unique UNIQUE (organization_id, code)
);

CREATE TABLE nova_comercial.tax_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(120) NOT NULL,
  tax_type VARCHAR(24) NOT NULL
    CHECK (tax_type IN ('VAT', 'EXCISE', 'WITHHOLDING', 'OTHER')),
  tax_rate NUMERIC(7,4) NOT NULL CHECK (tax_rate BETWEEN 0 AND 100),
  effective_from DATE NOT NULL,
  effective_to DATE,
  tax_authority_reference VARCHAR(80),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT tax_codes_effective_dates_check CHECK (
    effective_to IS NULL OR effective_to >= effective_from
  ),
  CONSTRAINT tax_codes_organization_fk
    FOREIGN KEY (organization_id) REFERENCES nova_core.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT tax_codes_org_id_unique UNIQUE (organization_id, id),
  CONSTRAINT tax_codes_org_code_unique UNIQUE (organization_id, code)
);
CREATE INDEX tax_codes_org_effective_idx
  ON nova_comercial.tax_codes (organization_id, status, effective_from, effective_to);

CREATE TABLE nova_comercial.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(100) NOT NULL,
  method_type VARCHAR(24) NOT NULL
    CHECK (method_type IN ('CASH', 'BANK_TRANSFER', 'CARD', 'MOBILE_MONEY', 'OTHER')),
  requires_reference BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT payment_methods_organization_fk
    FOREIGN KEY (organization_id) REFERENCES nova_core.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT payment_methods_org_id_unique UNIQUE (organization_id, id),
  CONSTRAINT payment_methods_org_code_unique UNIQUE (organization_id, code)
);

CREATE TABLE nova_comercial.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  code VARCHAR(40) NOT NULL,
  legal_name VARCHAR(180) NOT NULL,
  trade_name VARCHAR(180),
  tax_id VARCHAR(40),
  email VARCHAR(254),
  phone VARCHAR(40),
  address_line VARCHAR(240),
  municipality VARCHAR(120),
  province VARCHAR(120),
  country_code CHAR(2) NOT NULL DEFAULT 'AO',
  credit_limit NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  payment_terms_days SMALLINT NOT NULL DEFAULT 0 CHECK (payment_terms_days BETWEEN 0 AND 365),
  notes TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED')),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT customers_organization_fk
    FOREIGN KEY (organization_id) REFERENCES nova_core.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT customers_org_id_unique UNIQUE (organization_id, id),
  CONSTRAINT customers_org_code_unique UNIQUE (organization_id, code)
);
CREATE UNIQUE INDEX customers_org_tax_id_unique
  ON nova_comercial.customers (organization_id, tax_id) WHERE tax_id IS NOT NULL;
CREATE INDEX customers_org_name_idx
  ON nova_comercial.customers (organization_id, legal_name);

CREATE TABLE nova_comercial.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  code VARCHAR(40) NOT NULL,
  legal_name VARCHAR(180) NOT NULL,
  trade_name VARCHAR(180),
  tax_id VARCHAR(40),
  email VARCHAR(254),
  phone VARCHAR(40),
  address_line VARCHAR(240),
  municipality VARCHAR(120),
  province VARCHAR(120),
  country_code CHAR(2) NOT NULL DEFAULT 'AO',
  payment_terms_days SMALLINT NOT NULL DEFAULT 0 CHECK (payment_terms_days BETWEEN 0 AND 365),
  notes TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED')),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT suppliers_organization_fk
    FOREIGN KEY (organization_id) REFERENCES nova_core.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT suppliers_org_id_unique UNIQUE (organization_id, id),
  CONSTRAINT suppliers_org_code_unique UNIQUE (organization_id, code)
);
CREATE UNIQUE INDEX suppliers_org_tax_id_unique
  ON nova_comercial.suppliers (organization_id, tax_id) WHERE tax_id IS NOT NULL;
CREATE INDEX suppliers_org_name_idx
  ON nova_comercial.suppliers (organization_id, legal_name);

CREATE TABLE nova_comercial.item_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  parent_category_id UUID,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT item_categories_organization_fk
    FOREIGN KEY (organization_id) REFERENCES nova_core.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT item_categories_org_id_unique UNIQUE (organization_id, id),
  CONSTRAINT item_categories_org_code_unique UNIQUE (organization_id, code),
  CONSTRAINT item_categories_parent_fk
    FOREIGN KEY (organization_id, parent_category_id)
    REFERENCES nova_comercial.item_categories (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT item_categories_not_self_parent CHECK (
    parent_category_id IS NULL OR parent_category_id <> id
  )
);

CREATE TABLE nova_comercial.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  category_id UUID,
  unit_id UUID NOT NULL,
  tax_code_id UUID,
  code VARCHAR(48) NOT NULL,
  barcode VARCHAR(80),
  item_type VARCHAR(16) NOT NULL CHECK (item_type IN ('PRODUCT', 'SERVICE')),
  name VARCHAR(180) NOT NULL,
  description TEXT,
  track_stock BOOLEAN NOT NULL DEFAULT FALSE,
  sales_price NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (sales_price >= 0),
  purchase_price NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'DISCONTINUED')),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT items_organization_fk
    FOREIGN KEY (organization_id) REFERENCES nova_core.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT items_org_id_unique UNIQUE (organization_id, id),
  CONSTRAINT items_org_code_unique UNIQUE (organization_id, code),
  CONSTRAINT items_category_fk
    FOREIGN KEY (organization_id, category_id)
    REFERENCES nova_comercial.item_categories (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT items_unit_fk
    FOREIGN KEY (organization_id, unit_id)
    REFERENCES nova_comercial.units_of_measure (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT items_tax_code_fk
    FOREIGN KEY (organization_id, tax_code_id)
    REFERENCES nova_comercial.tax_codes (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT items_service_stock_check CHECK (item_type <> 'SERVICE' OR track_stock = FALSE)
);
CREATE UNIQUE INDEX items_org_barcode_unique
  ON nova_comercial.items (organization_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX items_org_type_status_idx
  ON nova_comercial.items (organization_id, item_type, status);

CREATE TABLE nova_comercial.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  address_line VARCHAR(240),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT warehouses_organization_fk
    FOREIGN KEY (organization_id) REFERENCES nova_core.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT warehouses_org_id_unique UNIQUE (organization_id, id),
  CONSTRAINT warehouses_org_code_unique UNIQUE (organization_id, code),
  CONSTRAINT warehouses_branch_fk
    FOREIGN KEY (organization_id, branch_id)
    REFERENCES nova_comercial.branches (organization_id, id) ON DELETE RESTRICT
);

-- All business tables are tenant-scoped. RLS is enabled, but no client policies
-- are created: the browser/mobile clients must not access this schema directly.
-- A backend authorization layer and explicit policy design are prerequisites.
ALTER TABLE nova_comercial.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE nova_comercial.fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE nova_comercial.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE nova_comercial.units_of_measure ENABLE ROW LEVEL SECURITY;
ALTER TABLE nova_comercial.tax_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE nova_comercial.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE nova_comercial.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE nova_comercial.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE nova_comercial.item_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE nova_comercial.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE nova_comercial.warehouses ENABLE ROW LEVEL SECURITY;

COMMENT ON SCHEMA nova_comercial IS
  'NOVA COMERCIAL ERP operational data. Access through the trusted backend only.';
COMMENT ON TABLE nova_comercial.customers IS
  'Customer master data, isolated by organization_id; tax identifiers are unique per organization when supplied.';
COMMENT ON TABLE nova_comercial.suppliers IS
  'Supplier master data, isolated by organization_id; tax identifiers are unique per organization when supplied.';
COMMENT ON TABLE nova_comercial.tax_codes IS
  'Configurable tax catalogue. Rates and effective dates must be approved against current Angolan tax rules before use.';
