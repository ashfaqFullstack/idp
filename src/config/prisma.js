const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const logger = require('./logger');

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    max: 1, // Vercel serverless — keep pool size at 1
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    adapter,
    log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
        ...(isProduction ? [] : [{ emit: 'event', level: 'query' }]),
    ],
});

// if (!isProduction) {
//     prisma.$on('query', (e) => {
//         logger.debug(`Query: ${e.query} | Duration: ${e.duration}ms`);
//     });
// }

prisma.$on('error', (e) => logger.error(`Prisma error: ${e.message}`));
prisma.$on('warn', (e) => logger.warn(`Prisma warning: ${e.message}`));

module.exports = prisma;