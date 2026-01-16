/**
 * React SDK 使用示例
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { initMonitor, ErrorBoundary } from '@monitor/sdk-react';

// 初始化监控 SDK
initMonitor({
  apiKey: 'mk_BZgm_0Y_YshCOVsVDV8OaT6Bd0J1-jIi',
  serverUrl: 'http://localhost:8080',
  enableError: true,
  enablePerformance: true,
  enableReplay: true,
  replaySampleRate: 1, // 100% 录制（仅用于开发测试）
  environment: 'development',
  version: '1.0.0',
  user: {
    id: 'demo-user',
    email: 'gemini0525@foxmail.com',
  },
});

function BuggyComponent() {
  const [count, setCount] = React.useState(0);

  if (count > 5) {
    throw new Error('计数器超过了 5！');
  }

  return (
    <div>
      <h2>错误测试组件</h2>
      <p>当前计数: {count}</p>
      <button onClick={() => setCount(count + 1)}>增加计数</button>
    </div>
  );
}

function App() {
  const handleTestError = () => {
    throw new Error('这是一个手动触发的错误！');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>前端监控 SDK 测试页面</h1>

      <section style={{ marginTop: '20px' }}>
        <h2>错误监控测试</h2>
        <button onClick={handleTestError}>触发全局错误</button>

        <ErrorBoundary fallback={<div>组件出错了！</div>}>
          <BuggyComponent />
        </ErrorBoundary>
      </section>

      <section style={{ marginTop: '20px' }}>
        <h2>性能监控测试</h2>
        <p>页面加载时会自动收集性能数据</p>
      </section>

      <section style={{ marginTop: '20px' }}>
        <h2>Session Replay 测试</h2>
        <p>你的所有操作都会被录制（在开发环境）</p>
        <input type="text" placeholder="输入一些文本..." />
        <button>点击按钮</button>
      </section>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
