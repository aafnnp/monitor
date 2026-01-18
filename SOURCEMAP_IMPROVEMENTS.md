# SourceMap 功能改进总结

本文档总结了 SourceMap 功能的所有改进内容。

## 🎉 完成的功能

### 1. ✅ 生产环境 SourceMap 上传

#### CLI 工具
- 自动从 `package.json` 读取版本号
- 支持上传后删除本地文件（`--delete`）
- 智能文件匹配（去除 hash）
- 详细的上传进度和状态

```bash
monitor-cli upload-sourcemap \
  --api-key your-api-key \
  --url https://monitor.example.com \
  --dir ./dist \
  --delete
```

#### Vite 插件
- 构建完成后自动上传
- 支持环境判断（`productionOnly`）
- 自动版本管理
- 构建完成后自动删除

```typescript
import { monitorSourceMapPlugin } from '@monitor/cli/vite-plugin';

export default defineConfig({
  plugins: [
    monitorSourceMapPlugin({
      apiKey: process.env.MONITOR_API_KEY!,
      serverUrl: 'http://localhost:8080',
      deleteAfterUpload: true,
      productionOnly: true,
    }),
  ],
});
```

### 2. ✅ 智能文件名匹配

**问题**：开发和生产环境文件名不一致
- 开发：`src/main.tsx`
- 生产：`assets/index-abc123.js`

**解决方案**：
- 提取基础文件名（去除 hash 和 query 参数）
- 支持精确匹配和模糊匹配
- 优先匹配版本号对应的 SourceMap

```typescript
// 匹配算法
chunk-BISVECJP.js?v=abc123  →  chunk.js
index-abc123.js             →  index.js
```

### 3. ✅ 版本管理

**实现**：
- SDK 初始化时指定版本号
- 错误上报时自动携带版本号
- 服务端根据版本号精确匹配 SourceMap
- 未找到时使用最新版本兜底

```typescript
// SDK 配置
initMonitor({
  version: '1.0.0',  // 与 package.json 一致
  // ...
});

// 上传时匹配
monitor-cli upload-sourcemap --version 1.0.0 ...
```

### 4. ✅ 改进的 isInApp 判断

**优化前**：
- 使用简单的模式匹配
- `/chunk-/` 模式会误杀应用代码

**优化后**：
- 优先识别 `src/` 路径为应用代码
- 更精确的第三方库特征匹配
- 支持自定义规则

```typescript
function isInApp(fileName?: string): boolean {
  // 如果是源文件路径，直接认为是应用代码
  if (/\/src\//.test(fileName) || /^src\//.test(fileName)) {
    return true;
  }
  // ...
}
```

### 5. ✅ 前端界面优化

#### 环境标识
- 显示 `development`/`production` 标签
- 不同环境用不同颜色区分

#### 开发环境提示
```
💡 提示：
开发环境下，建议直接查看浏览器控制台获取最准确的错误信息和源码位置。
生产环境需要上传 SourceMap 才能精确定位源码位置。
```

#### SourceMap 状态
- "SourceMap 可用" / "SourceMap 不可用"
- 显示 "已解析 X/Y 个堆栈帧"
- 帮助用户诊断问题

#### 堆栈帧展示
- 函数名、文件名、行列号
- "已解析" 标签
- 源码片段（带行号和高亮）
- 未解析时显示原始堆栈

#### 版本信息
- 显示错误发生时的版本号
- 方便匹配对应的 SourceMap

### 6. ✅ 服务端改进

#### 错误详情接口
- 返回 SourceMap 状态信息
- 返回解析统计数据
- 即使没有 SourceMap 也返回有用信息

```json
{
  "sourceMapStatus": {
    "available": true,
    "version": "1.0.0",
    "matchedCount": 3,
    "totalFrames": 5
  }
}
```

#### 堆栈解析
- 智能匹配 SourceMap
- 提取源码片段（前后 5 行）
- 错误处理和降级
- 详细的日志输出

### 7. ✅ 完整文档

创建了三个详细文档：

1. **SOURCEMAP_GUIDE.md** - 完整功能指南
   - 快速开始
   - 工作原理
   - 常见场景
   - 最佳实践
   - 故障排查

2. **DEV_SOURCEMAP_SETUP.md** - 开发环境配置
   - 问题说明
   - 推荐做法
   - 测试方法
   - 故障排查

3. **packages/cli/README.md** - CLI 工具文档
   - 安装使用
   - 参数说明
   - 示例代码
   - CI/CD 集成

## 📊 对比

