import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PERMISSIONS = [
  { code: "user:read", description: "Read users" },
  { code: "user:write", description: "Create and update users" },
  { code: "role:read", description: "Read roles" },
  { code: "role:write", description: "Assign roles" }
] as const;

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);

  const tenant = await prisma.tenant.upsert({
    where: { id: "tenant_default" },
    update: { name: "Default Tenant", status: "ACTIVE" },
    create: { id: "tenant_default", code: "default", name: "Default Tenant" }
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "System Admin",
      passwordHash
    }
  });

  const adminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "admin" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "admin",
      description: "System administrator"
    }
  });

  const member = await prisma.tenantMember.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: admin.id } },
    update: { status: "ACTIVE" },
    create: { tenantId: tenant.id, userId: admin.id }
  });

  await prisma.tenantMemberRole.upsert({
    where: { memberId_roleId: { memberId: member.id, roleId: adminRole.id } },
    update: {},
    create: { memberId: member.id, roleId: adminRole.id }
  });

  for (const item of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { code: item.code },
      update: { description: item.description },
      create: item
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id
      }
    });
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id
      }
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id
    }
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
