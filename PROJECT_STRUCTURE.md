# 项目结构说明

## 整体架构

```
monitor/
├── packages/                    # Monorepo 包目录
│   ├── types/                   # 共享 TypeScript 类型定义
│   ├── sdk-core/               # 核心 SDK（错误/性能/replay）
│   ├── sdk-react/              # React SDK 适配器
│   ├── sdk-vue/                # Vue SDK 适配器
│   ├── sdk-react-native/       # React Native SDK 适配器
│   ├── server/                 # Hono 后端服务
│   ├── dashboard/              # 管理控制台（React）
│   └── cli/                    # CLI 工具（SourceMap 上传）
├── docker/                     # Docker 配置文件
├── examples/                   # 示例项目
│   └── react-demo/            # React 集成示例
├── pnpm-workspace.yaml        # pnpm workspace 配置
├── turbo.json                 # Turborepo 配置
├── package.json               # 根 package.json
├── README.md                  # 项目说明
├── USAGE.md                   # 使用指南
└── PROJECT_STRUCTURE.md       # 本文件
```

## 核心包说明

### packages/types

共享的 TypeScript 类型定义，被所有其他包引用。

**主要类型：**

- User, Project, ProjectMember
- ErrorRecord, ErrorContext
- SessionRecord, ReplayEvent
- PerformanceMetrics, WebVitals
- SourceMapRecord

### packages/sdk-core

核心 SDK 实现，提供跨平台的监控能力。

**核心模块：**

- `error/ErrorTracker.ts` - 错误捕获和上报
- `performance/MetricsCollector.ts` - 性能数据收集
- `replay/SessionRecorder.ts` - Session 录制（基于 rrweb）
- `transport/DataUploader.ts` - 数据上传

### packages/sdk-react

React 专用 SDK，提供组件和 Hooks。

**主要导出：**

- `initMonitor()` - 初始化函数
- `ErrorBoundary` - 错误边界组件
- `useMonitor()` - 监控实例 Hook
- `useErrorHandler()` - 错误处理 Hook

### packages/sdk-vue

Vue 3 专用 SDK，提供插件和组合式 API。

**主要导出：**

- `MonitorPlugin` - Vue 插件
- `useMonitor()` - 组合式 API

### packages/sdk-react-native

React Native 专用 SDK（简化版，不含 Session Replay）。

**主要导出：**

- `initMonitor()` - 初始化函数
- `ErrorBoundary` - 错误边界组件
- `useMonitor()` - 监控实例 Hook

### packages/server

Hono 后端服务，处理数据接收和管理。

**路由结构：**

```
/auth/*                        # 认证相关
  POST /auth/register          # 用户注册
  POST /auth/login             # 用户登录
  POST /auth/refresh           # 刷新 token
  POST /auth/logout            # 登出

/api/projects                  # 项目管理（需认证）
  GET /api/projects            # 获取项目列表
  POST /api/projects           # 创建项目
  GET /api/projects/:id        # 获取项目详情
  PUT /api/projects/:id        # 更新项目
  DELETE /api/projects/:id     # 删除项目
  POST /api/projects/:id/regenerate-key  # 重新生成 API Key

/api/report/*                  # 数据上报（API Key 认证）
  POST /api/report/errors      # 上报错误
  POST /api/report/session     # 上报 Session 录制
  POST /api/report/performance # 上报性能数据

/api/sourcemap/*               # SourceMap 管理
  POST /api/sourcemap/upload   # 上传 SourceMap（API Key）
  GET /api/sourcemap/:projectId  # 获取列表（JWT）
  POST /api/sourcemap/resolve/:errorId  # 解析堆栈（JWT）
  DELETE /api/sourcemap/:id    # 删除（JWT）
```

**数据库表：**

- users - 用户表
- projects - 项目表
- project_members - 项目成员关系表
- errors - 错误记录表
- sessions - Session 录制表
- performance_metrics - 性能数据表
- sourcemaps - SourceMap 表
- refresh_tokens - Refresh Token 表

### packages/dashboard

React + Vite 管理控制台。

**页面结构：**

- `/login` - 登录/注册页面
- `/` - 项目列表
- `/projects/:id` - 项目详情（待扩展）
  - 错误监控
  - Session Replay
  - 性能监控
  - SourceMap 管理

**技术栈：**

- React 18
- React Router v6
- TanStack Query
- shadcn/ui
- TailwindCSS
- Recharts（图表）
- rrweb-player（回放）

### packages/cli

命令行工具，用于 SourceMap 上传。

**命令：**

```bash
monitor-cli upload-sourcemap \
  --api-key <key> \
  --url <server-url> \
  --version <version> \
  --dir <directory> \
  --pattern "**/*.map"
```

## 数据流

### 错误上报流程

```
应用发生错误
    ↓
SDK 捕获错误（ErrorTracker）
    ↓
收集上下文信息（用户、设备、页面）
    ↓
应用 beforeSend 钩子
    ↓
加入上报队列
    ↓
批量上报到服务器（DataUploader）
    ↓
服务器接收（/api/report/errors）
    ↓
生成错误指纹
    ↓
检查去重（相同指纹则增加计数）
    ↓
存入数据库（errors 表）
    ↓
管理控制台展示
    ↓
（可选）SourceMap 解析堆栈
```

