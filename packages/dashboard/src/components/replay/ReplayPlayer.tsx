/**
 * 会话回放播放器组件
 * 基于 rrweb-player 实现会话录制回放
 */
import { useEffect, useRef } from 'react';
import rrwebPlayer from 'rrweb-player';
import type { ReplayEvent } from '@monitor/types';
import 'rrweb-player/dist/style.css';

/**
 * 会话回放播放器属性
 */
interface ReplayPlayerProps {
  /** 回放事件列表 */
  events: ReplayEvent[];
  /** 是否自动播放 */
  autoPlay?: boolean;
  /** 播放速度 */
  speed?: number;
}

/**
 * 会话回放播放器组件
 */
export function ReplayPlayer({ events, autoPlay = false, speed = 1 }: ReplayPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || events.length === 0) {
      return;
    }

    // 清理之前的播放器实例
    if (playerRef.current) {
      try {
        playerRef.current.destroy?.();
      } catch (error) {
        console.error('销毁播放器失败:', error);
      }
      playerRef.current = null;
    }

    // 清空容器
    containerRef.current.innerHTML = '';

    try {
      // 创建新的播放器实例
      const player = new rrwebPlayer({
        target: containerRef.current,
        props: {
          events: events as any,
          autoPlay,
          speed,
          showController: true,
          mouseTail: {
            strokeStyle: '#ff0000',
            lineWidth: 2,
          },
        },
      });

      playerRef.current = player;

      // 清理函数
      return () => {
        if (playerRef.current) {
          try {
            playerRef.current.destroy?.();
          } catch (error) {
            console.error('清理播放器失败:', error);
          }
          playerRef.current = null;
        }
      };
    } catch (error) {
      console.error('创建回放播放器失败:', error);
    }
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy?.();
      }
    };
  }, [events, autoPlay, speed]);

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] border rounded-lg bg-muted">
        <div className="text-muted-foreground">暂无回放数据</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="w-full border rounded-lg overflow-hidden bg-white"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}
