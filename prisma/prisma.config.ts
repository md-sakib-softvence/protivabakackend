import 'dotenv/config';
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./schema.prisma",
  migrations: {
    path: "./migrations",
    seed: "npx ts-node -P prisma/seeds/tsconfig.seed.json prisma/seeds/index.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
