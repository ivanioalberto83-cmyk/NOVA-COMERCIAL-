ALTER TABLE "nova_core"."security_users" ADD COLUMN "email" VARCHAR(320) NOT NULL;
CREATE UNIQUE INDEX "security_users_email_key" ON "nova_core"."security_users"("email");
ALTER TABLE "nova_core"."security_credentials"
  ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "locked_until" TIMESTAMPTZ(6);
