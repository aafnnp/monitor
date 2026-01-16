# 错误监控优化指南

## 问题背景

原有的错误监控存在以下问题，导致开发者难以排查：

1. **堆栈信息不清晰**：显示的是编译后的代码，包含大量框架内部代码
2. **缺少上下文**：不知道用户做了什么操作导致错误
3. **缺少源码片段**：无法直观看到出错的代码位置
4. **错误重复显示**：相同错误每次都创建新记录

## 解决方案

### 1. 增强的错误上下文收集

SDK 现在会自动收集以下信息：

#### 用户行为追踪（Breadcrumbs）

- **用户交互**：点击事件、表单提交等
- **页面导航**：路由跳转、浏览器前进后退
- **HTTP 请求**：XHR 和 Fetch 请求及响应状态
- **控制台输出**：console.log/warn/error 等

#### 增强的设备信息

- 用户语言和时区
- 屏幕分辨率
- 浏览器平台信息

#### 错误时间追踪

- **首次发生时间**：该错误第一次出现的时间
- **最后发生时间**：该错误最近一次出现的时间
- **发生次数**：统计相同错误的发生次数

### 2. SourceMap 映射和堆栈过滤

#### 自动过滤框架代码

系统会自动识别并过滤以下代码：

- node_modules 中的第三方库
- webpack/vite 等构建工具的内部代码
- React、Vue 等框架的内部实现

#### SourceMap 解析

- 将编译后的代码位置映射回原始源码
- 显示原始文件名和行号
- 提供出错位置的源码片段（包含上下文）

### 3. 智能错误分组

使用错误指纹（fingerprint）技术：

- 相同的错误会自动聚合到一起
- 只记录发生次数，不重复存储
- 保留最新的用户行为追踪

### 4. 友好的错误详情展示

Dashboard 提供：

- **概览信息**：错误消息、发生次数、时间范围
- **应用堆栈**：只显示业务代码的堆栈，带源码片段
- **用户行为**：时间线展示错误发生前的用户操作
- **环境信息**：设备、浏览器、时区等详细信息

## 使用示例

### SDK 无需额外配置

所有增强功能都是自动启用的：

```typescript
import MonitorSDK from '@monitor/sdk-core';

const monitor = new MonitorSDK({
  apiKey: 'your-api-key',
  serverUrl: 'http://localhost:8080',
  environment: 'production',
  version: '1.0.0',
});

monitor.init();
```

### 查看错误详情

1. 进入项目详情页面
2. 点击「错误监控」标签
3. 点击任意错误卡片查看详情

详情页包含：

- ✅ **只显示应用代码的堆栈**（已过滤框架代码）
- ✅ **出错位置的源代码片段**（带高亮）
- ✅ **用户操作时间线**（点击、导航、请求等）
- ✅ **完整的设备和环境信息**

## 技术架构

### 前端 SDK

```
ErrorTracker
├── 错误监听
│   ├── window.onerror
│   ├── unhandledrejection
│   └── 资源加载错误
├── Breadcrumbs 追踪
│   ├── 用户交互（click）
│   ├── 页面导航（pushState/popstate）
│   ├── HTTP 请求（XHR/Fetch）
│   └── 控制台输出（console.*）
└── 上下文收集
    ├── 用户信息
    ├── 设备信息
    └── 页面信息
```

### 后端服务

```
错误处理
├── 接收上报
│   └── 生成错误指纹
├── 错误分组
│   ├── 检查重复
│   └── 更新计数
├── SourceMap 解析
│   ├── 解析堆栈帧
│   ├── 映射源码位置
│   └── 提取代码片段
└── 堆栈过滤
    ├── 识别应用代码
    └── 过滤框架代码
```

## 数据库变更

### 新增字段

```sql
ALTER TABLE errors ADD COLUMN first_seen_at timestamp;
ALTER TABLE errors ADD COLUMN last_seen_at timestamp;
CREATE INDEX errors_project_last_seen_idx ON errors (project_id, last_seen_at);
```

### 运行迁移

