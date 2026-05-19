/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes, scryptSync } from 'node:crypto';
import {
  PERMISSION_CATALOGUE,
  BUILT_IN_ROLES,
} from '@rest/shared-types/permissions';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

async function enableExtensions() {
  console.log('→ Enabling PostgreSQL extensions');
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS postgis');
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS citext');
}

async function seedPermissions() {
  console.log(`→ Seeding ${PERMISSION_CATALOGUE.length} permissions`);
  for (const p of PERMISSION_CATALOGUE) {
    await prisma.permission.upsert({
      where: { subject_action: { subject: p.subject, action: p.action } },
      update: { label: p.label, description: p.description ?? null },
      create: {
        subject: p.subject,
        action: p.action,
        label: p.label,
        description: p.description ?? null,
      },
    });
  }
}

async function seedRoles() {
  console.log(`→ Seeding ${BUILT_IN_ROLES.length} built-in roles`);
  for (const r of BUILT_IN_ROLES) {
    const role = await prisma.role.upsert({
      where: { key: r.key },
      update: {
        name: r.name,
        description: r.description ?? null,
        isBuiltIn: true,
        isImmutable: r.isImmutable ?? false,
      },
      create: {
        key: r.key,
        name: r.name,
        description: r.description ?? null,
        isBuiltIn: true,
        isImmutable: r.isImmutable ?? false,
      },
    });

    // super_admin gets a virtual "*" — no rows needed; ability factory short-circuits.
    if (r.key === 'super_admin') continue;

    // Wipe-and-rewrite for built-in roles on every seed; custom roles untouched.
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const perm of r.permissions ?? []) {
      const dbPerm = await prisma.permission.findUnique({
        where: { subject_action: { subject: perm.subject, action: perm.action } },
      });
      if (!dbPerm) {
        console.warn(
          `  ! permission ${perm.subject}:${perm.action} not in catalogue — skipped for ${r.key}`,
        );
        continue;
      }
      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: dbPerm.id,
          conditions: perm.conditions ?? null,
        },
      });
    }
  }
}

async function seedSuperAdmin() {
  const email = process.env.BOOTSTRAP_SUPERADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.BOOTSTRAP_SUPERADMIN_PASSWORD ?? 'ChangeMe!123';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`→ Super admin ${email} already exists — skipping`);
    return;
  }

  console.log(`→ Creating bootstrap super admin: ${email}`);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      displayName: 'Super Admin',
      isActive: true,
    },
  });

  const role = await prisma.role.findUnique({ where: { key: 'super_admin' } });
  if (!role) throw new Error('super_admin role missing after seed');

  await prisma.userRoleAssignment.create({
    data: { userId: user.id, roleId: role.id },
  });

  console.log(`  ! Bootstrap password: ${password} — change immediately`);
}

async function main() {
  await enableExtensions();
  await seedPermissions();
  await seedRoles();
  await seedSuperAdmin();
  console.log('✓ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
