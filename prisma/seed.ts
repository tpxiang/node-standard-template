import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_PERMISSIONS = [
  { code: "user:read", description: "Read users" },
  { code: "user:write", description: "Create and update users" },
  { code: "role:read", description: "Read roles" },
  { code: "role:write", description: "Assign roles" }
] as const;

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);

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
    where: { name: "admin" },
    update: {},
    create: {
      name: "admin",
      description: "System administrator"
    }
  });

  for (const item of ADMIN_PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { code: item.code },
      update: { description: item.description },
      create: {
        code: item.code,
        description: item.description
      }
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
