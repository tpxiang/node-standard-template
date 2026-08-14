CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "TenantMemberStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "tenants" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenants_code_key" ON "tenants"("code");
INSERT INTO "tenants" ("id", "code", "name", "status", "created_at", "updated_at")
VALUES ('tenant_default', 'default', 'Default Tenant', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "roles" ADD COLUMN "tenant_id" TEXT NOT NULL DEFAULT 'tenant_default';
DROP INDEX "roles_name_key";
CREATE UNIQUE INDEX "roles_tenant_id_name_key" ON "roles"("tenant_id", "name");
ALTER TABLE "audit_logs" ADD COLUMN "tenant_id" TEXT NOT NULL DEFAULT 'tenant_default';

CREATE TABLE "tenant_members" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "status" "TenantMemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenant_members_tenant_id_user_id_key" ON "tenant_members"("tenant_id", "user_id");
CREATE INDEX "tenant_members_user_id_status_idx" ON "tenant_members"("user_id", "status");

CREATE TABLE "tenant_member_roles" (
  "member_id" TEXT NOT NULL,
  "role_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_member_roles_pkey" PRIMARY KEY ("member_id", "role_id")
);

INSERT INTO "tenant_members" ("id", "tenant_id", "user_id", "status", "created_at", "updated_at")
SELECT 'tm_' || "id", 'tenant_default', "id", 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "users";
INSERT INTO "tenant_member_roles" ("member_id", "role_id", "created_at")
SELECT 'tm_' || "user_id", "role_id", "created_at" FROM "user_roles";

ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_member_roles" ADD CONSTRAINT "tenant_member_roles_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "tenant_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_member_roles" ADD CONSTRAINT "tenant_member_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
