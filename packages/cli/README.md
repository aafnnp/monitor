# @monitor/cli

前端监控系统的命令行工具，用于上传 SourceMap 文件。

## 安装

```bash
pnpm add -D @monitor/cli
```

## 使用方法

### 命令行工具

```bash
# 上传 SourceMap（自动从 package.json 读取版本号）
monitor-cli upload-sourcemap \
  --api-key your-api-key \
  --url http://localhost:8080 \
  --dir ./dist

# 手动指定版本号
monitor-cli upload-sourcemap \
  --api-key your-api-key \
  --url http://localhost:8080 \
  --version 1.0.0 \
  --dir ./dist

# 上传后删除本地 SourceMap（生产环境推荐）
monitor-cli upload-sourcemap \
  --api-key your-api-key \
  --url http://localhost:8080 \
  --dir ./dist \
  --delete

# 自定义文件匹配模式
monitor-cli upload-sourcemap \
  --api-key your-api-key \
  --url http://localhost:8080 \
  --dir ./dist \
  --pattern "**/*.js.map"

# 查看帮助
monitor-cli upload-sourcemap --help
```

### Vite 插件

在 `vite.config.ts` 中使用插件自动上传 SourceMap：

```typescript
import { defineConfig } from 'vite';
import { monitorSourceMapPlugin } from '@monitor/cli/vite-plugin';

export default defineConfig({
  plugins: [
    monitorSourceMapPlugin({
      // API Key（必需）
      apiKey: process.env.MONITOR_API_KEY || 'your-api-key',
      
      // 服务器地址（必需）
      serverUrl: 'http://localhost:8080',
      
      // 版本号（可选，默认从 package.json 读取）
      version: '1.0.0',
      
      // 上传后删除 SourceMap（可选，默认 false）
      deleteAfterUpload: true,
      
      // 只在生产环境上传（可选，默认 false）
      productionOnly: true,
      
      // 文件匹配模式（可选，默认 **/*.js.map）
      pattern: '**/*.js.map',
    }),
  ],
  build: {
    // 必须开启 sourcemap
    sourcemap: true,
  },
});
```

### 在 package.json 中配置脚本

```json
{
  "scripts": {
    "build": "vite build",
    "upload-sourcemap": "monitor-cli upload-sourcemap -k $MONITOR_API_KEY -u $MONITOR_URL -d dist --delete"
  }
}
```

### 在 CI/CD 中使用

#### GitHub Actions

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm build
        env:
          GENERATE_SOURCEMAP: true

      - name: Upload SourceMap
        run: |
          pnpm --filter @monitor/cli build
          monitor-cli upload-sourcemap \
            --api-key ${{ secrets.MONITOR_API_KEY }} \
            --url https://monitor.example.com \
            --dir ./dist \
            --delete

      - name: Deploy
        run: pnpm deploy
```

## 工作原理

### 智能文件匹配

CLI 工具会智能匹配文件名，自动处理：

- 去除文件名中的 hash（如 `chunk-abc123.js` → `chunk.js`）
- 去除 URL query 参数
- 支持模糊匹配

这样即使是开发环境生成的带 hash 的文件（如 Vite 的 `chunk-BISVECJP.js`），也能正确匹配到上传的 SourceMap。

### 版本管理

- **自动版本号**：默认从项目根目录的 `package.json` 读取 `version` 字段
- **手动指定**：使用 `--version` 参数或插件的 `version` 选项
- **版本匹配**：错误上报时会自动携带版本号，服务端优先使用对应版本的 SourceMap 进行解析

### 安全性

- 建议使用环境变量存储 API Key
- 生产环境使用 `--delete` 删除已上传的 SourceMap，避免暴露源码
- 不要将 SourceMap 部署到公网可访问的位置

## 参数说明

### 必需参数

- `-k, --api-key <key>`: 项目的 API Key
- `-u, --url <url>`: 监控服务器地址
- `-d, --dir <directory>`: SourceMap 文件所在目录

### 可选参数

- `-v, --version <version>`: 版本号（默认从 package.json 读取）
- `-p, --pattern <pattern>`: 文件匹配模式（默认 `**/*.js.map`）
- `--delete`: 上传后删除本地 SourceMap 文件
- `--include-sources`: 同时上传对应的 JS 文件（实验性功能）

## 示例

### 基础使用

```bash
# 最简单的使用方式
monitor-cli upload-sourcemap \
  -k your-api-key \
  -u http://localhost:8080 \
  -d dist
```

### 生产环境

```bash
# 生产环境推荐配置：指定版本号并删除 SourceMap
monitor-cli upload-sourcemap \
  -k $MONITOR_API_KEY \
  -u https://monitor.example.com \
  -v 1.2.3 \
  -d dist \
  --delete
```

### 使用环境变量

```bash
# 创建 .env 文件
cat > .env << EOF
MONITOR_API_KEY=your-api-key
MONITOR_URL=http://localhost:8080
EOF

# 在 package.json 中配置
# "upload-sourcemap": "monitor-cli upload-sourcemap -k $MONITOR_API_KEY -u $MONITOR_URL -d dist"

# 运行
pnpm upload-sourcemap
```

## 故障排查

### 上传失败

1. 检查 API Key 是否正确
2. 检查服务器地址是否可访问
3. 检查网络连接
4. 查看详细错误信息

### 匹配失败

1. 确认 SourceMap 文件路径正确
2. 检查版本号是否一致
3. 查看服务端日志
4. 确认文件名匹配规则

### 权限错误

1. 确认 API Key 有效
2. 检查 API Key 是否有上传权限
3. 联系项目管理员

## License

MIT
