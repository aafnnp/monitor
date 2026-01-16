/**
 * 性能分析服务 - 提供优化建议
 */
import type {
  PerformanceMetrics,
  PerformanceSuggestion,
  ResourceTiming,
  LongTask,
} from '@monitor/types';

/** 性能优化规则 */
interface PerformanceRule {
  type: PerformanceSuggestion['type'];
  condition: (metrics: PerformanceMetrics) => boolean;
  severity: PerformanceSuggestion['severity'];
  message: string;
  suggestion: string;
}

/** 性能优化规则列表 */
const RULES: PerformanceRule[] = [
  // LCP 规则
  {
    type: 'LCP',
    condition: (m) => (m.webVitals?.LCP || 0) > 4000,
    severity: 'high',
    message: 'LCP 超过 4 秒，用户体验较差',
    suggestion:
      '优化最大内容绘制：1) 优化图片加载（使用 WebP 格式、懒加载）；2) 减少阻塞渲染的 CSS/JS；3) 使用 CDN 加速资源加载；4) 考虑使用服务端渲染（SSR）',
  },
  {
    type: 'LCP',
    condition: (m) => (m.webVitals?.LCP || 0) > 2500 && (m.webVitals?.LCP || 0) <= 4000,
    severity: 'medium',
    message: 'LCP 在 2.5-4 秒之间，有优化空间',
    suggestion: '优化首屏加载：1) 压缩和优化图片；2) 预加载关键资源；3) 减少第三方脚本影响',
  },

  // FID 规则
  {
    type: 'FID',
    condition: (m) => (m.webVitals?.FID || 0) > 300,
    severity: 'high',
    message: 'FID 超过 300ms，交互响应慢',
    suggestion:
      '优化交互响应：1) 拆分长任务（使用 Web Workers）；2) 减少 JavaScript 执行时间；3) 优化事件处理器；4) 延迟加载非关键 JavaScript',
  },
  {
    type: 'FID',
    condition: (m) => (m.webVitals?.FID || 0) > 100 && (m.webVitals?.FID || 0) <= 300,
    severity: 'medium',
    message: 'FID 在 100-300ms 之间，建议优化',
    suggestion: '减少主线程阻塞：1) 使用 requestIdleCallback；2) 优化第三方库的使用',
  },

  // CLS 规则
  {
    type: 'CLS',
    condition: (m) => (m.webVitals?.CLS || 0) > 0.25,
    severity: 'high',
    message: 'CLS 超过 0.25，页面布局不稳定',
    suggestion:
      '减少布局偏移：1) 为图片和视频设置明确的宽高；2) 避免在现有内容上方插入内容；3) 为动态内容预留空间；4) 使用 transform 动画替代属性动画',
  },
  {
    type: 'CLS',
    condition: (m) => (m.webVitals?.CLS || 0) > 0.1 && (m.webVitals?.CLS || 0) <= 0.25,
    severity: 'medium',
    message: 'CLS 在 0.1-0.25 之间，需要注意',
    suggestion: '改善布局稳定性：1) 为字体加载设置 font-display；2) 避免使用动态注入的广告',
  },

  // TTFB 规则
  {
    type: 'TTFB',
    condition: (m) => (m.webVitals?.TTFB || 0) > 800,
    severity: 'high',
    message: 'TTFB 超过 800ms，服务器响应慢',
    suggestion:
      '优化服务器响应：1) 使用 CDN；2) 优化数据库查询；3) 启用服务器缓存；4) 减少服务器端计算；5) 升级服务器硬件或优化网络',
  },
  {
    type: 'TTFB',
    condition: (m) => (m.webVitals?.TTFB || 0) > 600 && (m.webVitals?.TTFB || 0) <= 800,
    severity: 'medium',
    message: 'TTFB 在 600-800ms 之间，建议优化',
    suggestion: '改善服务器性能：1) 启用 HTTP/2 或 HTTP/3；2) 优化 API 响应时间',
  },

  // FCP 规则
  {
    type: 'FCP',
    condition: (m) => (m.webVitals?.FCP || 0) > 3000,
    severity: 'high',
    message: 'FCP 超过 3 秒，首次内容渲染慢',
    suggestion:
      '加速首次渲染：1) 内联关键 CSS；2) 移除阻塞渲染的资源；3) 启用服务端渲染；4) 使用预渲染',
  },

  // 资源加载规则
  {
    type: 'RESOURCE',
    condition: (m) => {
      const largeResources =
        m.resources?.filter((r: ResourceTiming) => (r.size || 0) > 1024 * 1024) || [];
      return largeResources.length > 0;
    },
    severity: 'medium',
    message: '检测到大文件资源（> 1MB）',
    suggestion:
      '优化资源大小：1) 压缩图片和视频；2) 启用 Gzip/Brotli 压缩；3) 代码分割（Code Splitting）；4) 使用懒加载',
  },
  {
    type: 'RESOURCE',
    condition: (m) => {
      const slowResources = m.resources?.filter((r: ResourceTiming) => r.duration > 3000) || [];
      return slowResources.length > 3;
    },
    severity: 'medium',
    message: '检测到多个慢速资源加载（> 3s）',
    suggestion:
      '优化资源加载：1) 使用 CDN；2) 启用资源缓存；3) 并行加载非关键资源；4) 使用资源预加载',
  },

  // 长任务规则
  {
    type: 'LONG_TASK',
    condition: (m) => {
      const longTasks = m.longTasks?.filter((t: LongTask) => t.duration > 100) || [];
      return longTasks.length > 5;
    },
    severity: 'high',
    message: '检测到多个长任务（> 100ms），阻塞主线程',
    suggestion:
      '优化长任务：1) 拆分大任务为小任务；2) 使用 Web Workers 处理计算密集型任务；3) 使用 requestIdleCallback 延迟非关键任务；4) 优化 JavaScript 执行',
  },

  // 内存规则
  {
    type: 'MEMORY',
    condition: (m) => {
      const used = m.memory?.used || 0;
      const limit = m.memory?.limit || Infinity;
      return used / limit > 0.9;
    },
    severity: 'high',
    message: '内存使用超过 90%，可能导致性能问题',
    suggestion:
      '优化内存使用：1) 检查并修复内存泄漏；2) 及时清理不用的对象引用；3) 使用对象池减少垃圾回收；4) 优化大数据结构的使用',
  },
];

/**
 * 分析性能数据并生成优化建议
 * @param metrics - 性能指标数据
 * @returns 优化建议列表
 */
export function analyzePerformance(metrics: any): PerformanceSuggestion[] {
  const suggestions: PerformanceSuggestion[] = [];

  for (const rule of RULES) {
    try {
      if (rule.condition(metrics)) {
        suggestions.push({
          type: rule.type,
          severity: rule.severity,
          message: rule.message,
          suggestion: rule.suggestion,
        });
      }
    } catch (error) {
      console.error('规则检查失败:', rule.type, error);
    }
  }

  // 按严重程度排序
  return suggestions.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
