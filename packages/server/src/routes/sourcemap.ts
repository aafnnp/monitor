/**
 * SourceMap 管理路由
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.js';
import { sourcemaps, projects, projectMembers, errors } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, apiKeyMiddleware } from '../middleware/auth.js';
import {
  resolveStackFrame,
  parseStackTrace,
  getSourceSnippet,
} from '../services/SourceMapResolver.js';
import type { Variables } from '../types.js';

const sourcemap = new Hono<{ Variables: Variables }>();

// SourceMap 上传验证 schema
const uploadSchema = z.object({
  version: z.string().min(1, '版本号不能为空'),
  filePath: z.string().min(1, '文件路径不能为空'),
  mapData: z.string().min(1, 'SourceMap 数据不能为空'),
});

/**
 * 上传 SourceMap
 * POST /sourcemap/upload
 * 使用 API Key 认证
 */
sourcemap.post('/upload', apiKeyMiddleware, zValidator('json', uploadSchema), async (c) => {
  const apiKey = c.get('apiKey');
  const { version, filePath, mapData } = await c.req.json();

  try {
    // 查找项目
    const [project] = await db.select().from(projects).where(eq(projects.apiKey, apiKey)).limit(1);

    if (!project) {
      return c.json({ error: 'API Key 无效' }, 401);
    }

    // 检查是否已存在相同版本和文件的 SourceMap
    const existing = await db
      .select()
      .from(sourcemaps)
      .where(
        and(
          eq(sourcemaps.projectId, project.id),
          eq(sourcemaps.version, version),
          eq(sourcemaps.filePath, filePath)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // 更新已存在的 SourceMap
      const [updated] = await db
        .update(sourcemaps)
        .set({ mapData })
        .where(eq(sourcemaps.id, existing[0].id))
        .returning();

      return c.json({ success: true, id: updated.id, updated: true });
    } else {
      // 创建新 SourceMap
      const [record] = await db
        .insert(sourcemaps)
        .values({
          projectId: project.id,
          version,
          filePath,
          mapData,
        })
        .returning();

      return c.json({ success: true, id: record.id, updated: false });
    }
  } catch (error) {
    console.error('上传 SourceMap 失败:', error);
    return c.json({ error: '上传失败' }, 500);
  }
});

/**
 * 获取项目的 SourceMap 列表
 * GET /sourcemap/:projectId
 * 使用 JWT 认证
 */
sourcemap.get('/:projectId', authMiddleware, async (c) => {
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

    // 获取 SourceMap 列表（不返回完整的 mapData）
    const maps = await db
      .select({
        id: sourcemaps.id,
        version: sourcemaps.version,
        filePath: sourcemaps.filePath,
        createdAt: sourcemaps.createdAt,
      })
      .from(sourcemaps)
      .where(eq(sourcemaps.projectId, projectId))
      .orderBy(sourcemaps.createdAt);

    return c.json(maps);
  } catch (error) {
    console.error('获取 SourceMap 列表失败:', error);
    return c.json({ error: '获取列表失败' }, 500);
  }
});

/**
 * 解析错误堆栈
 * POST /sourcemap/resolve/:errorId
 * 使用 JWT 认证
 */
sourcemap.post('/resolve/:errorId', authMiddleware, async (c) => {
  const errorId = c.req.param('errorId');
  const auth = c.get('auth');

  try {
    // 获取错误记录
    const [error] = await db.select().from(errors).where(eq(errors.id, errorId)).limit(1);

    if (!error) {
      return c.json({ error: '错误记录不存在' }, 404);
    }

    // 检查权限
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(eq(projectMembers.projectId, error.projectId), eq(projectMembers.userId, auth.userId))
      )
      .limit(1);

    if (!membership) {
      return c.json({ error: '无权访问该错误' }, 403);
    }

    if (!error.stack) {
      return c.json({ error: '该错误没有堆栈信息' }, 400);
    }

    // 解析堆栈
    const frames = parseStackTrace(error.stack);

    // 获取项目的 SourceMap（简单处理：使用最新版本）
    const maps = await db
      .select()
      .from(sourcemaps)
      .where(eq(sourcemaps.projectId, error.projectId))
      .orderBy(sourcemaps.createdAt);

    if (maps.length === 0) {
      return c.json({
        frames,
        resolved: false,
        message: '未找到 SourceMap',
      });
    }

    // 尝试解析每个堆栈帧
    const resolvedFrames = [];

    for (const frame of frames) {
      // 查找匹配的 SourceMap
      const matchingMap = maps.find((m) => frame.fileName?.includes(m.filePath));

      if (matchingMap) {
        const resolved = await resolveStackFrame(frame, matchingMap.mapData);

        // 如果解析成功且有源代码，添加代码片段
        if (resolved.originalSource && resolved.originalLineNumber) {
          const snippet = getSourceSnippet(resolved.originalSource, resolved.originalLineNumber);
          resolvedFrames.push({ ...resolved, snippet });
        } else {
          resolvedFrames.push(resolved);
        }
      } else {
        resolvedFrames.push(frame);
      }
    }

    return c.json({
      frames: resolvedFrames,
      resolved: true,
    });
  } catch (error) {
    console.error('解析堆栈失败:', error);
    return c.json({ error: '解析失败' }, 500);
  }
});

/**
 * 删除 SourceMap
 * DELETE /sourcemap/:id
 * 使用 JWT 认证
 */
sourcemap.delete('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const auth = c.get('auth');

  try {
    // 获取 SourceMap
    const [map] = await db.select().from(sourcemaps).where(eq(sourcemaps.id, id)).limit(1);

    if (!map) {
      return c.json({ error: 'SourceMap 不存在' }, 404);
    }

    // 检查权限（只有 owner 和 admin 可以删除）
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(eq(projectMembers.projectId, map.projectId), eq(projectMembers.userId, auth.userId))
      )
      .limit(1);

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return c.json({ error: '无权删除 SourceMap' }, 403);
    }

    await db.delete(sourcemaps).where(eq(sourcemaps.id, id));

    return c.json({ message: 'SourceMap 已删除' });
  } catch (error) {
    console.error('删除 SourceMap 失败:', error);
    return c.json({ error: '删除失败' }, 500);
  }
});

export default sourcemap;
