/**
 * 性能指标收集器
 */
import type { WebVitals, ResourceTiming, LongTask, SDKOptions } from '@monitor/types';

export interface PerformanceData {
  pageUrl: string;
  metrics: {
    webVitals?: WebVitals;
    resources?: ResourceTiming[];
    longTasks?: LongTask[];
    memory?: {
      used: number;
      total: number;
      limit: number;
    };
  };
}

export interface PerformanceHandler {
  (data: PerformanceData): void;
}

/**
 * 性能指标收集器类
 */
export class MetricsCollector {
  private onPerformance?: PerformanceHandler;
  private webVitals: WebVitals = {};

  constructor(_options: SDKOptions, onPerformance?: PerformanceHandler) {
    this.onPerformance = onPerformance;
  }

  /**
   * 初始化性能监控
   */
  init(): void {
    if (typeof window === 'undefined' || !('performance' in window)) return;

    // 收集 Web Vitals
    this.collectWebVitals();

    // 监听长任务
    this.observeLongTasks();

    // 页面加载完成后收集数据
    if (document.readyState === 'complete') {
      this.collectMetrics();
    } else {
      window.addEventListener('load', () => {
        // 等待一段时间，确保所有指标都已收集
        setTimeout(() => this.collectMetrics(), 2000);
      });
    }
  }

  /**
   * 收集 Web Vitals 指标
   */
  private collectWebVitals(): void {
    // LCP (Largest Contentful Paint)
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.webVitals.LCP = lastEntry.renderTime || lastEntry.loadTime;
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // LCP not supported
    }

    // FID (First Input Delay)
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          const fidEntry = entry as any;
          this.webVitals.FID = fidEntry.processingStart - fidEntry.startTime;
        }
      });
      observer.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      // FID not supported
    }

    // CLS (Cumulative Layout Shift)
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as any;
          if (!layoutShift.hadRecentInput) {
            clsValue += layoutShift.value;
            this.webVitals.CLS = clsValue;
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // CLS not supported
    }

    // FCP (First Contentful Paint) 和 TTFB
    try {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.webVitals.TTFB = navigation.responseStart - navigation.requestStart;
      }

      const paint = performance.getEntriesByType('paint');
      const fcp = paint.find((entry) => entry.name === 'first-contentful-paint');
      if (fcp) {
        this.webVitals.FCP = fcp.startTime;
      }
    } catch (e) {
      // Navigation timing not supported
    }
  }

  /**
   * 监听长任务
   */
  private observeLongTasks(): void {
    try {
      const observer = new PerformanceObserver(() => {
        // 长任务会在 collectMetrics 中统一收集
      });
      observer.observe({ type: 'longtask', buffered: true });
    } catch (e) {
      // Long tasks not supported
    }
  }

  /**
   * 收集所有性能指标
   */
  private collectMetrics(): void {
    const metrics: PerformanceData['metrics'] = {
      webVitals: this.webVitals,
    };

    // 收集资源加载性能
    try {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      metrics.resources = resources.map((resource) => ({
        name: resource.name,
        type: resource.initiatorType,
        duration: resource.duration,
        size: resource.transferSize,
        startTime: resource.startTime,
      }));
    } catch (e) {
      // Resource timing not supported
    }

    // 收集长任务
    try {
      const longTasks = performance.getEntriesByType('longtask');
      metrics.longTasks = longTasks.map((task) => ({
        duration: task.duration,
        startTime: task.startTime,
      }));
    } catch (e) {
      // Long tasks not supported
    }

    // 收集内存信息
    try {
      const memory = (performance as any).memory;
      if (memory) {
        metrics.memory = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
        };
      }
    } catch (e) {
      // Memory API not supported
    }

    // 触发回调
    if (this.onPerformance) {
      this.onPerformance({
        pageUrl: window.location.href,
        metrics,
      });
    }
  }

  /**
   * 手动触发性能数据收集
   */
  collect(): void {
    this.collectMetrics();
  }
}
