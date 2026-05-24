import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('kabrak123', 12);

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  // Create demo tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Boutique Demo',
      slug: 'boutique-demo',
      plan: 'SHOP',
      businessCategories: ['CLOTHING', 'SHOES', 'PERFUMES'],
      phone: '+237 6XX XXX XXX',
      email: 'demo@kabrak.com',
      language: 'fr',
    },
  });

  // Create owner user
  await prisma.user.create({
    data: {
      email: 'demo@kabrak.com',
      password: hashedPassword,
      firstName: 'Demo',
      lastName: 'Owner',
      role: 'OWNER',
      tenantId: tenant.id,
    },
  });

  // Create subscription
  await prisma.subscription.create({
    data: {
      plan: 'SHOP',
      status: 'TRIAL',
      priceMonthly: 7900,
      startDate: new Date(),
      endDate: trialEnd,
      trialEndsAt: trialEnd,
      tenantId: tenant.id,
    },
  });

  // Create categories
  const catVetements = await prisma.category.create({
    data: { name: 'Vêtements', icon: 'shirt', tenantId: tenant.id },
  });
  const catChaussures = await prisma.category.create({
    data: { name: 'Chaussures', icon: 'footprints', tenantId: tenant.id },
  });
  const catParfums = await prisma.category.create({
    data: { name: 'Parfums', icon: 'spray-can', tenantId: tenant.id },
  });

  // Create products
  await prisma.product.createMany({
    data: [
      {
        name: 'Robe Wax Africaine',
        businessType: 'CLOTHING',
        costPrice: 5000,
        sellingPrice: 12000,
        totalStock: 25,
        categoryId: catVetements.id,
        tenantId: tenant.id,
        adaptiveFields: { category: 'Robe', sizes: [{ size: 'S', stock: 5 }, { size: 'M', stock: 10 }, { size: 'L', stock: 7 }, { size: 'XL', stock: 3 }], color: 'Multicolore' },
      },
      {
        name: 'Nike Air Max 90',
        businessType: 'SHOES',
        costPrice: 25000,
        sellingPrice: 45000,
        totalStock: 15,
        categoryId: catChaussures.id,
        tenantId: tenant.id,
        adaptiveFields: { brand: 'Nike', color: 'Noir', sizes: [{ size: '40', stock: 3 }, { size: '41', stock: 4 }, { size: '42', stock: 5 }, { size: '43', stock: 3 }] },
      },
      {
        name: 'Sauvage Dior 100ml',
        businessType: 'PERFUMES',
        costPrice: 15000,
        sellingPrice: 35000,
        totalStock: 8,
        categoryId: catParfums.id,
        tenantId: tenant.id,
        adaptiveFields: { brand: 'Dior', volume: '100ml' },
      },
      {
        name: 'Jean Slim Homme',
        businessType: 'CLOTHING',
        costPrice: 4000,
        sellingPrice: 8500,
        totalStock: 30,
        categoryId: catVetements.id,
        tenantId: tenant.id,
        adaptiveFields: { category: 'Pantalon', sizes: [{ size: 'S', stock: 5 }, { size: 'M', stock: 10 }, { size: 'L', stock: 10 }, { size: 'XL', stock: 5 }], color: 'Bleu' },
      },
      {
        name: 'Adidas Superstar',
        businessType: 'SHOES',
        costPrice: 20000,
        sellingPrice: 38000,
        totalStock: 3,
        lowStockAlert: 5,
        categoryId: catChaussures.id,
        tenantId: tenant.id,
        adaptiveFields: { brand: 'Adidas', color: 'Blanc', sizes: [{ size: '41', stock: 1 }, { size: '42', stock: 1 }, { size: '43', stock: 1 }] },
      },
    ],
  });

  // Create clients
  await prisma.client.createMany({
    data: [
      { name: 'Aïcha Mbarga', phone: '+237 690 123 456', email: 'aicha@example.com', tenantId: tenant.id },
      { name: 'Paul Ndjock', phone: '+237 677 234 567', tenantId: tenant.id },
      { name: 'Fatima Oumarou', phone: '+237 655 345 678', tenantId: tenant.id },
    ],
  });

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