### 优化前
❌ 开发环境显示编译后的行号  
❌ 无法匹配带 hash 的文件名  
❌ 没有版本管理  
❌ 界面信息不清晰  
❌ 缺少使用文档  

### 优化后
✅ 智能识别文件名（去除 hash）  
✅ 完整的版本管理系统  
✅ 清晰的状态提示和诊断信息  
✅ 多种上传方式（CLI + Vite 插件）  
✅ 完整的文档和最佳实践  
✅ 开发/生产环境区分  

## 🚀 使用流程

### 开发环境

```bash
# 1. 启动开发服务器
pnpm dev

# 2. 触发错误
# 点击 "触发全局错误" 按钮

# 3. 查看错误
# - 浏览器控制台：准确的源码位置
# - 监控控制台：错误统计和上下文
```

### 生产环境

```bash
# 1. 配置 Vite 插件
# vite.config.ts 中添加 monitorSourceMapPlugin

# 2. 构建
pnpm build

# 3. 自动上传 SourceMap（如果配置了插件）
# 或手动上传：monitor-cli upload-sourcemap ...

# 4. 部署
pnpm deploy

# 5. 在监控控制台查看错误
# 现在可以看到准确的源码位置
```

## 🔧 技术实现

### 文件匹配算法
```typescript
extractBaseFileName()     // 提取基础文件名
matchSourceMap()         // 智能匹配 SourceMap
resolveStackFrame()      // 解析堆栈帧
getSourceSnippet()       // 提取源码片段
```

### 版本匹配流程
```
1. SDK 上报错误 + 版本号
   ↓
2. 服务端接收错误
   ↓
3. 根据版本号查询 SourceMap
   ↓
4. 使用智能算法匹配文件
   ↓
5. 解析堆栈获取源码
   ↓
6. 返回给前端显示
```

### 前端状态管理
```typescript
interface SourceMapStatus {
  available: boolean;      // SourceMap 是否可用
  version?: string;        // 错误的版本号
  matchedCount: number;    // 成功解析的数量
  totalFrames: number;     // 总堆栈帧数
}
```

## 📝 最佳实践

### 1. 版本管理
```json
// package.json
{
  "version": "1.2.3"
}
```

```typescript
// SDK 初始化
initMonitor({
  version: pkg.version,  // 与 package.json 保持一致
});
```

### 2. CI/CD 自动化
```yaml
# GitHub Actions
- name: Upload SourceMap
  run: |
    monitor-cli upload-sourcemap \
      --api-key ${{ secrets.MONITOR_API_KEY }} \
      --version ${{ github.ref_name }} \
      --dir ./dist \
      --delete
```

### 3. 安全性
```typescript
// 生产环境删除 SourceMap
monitorSourceMapPlugin({
  deleteAfterUpload: true,
  productionOnly: true,
});
```

### 4. 环境区分
```typescript
initMonitor({
  environment: process.env.NODE_ENV,
  version: process.env.VITE_APP_VERSION,
});
```

## 🎯 下一步改进

虽然当前功能已经完善，但还可以继续优化：

### 可选改进
1. **对象存储**：将 SourceMap 存储到 S3/OSS，减轻数据库压力
2. **压缩存储**：压缩 SourceMap 数据，节省存储空间
3. **批量删除**：支持批量删除旧版本的 SourceMap
4. **访问统计**：记录 SourceMap 的使用情况
5. **CDN 加速**：通过 CDN 加速 SourceMap 上传

### 高级功能
1. **Sentry 兼容**：支持 Sentry 的 SourceMap 格式
2. **Webpack 插件**：除了 Vite，也支持 Webpack
3. **Rollup 插件**：支持 Rollup 构建工具
4. **符号化服务**：独立的符号化服务，支持大规模并发

## 📚 相关文档

- [SOURCEMAP_GUIDE.md](./SOURCEMAP_GUIDE.md) - 完整功能指南
- [DEV_SOURCEMAP_SETUP.md](./DEV_SOURCEMAP_SETUP.md) - 开发环境配置
- [packages/cli/README.md](./packages/cli/README.md) - CLI 工具文档
- [USAGE.md](./USAGE.md) - 系统使用指南

## 🎊 总结

SourceMap 功能现在已经非常完善：

✅ **功能完整**：CLI、Vite 插件、智能匹配、版本管理  
✅ **用户友好**：清晰的状态提示、详细的诊断信息  
✅ **文档齐全**：使用指南、最佳实践、故障排查  
✅ **生产就绪**：安全性、性能优化、错误处理  

现在可以在生产环境精确定位错误，大大提高问题排查效率！🚀
