/**
 * Session 录制器
 */
import { record } from 'rrweb';
import type { ReplayEvent, SDKOptions } from '@monitor/types';

// rrweb 事件类型
interface EventWithTime {
  type: number;
  data: unknown;
  timestamp: number;
}

export interface SessionHandler {
  (sessionId: string, events: ReplayEvent[]): void;
}

/**
 * Session 录制器类
 */
export class SessionRecorder {
  private options: SDKOptions;
  private onSession?: SessionHandler;
  private stopRecording?: () => void;
  private events: ReplayEvent[] = [];
  private sessionId: string;
  private lastFlushTime: number = Date.now();
  private readonly FLUSH_INTERVAL = 10000; // 10 秒
  private readonly MAX_EVENTS = 100; // 最多缓存 100 个事件

  constructor(options: SDKOptions, onSession?: SessionHandler) {
    this.options = options;
    this.onSession = onSession;
    this.sessionId = this.generateSessionId();
  }

  /**
   * 开始录制
   */
  start(): void {
    if (typeof window === 'undefined') return;

    // 检查是否启用 Session Replay
    if (!this.options.enableReplay) return;

    // 检查采样率
    if (this.options.replaySampleRate && Math.random() > this.options.replaySampleRate) {
      return;
    }

    // 开始录制
    this.stopRecording = record({
      emit: (event) => {
        this.handleEvent(event);
      },
      checkoutEveryNms: 300000, // 每 5 分钟创建新快照
      sampling: {
        // 鼠标移动采样
        mousemove: true,
        // 滚动事件采样间隔
        scroll: 150,
        // 输入事件脱敏
        input: 'last',
      },
      // 隐私保护
      maskAllInputs: true,
      maskInputOptions: {
        password: true,
      },
      // 阻止某些元素被录制
      blockClass: 'monitor-block',
      // 忽略某些元素
      ignoreClass: 'monitor-ignore',
    });

    // 定期上报
    this.startFlushTimer();
  }

  /**
   * 停止录制
   */
  stop(): void {
    if (this.stopRecording) {
      this.stopRecording();
      this.stopRecording = undefined;
    }

    // 上报剩余事件
    this.flush();
  }

  /**
   * 处理录制事件
   * @param event - rrweb 事件
   */
  private handleEvent(event: EventWithTime): void {
    this.events.push({
      type: event.type,
      data: event.data,
      timestamp: event.timestamp,
    });

    // 如果事件数量达到上限，触发上报
    if (this.events.length >= this.MAX_EVENTS) {
      this.flush();
    }
  }

  /**
   * 启动定时上报
   */
  private startFlushTimer(): void {
    setInterval(() => {
      const now = Date.now();
      if (now - this.lastFlushTime >= this.FLUSH_INTERVAL) {
        this.flush();
      }
    }, this.FLUSH_INTERVAL);
  }

  /**
   * 上报事件
   */
  private flush(): void {
    if (this.events.length === 0) return;

    if (this.onSession) {
      this.onSession(this.sessionId, [...this.events]);
    }

    this.events = [];
    this.lastFlushTime = Date.now();
  }

  /**
   * 生成 Session ID
   * @returns Session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 获取当前 Session ID
   * @returns Session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}
