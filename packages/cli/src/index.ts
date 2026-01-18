#!/usr/bin/env node
/**
 * Monitor CLI - SourceMap 上传工具
 */
import { Command } from 'commander';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';

// 导出 Vite 插件
export { monitorSourceMapPlugin } from './vite-plugin.js';

const program = new Command();

program
  .name('monitor-cli')
  .description('前端监控系统 CLI 工具')
  .version('1.0.0');

/**
 * 上传 SourceMap 命令
 */
program
  .command('upload-sourcemap')
  .description('上传 SourceMap 文件到监控服务器')
  .requiredOption('-k, --api-key <key>', 'API Key')
  .requiredOption('-u, --url <url>', '服务器地址')
  .option('-v, --version <version>', '版本号（默认从 package.json 读取）')
  .requiredOption('-d, --dir <directory>', 'SourceMap 文件目录')
  .option('-p, --pattern <pattern>', 'SourceMap 文件匹配模式', '**/*.js.map')
  .option('--delete', '上传后删除本地 SourceMap 文件（生产环境推荐）', false)
  .option('--include-sources', '同时上传对应的 JS 文件', false)
  .action(async (options) => {
    try {
      console.log('🚀 开始上传 SourceMap...');

      // 如果没有指定版本号，尝试从 package.json 读取
      let version = options.version;
      if (!version) {
        try {
          const packageJson = JSON.parse(
            await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8')
          );
          version = packageJson.version;
          console.log(`📦 从 package.json 读取版本号: ${version}`);
        } catch (error) {
          console.error('❌ 未指定版本号且无法读取 package.json，请使用 -v 参数指定版本号');
          process.exit(1);
        }
      }

      console.log(`版本: ${version}`);
      console.log(`目录: ${options.dir}`);

      // 查找所有 SourceMap 文件
      const files = await glob(options.pattern, {
        cwd: options.dir,
        absolute: true,
        nodir: true,
      });

      if (files.length === 0) {
        console.log('⚠️  未找到 SourceMap 文件');
        return;
      }

      console.log(`找到 ${files.length} 个 SourceMap 文件`);

      let successCount = 0;
      let failCount = 0;
      const filesToDelete: string[] = [];

      // 上传每个文件
      for (const file of files) {
        // 使用相对于输出目录的路径，并转换为 URL 路径格式
        let fileName = path.relative(options.dir, file).replace(/\\/g, '/');

        // 去除 .map 后缀，因为我们要存储对应的 JS 文件名
        const jsFileName = fileName.replace(/\.map$/, '');

        try {
          const content = await fs.readFile(file, 'utf-8');

          const response = await fetch(`${options.url}/api/sourcemap/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': options.apiKey,
            },
            body: JSON.stringify({
              version: version,
              filePath: jsFileName, // 存储 JS 文件名而不是 .map 文件名
              mapData: content,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`✅ ${fileName} ${result.updated ? '(更新)' : '(新增)'}`);
            successCount++;

            // 如果需要删除，记录文件路径
            if (options.delete) {
              filesToDelete.push(file);
              // 如果包含源文件，也删除对应的 JS 文件
              if (options.includeSources) {
                const jsFile = file.replace(/\.map$/, '');
                try {
                  await fs.access(jsFile);
                  filesToDelete.push(jsFile);
                } catch {
                  // JS 文件不存在，忽略
                }
              }
            }
          } else {
            const error = await response.json().catch(() => ({ error: '上传失败' }));
            console.error(`❌ ${fileName}: ${error.error}`);
            failCount++;
          }
        } catch (error: any) {
          console.error(`❌ ${fileName}: ${error.message}`);
          failCount++;
        }
      }

      // 删除已上传的文件
      if (options.delete && filesToDelete.length > 0) {
        console.log(`\n🗑️  删除已上传的文件...`);
        for (const file of filesToDelete) {
          try {
            await fs.unlink(file);
            console.log(`✅ 已删除: ${path.relative(options.dir, file)}`);
          } catch (error: any) {
            console.error(`❌ 删除失败: ${path.relative(options.dir, file)} - ${error.message}`);
          }
        }
      }

      console.log(`\n📊 上传完成: 成功 ${successCount}, 失败 ${failCount}`);

      if (failCount > 0) {
        process.exit(1);
      }
    } catch (error: any) {
      console.error(`❌ 上传失败: ${error.message}`);
      process.exit(1);
    }
  });

program.parse();
