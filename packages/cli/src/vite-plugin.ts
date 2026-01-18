/**
 * Vite 插件：自动上传 SourceMap
 */
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';

// 使用兼容的 Plugin 类型定义，避免直接依赖 vite
interface VitePlugin {
  name: string;
  configResolved?: (config: any) => void | Promise<void>;
  closeBundle?: () => void | Promise<void>;
  [key: string]: any;
}

export interface SourceMapUploadOptions {
  /** API Key */
  apiKey: string;
  /** 服务器地址 */
  serverUrl: string;
  /** 版本号（默认从 package.json 读取） */
  version?: string;
  /** 是否上传后删除 SourceMap 文件 */
  deleteAfterUpload?: boolean;
  /** 是否只在生产环境上传 */
  productionOnly?: boolean;
  /** SourceMap 文件匹配模式 */
  pattern?: string;
}

/**
 * Monitor SourceMap 上传插件
 * @param options - 配置选项
 * @returns Vite 插件
 */
export function monitorSourceMapPlugin(options: SourceMapUploadOptions): VitePlugin {
  let outDir = 'dist';
  let version: string;

  return {
    name: 'monitor-sourcemap-upload',

    configResolved(config) {
      outDir = config.build.outDir;

      // 如果是开发环境且设置了 productionOnly，跳过
      if (options.productionOnly && config.mode !== 'production') {
        console.log('🔵 Monitor: 开发环境跳过 SourceMap 上传');
        return;
      }
    },

    async closeBundle() {
      // 跳过开发环境
      if (options.productionOnly && process.env.NODE_ENV !== 'production') {
        return;
      }

      try {
        console.log('🚀 Monitor: 开始上传 SourceMap...');

        // 获取版本号
        version = options.version || '';
        if (!version) {
          try {
            const packageJson = JSON.parse(
              await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8')
            );
            version = packageJson.version;
            console.log(`📦 Monitor: 从 package.json 读取版本号: ${version}`);
          } catch (error) {
            console.error('❌ Monitor: 无法读取版本号');
            return;
          }
        }

        // 查找 SourceMap 文件
        const pattern = options.pattern || '**/*.js.map';
        const files = await glob(pattern, {
          cwd: outDir,
          absolute: true,
          nodir: true,
        });

        if (files.length === 0) {
          console.log('⚠️  Monitor: 未找到 SourceMap 文件');
          return;
        }

        console.log(`📁 Monitor: 找到 ${files.length} 个 SourceMap 文件`);

        let successCount = 0;
        let failCount = 0;
        const filesToDelete: string[] = [];

        // 上传每个文件
        for (const file of files) {
          const fileName = path.relative(outDir, file).replace(/\\/g, '/');
          const jsFileName = fileName.replace(/\.map$/, '');

          try {
            const content = await fs.readFile(file, 'utf-8');

            const response = await fetch(`${options.serverUrl}/api/sourcemap/upload`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': options.apiKey,
              },
              body: JSON.stringify({
                version: version,
                filePath: jsFileName,
                mapData: content,
              }),
            });

            if (response.ok) {
              const result = await response.json();
              console.log(`✅ Monitor: ${fileName} ${result.updated ? '(更新)' : '(新增)'}`);
              successCount++;

              if (options.deleteAfterUpload) {
                filesToDelete.push(file);
              }
            } else {
              const error = await response.json().catch(() => ({ error: '上传失败' }));
              console.error(`❌ Monitor: ${fileName} - ${error.error}`);
              failCount++;
            }
          } catch (error: any) {
            console.error(`❌ Monitor: ${fileName} - ${error.message}`);
            failCount++;
          }
        }

        // 删除已上传的文件
        if (options.deleteAfterUpload && filesToDelete.length > 0) {
          console.log(`\n🗑️  Monitor: 删除已上传的 SourceMap...`);
          for (const file of filesToDelete) {
            try {
              await fs.unlink(file);
              console.log(`✅ Monitor: 已删除 ${path.relative(outDir, file)}`);
            } catch (error: any) {
              console.error(`❌ Monitor: 删除失败 ${path.relative(outDir, file)}`);
            }
          }
        }

        console.log(`\n📊 Monitor: 上传完成 - 成功 ${successCount}, 失败 ${failCount}`);
      } catch (error: any) {
        console.error(`❌ Monitor: 上传失败 - ${error.message}`);
      }
    },
  };
}
