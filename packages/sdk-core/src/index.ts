/**
 * SDK Core 入口
 */
export { MonitorSDK } from './MonitorSDK.js';
export { ErrorTracker } from './error/ErrorTracker.js';
export { MetricsCollector } from './performance/MetricsCollector.js';
export { SessionRecorder } from './replay/SessionRecorder.js';
export { DataUploader } from './transport/DataUploader.js';

// 导出类型
export type { SDKOptions, ErrorLevel, ErrorRecord, ErrorContext } from '@monitor/types';
