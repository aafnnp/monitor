#!/bin/bash
echo "正在停止旧服务..."
pkill -f "node.*@monitor/server"
pkill -f "vite.*@monitor/dashboard"
sleep 2
echo "重新启动服务..."
cd /Users/pfan/Workplaces/github/monitor
pnpm dev > /tmp/monitor.log 2>&1 &
echo "服务已在后台启动，日志输出到 /tmp/monitor.log"
echo "请等待 5 秒让服务完全启动..."
sleep 5
echo "✅ 完成！现在可以刷新浏览器测试了"
