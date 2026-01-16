# 前端监控系统

一个全栈前端监控系统，支持 React、Vue、React Native 等多种技术栈。

## 功能特性

- ✅ 错误监控和堆栈解析
- ✅ Session Replay（用户行为回放）
- ✅ 性能监控和优化建议
- ✅ SourceMap 上传和解析
- ✅ 多用户、多项目管理

## 技术栈

- **前端 SDK**: TypeScript
- **管理后台**: React + Vite + shadcn/ui + TailwindCSS
- **后端服务**: Hono + Node.js
- **数据库**: PostgreSQL + Drizzle ORM
- **构建工具**: Turborepo + pnpm

## 项目结构

```
monitor/
├── packages/
│   ├── types/                 # 共享类型定义
│   ├── sdk-core/              # 核心 SDK
│   ├── sdk-react/             # React SDK
│   ├── sdk-vue/               # Vue SDK
│   ├── sdk-react-native/      # React Native SDK
│   ├── server/                # Hono 后端
│   └── dashboard/             # 管理控制台
├── docker/                    # Docker 配置
└── pnpm-workspace.yaml
```

## 快速开始

详细使用指南请查看 [USAGE.md](./USAGE.md)

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动数据库
docker-compose -f docker/docker-compose.yml up -d postgres

# 生成并运行数据库迁移
pnpm --filter @monitor/server db:generate
pnpm --filter @monitor/server db:migrate

# 构建 SDK 包
pnpm -r --filter "./packages/*" build

# 启动所有服务
pnpm dev
```

### Docker 部署

```bash
docker-compose -f docker/docker-compose.yml up --build -d
```

访问 http://localhost:3000 查看管理控制台。

## SDK 使用示例

### React

```typescript
import { initMonitor, ErrorBoundary } from '@monitor/sdk-react';

initMonitor({
  apiKey: 'your-api-key',
  serverUrl: 'http://localhost:8080',
  enableError: true,
  enablePerformance: true,
  enableReplay: true,
});

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}
```

### Vue

```typescript
import { MonitorPlugin } from '@monitor/sdk-vue';

app.use(MonitorPlugin, {
  apiKey: 'your-api-key',
  serverUrl: 'http://localhost:8080',
});
```

## 文档

- [使用指南](./USAGE.md) - 详细的安装和使用说明
- [示例项目](./examples/react-demo) - React 集成示例

## License

MIT
