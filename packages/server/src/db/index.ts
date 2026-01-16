/**
 * 数据库连接和客户端
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL || 'postgres://monitor:monitor123@localhost:5432/monitor';

// 创建 postgres 连接
const queryClient = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// 创建 drizzle 实例
export const db = drizzle(queryClient, { schema });

export { schema };