```bash
cd packages/server
pnpm run db:migrate
```

## 最佳实践

### 1. 上传 SourceMap

在生产环境部署时，上传 SourceMap 文件：

```bash
# 使用 CLI 工具
pnpm --filter @monitor/cli build
node packages/cli/dist/index.js upload-sourcemap \
  --api-key YOUR_API_KEY \
  --server-url http://localhost:8080 \
  --version 1.0.0 \
  --files dist/**/*.map
```

### 2. 设置用户信息

在用户登录后设置用户信息，方便追踪：

```typescript
monitor.setUser({
  id: 'user-123',
  email: 'user@example.com',
  name: '张三',
});
```

### 3. 添加自定义标签

为错误添加业务标签，方便分类：

```typescript
const monitor = new MonitorSDK({
  apiKey: 'your-api-key',
  serverUrl: 'http://localhost:8080',
  tags: {
    module: 'checkout',
    feature: 'payment',
  },
});
```

### 4. 手动捕获错误

对于特定的业务逻辑错误，可以手动上报：

```typescript
try {
  // 业务逻辑
  processPayment();
} catch (error) {
  monitor.captureError(error, 'error', {
    orderId: '12345',
    amount: 100,
  });
}
```

## 对比效果

### 优化前

```
Uncaught Error: 这是一个手动触发的错误！
  at handleTestError (http://localhost:5173/src/main.tsx:71:11)
  at HTMLUnknownElement.callCallback2 (http://localhost:5173/node_modules/.vite/deps/chunk-BISVECJP.js?v=b6daa95c:3674:22)
  at Object.invokeGuardedCallbackDev (http://localhost:5173/node_modules/.vite/deps/chunk-BISVECJP.js?v=b6daa95c:3699:24)
```

❌ 问题：

- 包含大量 React/Vite 内部代码
- 无法看到出错的源代码
- 不知道用户做了什么操作

### 优化后

**错误堆栈（只显示应用代码）**

```
at handleTestError (src/main.tsx:71:11)

源代码片段：
66 | function App() {
67 |   const handleTestError = () => {
68 |     // 模拟一个错误
69 |     const data = null;
70 |     try {
71 |       throw new Error('这是一个手动触发的错误！');  ← 错误发生位置
72 |     } catch (error) {
73 |       console.error(error);
74 |     }
75 |   };
76 | }
```

**用户行为追踪**

```
18:30:45  [navigation] 导航到 /dashboard
18:30:50  [click] 点击 button.test-error-btn
18:30:51  [console] 测试错误捕获
18:30:51  [error] 这是一个手动触发的错误！
```

✅ 改进：

- 只显示业务代码的堆栈
- 显示出错位置的源代码（带高亮）
- 完整的用户操作时间线
- 详细的设备和环境信息

## 性能影响

所有监控功能都经过优化，对应用性能影响极小：

- **Breadcrumbs**：使用环形缓冲区，最多保留 30 条
- **堆栈解析**：仅在服务端进行，不影响客户端性能
- **批量上报**：错误达到 5 条或页面卸载时才上报

## 常见问题

### Q: SourceMap 会暴露源代码吗？

A: SourceMap 仅存储在服务端，不会公开。建议在自己的服务器上部署。

### Q: Breadcrumbs 会收集敏感信息吗？

A: 默认不会收集表单输入内容。可以通过 `beforeSend` 钩子过滤敏感数据。

### Q: 如何关闭某些 Breadcrumbs？

A: 目前所有 Breadcrumbs 都是自动收集的，后续版本会提供配置选项。

### Q: 错误分组不准确怎么办？

A: 可以在 `beforeSend` 钩子中自定义 `fingerprint` 字段。

## 总结

通过以上优化，错误监控现在能够：

✅ **快速定位问题**：只看应用代码，不被框架代码干扰  
✅ **理解错误场景**：完整的用户操作时间线  
✅ **查看源代码**：直接显示出错位置的代码片段  
✅ **减少噪音**：相同错误自动聚合，只看重要的

这大大提升了开发者排查问题的效率！
