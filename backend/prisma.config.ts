// Prisma 7.x configuration file for migrations
// This file is used by Prisma CLI for migrations and other operations
// Runtime database URL is passed via PrismaClient constructor in prisma.service.ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
