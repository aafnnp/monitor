/**
 * 共享类型定义
 */

// ========== 用户和认证相关 ==========

/** 用户角色枚举 */
export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

/** 用户信息 */
export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

/** 项目信息 */
export interface Project {
  id: string;
  name: string;
  apiKey: string;
  ownerId: string;
  createdAt: Date;
}

/** 项目成员 */
export interface ProjectMember {
  projectId: string;
  userId: string;
  role: UserRole;
  createdAt: Date;
}

// ========== 错误监控相关 ==========

/** 错误级别 */
export enum ErrorLevel {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/** 用户行为面包屑类型 */
export enum BreadcrumbType {
  USER = 'user', // 用户交互
  NAVIGATION = 'navigation', // 页面导航
  CONSOLE = 'console', // 控制台输出
  HTTP = 'http', // HTTP 请求
  ERROR = 'error', // 错误
}

/** 用户行为面包屑 */
export interface Breadcrumb {
  type: BreadcrumbType;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  level?: ErrorLevel;
  timestamp: number;
}

/** 错误上下文 */
export interface ErrorContext {
  /** 用户信息 */
  user?: {
    id?: string;
    email?: string;
    [key: string]: unknown;
  };
  /** 设备信息 */
  device?: {
    userAgent?: string;
    screenWidth?: number;
    screenHeight?: number;
    platform?: string;
    language?: string;
    timezone?: string;
  };
  /** 页面信息 */
  page?: {
    url: string;
    title?: string;
    referrer?: string;
  };
  /** 自定义标签 */
  tags?: Record<string, string>;
  /** 额外数据 */
  extra?: Record<string, unknown>;
  /** 用户行为追踪 */
  breadcrumbs?: Breadcrumb[];
  /** HTTP 请求信息 */
  request?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
}

/** 错误堆栈帧 */
export interface StackFrame {
  fileName?: string;
  functionName?: string;
  lineNumber?: number;
  columnNumber?: number;
  source?: string;
  /** 是否为应用代码（非框架/库代码） */
  inApp?: boolean;
}

/** 错误记录 */
export interface ErrorRecord {
  id: string;
  projectId: string;
  message: string;
  stack?: string;
  level: ErrorLevel;
  context?: ErrorContext;
  /** 错误指纹，用于分组 */
  fingerprint?: string;
  /** 发生次数 */
  count?: number;
  /** 首次发生时间 */
  firstSeenAt?: Date;
  /** 最后发生时间 */
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

// ========== Session Replay 相关 ==========

/** Session 录制事件（基于 rrweb） */
export interface ReplayEvent {
  type: number;
  data: unknown;
  timestamp: number;
}

/** Session 信息 */
export interface SessionRecord {
  id: string;
  projectId: string;
  sessionId: string;
  events: ReplayEvent[];
  userInfo?: {
    id?: string;
    email?: string;
    [key: string]: unknown;
  };
  duration?: number;
  createdAt: Date;
}

// ========== 性能监控相关 ==========

/** Core Web Vitals 指标 */
export interface WebVitals {
  /** Largest Contentful Paint */
  LCP?: number;
  /** First Input Delay */
  FID?: number;
  /** Cumulative Layout Shift */
  CLS?: number;
  /** Time to First Byte */
  TTFB?: number;
  /** First Contentful Paint */
  FCP?: number;
}

/** 资源加载性能 */
export interface ResourceTiming {
  name: string;
  type: string;
  duration: number;
  size?: number;
  startTime: number;
}

/** 长任务 */
export interface LongTask {
  duration: number;
  startTime: number;
}

/** 性能指标 */
export interface PerformanceMetrics {
  projectId: string;
  pageUrl: string;
  webVitals?: WebVitals;
  resources?: ResourceTiming[];
  longTasks?: LongTask[];
  memory?: {
    used: number;
    total: number;
    limit: number;
  };
  createdAt: Date;
}

/** 性能优化建议 */
export interface PerformanceSuggestion {
  type: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'RESOURCE' | 'LONG_TASK' | 'MEMORY';
  severity: 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
}

// ========== SourceMap 相关 ==========

/** SourceMap 记录 */
export interface SourceMapRecord {
  id: string;
  projectId: string;
  version: string;
  filePath: string;
  mapData: string;
  createdAt: Date;
}

/** 解析后的堆栈帧 */
export interface ResolvedStackFrame extends StackFrame {
  originalFileName?: string;
  originalLineNumber?: number;
  originalColumnNumber?: number;
  originalSource?: string;
}

// ========== SDK 配置相关 ==========

/** SDK 配置选项 */
export interface SDKOptions {
  /** 项目 API Key */
  apiKey: string;
  /** 服务端地址 */
  serverUrl: string;
  /** 是否启用错误监控 */
  enableError?: boolean;
  /** 是否启用性能监控 */
  enablePerformance?: boolean;
  /** 是否启用 Session Replay */
  enableReplay?: boolean;
  /** Session Replay 采样率 (0-1) */
  replaySampleRate?: number;
  /** 是否仅在出错时录制 */
  replayOnError?: boolean;
  /** 环境标识 */
  environment?: string;
  /** 版本号 */
  version?: string;
  /** 用户信息 */
  user?: {
    id?: string;
    email?: string;
    [key: string]: unknown;
  };
  /** 自定义标签 */
  tags?: Record<string, string>;
  /** 错误过滤器 */
  beforeSend?: (error: ErrorRecord) => ErrorRecord | null;
}

// ========== API 请求/响应类型 ==========

/** 登录请求 */
export interface LoginRequest {
  email: string;
  password: string;
}

/** 登录响应 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/** 注册请求 */
export interface RegisterRequest {
  email: string;
  password: string;
}

/** 创建项目请求 */
export interface CreateProjectRequest {
  name: string;
}

/** 错误上报请求 */
export interface ReportErrorRequest {
  errors: Omit<ErrorRecord, 'id' | 'projectId' | 'createdAt'>[];
}

/** Session 上报请求 */
export interface ReportSessionRequest {
  sessionId: string;
  events: ReplayEvent[];
  userInfo?: Record<string, unknown>;
}

/** 性能数据上报请求 */
export interface ReportPerformanceRequest {
  metrics: Omit<PerformanceMetrics, 'projectId' | 'createdAt'>;
}
