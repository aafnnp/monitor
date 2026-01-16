/**
 * SourceMap 解析服务
 */
import { SourceMapConsumer } from 'source-map';
import type { StackFrame, ResolvedStackFrame } from '@monitor/types';

/**
 * 判断是否为应用代码（非框架/库代码）
 * @param fileName - 文件名
 * @returns 是否为应用代码
 */
function isInApp(fileName?: string): boolean {
  if (!fileName) return false;

  // 常见的第三方库/框架特征
  const thirdPartyPatterns = [
    /node_modules/,
    /webpack/,
    /vite/,
    /@vite/,
    /chunk-/,
    /react-dom/,
    /react-refresh/,
    /\.deps\//,
    /__vite__/,
    /\/deps\//,
  ];

  return !thirdPartyPatterns.some((pattern) => pattern.test(fileName));
}

/**
 * 解析单个堆栈帧
 * @param frame - 堆栈帧
 * @param sourceMapContent - SourceMap 内容（JSON 字符串）
 * @returns 解析后的堆栈帧
 */
export async function resolveStackFrame(
  frame: StackFrame,
  sourceMapContent: string
): Promise<ResolvedStackFrame> {
  try {
    const rawSourceMap = JSON.parse(sourceMapContent);
    const consumer = await new SourceMapConsumer(rawSourceMap);

    // 获取原始位置
    const originalPosition = consumer.originalPositionFor({
      line: frame.lineNumber || 0,
      column: frame.columnNumber || 0,
    });

    // 获取原始源代码
    const sourceContent = originalPosition.source
      ? consumer.sourceContentFor(originalPosition.source, true)
      : null;

    consumer.destroy();

    const resolvedFrame: ResolvedStackFrame = {
      ...frame,
      originalFileName: originalPosition.source || undefined,
      originalLineNumber: originalPosition.line || undefined,
      originalColumnNumber: originalPosition.column || undefined,
      originalSource: sourceContent || undefined,
      inApp: isInApp(originalPosition.source || frame.fileName),
    };

    return resolvedFrame;
  } catch (error) {
    console.error('解析 SourceMap 失败:', error);
    return {
      ...frame,
      inApp: isInApp(frame.fileName),
    };
  }
}

/**
 * 从堆栈字符串中提取堆栈帧
 * @param stack - 堆栈字符串
 * @returns 堆栈帧数组
 */
export function parseStackTrace(stack: string): StackFrame[] {
  const frames: StackFrame[] = [];
  const lines = stack.split('\n');

  for (const line of lines) {
    // 匹配常见的堆栈格式
    // Chrome: "    at functionName (file:line:column)"
    // Firefox: "functionName@file:line:column"
    const chromeMatch = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);
    const firefoxMatch = line.match(/(.+?)@(.+?):(\d+):(\d+)/);

    let match = chromeMatch || firefoxMatch;

    if (match) {
      const fileName = match[2];
      frames.push({
        functionName: match[1]?.trim() || '<anonymous>',
        fileName,
        lineNumber: parseInt(match[3], 10),
        columnNumber: parseInt(match[4], 10),
        inApp: isInApp(fileName),
      });
    }
  }

  return frames;
}

/**
 * 过滤堆栈帧，只保留应用代码
 * @param frames - 堆栈帧数组
 * @returns 过滤后的堆栈帧数组
 */
export function filterStackFrames(frames: StackFrame[]): StackFrame[] {
  return frames.filter((frame) => frame.inApp);
}

/**
 * 格式化堆栈帧为易读的字符串
 * @param frames - 堆栈帧数组
 * @param showOnlyInApp - 是否只显示应用代码
 * @returns 格式化后的堆栈字符串
 */
export function formatStackFrames(frames: ResolvedStackFrame[], showOnlyInApp = true): string {
  const framesToShow = showOnlyInApp ? frames.filter((f) => f.inApp) : frames;

  return framesToShow
    .map((frame) => {
      const fileName = frame.originalFileName || frame.fileName || 'unknown';
      const functionName = frame.functionName || '<anonymous>';
      const lineNumber = frame.originalLineNumber || frame.lineNumber || 0;
      const columnNumber = frame.originalColumnNumber || frame.columnNumber || 0;

      return `  at ${functionName} (${fileName}:${lineNumber}:${columnNumber})`;
    })
    .join('\n');
}

/**
 * 获取源代码片段（包含上下文行）
 * @param source - 源代码
 * @param line - 目标行号（1-based）
 * @param contextLines - 上下文行数
 * @returns 代码片段
 */
export function getSourceSnippet(
  source: string,
  line: number,
  contextLines: number = 5
): { lines: Array<{ number: number; content: string; highlight: boolean }> } {
  const lines = source.split('\n');
  const startLine = Math.max(0, line - contextLines - 1);
  const endLine = Math.min(lines.length, line + contextLines);

  const result = [];
  for (let i = startLine; i < endLine; i++) {
    result.push({
      number: i + 1,
      content: lines[i],
      highlight: i + 1 === line,
    });
  }

  return { lines: result };
}

/**
 * 生成错误指纹，用于错误分组
 * @param message - 错误消息
 * @param stack - 堆栈信息
 * @returns 错误指纹
 */
export function generateErrorFingerprint(message: string, stack?: string): string {
  // 使用错误消息和堆栈中的应用代码部分生成指纹
  let fingerprintBase = message;

  if (stack) {
    const frames = parseStackTrace(stack);
    const appFrames = frames.filter((f) => f.inApp).slice(0, 3); // 取前3个应用帧

    fingerprintBase += appFrames
      .map((f) => `${f.functionName}:${f.fileName}:${f.lineNumber}`)
      .join('|');
  }

  // 简单的哈希函数
  let hash = 0;
  for (let i = 0; i < fingerprintBase.length; i++) {
    const char = fingerprintBase.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(36);
}
