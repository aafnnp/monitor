# 前端监控系统使用指南

## 快速开始

### 1. 安装依赖

```bash
# 安装所有包的依赖
pnpm install

# 如果遇到 workspace 识别问题，可以尝试清理后重新安装
# pnpm store prune
# rm -rf node_modules packages/*/node_modules examples/*/node_modules
# pnpm install
```

### 2. 启动数据库

```bash
docker-compose -f docker/docker-compose.yml up -d postgres
```

### 3. 运行数据库迁移

```bash
# 生成迁移文件
pnpm --filter @monitor/server db:generate

# 执行迁移
pnpm --filter @monitor/server db:migrate
```

### 4. 构建 SDK 包

在运行示例之前，需要先构建 SDK 包：

```bash
# 构建所有 SDK 包
pnpm --filter @monitor/types build
pnpm --filter @monitor/sdk-core build
pnpm --filter @monitor/sdk-react build
pnpm --filter @monitor/sdk-vue build
pnpm --filter @monitor/sdk-react-native build

# 或者一次性构建所有包（推荐）
pnpm -r --filter "./packages/*" build
```

### 5. 启动服务

```bash
# 启动后端服务
pnpm --filter @monitor/server dev

# 启动管理控制台（新终端）
pnpm --filter @monitor/dashboard dev

# 启动示例应用（新终端，可选）
pnpm --filter monitor-react-demo dev
```

### 6. 访问应用

- 管理控制台: http://localhost:8888
- 后端 API: http://localhost:8080
- 示例应用: http://localhost:5173（注意：Vite 默认端口，如果 5173 被占用会自动切换）

## SDK 使用

### React 应用集成

```typescript
import { initMonitor, ErrorBoundary } from '@monitor/sdk-react';

// 初始化 SDK
initMonitor({
  apiKey: 'your-api-key', // 在管理控制台获取
  serverUrl: 'http://localhost:8080',
  enableError: true,
  enablePerformance: true,
  enableReplay: true,
  replaySampleRate: 0.1, // 10% 录制率
  environment: 'production',
  version: '1.0.0',
});

// 使用 ErrorBoundary 包裹组件
function App() {
  return (
    <ErrorBoundary fallback={<div>出错了</div>}>
      <YourApp />
    </ErrorBoundary>
  );
}
```

### Vue 应用集成

```typescript
import { createApp } from 'vue';
import { MonitorPlugin } from '@monitor/sdk-vue';
import App from './App.vue';

const app = createApp(App);

app.use(MonitorPlugin, {
  apiKey: 'your-api-key',
  serverUrl: 'http://localhost:8080',
  enableError: true,
  enablePerformance: true,
  enableReplay: true,
});

app.mount('#app');
```

### React Native 集成

```typescript
import { initMonitor, ErrorBoundary } from '@monitor/sdk-react-native';

initMonitor({
  apiKey: 'your-api-key',
  serverUrl: 'http://localhost:8080',
  enableError: true,
});

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}
```

## SourceMap 上传

构建生产版本后，上传 SourceMap 以便在控制台看到源代码位置：

```bash
# 构建应用（确保开启 sourcemap）
npm run build

# 上传 SourceMap
pnpm --filter @monitor/cli build
node packages/cli/dist/index.js upload-sourcemap \
  --api-key your-api-key \
  --url http://localhost:8080 \
  --version 1.0.0 \
  --dir dist
```

或在 package.json 中添加脚本：

```json
{
  "scripts": {
    "upload-sourcemap": "monitor-cli upload-sourcemap -k $API_KEY -u $SERVER_URL -v $VERSION -d dist"
  }
}
```

## Docker 部署

### 构建并启动所有服务

```bash
docker-compose -f docker/docker-compose.yml up --build
```

服务将在以下端口启动：

- 管理控制台: http://localhost:3000
- 后端 API: http://localhost:8080
- PostgreSQL: localhost:5432

### 环境变量配置

创建 `.env` 文件：

```env
DATABASE_URL=postgres://monitor:monitor123@postgres:5432/monitor
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
PORT=8080
NODE_ENV=production
```

## 功能说明

### 1. 错误监控

- 自动捕获未处理的错误和 Promise 拒绝
- 收集错误上下文（用户、设备、页面信息）
- 错误去重和聚合
- SourceMap 解析显示源代码

### 2. Session Replay

- 基于 rrweb 实现用户行为录制
- 支持采样率配置
- 敏感信息自动脱敏
- 仅在出错时录制（可选）

### 3. 性能监控

- Core Web Vitals（LCP、FID、CLS、TTFB、FCP）
- 资源加载性能分析
- 长任务检测
- 内存使用监控
- 基于规则的优化建议

### 4. 多项目管理

- 支持多用户、多项目
- RBAC 权限控制（Owner、Admin、Member、Viewer）
- 独立的 API Key 管理

## 开发注意事项

1. **采样率**: 生产环境建议设置 `replaySampleRate: 0.1` (10%)
2. **性能影响**: SDK 对性能影响极小，使用 requestIdleCallback 进行批量上报
3. **隐私保护**: 默认脱敏所有密码输入框，可通过 `monitor-block` class 阻止元素录制
4. **数据保留**: 建议配置定期清理 30 天前的数据

## 故障排查

### SDK 无法上报数据

1. 检查 API Key 是否正确
2. 检查 serverUrl 是否可访问
3. 打开浏览器控制台查看错误信息
4. 检查 CORS 配置

### SourceMap 解析失败

1. 确认已上传对应版本的 SourceMap
2. 检查文件路径是否匹配
3. 确认 SourceMap 文件格式正确

### 性能问题

1. 降低 Session Replay 采样率
2. 启用 `replayOnError: true` 仅在出错时录制
3. 增加上报批次间隔

## 技术栈

- **前端 SDK**: TypeScript + rrweb
- **管理后台**: React + Vite + shadcn/ui + TailwindCSS
- **后端服务**: Hono + Node.js
- **数据库**: PostgreSQL + Drizzle ORM
- **构建工具**: Turborepo + pnpm

## License

MIT
