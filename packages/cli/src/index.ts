#!/usr/bin/env node
/**
 * Monitor CLI - SourceMap 上传工具
 */
import { Command } from 'commander';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';

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
  .requiredOption('-v, --version <version>', '版本号')
  .requiredOption('-d, --dir <directory>', 'SourceMap 文件目录')
  .option('-p, --pattern <pattern>', 'SourceMap 文件匹配模式', '**/*.map')
  .action(async (options) => {
    try {
      console.log('🚀 开始上传 SourceMap...');
      console.log(`版本: ${options.version}`);
      console.log(`目录: ${options.dir}`);
      
      // 查找所有 SourceMap 文件
      const files = await glob(options.pattern, {
        cwd: options.dir,
        absolute: true,
      });
      
      if (files.length === 0) {
        console.log('⚠️  未找到 SourceMap 文件');
        return;
      }
      
      console.log(`找到 ${files.length} 个 SourceMap 文件`);
      
      let successCount = 0;
      let failCount = 0;
      
      // 上传每个文件
      for (const file of files) {
        const fileName = path.relative(options.dir, file);
        
        try {
          const content = await fs.readFile(file, 'utf-8');
          
          const response = await fetch(`${options.url}/api/sourcemap/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': options.apiKey,
            },
            body: JSON.stringify({
              version: options.version,
              filePath: fileName,
              mapData: content,
            }),
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log(`✅ ${fileName} ${result.updated ? '(更新)' : '(新增)'}`);
            successCount++;
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
      
      console.log(`\n📊 上传完成: 成功 ${successCount}, 失败 ${failCount}`);
    } catch (error: any) {
      console.error(`❌ 上传失败: ${error.message}`);
      process.exit(1);
    }
  });

program.parse();
