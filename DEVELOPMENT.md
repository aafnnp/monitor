# 快速开发指南

本文档帮助开发者快速上手项目开发。更详细的信息请参考 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 5 分钟快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/YOUR_USERNAME/monitor.git
cd monitor

# 2. 安装依赖
pnpm install

# 3. 启动数据库
docker-compose -f docker/docker-compose.yml up -d postgres

# 4. 数据库迁移
pnpm --filter @monitor/server db:migrate

# 5. 启动开发服务
pnpm dev
```

访问 http://localhost:8888 查看管理控制台。

## 常见开发场景

### 场景 1：修改 SDK 核心功能

```bash
# 1. 修改 SDK 代码
vim packages/sdk-core/src/error/ErrorTracker.ts

# 2. 重新构建 SDK
pnpm --filter @monitor/sdk-core build

# 3. 在示例项目中测试
cd examples/react-demo
pnpm dev
```

### 场景 2：添加新的 React 组件

```bash
# 1. 修改 React SDK
vim packages/sdk-react/src/index.tsx

# 2. 重新构建
pnpm --filter @monitor/sdk-react build

# 3. 测试
cd examples/react-demo
pnpm dev
```

### 场景 3：修改后端 API

```bash
# 1. 修改后端代码
vim packages/server/src/routes/errors.ts

# 2. 重启服务（热重载自动生效）
# 服务会自动重启

# 3. 测试 API
curl http://localhost:8080/api/xxx
```

### 场景 4：修改管理控制台

```bash
# 1. 修改 Dashboard 代码
vim packages/dashboard/src/pages/ProjectDetail.tsx

# 2. 保存文件（热重载自动生效）
# Vite 会自动刷新页面
```

### 场景 5：修改共享类型

```bash
# 1. 修改类型定义
vim packages/types/src/index.ts

# 2. 重新构建所有依赖包
pnpm --filter @monitor/types build
pnpm build

# 3. 重启所有开发服务
pnpm dev
```

## 调试技巧

### 调试 SDK

1. **启用调试模式**

```typescript
// examples/react-demo/src/main.tsx
initMonitor({
  apiKey: 'xxx',
  serverUrl: 'http://localhost:8080',
  debug: true, // 开启调试日志
});
```

2. **查看浏览器控制台**

所有 SDK 的调试信息会输出到浏览器控制台。

### 调试后端

1. **查看服务日志**

```bash
# 终端会实时显示日志
pnpm --filter @monitor/server dev
```

2. **使用断点调试**

在 VSCode 中添加断点，使用调试配置启动服务。

### 调试数据库

```bash
# 连接到数据库
docker exec -it monitor-postgres psql -U monitor -d monitor

# 查看表数据
SELECT * FROM errors LIMIT 10;
SELECT * FROM sessions LIMIT 10;
SELECT * FROM performance_metrics LIMIT 10;
```

## 目录结构速查

```
packages/
├── sdk-core/          # SDK 核心实现
│   └── src/
│       ├── error/     # 错误追踪
│       ├── performance/ # 性能监控
│       ├── replay/    # Session 回放
│       └── transport/ # 数据上传
│
├── sdk-react/        # React 适配器
│   └── src/
│       └── index.tsx # 组件和 Hooks
│
├── server/           # 后端服务
│   └── src/
│       ├── routes/   # API 路由
│       ├── db/       # 数据库相关
│       └── services/ # 业务服务
│
└── dashboard/        # 管理控制台
    └── src/
        ├── pages/    # 页面组件
        ├── components/ # UI 组件
        └── lib/      # 工具函数
```

## 快速命令参考

```bash
# 开发
pnpm dev                           # 启动所有服务
pnpm --filter @monitor/server dev # 只启动后端
pnpm --filter @monitor/dashboard dev # 只启动前端

# 构建
pnpm build                         # 构建所有包
pnpm --filter @monitor/sdk-core build # 构建特定包

# 测试
pnpm test                          # 运行所有测试
pnpm --filter @monitor/sdk-core test # 测试特定包

