/**
 * 项目详情页面
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  AlertCircle,
  Activity,
  Video,
  TrendingUp,
  TrendingDown,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { projectApi, statsApi, errorApi, performanceApi, sessionApi } from '@/lib/api';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { ReplayPlayer } from '@/components/replay/ReplayPlayer';

/**
 * 统计卡片组件
 */
function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down';
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {trend &&
              (trend === 'up' ? (
                <TrendingUp className="h-3 w-3 mr-1 text-red-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-green-500" />
              ))}
            <span>{description}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 错误列表标签页
 */
function ErrorsTab({ projectId }: { projectId: string }) {
  const [selectedError, setSelectedError] = React.useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['errors', projectId],
    queryFn: () => errorApi.list(projectId, { limit: 20 }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!data?.data || data.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">暂无错误记录</p>
      </div>
    );
  }

  if (selectedError) {
    return (
      <ErrorDetailView
        projectId={projectId}
        errorId={selectedError}
        onBack={() => setSelectedError(null)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>错误列表</CardTitle>
        <CardDescription>最近发生的错误记录</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>错误信息</TableHead>
              <TableHead>页面</TableHead>
              <TableHead>级别</TableHead>
              <TableHead>次数</TableHead>
              <TableHead>首次发生</TableHead>
              <TableHead>最近发生</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((error: any) => (
              <TableRow
                key={error.id}
                className="cursor-pointer"
                onClick={() => setSelectedError(error.id)}
              >
                <TableCell className="font-medium max-w-md">
                  <div className="truncate">{error.message}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground truncate max-w-xs">
                    {error.context?.page?.url || '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      error.level === 'error'
                        ? 'destructive'
                        : error.level === 'warning'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {error.level}
                  </Badge>
                </TableCell>
                <TableCell>{error.count || 1}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatRelativeTime(error.firstSeenAt || error.createdAt)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatRelativeTime(error.lastSeenAt || error.createdAt)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedError(error.id);
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/**
 * 错误详情视图
 */
function ErrorDetailView({
  projectId,
  errorId,
  onBack,
}: {
  projectId: string;
  errorId: string;
  onBack: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['error-detail', projectId, errorId],
    queryFn: () => errorApi.get(projectId, errorId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-muted-foreground">错误记录不存在</div>
      </div>
    );
  }

  const error = data.data;
  const breadcrumbs = error.context?.breadcrumbs || [];
  const appFrames = error.resolvedFrames?.filter((f: any) => f.inApp) || [];

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回列表
      </Button>

      {/* 错误基本信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl">{error.message}</CardTitle>
              <CardDescription className="mt-2">{error.context?.page?.url}</CardDescription>
            </div>
            <div className="flex gap-2">
              {error.context?.extra?.environment && (
                <Badge variant="outline">{error.context.extra.environment}</Badge>
              )}
              <Badge
                variant={
                  error.level === 'error'
                    ? 'destructive'
                    : error.level === 'warning'
                      ? 'secondary'
                      : 'outline'
                }
              >
                {error.level}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">发生次数</div>
              <div className="font-semibold">{error.count} 次</div>
            </div>
            <div>
              <div className="text-muted-foreground">首次发生</div>
              <div className="font-semibold">
                {formatRelativeTime(error.firstSeenAt || error.createdAt)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">最后发生</div>
              <div className="font-semibold">
                {formatRelativeTime(error.lastSeenAt || error.createdAt)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">版本</div>
              <div className="font-semibold">{error.context?.extra?.version || '-'}</div>
            </div>
          </div>

          {/* 开发环境提示 */}
          {error.context?.extra?.environment === 'development' && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-semibold">💡 提示：</span>
                <div className="text-blue-800 dark:text-blue-300">
                  <p>开发环境下，建议直接查看浏览器控制台获取最准确的错误信息和源码位置。</p>
                  <p className="mt-1">
                    生产环境需要上传 SourceMap 才能精确定位源码位置，请参考{' '}
                    <a
                      href="https://github.com/your-repo/monitor/blob/main/SOURCEMAP_GUIDE.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium"
                    >
                      SourceMap 使用指南
                    </a>
                    。
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 堆栈信息 */}
      {(appFrames.length > 0 || error.stack) && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>错误堆栈</CardTitle>
                <CardDescription>
                  {appFrames.length > 0
                    ? '已解析的应用代码堆栈（已过滤框架和库的内部代码）'
                    : '原始堆栈信息'}
                </CardDescription>
              </div>
              {error.sourceMapStatus && (
                <div className="text-xs">
                  <Badge
                    variant={error.sourceMapStatus.available ? 'default' : 'secondary'}
                    className="mb-1"
                  >
                    {error.sourceMapStatus.available ? 'SourceMap 可用' : 'SourceMap 不可用'}
                  </Badge>
                  {error.sourceMapStatus.available && (
                    <div className="mt-1 text-muted-foreground">
                      已解析 {error.sourceMapStatus.matchedCount} /{' '}
                      {error.sourceMapStatus.totalFrames} 个堆栈帧
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {appFrames.length > 0 ? (
              <div className="space-y-4">
                {appFrames.map((frame: any, index: number) => {
                  const fileName = frame.originalFileName || frame.fileName;
                  const lineNumber = frame.originalLineNumber || frame.lineNumber;
                  const columnNumber = frame.originalColumnNumber || frame.columnNumber;
                  const functionName = frame.functionName || '<anonymous>';
                  const snippetKey = `${frame.originalFileName}:${frame.originalLineNumber}`;
                  const snippet = error.sourceSnippets?.[snippetKey];
                  const isResolved = !!frame.originalFileName;

                  return (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-mono font-semibold">{functionName}</span>
                        <span className="text-xs text-muted-foreground">
                          {fileName}:{lineNumber}:{columnNumber}
                        </span>
                        {isResolved && (
                          <Badge variant="outline" className="text-xs">
                            已解析
                          </Badge>
                        )}
                      </div>

                      {snippet && snippet.lines ? (
                        <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                          {snippet.lines.map((line: any) => (
                            <div
                              key={line.number}
                              className={`${line.highlight ? 'bg-red-100 dark:bg-red-900/30 font-bold' : ''}`}
                            >
                              <span className="text-muted-foreground mr-4">{line.number}</span>
                              {line.content}
                            </div>
                          ))}
                        </pre>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {isResolved ? '源码内容不可用' : '未找到 SourceMap，无法显示源码'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap">
                  {error.stack}
                </pre>
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-300">
                  <p className="font-medium">⚠️ 未找到对应的 SourceMap</p>
                  <p className="mt-1">
                    请上传 SourceMap 文件以查看源码位置。{' '}
                    {error.context?.extra?.version && (
                      <span>当前版本：{error.context.extra.version}</span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 用户行为追踪 */}
      {breadcrumbs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>用户行为追踪</CardTitle>
            <CardDescription>错误发生前的用户操作</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {breadcrumbs.slice(-10).map((crumb: any, index: number) => (
                <div key={index} className="flex items-start gap-3 text-sm border-l-2 pl-3 py-1">
                  <Badge variant="outline" className="text-xs">
                    {crumb.type}
                  </Badge>
                  <div className="flex-1">
                    <div>{crumb.message}</div>
                    {crumb.data && (
                      <pre className="text-xs text-muted-foreground mt-1">
                        {JSON.stringify(crumb.data, null, 2)}
                      </pre>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(crumb.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 设备和环境信息 */}
      <Card>
        <CardHeader>
          <CardTitle>设备和环境信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {error.context?.device?.userAgent && (
              <div>
                <div className="text-muted-foreground">User Agent</div>
                <div className="font-mono text-xs">{error.context.device.userAgent}</div>
              </div>
            )}
            {error.context?.device?.platform && (
              <div>
                <div className="text-muted-foreground">平台</div>
                <div>{error.context.device.platform}</div>
              </div>
            )}
            {error.context?.device?.language && (
              <div>
                <div className="text-muted-foreground">语言</div>
                <div>{error.context.device.language}</div>
              </div>
            )}
            {error.context?.device?.timezone && (
              <div>
                <div className="text-muted-foreground">时区</div>
                <div>{error.context.device.timezone}</div>
              </div>
            )}
            {error.context?.device?.screenWidth && (
              <div>
                <div className="text-muted-foreground">屏幕分辨率</div>
                <div>
                  {error.context.device.screenWidth} × {error.context.device.screenHeight}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 性能数据标签页
 */
function PerformanceTab({ projectId }: { projectId: string }) {
  const [selectedMetric, setSelectedMetric] = React.useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['performance', projectId],
    queryFn: () => performanceApi.list(projectId, { limit: 20 }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!data?.data || data.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Activity className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">暂无性能数据</p>
      </div>
    );
  }

  if (selectedMetric) {
    return (
      <PerformanceDetailView
        projectId={projectId}
        metricId={selectedMetric}
        onBack={() => setSelectedMetric(null)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>性能数据</CardTitle>
        <CardDescription>页面性能指标</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>页面 URL</TableHead>
              <TableHead>LCP</TableHead>
              <TableHead>FID</TableHead>
              <TableHead>CLS</TableHead>
              <TableHead>TTFB</TableHead>
              <TableHead>FCP</TableHead>
              <TableHead>资源数</TableHead>
              <TableHead>长任务</TableHead>
              <TableHead>时间</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((metric: any) => {
              const webVitals = metric.metrics?.webVitals || {};
              const resources = metric.metrics?.resources || [];
              const longTasks = metric.metrics?.longTasks || [];

              return (
                <TableRow
                  key={metric.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedMetric(metric.id)}
                >
                  <TableCell className="font-medium max-w-md">
                    <div className="truncate">{metric.pageUrl}</div>
                  </TableCell>
                  <TableCell>
                    {webVitals.LCP ? `${(webVitals.LCP / 1000).toFixed(2)}s` : '-'}
                  </TableCell>
                  <TableCell>
                    {webVitals.FID ? `${webVitals.FID.toFixed(0)}ms` : '-'}
                  </TableCell>
                  <TableCell>
                    {webVitals.CLS !== undefined ? webVitals.CLS.toFixed(3) : '-'}
                  </TableCell>
                  <TableCell>
                    {webVitals.TTFB ? `${webVitals.TTFB.toFixed(0)}ms` : '-'}
                  </TableCell>
                  <TableCell>
                    {webVitals.FCP ? `${(webVitals.FCP / 1000).toFixed(2)}s` : '-'}
                  </TableCell>
                  <TableCell>{resources.length > 0 ? resources.length : '-'}</TableCell>
                  <TableCell>
                    {longTasks.length > 0 ? (
                      <Badge variant="destructive">{longTasks.length}</Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatRelativeTime(metric.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMetric(metric.id);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/**
 * 性能数据详情视图
 */
function PerformanceDetailView({
  projectId,
  metricId,
  onBack,
}: {
  projectId: string;
  metricId: string;
  onBack: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['performance-detail', projectId, metricId],
    queryFn: () => performanceApi.get(projectId, metricId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-muted-foreground">性能数据不存在</div>
      </div>
    );
  }

  const metric = data.data;
  const webVitals = metric.metrics?.webVitals || {};
  const resources = metric.metrics?.resources || [];
  const longTasks = metric.metrics?.longTasks || [];
  const memory = metric.metrics?.memory;

  /**
   * 获取 Web Vital 状态颜色
   */
  const getWebVitalStatus = (type: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP', value: number) => {
    switch (type) {
      case 'LCP':
        return value <= 2500 ? 'green' : value <= 4000 ? 'yellow' : 'red';
      case 'FID':
        return value <= 100 ? 'green' : value <= 300 ? 'yellow' : 'red';
      case 'CLS':
        return value <= 0.1 ? 'green' : value <= 0.25 ? 'yellow' : 'red';
      case 'TTFB':
        return value <= 800 ? 'green' : value <= 1800 ? 'yellow' : 'red';
      case 'FCP':
        return value <= 1800 ? 'green' : value <= 3000 ? 'yellow' : 'red';
      default:
        return 'gray';
    }
  };

  /**
   * 格式化文件大小
   */
  const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  };

  /**
   * 格式化时间
   */
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回列表
      </Button>

      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle>性能数据详情</CardTitle>
          <CardDescription>{metric.pageUrl}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">记录时间</div>
              <div className="font-semibold">{formatRelativeTime(metric.createdAt)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">资源数量</div>
              <div className="font-semibold">{resources.length}</div>
            </div>
            <div>
              <div className="text-muted-foreground">长任务数量</div>
              <div className="font-semibold">
                {longTasks.length > 0 ? (
                  <Badge variant="destructive">{longTasks.length}</Badge>
                ) : (
                  '0'
                )}
              </div>
            </div>
            {memory && (
              <div>
                <div className="text-muted-foreground">内存使用</div>
                <div className="font-semibold">{formatSize(memory.used)}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Web Vitals */}
      <Card>
        <CardHeader>
          <CardTitle>Core Web Vitals</CardTitle>
          <CardDescription>Google 核心网页指标</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {webVitals.LCP !== undefined && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">LCP</div>
                  <Badge
                    variant={
                      getWebVitalStatus('LCP', webVitals.LCP) === 'green'
                        ? 'default'
                        : getWebVitalStatus('LCP', webVitals.LCP) === 'yellow'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {getWebVitalStatus('LCP', webVitals.LCP) === 'green'
                      ? '良好'
                      : getWebVitalStatus('LCP', webVitals.LCP) === 'yellow'
                        ? '需改进'
                        : '差'}
                  </Badge>
                </div>
                <div className="text-2xl font-bold">{formatTime(webVitals.LCP)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Largest Contentful Paint
                </div>
              </div>
            )}

            {webVitals.FID !== undefined && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">FID</div>
                  <Badge
                    variant={
                      getWebVitalStatus('FID', webVitals.FID) === 'green'
                        ? 'default'
                        : getWebVitalStatus('FID', webVitals.FID) === 'yellow'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {getWebVitalStatus('FID', webVitals.FID) === 'green'
                      ? '良好'
                      : getWebVitalStatus('FID', webVitals.FID) === 'yellow'
                        ? '需改进'
                        : '差'}
                  </Badge>
                </div>
                <div className="text-2xl font-bold">{formatTime(webVitals.FID)}</div>
                <div className="text-xs text-muted-foreground mt-1">First Input Delay</div>
              </div>
            )}

            {webVitals.CLS !== undefined && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">CLS</div>
                  <Badge
                    variant={
                      getWebVitalStatus('CLS', webVitals.CLS) === 'green'
                        ? 'default'
                        : getWebVitalStatus('CLS', webVitals.CLS) === 'yellow'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {getWebVitalStatus('CLS', webVitals.CLS) === 'green'
                      ? '良好'
                      : getWebVitalStatus('CLS', webVitals.CLS) === 'yellow'
                        ? '需改进'
                        : '差'}
                  </Badge>
                </div>
                <div className="text-2xl font-bold">{webVitals.CLS.toFixed(3)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Cumulative Layout Shift
                </div>
              </div>
            )}

            {webVitals.TTFB !== undefined && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">TTFB</div>
                  <Badge
                    variant={
                      getWebVitalStatus('TTFB', webVitals.TTFB) === 'green'
                        ? 'default'
                        : getWebVitalStatus('TTFB', webVitals.TTFB) === 'yellow'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {getWebVitalStatus('TTFB', webVitals.TTFB) === 'green'
                      ? '良好'
                      : getWebVitalStatus('TTFB', webVitals.TTFB) === 'yellow'
                        ? '需改进'
                        : '差'}
                  </Badge>
                </div>
                <div className="text-2xl font-bold">{formatTime(webVitals.TTFB)}</div>
                <div className="text-xs text-muted-foreground mt-1">Time to First Byte</div>
              </div>
            )}

            {webVitals.FCP !== undefined && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">FCP</div>
                  <Badge
                    variant={
                      getWebVitalStatus('FCP', webVitals.FCP) === 'green'
                        ? 'default'
                        : getWebVitalStatus('FCP', webVitals.FCP) === 'yellow'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {getWebVitalStatus('FCP', webVitals.FCP) === 'green'
                      ? '良好'
                      : getWebVitalStatus('FCP', webVitals.FCP) === 'yellow'
                        ? '需改进'
                        : '差'}
                  </Badge>
                </div>
                <div className="text-2xl font-bold">{formatTime(webVitals.FCP)}</div>
                <div className="text-xs text-muted-foreground mt-1">First Contentful Paint</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 资源加载性能 */}
      {resources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>资源加载性能</CardTitle>
            <CardDescription>共 {resources.length} 个资源</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>资源名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead>耗时</TableHead>
                    <TableHead>开始时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resources
                    .sort((a: any, b: any) => b.duration - a.duration)
                    .map((resource: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs max-w-md">
                          <div className="truncate" title={resource.name}>
                            {resource.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{resource.type}</Badge>
                        </TableCell>
                        <TableCell>{formatSize(resource.size)}</TableCell>
                        <TableCell>
                          <span
                            className={
                              resource.duration > 1000
                                ? 'text-red-600 dark:text-red-400 font-semibold'
                                : resource.duration > 500
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : ''
                            }
                          >
                            {formatTime(resource.duration)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTime(resource.startTime)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 长任务 */}
      {longTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>长任务检测</CardTitle>
            <CardDescription>
              检测到 {longTasks.length} 个超过 50ms 的长任务，可能影响页面性能
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {longTasks.map((task: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">任务 #{index + 1}</div>
                      <div className="text-sm text-muted-foreground">
                        开始时间: {formatTime(task.startTime)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {formatTime(task.duration)}
                      </div>
                      <div className="text-xs text-muted-foreground">执行时长</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 内存使用 */}
      {memory && (
        <Card>
          <CardHeader>
            <CardTitle>内存使用情况</CardTitle>
            <CardDescription>JavaScript 堆内存统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-muted-foreground">已使用</div>
                  <div className="font-semibold">{formatSize(memory.used)}</div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{
                      width: `${(memory.used / memory.limit) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">已使用</div>
                  <div className="font-semibold">{formatSize(memory.used)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">总分配</div>
                  <div className="font-semibold">{formatSize(memory.total)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">限制</div>
                  <div className="font-semibold">{formatSize(memory.limit)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * 会话详情视图
 */
function SessionDetailView({
  projectId,
  sessionId,
  onBack,
}: {
  projectId: string;
  sessionId: string;
  onBack: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['session-detail', projectId, sessionId],
    queryFn: () => sessionApi.get(projectId, sessionId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-muted-foreground">会话记录不存在</div>
      </div>
    );
  }

  const session = data;
  const events = (session.events || []) as any[];

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回列表
      </Button>

      {/* 会话基本信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl">会话详情</CardTitle>
              <CardDescription className="mt-2 font-mono">{session.sessionId}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">用户</div>
              <div className="font-semibold">{session.userInfo?.email || '匿名用户'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">时长</div>
              <div className="font-semibold">
                {session.duration ? `${(session.duration / 1000).toFixed(0)}s` : '-'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">事件数量</div>
              <div className="font-semibold">{events.length}</div>
            </div>
            <div>
              <div className="text-muted-foreground">创建时间</div>
              <div className="font-semibold">{formatRelativeTime(session.createdAt)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 会话回放 */}
      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>会话回放</CardTitle>
            <CardDescription>回放用户的操作过程</CardDescription>
          </CardHeader>
          <CardContent>
            <ReplayPlayer events={events} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Session Replay 标签页
 */
function SessionsTab({ projectId }: { projectId: string }) {
  const [selectedSession, setSelectedSession] = React.useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['sessions', projectId],
    queryFn: () => sessionApi.list(projectId, { limit: 20 }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!data?.data || data.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Video className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">暂无会话录制</p>
      </div>
    );
  }

  if (selectedSession) {
    return (
      <SessionDetailView
        projectId={projectId}
        sessionId={selectedSession}
        onBack={() => setSelectedSession(null)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>会话录制</CardTitle>
        <CardDescription>用户会话回放记录</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session ID</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>时长</TableHead>
              <TableHead>事件数量</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((session: any) => (
              <TableRow
                key={session.id}
                className="cursor-pointer"
                onClick={() => setSelectedSession(session.sessionId)}
              >
                <TableCell className="font-medium font-mono">{session.sessionId}</TableCell>
                <TableCell>{session.userInfo?.email || '匿名用户'}</TableCell>
                <TableCell>
                  {session.duration ? `${(session.duration / 1000).toFixed(0)}s` : '-'}
                </TableCell>
                <TableCell>{session.eventCount || '-'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatRelativeTime(session.createdAt)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSession(session.sessionId);
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/**
 * 项目详情主组件
 */
export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectApi.get(id!),
    enabled: !!id,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', id],
    queryFn: () => statsApi.overview(id!),
    enabled: !!id,
  });

  const handleCopyApiKey = () => {
    if (project?.apiKey) {
      navigator.clipboard.writeText(project.apiKey);
    }
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-muted-foreground">项目不存在</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* 页头 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight">{project.name}</h2>
          <p className="text-muted-foreground">创建于 {formatDate(project.createdAt)}</p>
        </div>
      </div>

      {/* API Key 卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>API Key</CardTitle>
          <CardDescription>用于集成监控 SDK 的密钥</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-muted p-3 rounded break-all">
              {project.apiKey}
            </code>
            <Button variant="outline" size="icon" onClick={handleCopyApiKey}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 统计概览 */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="错误数量"
          value={statsLoading ? '-' : stats?.errors.total || 0}
          description={statsLoading ? '' : `过去 24 小时: ${stats?.errors.last24h || 0}`}
          icon={AlertCircle}
          trend={stats?.errors.last24h ? 'up' : undefined}
        />
        <StatCard
          title="平均 LCP"
          value={
            statsLoading
              ? '-'
              : stats?.performance.avgLCP
                ? `${(stats.performance.avgLCP / 1000).toFixed(2)}s`
                : '-'
          }
          description="Largest Contentful Paint"
          icon={Activity}
        />
        <StatCard
          title="会话数量"
          value={statsLoading ? '-' : stats?.sessions.total || 0}
          description={statsLoading ? '' : `过去 24 小时: ${stats?.sessions.last24h || 0}`}
          icon={Video}
        />
      </div>

      {/* 标签页 */}
      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">错误监控</TabsTrigger>
          <TabsTrigger value="performance">性能数据</TabsTrigger>
          <TabsTrigger value="sessions">会话录制</TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="space-y-4">
          <ErrorsTab projectId={id!} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceTab projectId={id!} />
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <SessionsTab projectId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
