# Prestador de Serviços Singular Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a secure singular service-provider registration journey that keeps global identity in NOVA CORE and professional/fiscal data in NOVA COMERCIAL, without affecting NOVA TODDLE ESCOLAR.

**Architecture:** NOVA COMERCIAL owns the registration journey and private provider profile. NOVA CORE provisions the global account, tenant membership and authentication identity through a narrowly scoped server-to-server interface. The NOVA COMERCIAL data layer persists professional and fiscal information in the isolated `nova_comercial` schema; billing eligibility is exposed as a minimal status contract and does not activate AGT integration.

**Tech Stack:** Existing NOVA SECURITY API: NestJS 11, TypeScript, Prisma 6, PostgreSQL, Node.js 20+, `tsx --test`, native Node test runner. Proposed NOVA COMERCIAL API: NestJS/TypeScript/Prisma, following the existing security API conventions. PostgreSQL schema isolation and RLS are required for the commercial profile store.

## Global Constraints

- Preserve the existing repository structure and reuse the existing NOVA SECURITY CORE implementation.
- NOVA CORE stores global identity, authentication, sessions and permissions; NOVA COMERCIAL stores professional and fiscal profile data.
- Do not store BI images by default. The BI number is private and must never appear in public responses, general reports, notifications or unnecessary logs.
- NIF may be absent during initial registration. Such profiles remain pending fiscal regularisation and cannot issue invoices where NIF and fiscal validation are legally required.
- Do not invent tax rates, exemptions, fiscal regimes, AGT validation, BI verification or official integration capabilities.
- No SSO, AGT integration, invoice certification or external government verification may be represented as active unless implemented and independently verified.
- All account, profile and tenant operations must be tenant-scoped, authenticated where appropriate, auditable and safe to retry.
- A failed cross-service operation must not grant access or fiscal eligibility by default.
- Keep the `nova_comercial` schema isolated from the school `public` schema in Supabase project `rojyxfjaidyvtmsmefcf`. Do not change school tables, policies, Auth, Storage, functions or data.
- Never expose service-role credentials or database credentials to browser/mobile clients.
- No production migrations, deployment, or external integration without separate explicit authorisation.
- Proposed paths below are new unless explicitly marked as observed. Confirm the repository tree and current branch head before creating or modifying them.

---

## Repository evidence and implementation boundary

Observed in branch `feature/nova-singular-provider-registration-design`:
- `apps/security-api/package.json`: standalone package; scripts include `test`, `test:e2e`, `test:integration`, `test:auth`, `test:auth:integration`, `lint`, `build`, and Prisma commands.
- `apps/security-api/src/auth/auth.controller.ts`: public login, refresh and logout endpoints.
- `apps/security-api/src/auth/auth.service.ts`: login requires an active membership; password verification and refresh-session lifecycle are implemented.
- `apps/security-api/src/identity/identity.repository.ts`: Prisma persistence for users, memberships, organisations, products and sessions.
- `apps/security-api/prisma/schema.prisma`: global User, Credential, Organization, Product, Membership, roles, permissions and sessions.
- `apps/security-api/src/app.module.ts`: IdentityModule and AuthModule; global AuthSessionGuard.
- `apps/security-api/test/auth.integration.spec.ts` and `apps/security-api/test/identity.persistence.spec.ts`: native Node test runner with disposable PostgreSQL integration tests.
- `apps/security-api/README.md`: Node 20+, npm, local disposable PostgreSQL and explicit destructive-test database guard.

The repository's NOVA COMERCIAL application/API entry point and its existing data model were not established by the files inspected for this plan. The proposed commercial API paths are therefore marked as proposed and must be reconciled with the full repository tree before implementation. Do not create a duplicate application if an existing NOVA COMERCIAL service is found.

## Decision gate before implementation

**Recommendation, not an approved product requirement:** represent each singular provider as an independent NOVA CORE organisation/tenant with one product membership for NOVA COMERCIAL. This fits the observed CORE login contract, which requires an active organisation/product membership, while keeping the provider's professional/fiscal profile outside CORE.

This tenant representation must be confirmed before implementation. If the product owner chooses a different mapping, the provisioning contract and data relationships in Tasks 1–2 must be revised before code is written.

