const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    adapter,
    log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
        // { emit: 'event', level: 'query' },
    ],
});

// logger for query to log on development 

// if (process.env.NODE_ENV === 'development') {
//     prisma.$on('query', (e) => {
//         logger.debug(`Query: ${e.query} | Duration: ${e.duration}ms`);
//     });
// }

prisma.$on('error', (e) => logger.error(`Prisma error: ${e.message}`));
prisma.$on('warn', (e) => logger.warn(`Prisma warning: ${e.message}`));

module.exports = prisma;