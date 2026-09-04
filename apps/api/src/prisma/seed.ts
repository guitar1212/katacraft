import 'dotenv/config';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const seedDir = path.resolve(__dirname, '../../seed/scad');

async function loadSample(baseName: string) {
  const scadSource = await fs.readFile(path.join(seedDir, `${baseName}.scad`), 'utf-8');
  const paramSchemaJson = JSON.parse(await fs.readFile(path.join(seedDir, `${baseName}.schema.json`), 'utf-8'));
  return { scadSource, paramSchemaJson };
}

async function main() {
  await prisma.systemSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', signupBonusCredits: 50, defaultDownloadCreditCost: 1 },
  });

  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!';
  const admin = await prisma.user.upsert({
    where: { email: 'admin@katacraft.local' },
    update: {},
    create: {
      email: 'admin@katacraft.local',
      name: 'KataCraft Admin',
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(adminPassword, 12),
      creditsBalance: 9999,
    },
  });
  console.log(`Seeded admin user admin@katacraft.local / ${adminPassword}`);

  const category = await prisma.category.upsert({
    where: { slug: 'gifts-accessories' },
    update: {},
    create: { name: '禮品配件', slug: 'gifts-accessories', sortOrder: 1 },
  });
  const storageCategory = await prisma.category.upsert({
    where: { slug: 'home-storage' },
    update: {},
    create: { name: '收納小物', slug: 'home-storage', sortOrder: 2 },
  });

  // --- Customizable model #1: keychain ---
  const keychainSample = await loadSample('keychain');
  const keychain = await prisma.model.upsert({
    where: { slug: 'text-keychain' },
    update: {},
    create: {
      slug: 'text-keychain',
      name: '客製文字鑰匙圈',
      description: '輸入你想要的文字，客製一個專屬鑰匙圈。',
      kind: 'MODEL',
      status: 'DRAFT',
      categoryId: category.id,
      creditCost: 1,
      featured: true,
      createdById: admin.id,
    },
  });
  const keychainVersion = await prisma.modelVersion.upsert({
    where: { modelId_versionNo: { modelId: keychain.id, versionNo: 1 } },
    update: {},
    create: {
      modelId: keychain.id,
      versionNo: 1,
      scadSource: keychainSample.scadSource,
      paramSchemaJson: keychainSample.paramSchemaJson,
      createdById: admin.id,
    },
  });
  await prisma.model.update({
    where: { id: keychain.id },
    data: { status: 'PUBLISHED', currentVersionId: keychainVersion.id },
  });

  // --- Customizable model #2: storage box ---
  const boxSample = await loadSample('storage-box');
  const box = await prisma.model.upsert({
    where: { slug: 'parametric-storage-box' },
    update: {},
    create: {
      slug: 'parametric-storage-box',
      name: '參數化收納盒',
      description: '依照你的桌面空間，客製一個剛好大小的收納盒。',
      kind: 'MODEL',
      status: 'DRAFT',
      categoryId: storageCategory.id,
      creditCost: 1,
      createdById: admin.id,
    },
  });
  const boxVersion = await prisma.modelVersion.upsert({
    where: { modelId_versionNo: { modelId: box.id, versionNo: 1 } },
    update: {},
    create: {
      modelId: box.id,
      versionNo: 1,
      scadSource: boxSample.scadSource,
      paramSchemaJson: boxSample.paramSchemaJson,
      createdById: admin.id,
    },
  });
  await prisma.model.update({
    where: { id: box.id },
    data: { status: 'PUBLISHED', currentVersionId: boxVersion.id },
  });

  // --- Printable (non-customizable) example ---
  const printable = await prisma.model.upsert({
    where: { slug: 'sample-printable-pack' },
    update: {},
    create: {
      slug: 'sample-printable-pack',
      name: '範例成品包',
      description: '已完稿、可直接下載列印的檔案組合（範例，非可客製化模型）。',
      kind: 'PRINTABLE',
      status: 'PUBLISHED',
      categoryId: storageCategory.id,
      creditCost: 1,
      createdById: admin.id,
    },
  });
  const existingFile = await prisma.printableFile.findFirst({ where: { modelId: printable.id } });
  if (!existingFile) {
    const storageDir = path.resolve(process.env.STORAGE_DIR ?? './storage');
    await fs.mkdir(storageDir, { recursive: true });
    const filename = 'printable-README.txt';
    const key = `printable-seed-${filename}`;
    await fs.writeFile(
      path.join(storageDir, key),
      'This is a seed placeholder for a printable file (in real use this would be an STL/3MF produced by a designer, not generated on demand).\n',
      'utf-8',
    );
    await prisma.printableFile.create({
      data: { modelId: printable.id, fileUrl: `/files/${key}`, filename, sizeBytes: 0 },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