---

### Task 1: Define and implement the NOVA CORE account-provisioning boundary

**Files:**
- Modify (observed): `apps/security-api/src/identity/identity.repository.ts`
- Modify (observed): `apps/security-api/src/identity/identity.module.ts`
- Create (proposed): `apps/security-api/src/registration/registration.controller.ts`
- Create (proposed): `apps/security-api/src/registration/registration.service.ts`
- Create (proposed): `apps/security-api/src/registration/registration.module.ts`
- Create (proposed): `apps/security-api/src/registration/dto/provision-account.dto.ts`
- Modify (observed): `apps/security-api/src/app.module.ts`
- Create (proposed): `apps/security-api/src/registration/registration.service.spec.ts`
- Create (proposed): `apps/security-api/test/registration.integration.spec.ts`
- Modify (observed): `apps/security-api/package.json` only if the integration test needs to be added to an explicit script.

**Interfaces:**
- Consumes: a server-to-server provisioning request containing an idempotency key, account email, password credential input, provider tenant display name/slug and the fixed NOVA COMERCIAL product code. It must not contain BI, NIF, date of birth or professional profile fields.
- Produces: a stable CORE user ID, organisation ID, membership ID and provisioning result. Never return password hashes or internal credential records.
- Internal service signature (proposed): `provisionSingularProviderAccount(input: ProvisionSingularProviderAccountInput): Promise<ProvisionSingularProviderAccountResult>`.
- External interface (proposed): authenticated internal endpoint; it must not be a public self-service endpoint. The commercial service is the orchestrator.

- [ ] **Step 1: Add failing unit tests**
  - New provisioning creates one user, credential hash, organisation and pending NOVA COMERCIAL membership atomically.
  - Repeating the same idempotency key returns the original result without creating duplicate users, organisations or memberships.
  - Reusing an email already owned by another account returns a non-enumerating conflict result and creates no tenant.
  - Invalid product configuration creates no partial records.
  - Password is hashed using the existing `PasswordService`; plaintext is never persisted or returned.
  - The CORE request rejects personal/fiscal profile fields so that BI and NIF cannot enter CORE through this endpoint.

- [ ] **Step 2: Verify the relevant failure**

Run from `apps/security-api`:
```bash
npm run test -- --test-name-pattern="singular provider provisioning"
```
Expected: the new tests fail because the provisioning service and endpoint do not exist. Confirm the command syntax against the installed `tsx` runner before relying on it; if unsupported, run the focused spec directly with `npx tsx --test src/registration/registration.service.spec.ts`.

- [ ] **Step 3: Implement the minimum behaviour**
  - Add a transaction-backed repository operation for user, credential, organisation and membership provisioning.
  - Hash credentials with the existing password service; never duplicate password hashing logic.
  - Require a configured NOVA COMERCIAL product record; do not accept arbitrary product IDs/codes from an untrusted browser.
  - Add idempotency persistence or an equivalent database-enforced uniqueness mechanism. Do not rely on process memory.
  - Protect the provisioning endpoint with service-to-service authentication and an explicit permission/scope. It must not be marked `@Public()`.
  - Keep the new account unable to log in until the membership activation rule is satisfied; do not silently activate access.
  - Do not introduce a new email-verification promise unless that product decision is separately approved.

- [ ] **Step 4: Verify the focused pass**

Run:
```bash
npx tsx --test src/registration/registration.service.spec.ts
```
Expected: all provisioning unit tests pass, including duplicate/idempotent requests and rejection of profile fields.

- [ ] **Step 5: Run affected integration checks**

