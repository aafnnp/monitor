/**
 * 项目管理路由
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.js';
import { projects, projectMembers } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { generateApiKey } from '../utils/apiKey.js';
import type { CreateProjectRequest, Project } from '@monitor/types';
import type { Variables } from '../types.js';

const projectsRouter = new Hono<{ Variables: Variables }>();

// 应用认证中间件
projectsRouter.use('/*', authMiddleware);

// 创建项目验证 schema
const createProjectSchema = z.object({
  name: z.string().min(1, '项目名称不能为空').max(100, '项目名称过长'),
});

/**
 * 创建项目
 * POST /projects
 */
projectsRouter.post('/', zValidator('json', createProjectSchema), async (c) => {
  const { name } = await c.req.json<CreateProjectRequest>();
  const auth = c.get('auth');

  try {
    const apiKey = generateApiKey();

    const [project] = await db
      .insert(projects)
      .values({
        name,
        apiKey,
        ownerId: auth.userId,
      })
      .returning();

    // 添加创建者为 owner
    await db.insert(projectMembers).values({
      projectId: project.id,
      userId: auth.userId,
      role: 'owner',
    });

    return c.json<Project>(
      {
        id: project.id,
        name: project.name,
        apiKey: project.apiKey,
        ownerId: project.ownerId,
        createdAt: project.createdAt,
      },
      201
    );
  } catch (error) {
    console.error('创建项目失败:', error);
    return c.json({ error: '创建项目失败' }, 500);
  }
});

/**
 * 获取用户的所有项目
 * GET /projects
 */
projectsRouter.get('/', async (c) => {
  const auth = c.get('auth');

  try {
    // 获取用户参与的所有项目
    const userProjects = await db
      .select({
        project: projects,
        role: projectMembers.role,
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .where(eq(projectMembers.userId, auth.userId));

    return c.json(
      userProjects.map((item) => ({
        ...item.project,
        role: item.role,
      }))
    );
  } catch (error) {
    console.error('获取项目列表失败:', error);
    return c.json({ error: '获取项目列表失败' }, 500);
  }
});

/**
 * 获取单个项目详情
 * GET /projects/:id
 */
projectsRouter.get('/:id', async (c) => {
  const projectId = c.req.param('id');
  const auth = c.get('auth');

  try {
    // 检查用户是否有权限访问该项目
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, auth.userId)))
      .limit(1);

    if (!membership) {
      return c.json({ error: '无权访问该项目' }, 403);
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

    if (!project) {
      return c.json({ error: '项目不存在' }, 404);
    }

    return c.json({
      ...project,
      role: membership.role,
    });
  } catch (error) {
    console.error('获取项目详情失败:', error);
    return c.json({ error: '获取项目详情失败' }, 500);
  }
});

/**
 * 更新项目
 * PUT /projects/:id
 */
projectsRouter.put('/:id', zValidator('json', createProjectSchema), async (c) => {
  const projectId = c.req.param('id');
  const { name } = await c.req.json<{ name: string }>();
  const auth = c.get('auth');

  try {
    // 检查权限（只有 owner 和 admin 可以更新）
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, auth.userId)))
      .limit(1);

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return c.json({ error: '无权修改该项目' }, 403);
    }

    const [updated] = await db
      .update(projects)
      .set({ name, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();

    if (!updated) {
      return c.json({ error: '项目不存在' }, 404);
    }

    return c.json(updated);
  } catch (error) {
    console.error('更新项目失败:', error);
    return c.json({ error: '更新项目失败' }, 500);
  }
});

/**
 * 删除项目
 * DELETE /projects/:id
 */
projectsRouter.delete('/:id', async (c) => {
  const projectId = c.req.param('id');
  const auth = c.get('auth');

  try {
    // 检查权限（只有 owner 可以删除）
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

    if (!project) {
      return c.json({ error: '项目不存在' }, 404);
    }

    if (project.ownerId !== auth.userId) {
      return c.json({ error: '只有项目所有者可以删除项目' }, 403);
    }

    await db.delete(projects).where(eq(projects.id, projectId));

    return c.json({ message: '项目已删除' });
  } catch (error) {
    console.error('删除项目失败:', error);
    return c.json({ error: '删除项目失败' }, 500);
  }
});

/**
 * 重新生成 API Key
 * POST /projects/:id/regenerate-key
 */
projectsRouter.post('/:id/regenerate-key', async (c) => {
  const projectId = c.req.param('id');
  const auth = c.get('auth');

  try {
    // 检查权限（只有 owner 和 admin 可以重新生成）
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, auth.userId)))
      .limit(1);

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return c.json({ error: '无权重新生成 API Key' }, 403);
    }

    const newApiKey = generateApiKey();
    const [updated] = await db
      .update(projects)
      .set({ apiKey: newApiKey, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();

    if (!updated) {
      return c.json({ error: '项目不存在' }, 404);
    }

    return c.json({ apiKey: newApiKey });
  } catch (error) {
    console.error('重新生成 API Key 失败:', error);
    return c.json({ error: '重新生成 API Key 失败' }, 500);
  }
});

export default projectsRouter;
