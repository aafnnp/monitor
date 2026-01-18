# 开发环境 SourceMap 配置指南

本文档说明如何在开发环境测试 SourceMap 功能。

## 问题说明

开发环境下存在以下情况：

1. **浏览器已有 SourceMap**：Vite 开发服务器会自动生成 inline SourceMap，浏览器控制台可以直接显示源码位置
2. **错误堆栈行号不准确**：JavaScript 的 `Error.stack` 捕获的行号是编译后的代码行号，即使浏览器有 SourceMap 也不会修改这个字符串
3. **监控系统需要 SourceMap**：我们的服务端需要 SourceMap 来反向映射错误位置

## 推荐做法

### 开发环境

**优先使用浏览器控制台**：
- 浏览器已经正确映射了源码位置
- 可以直接看到完整的源代码
- 交互式调试功能

**监控系统的作用**：
- 收集错误统计和趋势
- 记录用户行为追踪（Breadcrumbs）
- 查看完整的上下文信息（设备、用户等）

### 生产环境

**必须上传 SourceMap**：

```bash
# 方法 1：使用 Vite 插件（推荐）
# vite.config.ts
import { monitorSourceMapPlugin } from '@monitor/cli/vite-plugin';

export default defineConfig({
  plugins: [
    monitorSourceMapPlugin({
      apiKey: process.env.MONITOR_API_KEY!,
      serverUrl: 'https://monitor.example.com',
      deleteAfterUpload: true,  // 避免源码泄露
      productionOnly: true,
    }),
  ],
  build: {
    sourcemap: true,
  },
});

# 方法 2：使用 CLI 工具
pnpm build
monitor-cli upload-sourcemap \
  --api-key $MONITOR_API_KEY \
  --url https://monitor.example.com \
  --dir ./dist \
  --delete
```

## 测试 SourceMap 功能

如果你想在开发环境测试 SourceMap 解析功能：

### 方案 1：构建生产版本并上传 SourceMap

```bash
# 1. 构建生产版本
cd examples/react-demo
pnpm build

# 2. 上传 SourceMap
node ../../packages/cli/dist/index.js upload-sourcemap \
  -k mk_BZgm_0Y_YshCOVsVDV8OaT6Bd0J1-jIi \
  -u http://localhost:8080 \
  -v 1.0.0 \
  -d dist

# 3. 本地预览生产版本
pnpm preview

# 4. 触发错误并在控制台查看
```

### 方案 2：使用 nginx 或其他服务器部署生产构建

```bash
# 部署 dist 目录到生产环境
# 确保版本号与上传的 SourceMap 一致
```

## 界面改进说明

现在监控系统的错误详情页面包含：

### 1. 环境标识
- 显示 `development` 或 `production` 标签
- 区分不同环境的错误

### 2. 开发环境提示
当检测到开发环境错误时，会显示提示信息：
```
💡 提示：
开发环境下，建议直接查看浏览器控制台获取最准确的错误信息和源码位置。
生产环境需要上传 SourceMap 才能精确定位源码位置。
```

### 3. SourceMap 状态
- 显示 "SourceMap 可用" 或 "SourceMap 不可用"
- 显示成功解析的堆栈帧数量
- 帮助诊断为什么某些错误无法解析

### 4. 堆栈帧状态
每个堆栈帧显示：
- 函数名、文件名、行号、列号
- "已解析" 标签（如果通过 SourceMap 成功解析）
- 源码片段（如果可用）

### 5. 版本信息
显示错误发生时的应用版本号，方便匹配对应的 SourceMap

## 最佳实践

### SDK 初始化
```typescript
initMonitor({
  apiKey: 'your-api-key',
  serverUrl: 'http://localhost:8080',
  version: '1.0.0',  // 重要：必须与构建版本一致
  environment: process.env.NODE_ENV,  // development 或 production
  enableError: true,
});
```

### 构建配置
```typescript
// vite.config.ts
export default defineConfig({
  // 必须开启 sourcemap
  build: {
    sourcemap: true,
  },
  
  // 定义环境变量
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
});
```

### CI/CD 自动化
```yaml
# .github/workflows/deploy.yml
- name: Build
  run: pnpm build
  env:
    VITE_APP_VERSION: ${{ github.ref_name }}

- name: Upload SourceMap
  run: |
    monitor-cli upload-sourcemap \
      --api-key ${{ secrets.MONITOR_API_KEY }} \
      --url https://monitor.example.com \
      --version ${{ github.ref_name }} \
      --dir ./dist \
      --delete

- name: Deploy
  run: pnpm deploy
```

## 故障排查

### 问题：开发环境显示行号不对

**原因**：开发环境错误堆栈的行号是编译后的，需要 SourceMap 映射。

**解决**：
1. 优先查看浏览器控制台（已正确映射）
2. 或者构建生产版本并上传 SourceMap 进行测试

### 问题：生产环境无法显示源码

**原因**：没有上传 SourceMap 或版本号不匹配。

**解决**：
1. 检查是否上传了 SourceMap
2. 确认版本号一致（SDK 初始化的 `version` 和上传时的 `--version`）
3. 查看控制台的 SourceMap 状态信息

### 问题：部分堆栈帧无法解析

**原因**：某些文件没有对应的 SourceMap。

**解决**：
1. 检查构建配置是否为所有文件生成了 SourceMap
2. 确认上传时包含了所有 `.map` 文件
3. 查看 "已解析 X/Y 个堆栈帧" 的统计信息

## 示例

### 完整的开发流程

```bash
# 1. 安装依赖
pnpm install

# 2. 启动开发服务器
pnpm --filter monitor-react-demo dev

# 3. 触发错误查看效果
# 在浏览器中点击 "触发全局错误" 按钮

# 4. 查看错误
# - 浏览器控制台：看到准确的源码位置
# - 监控控制台：看到错误统计和上下文信息
```

### 完整的生产流程

```bash
# 1. 构建生产版本
pnpm --filter monitor-react-demo build

# 2. 上传 SourceMap
node packages/cli/dist/index.js upload-sourcemap \
  -k your-api-key \
  -u https://monitor.example.com \
  -d examples/react-demo/dist \
  --delete

# 3. 部署到生产环境
pnpm deploy

# 4. 在监控控制台查看生产错误
# 现在可以看到准确的源码位置和代码片段
```

## 总结

- **开发环境**：浏览器控制台最准确，监控系统用于收集统计和上下文
- **生产环境**：监控系统 + SourceMap 可以精确定位线上问题
- **版本一致性**：确保 SDK 版本号和 SourceMap 版本号一致
- **安全性**：生产环境使用 `--delete` 删除已上传的 SourceMap