### Session Replay 流程

```
SDK 初始化
    ↓
启动 rrweb 录制（SessionRecorder）
    ↓
捕获 DOM 变化和用户交互
    ↓
事件达到阈值或定时触发
    ↓
批量上报到服务器
    ↓
服务器接收（/api/report/session）
    ↓
合并或创建 session 记录
    ↓
存入数据库（sessions 表）
    ↓
管理控制台播放（rrweb-player）
```

### 性能监控流程

```
页面加载
    ↓
SDK 初始化（MetricsCollector）
    ↓
收集 Web Vitals（LCP、FID、CLS...）
    ↓
收集资源性能（Resources）
    ↓
监听长任务（Long Tasks）
    ↓
收集内存信息（Memory）
    ↓
页面加载完成后上报
    ↓
服务器接收（/api/report/performance）
    ↓
存入数据库（performance_metrics 表）
    ↓
应用规则引擎生成优化建议
    ↓
管理控制台展示图表和建议
```

## 开发流程

### 1. 本地开发

```bash
# 安装依赖
pnpm install

# 启动数据库
docker-compose -f docker/docker-compose.yml up -d postgres

# 数据库迁移
pnpm --filter @monitor/server db:generate
pnpm --filter @monitor/server db:migrate

# 启动所有服务（自动启动 server 和 dashboard）
pnpm dev

# 或分别启动
pnpm --filter @monitor/server dev      # 后端（8080）
pnpm --filter @monitor/dashboard dev   # 前端（8888）
pnpm --filter monitor-react-demo dev   # 示例（5174）
```

### 2. 构建

```bash
# 构建所有包
pnpm build

# 构建特定包
pnpm --filter @monitor/sdk-core build
pnpm --filter @monitor/server build
pnpm --filter @monitor/dashboard build
```

### 3. Docker 部署

```bash
# 构建并启动所有服务
docker-compose -f docker/docker-compose.yml up --build -d

# 查看日志
docker-compose -f docker/docker-compose.yml logs -f

# 停止服务
docker-compose -f docker/docker-compose.yml down
```

## 扩展功能

### 已实现

- ✅ 错误监控和堆栈解析
- ✅ Session Replay（用户行为录制）
- ✅ 性能监控和优化建议
- ✅ SourceMap 上传和解析
- ✅ 多用户、多项目管理
- ✅ RBAC 权限控制
- ✅ React/Vue/React-Native SDK

### 待扩展（可选）

- [ ] Webhook 告警通知
- [ ] 邮件/飞书/钉钉集成
- [ ] 错误状态管理（待处理/已解决/忽略）
- [ ] API 请求拦截和上报
- [ ] 用户行为路径分析（Breadcrumbs）
- [ ] 错误趋势图表
- [ ] 性能对比分析
- [ ] 自定义仪表盘
- [ ] 团队协作功能

## 技术选型理由

| 技术        | 理由                        |
| ----------- | --------------------------- |
| pnpm        | 节省磁盘空间，Monorepo 友好 |
| Turborepo   | 增量构建，缓存优化          |
| rrweb       | Session Replay 成熟方案     |
| Hono        | 轻量高性能的 Node.js 框架   |
| Drizzle ORM | 轻量、类型安全、性能优秀    |
| shadcn/ui   | 基于 Radix，可定制性强      |
| TailwindCSS | 快速开发，样式一致性好      |

## 性能考虑

### SDK 性能优化

1. **批量上报**：错误/性能数据批量上报，减少请求次数
2. **空闲时上报**：使用 `requestIdleCallback` 在浏览器空闲时上报
3. **采样率控制**：Session Replay 支持采样率配置
4. **懒加载**：按需加载 rrweb 等大型依赖

### 服务端性能优化

1. **数据库索引**：project_id + created_at 联合索引
2. **错误去重**：基于指纹去重，减少存储
3. **连接池**：PostgreSQL 连接池复用
4. **批量插入**：支持批量上报接口

### 前端性能优化

1. **代码分割**：React Router 路由懒加载
2. **虚拟列表**：大数据量列表使用虚拟滚动
3. **缓存策略**：TanStack Query 自动缓存
4. **图片优化**：WebP 格式，懒加载

## 安全考虑

1. **认证机制**：JWT + Refresh Token
2. **权限控制**：RBAC 角色权限
3. **SourceMap 保护**：仅项目成员可访问
4. **API Key 管理**：可随时重新生成
5. **数据隔离**：多项目数据严格隔离
6. **输入验证**：使用 Zod 进行参数验证
7. **CORS 配置**：严格的跨域配置

## 维护和监控

### 日志

- 所有错误输出到控制台
- 生产环境建议接入日志服务（如 Loki）

### 监控

- 健康检查端点：`GET /health`
- 数据库连接监控
- API 响应时间监控

### 备份

- 定期备份 PostgreSQL 数据库
- SourceMap 文件备份
- 配置文件版本控制

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交代码
4. 推送到分支
5. 创建 Pull Request

代码规范：

- 使用 ESLint + Prettier
- 提交信息遵循 Conventional Commits
- 添加必要的注释和文档
