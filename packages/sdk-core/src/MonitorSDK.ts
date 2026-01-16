/**
 * 监控 SDK 核心类
 */
import { ErrorLevel, type SDKOptions } from '@monitor/types';
import { ErrorTracker } from './error/ErrorTracker.js';
import { MetricsCollector } from './performance/MetricsCollector.js';
import { SessionRecorder } from './replay/SessionRecorder.js';
import { DataUploader } from './transport/DataUploader.js';

/**
 * 监控 SDK 主类
 */
export class MonitorSDK {
  private options: SDKOptions;
  private errorTracker?: ErrorTracker;
  private metricsCollector?: MetricsCollector;
  private sessionRecorder?: SessionRecorder;
  private dataUploader?: DataUploader;
  private initialized = false;

  constructor(options: SDKOptions) {
    this.options = this.normalizeOptions(options);
  }

  /**
   * 标准化配置选项
   * @param options - 原始配置
   * @returns 标准化后的配置
   */
  private normalizeOptions(options: SDKOptions): SDKOptions {
    return {
      enableError: true,
      enablePerformance: true,
      enableReplay: false,
      replaySampleRate: 0.1,
      replayOnError: true,
      environment: 'production',
      ...options,
    };
  }

  /**
   * 初始化 SDK
   */
  init(): void {
    if (this.initialized) {
      console.warn('MonitorSDK 已经初始化');
      return;
    }

    this.dataUploader = new DataUploader(this.options);

    // 初始化错误监控
    if (this.options.enableError) {
      this.errorTracker = new ErrorTracker(this.options, () => {
        // 如果配置了仅在出错时录制，启动录制
        if (this.options.replayOnError && !this.sessionRecorder) {
          this.startReplay();
        }
      });
      this.errorTracker.init();

      // 定期上报错误
      setInterval(() => {
        this.flushErrors();
      }, 5000);
    }

    // 初始化性能监控
    if (this.options.enablePerformance) {
      this.metricsCollector = new MetricsCollector(this.options, (data) => {
        this.dataUploader?.uploadPerformance(data);
      });
      this.metricsCollector.init();
    }

    // 初始化 Session Replay
    if (this.options.enableReplay && !this.options.replayOnError) {
      this.startReplay();
    }

    this.initialized = true;
  }

  /**
   * 启动 Session Replay
   */
  private startReplay(): void {
    if (this.sessionRecorder) return;

    this.sessionRecorder = new SessionRecorder(this.options, (sessionId, events) => {
      this.dataUploader?.uploadSession(sessionId, events);
    });
    this.sessionRecorder.start();
  }

  /**
   * 上报错误队列
   */
  private flushErrors(): void {
    if (!this.errorTracker || !this.dataUploader) return;

    const errors = this.errorTracker.getQueue();
    if (errors.length > 0) {
      this.dataUploader.uploadErrors(errors);
      this.errorTracker.clearQueue();
    }
  }

  /**
   * 手动捕获错误
   * @param error - 错误对象或消息
   * @param level - 错误级别
   * @param extra - 额外数据
   */
  captureError(error: Error | string, level?: ErrorLevel, extra?: Record<string, unknown>): void {
    if (!this.errorTracker) {
      console.warn('错误监控未启用');
      return;
    }

    this.errorTracker.captureError(error, level || ErrorLevel.ERROR, extra);
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

  /**
   * 手动收集性能数据
   */
  collectPerformance(): void {
    if (!this.metricsCollector) {
      console.warn('性能监控未启用');
      return;
    }

    this.metricsCollector.collect();
  }

  /**
   * 销毁 SDK
   */
  destroy(): void {
    if (this.sessionRecorder) {
      this.sessionRecorder.stop();
    }

    this.flushErrors();
    this.initialized = false;
  }
}
