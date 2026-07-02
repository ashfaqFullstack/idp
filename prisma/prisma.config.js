const { defineConfig } = require('prisma/config');
require('dotenv').config();

module.exports = defineConfig({
    earlyAccess: true,
    schema: './prisma/schema.prisma',
    migrate: {
        adapter: async () => {
            const { PrismaPg } = require('@prisma/adapter-pg');
            return new PrismaPg({ connectionString: process.env.DATABASE_URL });
        },
    },
});