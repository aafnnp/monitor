/**
 * Vue SDK
 */
import { MonitorSDK } from '@monitor/sdk-core';
import { ErrorLevel, type SDKOptions } from '@monitor/types';
import type { App, Plugin } from 'vue';

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

// ========== Vue Plugin ==========

export interface MonitorPluginOptions extends SDKOptions {
  captureVueErrors?: boolean;
}

/**
 * Vue 监控插件
 */
export const MonitorPlugin: Plugin = {
  install(app: App, options: MonitorPluginOptions) {
    // 初始化监控
    const monitor = initMonitor(options);

    // 注入全局属性
    app.config.globalProperties.$monitor = monitor;

    // 提供给组合式 API 使用
    app.provide('monitor', monitor);

    // 捕获 Vue 错误
    if (options.captureVueErrors !== false) {
      const originalErrorHandler = app.config.errorHandler;

      app.config.errorHandler = (err, instance, info) => {
        // 上报错误
        monitor.captureError(err as Error, ErrorLevel.ERROR, {
          vueComponent: instance?.$options.name || 'Anonymous',
          vueErrorInfo: info,
        });

        // 调用原始错误处理器
        if (originalErrorHandler) {
          originalErrorHandler(err, instance, info);
        }
      };
    }

    // 捕获警告（开发环境）
    if (process.env.NODE_ENV === 'development') {
      const originalWarnHandler = app.config.warnHandler;

      app.config.warnHandler = (msg, instance, trace) => {
        monitor.captureError(msg, ErrorLevel.WARNING, {
          vueComponent: instance?.$options.name || 'Anonymous',
          vueTrace: trace,
        });

        if (originalWarnHandler) {
          originalWarnHandler(msg, instance, trace);
        }
      };
    }
  },
};

// ========== 组合式 API ==========

/**
 * useMonitor - 获取监控实例的组合式函数
 * @returns SDK 实例和工具方法
 */
export function useMonitor() {
  const monitor = monitorInstance;

  const captureError = (
    error: Error | string,
    level: ErrorLevel = ErrorLevel.ERROR,
    extra?: Record<string, unknown>
  ) => {
    if (monitor) {
      monitor.captureError(error, level, extra);
    }
  };

  const setUser = (user: { id?: string; email?: string; [key: string]: unknown }) => {
    if (monitor) {
      monitor.setUser(user);
    }
  };

  const setTags = (tags: Record<string, string>) => {
    if (monitor) {
      monitor.setTags(tags);
    }
  };

  const collectPerformance = () => {
    if (monitor) {
      monitor.collectPerformance();
    }
  };

  return {
    monitor,
    captureError,
    setUser,
    setTags,
    collectPerformance,
  };
}

// ========== TypeScript 类型扩展 ==========

declare module 'vue' {
  interface ComponentCustomProperties {
    $monitor: MonitorSDK;
  }
}

// 导出核心类型
export type { SDKOptions, ErrorLevel } from '@monitor/types';
export { MonitorSDK } from '@monitor/sdk-core';