# 代码质量
pnpm format                        # 格式化代码
pnpm lint                          # 代码检查

# 清理
pnpm clean                         # 清理构建产物
```

## 数据库操作

```bash
# 创建迁移
pnpm --filter @monitor/server db:generate

# 运行迁移
pnpm --filter @monitor/server db:migrate

# 查看数据库
pnpm --filter @monitor/server db:studio

# 重置数据库
docker-compose -f docker/docker-compose.yml down -v
docker-compose -f docker/docker-compose.yml up -d postgres
pnpm --filter @monitor/server db:migrate
```

## 常见问题

### Q: 端口被占用怎么办？

```bash
# 查看占用端口的进程
lsof -i :8080  # 后端
lsof -i :8888  # 前端
lsof -i :5432  # 数据库

# 杀掉进程
kill -9 <PID>
```

### Q: 依赖安装失败怎么办？

```bash
# 清理缓存重新安装
rm -rf node_modules
rm -rf packages/*/node_modules
rm pnpm-lock.yaml
pnpm install
```

### Q: 构建失败怎么办？

```bash
# 清理构建产物
pnpm clean

# 删除所有 node_modules
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +

# 重新安装和构建
pnpm install
pnpm build
```

### Q: TypeScript 类型错误怎么办？

```bash
# 重新构建 types 包
pnpm --filter @monitor/types build

# 重新构建所有包
pnpm build
```

### Q: 数据库连接失败怎么办？

```bash
# 检查数据库是否启动
docker ps | grep postgres

# 查看数据库日志
docker logs monitor-postgres

# 重启数据库
docker-compose -f docker/docker-compose.yml restart postgres
```

## 性能优化建议

### SDK 开发

- 使用批量上报减少请求次数
- 使用 `requestIdleCallback` 在空闲时上报
- 控制 Session Replay 的采样率
- 避免同步阻塞操作

### 后端开发

- 使用数据库索引优化查询
- 实现接口缓存
- 使用连接池管理数据库连接
- 批量插入优化性能

### 前端开发

- 使用路由懒加载
- 大列表使用虚拟滚动
- 合理使用 React.memo 避免重复渲染
- 图片使用懒加载

## Git 工作流

```bash
# 1. 创建功能分支
git checkout -b feature/your-feature

# 2. 开发和提交
git add .
git commit -m "feat(sdk-core): 添加新功能"

# 3. 保持与主分支同步
git fetch upstream
git rebase upstream/main

# 4. 推送到你的 fork
git push origin feature/your-feature

# 5. 创建 Pull Request
# 在 GitHub 上创建 PR
```

## 代码审查清单

提交 PR 前请检查：

- [ ] 代码已格式化 (`pnpm format`)
- [ ] 通过 ESLint 检查 (`pnpm lint`)
- [ ] 所有测试通过 (`pnpm test`)
- [ ] 构建成功 (`pnpm build`)
- [ ] 添加了中文注释
- [ ] 更新了相关文档
- [ ] 在示例项目中测试通过
- [ ] 提交信息符合规范

## 版本发布流程

> 仅维护者可操作

```bash
# 1. 更新版本号
pnpm version patch  # 1.0.0 -> 1.0.1
pnpm version minor  # 1.0.0 -> 1.1.0
pnpm version major  # 1.0.0 -> 2.0.0

# 2. 构建
pnpm build

# 3. 发布
pnpm -r publish --access public

# 4. 创建标签
git tag v1.0.0
git push origin v1.0.0

# 5. 创建 GitHub Release
# 在 GitHub 上创建 Release
```

## 有用的链接

- [完整贡献指南](./CONTRIBUTING.md)
- [使用文档](./USAGE.md)
- [项目架构](./PROJECT_STRUCTURE.md)
- [示例项目](./examples/react-demo)

## 获取帮助

- 查看 [Issues](https://github.com/YOUR_USERNAME/monitor/issues)
- 参与 [Discussions](https://github.com/YOUR_USERNAME/monitor/discussions)
- 阅读现有代码和文档

---

愉快开发！🚀