Run against a disposable local PostgreSQL database only:
```bash
npm run test:integration
npm run test:auth
npm run lint
npm run build
```
Expected: provisioning persistence, existing tenant isolation, authentication tests, lint and build pass. The disposable database guard must reject remote/shared/production targets.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add apps/security-api/src/registration apps/security-api/src/identity apps/security-api/src/app.module.ts apps/security-api/test/registration.integration.spec.ts apps/security-api/package.json
git commit -m "feat(security): add singular provider account provisioning"
```

---

### Task 2: Build the NOVA COMERCIAL provider profile and registration workflow

**Files:**
- Create (proposed, unless an existing commercial API is discovered): `apps/commercial-api/package.json`
- Create (proposed): `apps/commercial-api/src/main.ts`
- Create (proposed): `apps/commercial-api/src/app.module.ts`
- Create (proposed): `apps/commercial-api/src/providers/providers.module.ts`
- Create (proposed): `apps/commercial-api/src/providers/providers.controller.ts`
- Create (proposed): `apps/commercial-api/src/providers/providers.service.ts`
- Create (proposed): `apps/commercial-api/src/providers/providers.repository.ts`
- Create (proposed): `apps/commercial-api/src/providers/dto/create-singular-provider.dto.ts`
- Create (proposed): `apps/commercial-api/prisma/schema.prisma`
- Create (proposed): `apps/commercial-api/prisma/migrations/<version>_singular_provider_profile/migration.sql`
- Create (proposed): `apps/commercial-api/test/singular-provider-registration.spec.ts`
- Create (proposed): `apps/commercial-api/test/singular-provider-isolation.integration.spec.ts`

**Interfaces:**
- Consumes: authenticated user context from NOVA CORE and the Task 1 internal account-provisioning contract.
- Produces: private provider profile with CORE user/tenant references, registration status and fiscal eligibility status.
- Proposed service signature: `createSingularProviderRegistration(input: CreateSingularProviderRegistrationInput, actor: AuthenticatedActor): Promise<SingularProviderRegistrationResult>`.
- Proposed public response: provider profile ID, registration status, next action and non-sensitive contact/profile summary. Never return BI number, credential information or private fiscal identifiers in broad list responses.

- [ ] **Step 1: Add failing tests**
  - Valid registration persists the profile separately from CORE identity.
  - Registration without NIF is accepted only into `PENDING_FISCAL_REGULARISATION`.
  - The BI number is stored only in the private provider-profile data boundary and is absent from response DTOs, logs and list endpoints.
  - Repeating a request with the same idempotency key does not create a duplicate profile.
  - A profile cannot be attached to another user's CORE identity or tenant by changing client-supplied IDs.
  - Cross-tenant reads and writes return no data/deny access.
  - A failed CORE provisioning call leaves no active profile or usable membership; retry can safely resume or compensate without creating duplicates.

- [ ] **Step 2: Verify the relevant failure**

Run from `apps/commercial-api`:
```bash
npm test -- --testNamePattern="singular provider registration"
```
Expected: focused tests fail because the provider registration service and persistence model do not exist. Use the package's native `node:test`/tsx convention if the repository audit confirms no commercial test runner exists.

- [ ] **Step 3: Implement the minimum behaviour**
  - Reuse the repository's existing NOVA COMERCIAL application if found; otherwise create the proposed standalone NestJS service.
  - Keep provider profile storage separate from the CORE database. Configure a server-side database connection scoped to the `nova_comercial` schema.
  - Store the CORE user ID and tenant ID as references, not duplicated credentials.
  - Implement the documented fields: BI number, full name, birth date, nationality, optional issue/expiry dates, optional NIF, fiscal situation, economic activity, professional services, contact details and address.
  - Do not make BI image upload mandatory.
  - Persist explicit registration and fiscal states; map the approved user-facing states to stable internal enums.
  - Validate the authenticated actor against the CORE identity context. Ignore or reject client-supplied tenant/user identifiers.
  - Use transactions and idempotency to prevent partial or duplicate profile creation.
  - Do not expose a public endpoint for administrative validation unless its role/permission contract is defined.
  - Keep tax rates, exemptions and tax-regime decisions out of this task; store only verified declarations and validation status.

- [ ] **Step 4: Verify the focused pass**

Run:
```bash
npm test -- --testNamePattern="singular provider registration"
```
Expected: registration, NIF-optional status, privacy and idempotency tests pass.

- [ ] **Step 5: Run affected integration checks**

Run:
```bash
npm run lint
npm run build
npm run test:integration
```
Expected: profile persistence and cross-tenant isolation tests pass against a disposable database configured for the `nova_comercial` schema. Verify that the migration creates objects only in that schema and does not reference or modify school `public` objects.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add apps/commercial-api
git commit -m "feat(commercial): add singular provider registration"
```

