CREATE SCHEMA IF NOT EXISTS "nova_core";

CREATE TYPE "nova_core"."UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED');
CREATE TYPE "nova_core"."OrgStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');
CREATE TYPE "nova_core"."ProductStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "nova_core"."MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED');

CREATE TABLE "nova_core"."security_users" (
  "id" UUID NOT NULL,
  "status" "nova_core"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "security_users_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "nova_core"."security_credentials" (
  "user_id" UUID NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "password_changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "security_credentials_pkey" PRIMARY KEY ("user_id")
);
CREATE TABLE "nova_core"."security_organizations" (
  "id" UUID NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "status" "nova_core"."OrgStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "security_organizations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "nova_core"."security_products" (
  "id" UUID NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "status" "nova_core"."ProductStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "security_products_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "nova_core"."security_memberships" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "status" "nova_core"."MembershipStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "security_memberships_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "nova_core"."security_roles" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "code" VARCHAR(100) NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "security_roles_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "nova_core"."security_permissions" (
  "id" UUID NOT NULL,
  "code" VARCHAR(140) NOT NULL,
  "description" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "security_permissions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "nova_core"."security_role_permissions" (
  "role_id" UUID NOT NULL,
  "permission_id" UUID NOT NULL,
  CONSTRAINT "security_role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id")
);
CREATE TABLE "nova_core"."security_membership_roles" (
  "membership_id" UUID NOT NULL,
  "role_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  CONSTRAINT "security_membership_roles_pkey" PRIMARY KEY ("membership_id", "role_id")
);
CREATE TABLE "nova_core"."security_sessions" (
  "id" UUID NOT NULL,
  "membership_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "refresh_token_hash" VARCHAR(255) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at" TIMESTAMPTZ(6),
  CONSTRAINT "security_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "security_organizations_slug_key" ON "nova_core"."security_organizations"("slug");
CREATE UNIQUE INDEX "security_products_code_key" ON "nova_core"."security_products"("code");
CREATE UNIQUE INDEX "security_memberships_user_id_organization_id_product_id_key" ON "nova_core"."security_memberships"("user_id", "organization_id", "product_id");
CREATE UNIQUE INDEX "security_memberships_id_organization_id_product_id_key" ON "nova_core"."security_memberships"("id", "organization_id", "product_id");
CREATE INDEX "security_memberships_organization_id_product_id_status_idx" ON "nova_core"."security_memberships"("organization_id", "product_id", "status");
CREATE UNIQUE INDEX "security_roles_organization_id_product_id_code_key" ON "nova_core"."security_roles"("organization_id", "product_id", "code");
CREATE UNIQUE INDEX "security_roles_id_organization_id_product_id_key" ON "nova_core"."security_roles"("id", "organization_id", "product_id");
CREATE UNIQUE INDEX "security_permissions_code_key" ON "nova_core"."security_permissions"("code");
CREATE UNIQUE INDEX "security_sessions_refresh_token_hash_key" ON "nova_core"."security_sessions"("refresh_token_hash");
CREATE INDEX "security_sessions_membership_id_expires_at_revoked_at_idx" ON "nova_core"."security_sessions"("membership_id", "expires_at", "revoked_at");

ALTER TABLE "nova_core"."security_credentials" ADD CONSTRAINT "security_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nova_core"."security_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nova_core"."security_memberships" ADD CONSTRAINT "security_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nova_core"."security_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nova_core"."security_memberships" ADD CONSTRAINT "security_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "nova_core"."security_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nova_core"."security_memberships" ADD CONSTRAINT "security_memberships_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "nova_core"."security_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nova_core"."security_roles" ADD CONSTRAINT "security_roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "nova_core"."security_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nova_core"."security_roles" ADD CONSTRAINT "security_roles_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "nova_core"."security_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nova_core"."security_role_permissions" ADD CONSTRAINT "security_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "nova_core"."security_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nova_core"."security_role_permissions" ADD CONSTRAINT "security_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "nova_core"."security_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nova_core"."security_membership_roles" ADD CONSTRAINT "security_membership_roles_membership_id_organization_id_product_id_fkey" FOREIGN KEY ("membership_id", "organization_id", "product_id") REFERENCES "nova_core"."security_memberships"("id", "organization_id", "product_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nova_core"."security_membership_roles" ADD CONSTRAINT "security_membership_roles_role_id_organization_id_product_id_fkey" FOREIGN KEY ("role_id", "organization_id", "product_id") REFERENCES "nova_core"."security_roles"("id", "organization_id", "product_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nova_core"."security_sessions" ADD CONSTRAINT "security_sessions_membership_id_organization_id_product_id_fkey" FOREIGN KEY ("membership_id", "organization_id", "product_id") REFERENCES "nova_core"."security_memberships"("id", "organization_id", "product_id") ON DELETE CASCADE ON UPDATE CASCADE;
