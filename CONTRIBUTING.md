# 开发者贡献指南

感谢你对本项目的关注！我们欢迎所有形式的贡献，包括但不限于：

- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 改进文档
- 🔧 提交代码修复
- ✨ 开发新特性

## 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境搭建](#开发环境搭建)
- [项目结构](#项目结构)
- [开发工作流](#开发工作流)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [测试要求](#测试要求)
- [文档要求](#文档要求)

## 行为准则

### 我们的承诺

为了营造一个开放和友好的环境，我们承诺：

- 尊重不同的观点和经验
- 接受建设性的批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 不可接受的行为

- 使用性暗示的语言或图像
- 人身攻击或侮辱性评论
- 公开或私下的骚扰
- 未经许可发布他人的私人信息
- 其他不道德或不专业的行为

## 如何贡献

### 报告 Bug

在提交 Bug 报告前，请：

1. **检查现有 Issues**：确保问题尚未被报告
2. **确认可复现**：确保问题可以稳定复现
3. **收集信息**：记录复现步骤、环境信息、错误日志等

提交 Bug 时请包含：

```markdown
## Bug 描述

简要描述问题

## 复现步骤

1. 执行操作 A
2. 执行操作 B
3. 观察到的错误

## 期望行为

描述你期望的正确行为

## 实际行为

描述实际发生的行为

## 环境信息

- OS: [e.g. macOS 13.0]
- Node.js: [e.g. v18.17.0]
- pnpm: [e.g. 8.15.0]
- 浏览器: [e.g. Chrome 120]
- SDK 版本: [e.g. 1.0.0]

## 错误日志

粘贴相关的错误日志或截图
```

### 提出功能建议

提交功能请求时请包含：

- **功能描述**：清晰描述你希望添加的功能
- **使用场景**：说明为什么需要这个功能
- **实现思路**：如果有，可以简要描述实现方案
- **替代方案**：是否考虑过其他替代方案

## 开发环境搭建

### 前置要求

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **Docker**: >= 20.0.0（用于本地数据库）
- **PostgreSQL**: >= 14.0（或使用 Docker）

### 克隆仓库

```bash
# 克隆你 fork 的仓库
git clone https://github.com/YOUR_USERNAME/monitor.git
cd monitor

# 添加上游仓库
git remote add upstream https://github.com/ORIGINAL_OWNER/monitor.git
```

### 安装依赖

```bash
# 安装所有包的依赖
pnpm install
```

### 启动数据库

```bash
# 使用 Docker 启动 PostgreSQL
docker-compose -f docker/docker-compose.yml up -d postgres

# 等待数据库启动完成（约 5-10 秒）
```

### 数据库迁移

```bash
# 生成迁移文件（如果修改了 schema）
pnpm --filter @monitor/server db:generate

# 运行迁移
pnpm --filter @monitor/server db:migrate
```

### 启动开发服务

```bash
# 方式 1：同时启动所有服务（推荐）
pnpm dev

# 方式 2：分别启动各个服务
pnpm --filter @monitor/server dev      # 后端服务 (http://localhost:8080)
pnpm --filter @monitor/dashboard dev   # 管理控制台 (http://localhost:8888)
pnpm --filter monitor-react-demo dev   # 示例项目 (http://localhost:5174)
```

### 验证安装

访问以下地址验证服务是否正常：

- 后端 API: http://localhost:8080/health
- 管理控制台: http://localhost:8888
- 示例项目: http://localhost:5174

## 项目结构

```
monitor/
├── packages/
│   ├── types/                   # 共享 TypeScript 类型定义
│   ├── sdk-core/               # 核心 SDK（错误/性能/replay）
│   ├── sdk-react/              # React SDK 适配器
│   ├── sdk-vue/                # Vue SDK 适配器
│   ├── sdk-react-native/       # React Native SDK 适配器
│   ├── server/                 # Hono 后端服务
│   ├── dashboard/              # React 管理控制台
│   └── cli/                    # CLI 工具
├── docker/                     # Docker 配置
├── examples/                   # 示例项目
└── docs/                       # 文档
```

详细的架构说明请参考 [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)。

### 包依赖关系

```
sdk-react ──┐
sdk-vue ────┼──> sdk-core ──> types
sdk-rn ─────┘

server ──> types
dashboard ──> types
cli ──> types
```

## 开发工作流

### 创建分支

```bash
# 从最新的 main 分支创建特性分支
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name

# 或修复分支
git checkout -b fix/your-bug-fix
```

分支命名规范：

- `feature/*` - 新功能
- `fix/*` - Bug 修复
- `docs/*` - 文档更新
- `refactor/*` - 代码重构
- `perf/*` - 性能优化
- `test/*` - 测试相关
- `chore/*` - 构建/工具相关

### 开发流程

1. **修改代码**

   ```bash
   # 如果修改了 SDK 核心代码，需要重新构建
   pnpm --filter @monitor/sdk-core build

   # 如果修改了 types，需要重新构建所有依赖包
   pnpm --filter @monitor/types build
   pnpm build
   ```

2. **实时开发**

   ```bash
   # SDK 包支持 watch 模式
   pnpm --filter @monitor/sdk-core dev
   ```

3. **测试修改**

   在示例项目中测试你的修改：

   ```bash
   cd examples/react-demo
   pnpm dev
   ```

### 常用命令

```bash
# 构建所有包
pnpm build

# 构建特定包
pnpm --filter @monitor/sdk-core build

# 清理构建产物
pnpm clean

# 代码格式化
pnpm format

# 代码检查
pnpm lint

# 运行测试
pnpm test

# 添加依赖到特定包
pnpm --filter @monitor/sdk-core add lodash

# 添加开发依赖
pnpm --filter @monitor/server add -D @types/node
```

## 代码规范

### TypeScript 规范

1. **类型定义**

   ```typescript
   // ✅ 好的实践
   interface UserConfig {
     apiKey: string;
     serverUrl: string;
     enableError?: boolean;
   }

   // ❌ 避免使用 any
   function handleData(data: any) {}

   // ✅ 使用具体类型
   function handleData(data: ErrorRecord) {}
   ```

2. **命名规范**

   ```typescript
   // 类、接口、类型：PascalCase
   class MonitorSDK {}
   interface UserConfig {}
   type ErrorLevel = 'error' | 'warning';

   // 函数、变量：camelCase
   const apiKey = 'xxx';
   function sendData() {}

   // 常量：UPPER_SNAKE_CASE
   const MAX_RETRY_COUNT = 3;
   const API_BASE_URL = 'https://api.example.com';

   // 私有属性：_camelCase
   class Foo {
     private _privateData: string;
   }
   ```

3. **注释规范**

   ````typescript
   /**
    * 初始化监控 SDK
    * @param config - 配置选项
    * @returns SDK 实例
    * @throws {Error} 当配置无效时抛出错误
    * @example
    * ```typescript
    * const monitor = initMonitor({
    *   apiKey: 'your-api-key',
    *   serverUrl: 'http://localhost:8080'
    * });
    * ```
    */
   export function initMonitor(config: MonitorConfig): MonitorSDK {
     // 实现
   }
   ````

### 代码风格

- 使用 2 空格缩进
- 使用单引号（字符串）
- 总是使用分号
- 每行最多 100 字符
- 使用尾随逗号（多行对象/数组）

```typescript
// ✅ 好的实践
const config = {
  apiKey: 'xxx',
  serverUrl: 'http://localhost:8080',
  options: {
    enableError: true,
    enablePerformance: true,
  },
};

// ❌ 避免
const config = {
  apiKey: 'xxx',
  serverUrl: 'http://localhost:8080',
  options: {
    enableError: true,
    enablePerformance: true,
  },
};
```

### 设计原则

1. **保持简单**：避免过度设计，优先考虑简洁实用的方案
2. **代码复用**：注意圈复杂度，尽可能复用代码
3. **模块化**：使用设计模式，保持模块独立性
4. **最小修改**：改动时最小化影响范围，避免修改无关模块

### React 组件规范

```typescript
// ✅ 好的实践
interface ButtonProps {
  /**
   * 按钮文本
   */
  label: string;
  /**
   * 点击事件处理器
   */
  onClick?: () => void;
  /**
   * 是否禁用
   * @default false
   */
  disabled?: boolean;
}

/**
 * 通用按钮组件
 */
export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  disabled = false,
}) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
};
```

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 提交消息格式

```
<类型>(<范围>): <简短描述>

<详细描述>（可选）

<footer>（可选）
```

### 类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具/依赖更新

### 范围

- `sdk-core`: 核心 SDK
- `sdk-react`: React SDK
- `sdk-vue`: Vue SDK
- `sdk-rn`: React Native SDK
- `server`: 后端服务
- `dashboard`: 管理控制台
- `cli`: CLI 工具
- `types`: 类型定义
- `docs`: 文档
- `*`: 多个包

### 示例

```bash
# 新功能
feat(sdk-core): 添加自定义采样率配置

# Bug 修复
fix(server): 修复 SourceMap 解析错误

# 重大变更
feat(sdk-core)!: 重构错误上报 API

BREAKING CHANGE: 移除了 sendError 方法，请使用 captureError 替代

# 多个范围
feat(sdk-*): 统一 SDK 初始化接口

# 文档更新
docs: 更新快速开始指南

# 工具更新
chore(deps): 升级 TypeScript 到 5.3
```

## Pull Request 流程

### 创建 Pull Request

1. **确保代码质量**

   ```bash
   # 格式化代码
   pnpm format

   # 代码检查
   pnpm lint

   # 运行测试
   pnpm test

   # 构建检查
   pnpm build
   ```

2. **提交代码**

   ```bash
   git add .
   git commit -m "feat(sdk-core): 添加新特性"
   git push origin feature/your-feature-name
   ```

3. **创建 PR**

   在 GitHub 上创建 Pull Request，填写模板：

   ```markdown
   ## 变更类型

   - [ ] 新功能
   - [ ] Bug 修复
   - [ ] 文档更新
   - [ ] 代码重构
   - [ ] 性能优化
   - [ ] 其他

   ## 变更描述

   简要描述本次变更的内容

   ## 相关 Issue

   Closes #123

   ## 测试说明

   描述如何测试这些变更

   ## 截图（如适用）

   ## Checklist

   - [ ] 代码已格式化
   - [ ] 通过所有测试
   - [ ] 更新了相关文档
   - [ ] 添加了必要的注释
   - [ ] 没有引入新的警告
   ```

### PR 审核

维护者会审核你的 PR：

- ✅ 代码质量检查
- ✅ 测试覆盖率
- ✅ 文档完整性
- ✅ 性能影响评估

请及时响应审核意见，必要时进行修改。

### 合并后

PR 合并后：

1. 删除特性分支

   ```bash
   git branch -d feature/your-feature-name
   git push origin --delete feature/your-feature-name
   ```

2. 同步主分支

   ```bash
   git checkout main
   git pull upstream main
   ```

## 测试要求

### 单元测试

为核心功能编写单元测试：

```typescript
// sdk-core/src/__tests__/ErrorTracker.test.ts
describe('ErrorTracker', () => {
  it('应该正确捕获错误', () => {
    const tracker = new ErrorTracker(config);
    const error = new Error('测试错误');

    tracker.captureError(error);

    expect(tracker.getErrorCount()).toBe(1);
  });
});
```

### 集成测试

在示例项目中进行集成测试：

1. 启动示例项目
2. 触发各种场景（错误、性能等）
3. 在管理控制台验证数据是否正确上报

### 测试清单

提交前请确保：

- [ ] 核心功能有单元测试覆盖
- [ ] 所有测试通过
- [ ] 在至少一个示例项目中测试通过
- [ ] 没有引入新的 TypeScript 错误
- [ ] 没有引入新的 ESLint 警告

## 文档要求

### 代码注释

- 所有公开的 API 必须有 JSDoc 注释
- 复杂的逻辑需要添加解释性注释
- 注释使用中文

```typescript
/**
 * 错误追踪器
 * 负责捕获、处理和上报各类错误
 */
export class ErrorTracker {
  /**
   * 捕获并上报错误
   * @param error - 错误对象
   * @param context - 错误上下文信息
   */
  captureError(error: Error, context?: ErrorContext): void {
    // 实现逻辑
  }
}
```

### README 更新

如果你的变更影响到使用方式，请更新相应的 README：

- `/README.md` - 主 README
- `/packages/*/README.md` - 各包的 README
- `/USAGE.md` - 使用指南

### 示例代码

如果添加了新功能，请：

1. 在 `/examples/` 中添加示例
2. 在文档中添加使用示例
3. 确保示例代码可以运行

## 发布流程

> 注意：仅维护者有权限发布新版本

1. **更新版本号**

   ```bash
   # 更新所有包的版本号
   pnpm version patch  # 修复版本 1.0.0 -> 1.0.1
   pnpm version minor  # 次版本 1.0.0 -> 1.1.0
   pnpm version major  # 主版本 1.0.0 -> 2.0.0
   ```

2. **生成 Changelog**

   ```bash
   # 根据提交记录生成 CHANGELOG.md
   pnpm changelog
   ```

3. **构建和发布**

   ```bash
   # 构建所有包
   pnpm build

   # 发布到 npm
   pnpm -r publish --access public
   ```

4. **创建 Git Tag**

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

5. **发布 GitHub Release**

   在 GitHub 上创建 Release，附上 Changelog

## 常见问题

### 如何调试 SDK？

1. 在示例项目中引入本地 SDK：

   ```json
   // examples/react-demo/package.json
   {
     "dependencies": {
       "@monitor/sdk-react": "workspace:*"
     }
   }
   ```

2. 启用 SDK 的调试模式：

   ```typescript
   initMonitor({
     apiKey: 'xxx',
     debug: true, // 开启调试日志
   });
   ```

### 如何添加新的 SDK 适配器？

参考现有的 `sdk-react` 或 `sdk-vue`：

1. 在 `packages/` 下创建新目录
2. 创建 `package.json` 和 `tsconfig.json`
3. 实现适配器代码
4. 添加到 `pnpm-workspace.yaml`
5. 更新根目录的文档

### 数据库迁移失败怎么办？

```bash
# 重置数据库
docker-compose -f docker/docker-compose.yml down -v
docker-compose -f docker/docker-compose.yml up -d postgres

# 等待启动完成后重新迁移
pnpm --filter @monitor/server db:migrate
```

### 构建失败怎么办？

```bash
# 清理所有构建产物和依赖
pnpm clean
rm -rf node_modules
rm -rf packages/*/node_modules

# 重新安装依赖
pnpm install

# 重新构建
pnpm build
```

## 获取帮助

如果你在贡献过程中遇到问题：

1. **查看文档**：
   - [README.md](./README.md)
   - [USAGE.md](./USAGE.md)
   - [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)

2. **搜索 Issues**：
   - 查看是否有人遇到过类似问题

3. **提问**：
   - 在 Issues 中提问
   - 在 Discussions 中讨论

4. **联系维护者**：
   - 通过 GitHub Issue 联系

## 致谢

感谢所有为本项目做出贡献的开发者！

---

再次感谢你的贡献！🎉