---

### Task 3: Connect registration orchestration, status transitions and eligibility

**Files:**
- Modify (proposed): `apps/commercial-api/src/providers/providers.service.ts`
- Create (proposed): `apps/commercial-api/src/core/core-provisioning.client.ts`
- Create (proposed): `apps/commercial-api/src/providers/provider-status-transition.service.ts`
- Create (proposed): `apps/commercial-api/src/providers/provider-eligibility.service.ts`
- Create (proposed): `apps/commercial-api/test/provider-onboarding-orchestration.spec.ts`
- Create (proposed): `apps/commercial-api/test/provider-status-transition.spec.ts`

**Interfaces:**
- Consumes: profile registration request, CORE provisioning contract from Task 1, authenticated actor, and verified fiscal-validation result.
- Produces: stable registration result and minimal eligibility assertion for NOVA BILLING.
- Proposed eligibility response: `{ providerId, commercialTenantId, registrationStatus, fiscalEligibility, evaluatedAt }`. It must not include BI or NIF.
- Proposed status-transition signature: `transitionProviderStatus(providerId: string, nextStatus: ProviderRegistrationStatus, actor: AuthenticatedActor, reason: string): Promise<ProviderStatusTransitionResult>`.

- [ ] **Step 1: Add failing tests**
  - Successful onboarding creates one CORE account/membership and one linked commercial profile.
  - CORE timeout does not mark the profile active or fiscal-eligible.
  - Repeating onboarding after a timeout safely retrieves the same CORE provisioning result.
  - Missing NIF keeps the profile pending fiscal regularisation.
  - A profile only becomes fiscally eligible after an authorised validation result is recorded.
  - Invalid state transitions are rejected and leave the previous state unchanged.
  - Every administrative transition records actor, timestamp, previous state, next state and reason.
  - NOVA BILLING receives only the minimum eligibility fields.

- [ ] **Step 2: Verify the relevant failure**

Run:
```bash
npx tsx --test test/provider-onboarding-orchestration.spec.ts test/provider-status-transition.spec.ts
```
Expected: tests fail because orchestration and transition services do not exist.

- [ ] **Step 3: Implement the minimum behaviour**
  - Add a server-to-server client for the Task 1 provisioning endpoint; enforce timeouts, authenticated requests and idempotency keys.
  - Implement a retryable onboarding state machine. Do not use a distributed transaction assumption across CORE and COMERCIAL.
  - Persist operation state so interrupted requests can resume safely.
  - Define explicit transition rules among DRAFT, PENDING_FISCAL_REGULARISATION, UNDER_REVIEW, VALIDATED, ACTIVE, SUSPENDED and REJECTED.
  - Keep account activation and fiscal eligibility as separate decisions.
  - Require an authorised actor and recorded reason for administrative validation, rejection and suspension.
  - Expose a minimal eligibility contract to NOVA BILLING; no billing or AGT operation is triggered by this task.

- [ ] **Step 4: Verify the focused pass**

Run:
```bash
npx tsx --test test/provider-onboarding-orchestration.spec.ts test/provider-status-transition.spec.ts
```
Expected: success, timeout, retry, status-transition and data-minimisation tests pass.

- [ ] **Step 5: Run affected integration checks**

