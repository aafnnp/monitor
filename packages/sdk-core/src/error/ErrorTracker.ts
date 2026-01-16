/**
 * 错误跟踪器
 */
import {
  ErrorLevel,
  BreadcrumbType,
  type ErrorRecord,
  type ErrorContext,
  type SDKOptions,
  type Breadcrumb,
} from '@monitor/types';

export interface ErrorHandler {
  (error: ErrorRecord): void;
}

/**
 * 错误跟踪器类
 */
export class ErrorTracker {
  private options: SDKOptions;
  private errorQueue: Omit<ErrorRecord, 'id' | 'projectId' | 'createdAt'>[] = [];
  private onError?: ErrorHandler;
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 30;

  constructor(options: SDKOptions, onError?: ErrorHandler) {
    this.options = options;
    this.onError = onError;
  }

  /**
   * 初始化错误监听
   */
  init(): void {
    if (typeof window === 'undefined') return;

    // 监听全局错误
    window.addEventListener('error', (event) => {
      this.handleError({
        message: event.message,
        stack: event.error?.stack,
        level: ErrorLevel.ERROR,
        context: this.getContext(),
      });
    });

    // 监听未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      this.handleError({
        message: error?.message || String(error),
        stack: error?.stack,
        level: ErrorLevel.ERROR,
        context: this.getContext(),
      });
    });

    // 监听资源加载错误
    window.addEventListener(
      'error',
      (event) => {
        if (event.target && event.target !== window) {
          const target = event.target as HTMLElement;
          this.handleError({
            message: `资源加载失败: ${target.tagName}`,
            level: ErrorLevel.WARNING,
            context: {
              ...this.getContext(),
              extra: {
                tagName: target.tagName,
                src: (target as any).src || (target as any).href,
              },
            },
          });
        }
      },
      true
    );

    // 初始化 breadcrumbs 追踪
    this.initBreadcrumbs();
  }

  /**
   * 初始化用户行为追踪
   */
  private initBreadcrumbs(): void {
    if (typeof window === 'undefined') return;

    // 追踪点击事件
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target as HTMLElement;
        const tagName = target.tagName.toLowerCase();
        const id = target.id ? `#${target.id}` : '';
        const className = target.className ? `.${target.className.split(' ').join('.')}` : '';

        this.addBreadcrumb({
          type: BreadcrumbType.USER,
          category: 'click',
          message: `点击 ${tagName}${id}${className}`,
          data: {
            target: `${tagName}${id}${className}`,
            innerText: target.innerText?.substring(0, 50),
          },
          timestamp: Date.now(),
        });
      },
      true
    );

    // 追踪页面导航
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      const breadcrumbTracker = (window as any).__monitorBreadcrumbTracker;
      if (breadcrumbTracker) {
        breadcrumbTracker.addBreadcrumb({
          type: BreadcrumbType.NAVIGATION,
          category: 'navigation',
          message: `导航到 ${args[2]}`,
          data: { to: args[2] },
          timestamp: Date.now(),
        });
      }
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      const breadcrumbTracker = (window as any).__monitorBreadcrumbTracker;
      if (breadcrumbTracker) {
        breadcrumbTracker.addBreadcrumb({
          type: BreadcrumbType.NAVIGATION,
          category: 'navigation',
          message: `替换导航到 ${args[2]}`,
          data: { to: args[2] },
          timestamp: Date.now(),
        });
      }
    };

    // 追踪 popstate
    window.addEventListener('popstate', () => {
      this.addBreadcrumb({
        type: BreadcrumbType.NAVIGATION,
        category: 'navigation',
        message: `浏览器后退/前进到 ${location.pathname}`,
        data: { to: location.href },
        timestamp: Date.now(),
      });
    });

    // 追踪控制台输出
    ['log', 'info', 'warn', 'error', 'debug'].forEach((level) => {
      const original = (console as any)[level];
      (console as any)[level] = (...args: any[]) => {
        this.addBreadcrumb({
          type: BreadcrumbType.CONSOLE,
          category: 'console',
          message: args.map((arg) => String(arg)).join(' '),
          level:
            level === 'error'
              ? ErrorLevel.ERROR
              : level === 'warn'
                ? ErrorLevel.WARNING
                : ErrorLevel.INFO,
          data: { arguments: args },
          timestamp: Date.now(),
        });
        original.apply(console, args);
      };
    });

    // 追踪 XHR 请求
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method: string, url: string | URL) {
      (this as any).__monitor_xhr = { method, url: String(url), startTime: Date.now() };
      return originalXHROpen.apply(this, arguments as any);
    };

    XMLHttpRequest.prototype.send = function () {
      const xhr = this;
      const data = (xhr as any).__monitor_xhr;

      xhr.addEventListener('loadend', function () {
        const breadcrumbTracker = (window as any).__monitorBreadcrumbTracker;
        if (breadcrumbTracker && data) {
          breadcrumbTracker.addBreadcrumb({
            type: BreadcrumbType.HTTP,
            category: 'xhr',
            message: `${data.method} ${data.url}`,
            data: {
              method: data.method,
              url: data.url,
              status: xhr.status,
              statusText: xhr.statusText,
              duration: Date.now() - data.startTime,
            },
            level: xhr.status >= 400 ? ErrorLevel.ERROR : ErrorLevel.INFO,
            timestamp: Date.now(),
          });
        }
      });

      return originalXHRSend.apply(this, arguments as any);
    };

    // 追踪 Fetch 请求
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const startTime = Date.now();
      let url = '';
      if (typeof args[0] === 'string') {
        url = args[0];
      } else if (args[0] instanceof URL) {
        url = args[0].toString();
      } else if (args[0] instanceof Request) {
        url = args[0].url;
      }
      const method = args[1]?.method || 'GET';

      try {
        const response = await originalFetch.apply(this, args);
        const breadcrumbTracker = (window as any).__monitorBreadcrumbTracker;
        if (breadcrumbTracker) {
          breadcrumbTracker.addBreadcrumb({
            type: BreadcrumbType.HTTP,
            category: 'fetch',
            message: `${method} ${url}`,
            data: {
              method,
              url,
              status: response.status,
              statusText: response.statusText,
              duration: Date.now() - startTime,
            },
            level: response.status >= 400 ? ErrorLevel.ERROR : ErrorLevel.INFO,
            timestamp: Date.now(),
          });
        }
        return response;
      } catch (error) {
        const breadcrumbTracker = (window as any).__monitorBreadcrumbTracker;
        if (breadcrumbTracker) {
          breadcrumbTracker.addBreadcrumb({
            type: BreadcrumbType.HTTP,
            category: 'fetch',
            message: `${method} ${url} 失败`,
            data: {
              method,
              url,
              error: String(error),
              duration: Date.now() - startTime,
            },
            level: ErrorLevel.ERROR,
            timestamp: Date.now(),
          });
        }
        throw error;
      }
    };

    // 将 this 存储到全局，供拦截的函数使用
    (window as any).__monitorBreadcrumbTracker = this;
  }

  /**
   * 添加面包屑
   * @param breadcrumb - 面包屑信息
   */
  addBreadcrumb(breadcrumb: Breadcrumb): void {
    this.breadcrumbs.push(breadcrumb);

    // 限制数量
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * 处理错误
   * @param error - 错误信息
   */
  private handleError(error: Omit<ErrorRecord, 'id' | 'projectId' | 'createdAt'>): void {
    // 应用 beforeSend 钩子
    let processedError: Omit<ErrorRecord, 'id' | 'projectId' | 'createdAt'> | null = error;

    if (this.options.beforeSend) {
      processedError = this.options.beforeSend(error as ErrorRecord) as any;
    }

    if (!processedError) return;

    // 添加到队列
    this.errorQueue.push(processedError);

    // 触发回调
    if (this.onError) {
      this.onError(processedError as ErrorRecord);
    }

    // 如果队列达到一定数量，触发上报
    if (this.errorQueue.length >= 5) {
      this.flush();
    }
  }

  /**
   * 手动捕获错误
   * @param error - 错误对象或消息
   * @param level - 错误级别
   * @param extra - 额外数据
   */
  captureError(
    error: Error | string,
    level: ErrorLevel = ErrorLevel.ERROR,
    extra?: Record<string, unknown>
  ): void {
    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'object' && 'stack' in error ? error.stack : undefined;

    this.handleError({
      message,
      stack,
      level,
      context: {
        ...this.getContext(),
        extra: { ...this.getContext().extra, ...extra },
      },
    });
  }

  /**
   * 获取错误上下文
   * @returns 错误上下文
   */
  private getContext(): ErrorContext {
    const context: ErrorContext = {};

    // 用户信息
    if (this.options.user) {
      context.user = this.options.user;
    }

    // 设备信息
    if (typeof navigator !== 'undefined') {
      context.device = {
        userAgent: navigator.userAgent,
        screenWidth: screen.width,
        screenHeight: screen.height,
        platform: navigator.platform,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    // 页面信息
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      context.page = {
        url: window.location.href,
        title: document.title,
        referrer: document.referrer,
      };
    }

    // 自定义标签
    if (this.options.tags) {
      context.tags = this.options.tags;
    }

    // 额外数据
    context.extra = {
      environment: this.options.environment,
      version: this.options.version,
    };

    // 添加面包屑
    context.breadcrumbs = [...this.breadcrumbs];

    return context;
  }

  /**
   * 获取待上报的错误队列
   * @returns 错误队列
   */
  getQueue(): Omit<ErrorRecord, 'id' | 'projectId' | 'createdAt'>[] {
    return [...this.errorQueue];
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    this.errorQueue = [];
  }

  /**
   * 立即上报所有错误
   */
  flush(): void {
    // 由外部的 MonitorSDK 处理实际的上报逻辑
  }
}
