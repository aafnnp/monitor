/**
 * 数据上传器
 */
import type { SDKOptions, ReplayEvent, ErrorRecord } from '@monitor/types';
import type { PerformanceData } from '../performance/MetricsCollector.js';

/**
 * 数据上传器类
 */
export class DataUploader {
  private options: SDKOptions;

  constructor(options: SDKOptions) {
    this.options = options;

    // 页面卸载时上传剩余数据
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }
  }

  /**
   * 上报错误
   * @param errors - 错误列表
   */
  async uploadErrors(errors: Omit<ErrorRecord, 'id' | 'projectId' | 'createdAt'>[]): Promise<void> {
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
      }
    } catch (error) {
      console.error('上报错误失败:', error);
    }
  }

  /**
   * 上报 Session 录制数据
   * @param sessionId - Session ID
   * @param events - 事件列表
   */
  async uploadSession(sessionId: string, events: ReplayEvent[]): Promise<void> {
    try {
      const response = await fetch(`${this.options.serverUrl}/api/report/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.options.apiKey,
        },
        body: JSON.stringify({
          sessionId,
          events,
          userInfo: this.options.user,
        }),
      });

      if (!response.ok) {
        console.error('上报 Session 失败:', response.statusText);
      }
    } catch (error) {
      console.error('上报 Session 失败:', error);
    }
  }

  /**
   * 上报性能数据
   * @param data - 性能数据
   */
  async uploadPerformance(data: PerformanceData): Promise<void> {
    try {
      const response = await fetch(`${this.options.serverUrl}/api/report/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.options.apiKey,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error('上报性能数据失败:', response.statusText);
      }
    } catch (error) {
      console.error('上报性能数据失败:', error);
    }
  }

  /**
   * 立即上报所有数据
   */
  flush(): void {
    // 由外部的 MonitorSDK 调用具体的上报方法
  }
}
