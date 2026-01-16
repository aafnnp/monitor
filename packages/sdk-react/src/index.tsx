/**
 * React SDK
 */
import React, { Component, createContext, useContext, useEffect, type ReactNode } from 'react';
import { MonitorSDK } from '@monitor/sdk-core';
import { ErrorLevel, type SDKOptions } from '@monitor/types';

let monitorInstance: MonitorSDK | null = null;

/**
 * 初始化监控 SDK
 * @param options - SDK 配置
 * @returns SDK 实例
 */
export function initMonitor(options: SDKOptions): MonitorSDK {
  if (monitorInstance) {
    console.warn('MonitorSDK 已经初始化');
    return monitorInstance;
  }

  monitorInstance = new MonitorSDK(options);
  monitorInstance.init();

  return monitorInstance;
}

/**
 * 获取监控 SDK 实例
 * @returns SDK 实例
 */
export function getMonitor(): MonitorSDK | null {
  return monitorInstance;
}

// ========== React Context ==========

const MonitorContext = createContext<MonitorSDK | null>(null);

interface MonitorProviderProps {
  children: ReactNode;
  options?: SDKOptions;
  instance?: MonitorSDK;
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
export function useMonitor(): MonitorSDK | null {
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
 * ErrorBoundary - React 错误边界组件
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

      return this.props.fallback || <div>出错了，请刷新页面重试</div>;
    }

    return this.props.children;
  }
}

// ========== Hooks ==========

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

/**
 * usePerformance - 性能监控 Hook
 */
export function usePerformance() {
  const monitor = useMonitor();

  useEffect(() => {
    if (monitor) {
      monitor.collectPerformance();
    }
  }, [monitor]);
}

// 导出核心类型
export type { SDKOptions, ErrorLevel } from '@monitor/types';
export { MonitorSDK } from '@monitor/sdk-core';
