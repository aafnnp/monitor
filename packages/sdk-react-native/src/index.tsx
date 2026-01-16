/**
 * React Native SDK
 * 注意：React Native 不支持 rrweb，因此不包含 Session Replay 功能
 */
import React, { Component, createContext, useContext, type ReactNode } from 'react';
import { ErrorLevel, type SDKOptions, type ErrorRecord, type ErrorContext } from '@monitor/types';

// React Native 全局错误处理类型声明
declare global {
  const ErrorUtils: {
    setGlobalHandler: (handler: (error: Error, isFatal: boolean) => void) => void;
    getGlobalHandler: () => ((error: Error, isFatal: boolean) => void) | undefined;
  };
}

let monitorInstance: MonitorSDKRN | null = null;

/**
 * React Native 监控 SDK 类
 * 简化版，不包含 Session Replay 和 DOM 相关功能
 */
export class MonitorSDKRN {
  private options: SDKOptions;
  private errorQueue: Omit<ErrorRecord, 'id' | 'projectId' | 'createdAt'>[] = [];

  constructor(options: SDKOptions) {
    this.options = options;
  }

  /**
   * 初始化 SDK
   */
  init(): void {
    // 捕获全局错误
    if (typeof ErrorUtils !== 'undefined') {
      const originalHandler = ErrorUtils.getGlobalHandler();

      ErrorUtils.setGlobalHandler((error, isFatal) => {
        this.captureError(error, isFatal ? ErrorLevel.ERROR : ErrorLevel.WARNING);

        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }

    // 定期上报错误
    setInterval(() => {
      this.flushErrors();
    }, 5000);
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

    const errorRecord: Omit<ErrorRecord, 'id' | 'projectId' | 'createdAt'> = {
      message,
      stack,
      level,
      context: this.getContext(extra),
    };

    // 应用 beforeSend 钩子
    let processedError = errorRecord;
    if (this.options.beforeSend) {
      const result = this.options.beforeSend(errorRecord as ErrorRecord);
      if (!result) return;
      processedError = result as any;
    }

    this.errorQueue.push(processedError);

    // 如果队列达到一定数量，触发上报
    if (this.errorQueue.length >= 5) {
      this.flushErrors();
    }
  }

  /**
   * 获取错误上下文
   * @param extra - 额外数据
   * @returns 错误上下文
   */
  private getContext(extra?: Record<string, unknown>): ErrorContext {
    const context: ErrorContext = {};

    // 用户信息
    if (this.options.user) {
      context.user = this.options.user;
    }

    // 自定义标签
    if (this.options.tags) {
      context.tags = this.options.tags;
    }

    // 额外数据
    context.extra = {
      environment: this.options.environment,
      version: this.options.version,
      platform: 'react-native',
      ...extra,
    };

    return context;
  }

  /**
   * 上报错误队列
   */
  private async flushErrors(): Promise<void> {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    try {
      const response = await fetch(`${this.options.serverUrl}/api/report/errors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.options.apiKey,
        },
        body: JSON.stringify({ errors }),
      });

      if (!response.ok) {
        console.error('上报错误失败:', response.statusText);
        // 失败时重新加入队列
        this.errorQueue.push(...errors);
      }
    } catch (error) {
      console.error('上报错误失败:', error);
      // 失败时重新加入队列
      this.errorQueue.push(...errors);
    }
  }

  /**
   * 设置用户信息
   * @param user - 用户信息
   */
  setUser(user: { id?: string; email?: string; [key: string]: unknown }): void {
    this.options.user = user;
  }

  /**
   * 设置自定义标签
   * @param tags - 标签对象
   */
  setTags(tags: Record<string, string>): void {
    this.options.tags = { ...this.options.tags, ...tags };
  }
}

/**
 * 初始化监控 SDK
 * @param options - SDK 配置
 * @returns SDK 实例
 */
export function initMonitor(options: SDKOptions): MonitorSDKRN {
  if (monitorInstance) {
    console.warn('MonitorSDK 已经初始化');
    return monitorInstance;
  }

  monitorInstance = new MonitorSDKRN(options);
  monitorInstance.init();

  return monitorInstance;
}

/**
 * 获取监控 SDK 实例
 * @returns SDK 实例
 */
export function getMonitor(): MonitorSDKRN | null {
  return monitorInstance;
}

// ========== React Context ==========

const MonitorContext = createContext<MonitorSDKRN | null>(null);

interface MonitorProviderProps {
  children: ReactNode;
  options?: SDKOptions;
  instance?: MonitorSDKRN;
}

/**
 * MonitorProvider - 提供监控上下文
 */
export function MonitorProvider({ children, options, instance }: MonitorProviderProps) {
  const monitor = instance || (options ? initMonitor(options) : monitorInstance);

  return <MonitorContext.Provider value={monitor}>{children}</MonitorContext.Provider>;
}

/**
 * useMonitor - 获取监控实例的 Hook
 * @returns SDK 实例
 */
export function useMonitor(): MonitorSDKRN | null {
  return useContext(MonitorContext);
}

// ========== Error Boundary ==========

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, errorInfo: React.ErrorInfo) => ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: ErrorLevel;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary - React Native 错误边界组件
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });

    // 上报错误到监控系统
    if (monitorInstance) {
      monitorInstance.captureError(error, this.props.level || ErrorLevel.ERROR, {
        componentStack: errorInfo.componentStack,
      });
    }

    // 调用自定义错误处理
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error!, this.state.errorInfo!);
      }

      return this.props.fallback || React.createElement('Text', {}, '出错了，请重试');
    }

    return this.props.children;
  }
}

/**
 * useErrorHandler - 错误处理 Hook
 * @returns 错误处理函数
 */
export function useErrorHandler() {
  const monitor = useMonitor();

  return (
    error: Error | string,
    level: ErrorLevel = ErrorLevel.ERROR,
    extra?: Record<string, unknown>
  ) => {
    if (monitor) {
      monitor.captureError(error, level, extra);
    }
  };
}

// 导出核心类型
export type { SDKOptions, ErrorLevel } from '@monitor/types';
