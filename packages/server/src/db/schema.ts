/**
 * 数据库表结构定义
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ========== 枚举类型 ==========

/** 用户角色枚举 */
export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'member', 'viewer']);

/** 错误级别枚举 */
export const errorLevelEnum = pgEnum('error_level', ['error', 'warning', 'info']);

// ========== 用户表 ==========

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ========== 项目表 ==========

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    apiKey: varchar('api_key', { length: 64 }).notNull().unique(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index('projects_owner_idx').on(table.ownerId),
  })
);

// ========== 项目成员表 ==========

export const projectMembers = pgTable(
  'project_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: userRoleEnum('role').notNull().default('viewer'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    projectUserIdx: index('project_members_project_user_idx').on(table.projectId, table.userId),
  })
);

// ========== 错误记录表 ==========

export const errors = pgTable(
  'errors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    message: text('message').notNull(),
    stack: text('stack'),
    level: errorLevelEnum('level').notNull().default('error'),
    context: jsonb('context'),
    fingerprint: varchar('fingerprint', { length: 64 }),
    count: integer('count').notNull().default(1),
    firstSeenAt: timestamp('first_seen_at').defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    projectCreatedIdx: index('errors_project_created_idx').on(table.projectId, table.createdAt),
    fingerprintIdx: index('errors_fingerprint_idx').on(table.fingerprint),
    projectLastSeenIdx: index('errors_project_last_seen_idx').on(table.projectId, table.lastSeenAt),
  })
);

// ========== Session 录制表 ==========

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    sessionId: varchar('session_id', { length: 64 }).notNull(),
    events: jsonb('events').notNull(),
    userInfo: jsonb('user_info'),
    duration: integer('duration'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    projectCreatedIdx: index('sessions_project_created_idx').on(table.projectId, table.createdAt),
    sessionIdIdx: index('sessions_session_id_idx').on(table.sessionId),
  })
);

// ========== 性能监控表 ==========

export const performanceMetrics = pgTable(
  'performance_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    pageUrl: text('page_url').notNull(),
    metrics: jsonb('metrics').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    projectCreatedIdx: index('performance_metrics_project_created_idx').on(
      table.projectId,
      table.createdAt
    ),
  })
);

// ========== SourceMap 表 ==========

export const sourcemaps = pgTable(
  'sourcemaps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    version: varchar('version', { length: 64 }).notNull(),
    filePath: text('file_path').notNull(),
    mapData: text('map_data').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    projectVersionIdx: index('sourcemaps_project_version_idx').on(table.projectId, table.version),
    projectVersionFileIdx: index('sourcemaps_project_version_file_idx').on(
      table.projectId,
      table.version,
      table.filePath
    ),
  })
);

// ========== Refresh Token 表 ==========

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 500 }).notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('refresh_tokens_user_idx').on(table.userId),
    tokenIdx: index('refresh_tokens_token_idx').on(table.token),
  })
);
