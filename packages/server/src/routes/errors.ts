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
  matchSourceMap,
} from '../services/SourceMapResolver.js';
import type { Variables } from '../types.js';
import type { ResolvedStackFrame } from '@monitor/types';

const errorRoutes = new Hono<{ Variables: Variables }>();

// 应用认证中间件
errorRoutes.use('/*', authMiddleware);

/**
 * 从开发环境 URL 中提取 SourceMap 数据
 * @param fileName - 堆栈中的文件名（可能是 URL）
 * @returns SourceMap JSON 字符串或 null
 */
async function fetchSourceMapFromDevUrl(fileName?: string): Promise<string | null> {
  if (!fileName) return null;

  try {
    const url = new URL(fileName);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const jsContent = await response.text();
    const match = jsContent.match(/\/\/# sourceMappingURL=(.+)$/m);
    if (!match) return null;

    const sourceMapUrl = match[1].trim();

    // 处理内联 source map
    if (sourceMapUrl.startsWith('data:application/json;base64,')) {
      const base64 = sourceMapUrl.replace('data:application/json;base64,', '');
      return Buffer.from(base64, 'base64').toString('utf-8');
    }

    if (sourceMapUrl.startsWith('data:application/json;charset=utf-8;base64,')) {
      const base64 = sourceMapUrl.replace('data:application/json;charset=utf-8;base64,', '');
      return Buffer.from(base64, 'base64').toString('utf-8');
    }

    if (sourceMapUrl.startsWith('data:application/json,')) {
      const data = sourceMapUrl.replace('data:application/json,', '');
      return decodeURIComponent(data);
    }

    // 处理外部 source map
    const resolvedUrl = new URL(sourceMapUrl, url.toString());
    const mapResponse = await fetch(resolvedUrl.toString());
    if (!mapResponse.ok) return null;

    return await mapResponse.text();
  } catch {
    return null;
  }
}

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
    let sourceMapStatus = {
      available: false,
      version: (errorRecord.context as any)?.extra?.version,
      matchedCount: 0,
      totalFrames: 0,
    };
    const environment = (errorRecord.context as any)?.extra?.environment;

    if (errorRecord.stack) {
      const frames = parseStackTrace(errorRecord.stack);
      sourceMapStatus.totalFrames = frames.length;

      // 获取版本号（从 context.extra 中）
      const version = (errorRecord.context as any)?.extra?.version;

      // 获取项目的 SourceMap（优先匹配版本号）
      let sourceMaps: Array<{ filePath: string; mapData: string }> = [];
      if (version) {
        // 优先使用指定版本的 SourceMap
        sourceMaps = await db
          .select()
          .from(sourcemaps)
          .where(and(eq(sourcemaps.projectId, projectId), eq(sourcemaps.version, version)))
          .orderBy(desc(sourcemaps.createdAt));
      }

      // 如果没有找到对应版本的 SourceMap，使用最新的
      if (sourceMaps.length === 0) {
        sourceMaps = await db
          .select()
          .from(sourcemaps)
          .where(eq(sourcemaps.projectId, projectId))
          .orderBy(desc(sourcemaps.createdAt))
          .limit(20);
      }

      sourceMapStatus.available = sourceMaps.length > 0;

      // 解析每个堆栈帧
      for (const frame of frames) {
        let resolved = frame as ResolvedStackFrame;
        let matchedBySourceMap = false;

        // 使用智能匹配算法找到对应的 SourceMap
        if (sourceMaps.length > 0) {
          const matchedMap = matchSourceMap(frame, sourceMaps);

          if (matchedMap) {
            try {
              resolved = await resolveStackFrame(frame, matchedMap.mapData);
              matchedBySourceMap = !!resolved.originalFileName;
            } catch (err) {
              console.error('解析堆栈帧失败:', err);
            }
          }
        }

        // 开发环境兜底：从 URL 获取 SourceMap，再解析回源文件
        if (
          !resolved.originalSource &&
          environment === 'development' &&
          frame.fileName &&
          /\/src\//.test(frame.fileName)
        ) {
          const mapData = await fetchSourceMapFromDevUrl(frame.fileName);
          if (mapData) {
            try {
              resolved = await resolveStackFrame(frame, mapData);
              matchedBySourceMap = matchedBySourceMap || !!resolved.originalFileName;
            } catch {
              // 忽略 URL 解析失败
            }
          }
        }

        if (matchedBySourceMap) {
          sourceMapStatus.matchedCount++;
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
        sourceMapStatus,
      },
    });
  } catch (error) {
    console.error('获取错误详情失败:', error);
    return c.json({ error: '获取失败' }, 500);
  }
});

export default errorRoutes;
