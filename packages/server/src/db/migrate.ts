/**
 * 数据库迁移脚本
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgres://monitor:monitor123@localhost:5432/monitor';

async function main() {
  console.log('🚀 开始数据库迁移...');
  
  const connection = postgres(connectionString, { max: 1 });
  const db = drizzle(connection);
  
  await migrate(db, { migrationsFolder: './drizzle' });
  
  console.log('✅ 数据库迁移完成');
  await connection.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ 数据库迁移失败:', err);
  process.exit(1);
});
