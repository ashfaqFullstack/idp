const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const plans = [
    { packageType: 'DIGITAL_ONLY', validityYears: 'ONE', price: 59.0 },
    { packageType: 'DIGITAL_ONLY', validityYears: 'TWO', price: 75.0 },
    { packageType: 'DIGITAL_ONLY', validityYears: 'THREE', price: 89.0 },
    { packageType: 'PRINT_DIGITAL', validityYears: 'ONE', price: 89.0 },
    { packageType: 'PRINT_DIGITAL', validityYears: 'TWO', price: 109.0 },
    { packageType: 'PRINT_DIGITAL', validityYears: 'THREE', price: 129.0 },
];

async function main() {
    console.log('Seeding plans...');

    for (const plan of plans) {
        await prisma.plan.upsert({
            where: {
                packageType_validityYears: {
                    packageType: plan.packageType,
                    validityYears: plan.validityYears,
                },
            },
            update: { price: plan.price, isActive: true },
            create: plan,
        });
        console.log(`  ✓ ${plan.packageType} / ${plan.validityYears} = $${plan.price}`);
    }

    console.log('Seeding complete.');
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });