/**
 * 数据统计和查询路由
 */
import { Hono } from 'hono';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { errors, sessions, performanceMetrics, projectMembers } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Variables } from '../types.js';

const stats = new Hono<{ Variables: Variables }>();

// 所有路由都需要认证
stats.use('*', authMiddleware);

/**
 * 获取项目概览统计
 * GET /stats/:projectId/overview
 */
stats.get('/stats/:projectId/overview', async (c) => {
  const projectId = c.req.param('projectId');
  const auth = c.get('auth');

  try {
    // 检查权限
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, auth.userId)))
      .limit(1);

    if (!membership) {
      return c.json({ error: '无权访问该项目' }, 403);
    }

    // 统计错误数量
    const [errorStats] = await db
      .select({
        total: sql<number>`count(*)`,
      })
      .from(errors)
      .where(eq(errors.projectId, projectId));

    // 统计性能数据数量
    const [performanceCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(performanceMetrics)
      .where(eq(performanceMetrics.projectId, projectId));

    // 统计session数量
    const [sessionCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessions)
      .where(eq(sessions.projectId, projectId));

    return c.json({
      errors: {
        total: Number(errorStats?.total || 0),
      },
      performance: {
        total: Number(performanceCount?.count || 0),
      },
      sessions: {
        total: Number(sessionCount?.count || 0),
      },
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return c.json({ error: '获取统计数据失败' }, 500);
  }
});

/**
 * 获取错误列表
 * GET /errors/:projectId
 */
stats.get('/errors/:projectId', async (c) => {
  const projectId = c.req.param('projectId');
  const auth = c.get('auth');
  const limit = Number(c.req.query('limit') || 20);
  const offset = Number(c.req.query('offset') || 0);

  try {
    // 检查权限
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, auth.userId)))
      .limit(1);

    if (!membership) {
      return c.json({ error: '无权访问该项目' }, 403);
    }

    // 查询错误列表
    const errorList = await db
      .select()
      .from(errors)
      .where(eq(errors.projectId, projectId))
      .orderBy(desc(errors.updatedAt))
      .limit(limit)
      .offset(offset);

    // 查询总数
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(errors)
      .where(eq(errors.projectId, projectId));

    return c.json({
      data: errorList,
      total: Number(total),
      limit,
      offset,
    });
  } catch (error) {
    console.error('获取错误列表失败:', error);
    return c.json({ error: '获取错误列表失败' }, 500);
  }
});

/**
 * 获取性能数据列表
 * GET /performance/:projectId
 */
stats.get('/performance/:projectId', async (c) => {
  const projectId = c.req.param('projectId');
  const auth = c.get('auth');
  const limit = Number(c.req.query('limit') || 20);
  const offset = Number(c.req.query('offset') || 0);

  try {
    // 检查权限
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, auth.userId)))
      .limit(1);

    if (!membership) {
      return c.json({ error: '无权访问该项目' }, 403);
    }

    // 查询性能数据列表
    const performanceList = await db
      .select()
      .from(performanceMetrics)
      .where(eq(performanceMetrics.projectId, projectId))
      .orderBy(desc(performanceMetrics.createdAt))
      .limit(limit)
      .offset(offset);

    // 查询总数
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(performanceMetrics)
      .where(eq(performanceMetrics.projectId, projectId));

    return c.json({
      data: performanceList,
      total: Number(total),
      limit,
      offset,
    });
  } catch (error) {
    console.error('获取性能数据失败:', error);
    return c.json({ error: '获取性能数据失败' }, 500);
  }
});

/**
 * 获取session列表
 * GET /sessions/:projectId
 */
stats.get('/sessions/:projectId', async (c) => {
  const projectId = c.req.param('projectId');
  const auth = c.get('auth');
  const limit = Number(c.req.query('limit') || 20);
  const offset = Number(c.req.query('offset') || 0);

  try {
    // 检查权限
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, auth.userId)))
      .limit(1);

    if (!membership) {
      return c.json({ error: '无权访问该项目' }, 403);
    }

    // 查询session列表（不返回完整的events数据）
    const sessionList = await db
      .select({
        id: sessions.id,
        sessionId: sessions.sessionId,
        projectId: sessions.projectId,
        userInfo: sessions.userInfo,
        eventCount: sql<number>`json_array_length(${sessions.events})`,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .where(eq(sessions.projectId, projectId))
      .orderBy(desc(sessions.createdAt))
      .limit(limit)
      .offset(offset);

    // 查询总数
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(sessions)
      .where(eq(sessions.projectId, projectId));

    return c.json({
      data: sessionList,
      total: Number(total),
      limit,
      offset,
    });
  } catch (error) {
    console.error('获取session列表失败:', error);
    return c.json({ error: '获取session列表失败' }, 500);
  }
});

/**
 * 获取单个session详情（包含完整events）
 * GET /sessions/:projectId/:sessionId
 */
stats.get('/sessions/:projectId/:sessionId', async (c) => {
  const projectId = c.req.param('projectId');
  const sessionId = c.req.param('sessionId');
  const auth = c.get('auth');

  try {
    // 检查权限
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, auth.userId)))
      .limit(1);

    if (!membership) {
      return c.json({ error: '无权访问该项目' }, 403);
    }

    // 查询session详情
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.projectId, projectId), eq(sessions.sessionId, sessionId)))
      .limit(1);

    if (!session) {
      return c.json({ error: 'Session不存在' }, 404);
    }

    return c.json(session);
  } catch (error) {
    console.error('获取session详情失败:', error);
    return c.json({ error: '获取session详情失败' }, 500);
  }
});

/**
 * 获取单个错误详情
 * GET /errors/:projectId/:errorId
 */
stats.get('/errors/:projectId/:errorId', async (c) => {
  const projectId = c.req.param('projectId');
  const errorId = c.req.param('errorId');
  const auth = c.get('auth');

  try {
    // 检查权限
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, auth.userId)))
      .limit(1);

    if (!membership) {
      return c.json({ error: '无权访问该项目' }, 403);
    }

    // 查询错误详情
    const [error] = await db
      .select()
      .from(errors)
      .where(and(eq(errors.projectId, projectId), eq(errors.id, errorId)))
      .limit(1);

    if (!error) {
      return c.json({ error: '错误不存在' }, 404);
    }

    return c.json(error);
  } catch (error) {
    console.error('获取错误详情失败:', error);
    return c.json({ error: '获取错误详情失败' }, 500);
  }
});

export default stats;