Run:
```bash
npm run test:integration
npm run lint
npm run build
```
Expected: onboarding and state transitions remain consistent across service boundaries; duplicate retries do not create duplicate identities or profiles.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add apps/commercial-api
git commit -m "feat(commercial): orchestrate singular provider onboarding"
```

---

### Task 4: Security, privacy, audit and regression verification

**Files:**
- Modify (proposed): `apps/commercial-api/prisma/migrations/<version>_singular_provider_profile/migration.sql`
- Create (proposed): `apps/commercial-api/test/provider-privacy.integration.spec.ts`
- Create (proposed): `apps/commercial-api/test/provider-audit.integration.spec.ts`
- Modify (observed only if needed): `apps/security-api/README.md`
- Create (proposed): `apps/commercial-api/README.md`
- Create (proposed): `docs/security/nova-singular-provider-data-flow.md`

**Interfaces:**
- Consumes: profile, actor, tenant and state-transition records from Tasks 1–3.
- Produces: verified access boundaries, auditable status changes, operational documentation and a test report.
- No frontend/mobile interface, BI image storage or AGT connector is introduced by this task.

- [ ] **Step 1: Add failing security tests**
  - Anonymous access to private profile routes is rejected.
  - A user from tenant A cannot read, update or enumerate tenant B's profile.
  - BI and NIF are absent from list APIs, ordinary logs, notifications and general audit summaries.
  - A privileged read of restricted identity/fiscal data is attributable to an actor and recorded.
  - A user cannot alter fiscal eligibility by changing request payloads.
  - The database role used by the commercial API cannot access school `public` tables through the intended connection grants.
  - RLS policies in `nova_comercial` enforce the approved server/user access model and do not grant anonymous access.

- [ ] **Step 2: Verify the relevant failure**

Run:
```bash
npx tsx --test test/provider-privacy.integration.spec.ts test/provider-audit.integration.spec.ts
```
Expected: tests expose missing privacy, audit and tenant-isolation controls before implementation.

- [ ] **Step 3: Implement the minimum behaviour**
  - Apply least-privilege database grants to the commercial service role.
  - Enable RLS on each new provider table and define policies from the verified actor/tenant context.
  - Ensure server-only secrets remain outside frontend bundles and repository history.
  - Redact BI, NIF and credentials from application logs and error payloads.
  - Record access to restricted fields and all state-changing administrative operations.
  - Document data-flow boundaries, secret configuration, local setup, migration review and rollback procedure.
  - Do not execute migrations against the shared Supabase project during development; use a disposable test database/schema first.

- [ ] **Step 4: Verify the focused pass**

Run:
```bash
npx tsx --test test/provider-privacy.integration.spec.ts test/provider-audit.integration.spec.ts
```
Expected: privacy, audit, RLS and tenant-isolation tests pass.

- [ ] **Step 5: Run the complete affected validation suite**

Run in `apps/security-api`:
```bash
npm ci
npm run db:validate
npm run lint
npm run test
npm run test:e2e
npm run test:integration
npm run test:auth
npm run test:auth:integration
npm run build
```

Run the equivalent install, Prisma validation, lint, unit, integration and build commands in the commercial API package. Expected: all relevant checks pass using disposable local/CI databases only. Confirm no test command targets the shared school Supabase project.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add apps/commercial-api docs/security/nova-singular-provider-data-flow.md apps/security-api/README.md
git commit -m "test(commercial): verify singular provider privacy and isolation"
```

---

## Unresolved product and architecture decisions

These decisions change the implementation contract and must be resolved before implementation starts:

1. **CORE tenant mapping — recommended default:** should each Prestador Singular receive an independent NOVA CORE organisation/tenant and one NOVA COMERCIAL membership? The existing CORE login flow requires an active organisation/product membership; the profile itself remains in NOVA COMERCIAL.
2. **Account activation:** should a new account be able to authenticate in a restricted onboarding state before the profile is validated, or should authentication wait until the CORE membership is activated? The current login service only authenticates active memberships.
3. **Email verification:** is email verification required before account activation? The current API README explicitly lists email verification as not yet implemented.
4. **Administrative validation authority:** which NOVA COMERCIAL role may validate identity/fiscal data, reject a registration, suspend a provider or mark fiscal eligibility? These permissions must be named before protected administrative endpoints are implemented.
5. **Existing commercial application:** the inspected branch confirmed the security API files but did not establish an existing NOVA COMERCIAL application/API entry point. The full repository tree must be checked before creating `apps/commercial-api`.
6. **Database deployment target:** confirm that the functional profile tables are intended for the existing isolated `nova_comercial` schema in the NOVA TODDLE ESCOLAR Supabase project, rather than a separate PostgreSQL/Supabase project. In either case, school `public` data and policies remain untouched.

## Execution handoff

This document is a plan only. It does not create application code, apply database migrations, change RLS, configure external services or deploy to production.

After the decision gate is resolved, execute task-by-task with focused tests, independent review and explicit verification before any claim of completion.
