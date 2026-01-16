/**
 * 错误查询和分析路由
 */
import { Hono } from 'hono';
import { db } from '../db/index.js';
import { errors, sourcemaps } from '../db/schema.js';
import { and, desc, eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import {
  parseStackTrace,
  resolveStackFrame,
  getSourceSnippet,
  formatStackFrames,
} from '../services/SourceMapResolver.js';
import type { Variables } from '../types.js';
import type { ResolvedStackFrame } from '@monitor/types';

const errorRoutes = new Hono<{ Variables: Variables }>();

// 应用认证中间件
errorRoutes.use('/*', authMiddleware);

/**
 * 获取错误列表
 * GET /errors/:projectId
 */
errorRoutes.get('/:projectId', async (c) => {
  const projectId = c.req.param('projectId');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    const errorList = await db
      .select()
      .from(errors)
      .where(eq(errors.projectId, projectId))
      .orderBy(desc(errors.lastSeenAt))
      .limit(limit)
      .offset(offset);

    return c.json({ success: true, data: errorList });
  } catch (error) {
    console.error('获取错误列表失败:', error);
    return c.json({ error: '获取失败' }, 500);
  }
});

/**
 * 获取错误详情（包含解析后的堆栈）
 * GET /errors/:projectId/:errorId
 */
errorRoutes.get('/:projectId/:errorId', async (c) => {
  const projectId = c.req.param('projectId');
  const errorId = c.req.param('errorId');

  try {
    // 获取错误记录
    const [errorRecord] = await db
      .select()
      .from(errors)
      .where(and(eq(errors.id, errorId), eq(errors.projectId, projectId)))
      .limit(1);

    if (!errorRecord) {
      return c.json({ error: '错误记录不存在' }, 404);
    }

    // 如果有堆栈信息，尝试解析
    let resolvedFrames: ResolvedStackFrame[] = [];
    let formattedStack: string | undefined;
    let sourceSnippets: Record<string, any> = {};

    if (errorRecord.stack) {
      const frames = parseStackTrace(errorRecord.stack);

      // 获取项目的 SourceMap（这里简化处理，实际应该根据文件名匹配）
      const sourceMaps = await db
        .select()
        .from(sourcemaps)
        .where(eq(sourcemaps.projectId, projectId))
        .orderBy(desc(sourcemaps.createdAt))
        .limit(10);

      // 解析每个堆栈帧
      for (const frame of frames) {
        let resolved = frame as ResolvedStackFrame;

        // 尝试使用 SourceMap 解析
        for (const sourceMap of sourceMaps) {
          if (frame.fileName && frame.fileName.includes(sourceMap.filePath)) {
            try {
              resolved = await resolveStackFrame(frame, sourceMap.mapData);
              break;
            } catch (err) {
              console.error('解析堆栈帧失败:', err);
            }
          }
        }

        resolvedFrames.push(resolved);

        // 获取源代码片段
        if (resolved.originalSource && resolved.originalLineNumber) {
          const snippet = getSourceSnippet(resolved.originalSource, resolved.originalLineNumber, 5);
          sourceSnippets[`${resolved.originalFileName}:${resolved.originalLineNumber}`] = snippet;
        }
      }

      // 格式化堆栈，只显示应用代码
      formattedStack = formatStackFrames(resolvedFrames, true);
    }

    return c.json({
      success: true,
      data: {
        ...errorRecord,
        resolvedFrames,
        formattedStack,
        sourceSnippets,
      },
    });
  } catch (error) {
    console.error('获取错误详情失败:', error);
    return c.json({ error: '获取失败' }, 500);
  }
});

export default errorRoutes;
