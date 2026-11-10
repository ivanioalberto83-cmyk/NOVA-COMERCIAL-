# NOVA COMERCIAL — ERP master-data foundation

**Status:** first development increment; SQL migration prepared, not deployed.  
**Target schema:** `nova_comercial`  
**Existing shared foundation:** `nova_core`  
**Protected legacy data:** `public` (NOVA ESCOLAR)

## 1. Scope of this increment

This increment establishes the common master data required before transaction modules can be implemented:

| Domain | Table | Purpose |
|---|---|---|
| Organisation structure | `branches` | Head office and branches |
| Financial calendar | `fiscal_periods` | Open, closing and closed accounting periods |
| Currency | `currencies` | Organisation-specific currencies and base currency |
| Units | `units_of_measure` | Product/service measurement units |
| Tax configuration | `tax_codes` | Configurable tax types, rates and effective dates |
| Payment configuration | `payment_methods` | Cash, transfer, card, mobile money and other methods |
| Commercial parties | `customers` | Customer master data |
| Commercial parties | `suppliers` | Supplier master data |
| Catalogue | `item_categories` | Hierarchical item categories |
| Catalogue | `items` | Products and services, prices, tax and stock tracking |
| Inventory structure | `warehouses` | Warehouses linked optionally to a branch |

The migration is at:
`apps/security-api/database/nova_comercial/migrations/20261110000100_master_data_foundation.sql`

It is intentionally kept outside Prisma's existing migration chain. The current security API Prisma schema and authentication repository still have known mismatches with the live `nova_core` schema. Running Prisma migrations against the shared Supabase project is therefore prohibited.

## 2. Multi-company and data integrity rules

- Every ERP record has a required `organization_id` referencing `nova_core.organizations`.
- Organisation-scoped unique keys prevent duplicate codes within the same company while allowing different companies to reuse codes.
- Composite foreign keys ensure a category, unit, tax code, branch or parent category belongs to the same organisation as the referencing record.
- Customer and supplier tax identifiers are unique per organisation when supplied.
- Currency, tax and payment settings are organisation-specific; the default currency code is AOA, but rates and fiscal settings are configurable rather than hard-coded.
- Monetary amounts use fixed precision (`NUMERIC(19,4)`); tax rates use `NUMERIC(7,4)`.
- Inactive records are retained; operational modules should reference them only where business rules permit.
- Fiscal-period overlap validation must be implemented in the service layer before a period is activated; the database currently validates date order and close-state consistency only.

## 3. Security posture

- RLS is enabled on all eleven tables.
- No RLS policies are created in this increment.
- Schema and table privileges are explicitly revoked from `PUBLIC`, `anon` and `authenticated`.
- The browser and mobile clients must call the trusted backend; they must not access these tables directly.
- Backend access is blocked from production use until authentication is aligned to the actual Supabase Auth identity, membership, product entitlement and RBAC model.
- Every endpoint must derive organisation context from verified server-side identity, never from a client-supplied organisation identifier alone.
- No changes are made to `nova_core`, `public`, Storage, Auth users, existing migrations or production data by this code increment.

## 4. Current implementation boundary

Included:
- SQL DDL for eleven master-data tables.
- Organisation foreign keys and composite tenant-boundary constraints.
- Indexes and unique constraints for core lookups.
- RLS enablement and explicit denial of direct client schema/table access.
- A Node test contract and CI step to guard the migration structure.

Not yet included:
- Applying this migration to Supabase.
- Backend CRUD endpoints or UI screens.
- Seed data for each company.
- Authentication/RBAC integration for ERP routes.
- Transactional modules (purchases, inventory movements, sales, cash/banks and accounting).
- Angolan tax configuration values. Those must be confirmed against current AGT legislation and the company's fiscal regime before production use.
- Backup/restore rehearsal and production acceptance.

## 5. Validation and controlled release

Run from `apps/security-api`:

```bash
npm ci
npm run test:erp:contract
```

The contract test is a structural guard; it does not replace executing the SQL against PostgreSQL 17. Before any shared Supabase deployment:
1. Reconcile the security API with the actual `nova_core` contract and Supabase Auth.
2. Run this SQL against a disposable PostgreSQL 17 database with a fixture for `nova_core.organizations`.
3. Verify all constraints, RLS state, schema privileges and rollback/recovery.
4. Review the migration and obtain explicit production deployment approval.
5. Apply as a separately tracked Supabase migration only after the preceding checks pass.

## 6. Next build sequence

1. Complete and verify the master-data database increment.
2. Implement organisation-scoped backend services and CRUD for branches, currencies, units, tax codes and payment methods.
3. Implement customers and suppliers.
4. Implement item catalogue and warehouses.
5. Add company configuration and opening balances.
6. Build purchasing and supplier invoice workflows.
7. Build stock ledger and inventory operations.
8. Build sales, invoicing and customer receivables.
9. Build cash/bank, reconciliation and accounting.
10. Add reports, audit trails, exports and management dashboards.

The master-data increment is a foundation for the ERP; it is not a claim that NOVA COMERCIAL is already an operational ERP.
