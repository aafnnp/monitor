/**
 * 认证相关路由
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users, refreshTokens } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import type { LoginRequest, RegisterRequest, LoginResponse } from '@monitor/types';

const auth = new Hono();

// 注册验证 schema
const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6位'),
});

// 登录验证 schema
const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '密码不能为空'),
});

/**
 * 用户注册
 * POST /auth/register
 */
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password } = await c.req.json<RegisterRequest>();
  
  try {
    // 检查用户是否已存在
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (existingUser.length > 0) {
      return c.json({ error: '该邮箱已被注册' }, 400);
    }
    
    // 创建用户
    const passwordHash = await hashPassword(password);
    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
    }).returning();
    
    // 生成 tokens
    const accessToken = generateAccessToken({ userId: newUser.id, email: newUser.email });
    const refreshToken = generateRefreshToken({ userId: newUser.id, email: newUser.email });
    
    // 保存 refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 天
    await db.insert(refreshTokens).values({
      userId: newUser.id,
      token: refreshToken,
      expiresAt,
    });
    
    return c.json<LoginResponse>({
      accessToken,
      refreshToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
    }, 201);
  } catch (error) {
    console.error('注册失败:', error);
    return c.json({ error: '注册失败，请稍后重试' }, 500);
  }
});

/**
 * 用户登录
 * POST /auth/login
 */
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = await c.req.json<LoginRequest>();
  
  try {
    // 查找用户
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (!user) {
      return c.json({ error: '邮箱或密码错误' }, 401);
    }
    
    // 验证密码
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return c.json({ error: '邮箱或密码错误' }, 401);
    }
    
    // 生成 tokens
    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });
    
    // 保存 refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 天
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt,
    });
    
    return c.json<LoginResponse>({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('登录失败:', error);
    return c.json({ error: '登录失败，请稍后重试' }, 500);
  }
});

/**
 * 刷新 token
 * POST /auth/refresh
 */
auth.post('/refresh', async (c) => {
  const { refreshToken } = await c.req.json<{ refreshToken: string }>();
  
  if (!refreshToken) {
    return c.json({ error: '未提供刷新令牌' }, 400);
  }
  
  try {
    // 验证 refresh token
    const payload = verifyRefreshToken(refreshToken);
    
    // 检查 token 是否在数据库中
    const [tokenRecord] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, refreshToken))
      .limit(1);
    
    if (!tokenRecord) {
      return c.json({ error: '刷新令牌无效' }, 401);
    }
    
    // 检查是否过期
    if (new Date() > tokenRecord.expiresAt) {
      await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
      return c.json({ error: '刷新令牌已过期' }, 401);
    }
    
    // 生成新的 access token
    const accessToken = generateAccessToken({ userId: payload.userId, email: payload.email });
    
    return c.json({ accessToken });
  } catch (error) {
    console.error('刷新令牌失败:', error);
    return c.json({ error: '刷新令牌无效' }, 401);
  }
});

/**
 * 登出
 * POST /auth/logout
 */
auth.post('/logout', async (c) => {
  const { refreshToken } = await c.req.json<{ refreshToken: string }>();
  
  if (refreshToken) {
    try {
      await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
    } catch (error) {
      console.error('登出失败:', error);
    }
  }
  
  return c.json({ message: '登出成功' });
});

export default auth;
