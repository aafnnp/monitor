/**
 * Hono 服务器入口
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import authRoutes from './routes/auth.js';
import projectsRoutes from './routes/projects.js';
import reportRoutes from './routes/report.js';
import sourcemapRoutes from './routes/sourcemap.js';
import statsRoutes from './routes/stats.js';
import errorRoutes from './routes/errors.js';

const app = new Hono();

// 中间件
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8888'],
    credentials: true,
  })
);

// 健康检查
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 路由
app.route('/auth', authRoutes);
app.route('/api/projects', projectsRoutes);
app.route('/api/report', reportRoutes);
app.route('/api/sourcemap', sourcemapRoutes);
app.route('/api/errors', errorRoutes);
app.route('/api', statsRoutes);

// 404 处理
app.notFound((c) => {
  return c.json({ error: '接口不存在' }, 404);
});

// 错误处理
app.onError((err, c) => {
  console.error('服务器错误:', err);
  return c.json({ error: '服务器内部错误' }, 500);
});

const port = parseInt(process.env.PORT || '8080');

console.log(`🚀 服务器启动在 http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
