// server/prisma.config.js
// 1. Force load the .env file immediately
require('dotenv').config(); 

const { defineConfig } = require('@prisma/config');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // 2. Now these will definitely be populated
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },
});