/**
 * 认证中间件
 */
import { Context, Next } from 'hono';
import { verifyAccessToken } from '../utils/jwt.js';
import type { Variables } from '../types.js';

/**
 * JWT 认证中间件
 * 验证 Authorization header 中的 Bearer token
 */
export async function authMiddleware(
  c: Context<{ Variables: Variables }>,
  next: Next
): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: '未提供认证令牌' }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyAccessToken(token);
    c.set('auth', payload);
    await next();
  } catch (_error) {
    return c.json({ error: '认证令牌无效或已过期' }, 401);
  }
}

/**
 * API Key 认证中间件
 * 用于 SDK 上报数据时的认证
 */
export async function apiKeyMiddleware(
  c: Context<{ Variables: Variables }>,
  next: Next
): Promise<Response | void> {
  const apiKey = c.req.header('X-API-Key');

  if (!apiKey) {
    return c.json({ error: '未提供 API Key' }, 401);
  }

  // 验证 API Key 格式
  if (!apiKey.startsWith('mk_')) {
    return c.json({ error: 'API Key 格式错误' }, 401);
  }

  c.set('apiKey', apiKey);
  await next();
}
