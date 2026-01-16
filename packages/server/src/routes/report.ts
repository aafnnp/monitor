/**
 * 数据上报路由
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.js';
import { errors, sessions, performanceMetrics, projects } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { apiKeyMiddleware } from '../middleware/auth.js';
import { generateErrorFingerprint } from '../services/SourceMapResolver.js';
import type { Variables } from '../types.js';

const report = new Hono<{ Variables: Variables }>();

// 应用 API Key 认证中间件
report.use('/*', apiKeyMiddleware);

// Breadcrumb schema
const breadcrumbSchema = z.object({
  type: z.enum(['user', 'navigation', 'console', 'http', 'error']),
  category: z.string(),
  message: z.string(),
  data: z.record(z.unknown()).optional(),
  level: z.enum(['error', 'warning', 'info']).optional(),
  timestamp: z.number(),
});

// 错误上报验证 schema
const reportErrorSchema = z.object({
  errors: z
    .array(
      z.object({
        message: z.string(),
        stack: z.string().optional(),
        level: z.enum(['error', 'warning', 'info']).default('error'),
        context: z
          .object({
            user: z
              .object({
                id: z.string().optional(),
                email: z.string().optional(),
              })
              .passthrough()
              .optional(),
            device: z
              .object({
                userAgent: z.string().optional(),
                screenWidth: z.number().optional(),
                screenHeight: z.number().optional(),
                platform: z.string().optional(),
                language: z.string().optional(),
                timezone: z.string().optional(),
              })
              .optional(),
            page: z
              .object({
                url: z.string(),
                title: z.string().optional(),
                referrer: z.string().optional(),
              })
              .optional(),
            tags: z.record(z.string()).optional(),
            extra: z.record(z.unknown()).optional(),
            breadcrumbs: z.array(breadcrumbSchema).optional(),
            request: z
              .object({
                url: z.string(),
                method: z.string(),
                headers: z.record(z.string()).optional(),
                body: z.unknown().optional(),
              })
              .optional(),
          })
          .optional(),
      })
    )
    .min(1),
});

/**
 * 上报错误
 * POST /report/errors
 */
report.post('/errors', zValidator('json', reportErrorSchema), async (c) => {
  const apiKey = c.get('apiKey');
  const { errors: errorList } = await c.req.json();

  try {
    // 查找项目
    const [project] = await db.select().from(projects).where(eq(projects.apiKey, apiKey)).limit(1);

    if (!project) {
      return c.json({ error: 'API Key 无效' }, 401);
    }

    // 批量处理错误
    const results = [];

    for (const error of errorList) {
      const fingerprint = generateErrorFingerprint(error.message, error.stack);

      // 检查是否已存在相同错误
      const [existing] = await db
        .select()
        .from(errors)
        .where(eq(errors.fingerprint, fingerprint))
        .limit(1);

      if (existing) {
        // 更新计数和最后发生时间
        const [updated] = await db
          .update(errors)
          .set({
            count: existing.count + 1,
            lastSeenAt: new Date(),
            updatedAt: new Date(),
            // 更新最新的 context（保留最新的用户行为）
            context: error.context as any,
          })
          .where(eq(errors.id, existing.id))
          .returning();

        results.push({ id: updated.id, isDuplicate: true });
      } else {
        // 创建新错误记录
        const now = new Date();
        const [newError] = await db
          .insert(errors)
          .values({
            projectId: project.id,
            message: error.message,
            stack: error.stack,
            level: error.level || 'error',
            context: error.context as any,
            fingerprint,
            count: 1,
            firstSeenAt: now,
            lastSeenAt: now,
          })
          .returning();

        results.push({ id: newError.id, isDuplicate: false });
      }
    }

    return c.json({ success: true, results });
  } catch (error) {
    console.error('上报错误失败:', error);
    return c.json({ error: '上报失败' }, 500);
  }
});

// Session 上报验证 schema
const reportSessionSchema = z.object({
  sessionId: z.string(),
  events: z
    .array(
      z.object({
        type: z.number(),
        data: z.unknown(),
        timestamp: z.number(),
      })
    )
    .min(1),
  userInfo: z.record(z.unknown()).optional(),
});

/**
 * 上报 Session 录制数据
 * POST /report/session
 */
report.post('/session', zValidator('json', reportSessionSchema), async (c) => {
  const apiKey = c.get('apiKey');
  const { sessionId, events, userInfo } = await c.req.json();

  try {
    // 查找项目
    const [project] = await db.select().from(projects).where(eq(projects.apiKey, apiKey)).limit(1);

    if (!project) {
      return c.json({ error: 'API Key 无效' }, 401);
    }

    // 检查是否已存在该 session
    const [existing] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId))
      .limit(1);

    if (existing) {
      // 合并事件（追加新事件）
      const existingEvents = existing.events as any[];
      const allEvents = [...existingEvents, ...events];

      // 计算总时长
      const duration =
        allEvents.length > 0
          ? allEvents[allEvents.length - 1].timestamp - allEvents[0].timestamp
          : 0;

      const [updated] = await db
        .update(sessions)
        .set({
          events: allEvents as any,
          duration,
        })
        .where(eq(sessions.id, existing.id))
        .returning();

      return c.json({ success: true, id: updated.id });
    } else {
      // 创建新 session
      const duration =
        events.length > 0 ? events[events.length - 1].timestamp - events[0].timestamp : 0;

      const [newSession] = await db
        .insert(sessions)
        .values({
          projectId: project.id,
          sessionId,
          events: events as any,
          userInfo: userInfo as any,
          duration,
        })
        .returning();

      return c.json({ success: true, id: newSession.id });
    }
  } catch (error) {
    console.error('上报 Session 失败:', error);
    return c.json({ error: '上报失败' }, 500);
  }
});

// 性能数据上报验证 schema
const reportPerformanceSchema = z.object({
  pageUrl: z.string(),
  metrics: z.object({
    webVitals: z
      .object({
        LCP: z.number().optional(),
        FID: z.number().optional(),
        CLS: z.number().optional(),
        TTFB: z.number().optional(),
        FCP: z.number().optional(),
      })
      .optional(),
    resources: z
      .array(
        z.object({
          name: z.string(),
          type: z.string(),
          duration: z.number(),
          size: z.number().optional(),
          startTime: z.number(),
        })
      )
      .optional(),
    longTasks: z
      .array(
        z.object({
          duration: z.number(),
          startTime: z.number(),
        })
      )
      .optional(),
    memory: z
      .object({
        used: z.number(),
        total: z.number(),
        limit: z.number(),
      })
      .optional(),
  }),
});

/**
 * 上报性能数据
 * POST /report/performance
 */
report.post('/performance', zValidator('json', reportPerformanceSchema), async (c) => {
  const apiKey = c.get('apiKey');
  const { pageUrl, metrics } = await c.req.json();

  try {
    // 查找项目
    const [project] = await db.select().from(projects).where(eq(projects.apiKey, apiKey)).limit(1);

    if (!project) {
      return c.json({ error: 'API Key 无效' }, 401);
    }

    // 保存性能数据
    const [record] = await db
      .insert(performanceMetrics)
      .values({
        projectId: project.id,
        pageUrl,
        metrics: metrics as any,
      })
      .returning();

    return c.json({ success: true, id: record.id });
  } catch (error) {
    console.error('上报性能数据失败:', error);
    return c.json({ error: '上报失败' }, 500);
  }
});

export default report;
