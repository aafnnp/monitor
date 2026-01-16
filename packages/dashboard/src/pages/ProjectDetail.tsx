/**
 * 项目详情页面
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle, Activity, Video, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { projectApi, statsApi, errorApi, performanceApi, sessionApi } from '@/lib/api';
import { formatDate, formatRelativeTime } from '@/lib/utils';

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
    return <div className="text-center py-8">加载中...</div>;
  }

  if (!data?.data || data.data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>暂无错误记录</p>
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
    <div className="space-y-4">
      {data.data.map((error: any) => (
        <Card
          key={error.id}
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setSelectedError(error.id)}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{error.message}</CardTitle>
                <CardDescription className="mt-1">{error.context?.page?.url}</CardDescription>
              </div>
              <div className="flex flex-col items-end">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    error.level === 'error'
                      ? 'bg-red-100 text-red-800'
                      : error.level === 'warning'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {error.level}
                </span>
                {error.count && error.count > 1 && (
                  <span className="text-xs text-muted-foreground mt-1">发生 {error.count} 次</span>
                )}
              </div>
            </div>
          </CardHeader>
          {error.stack && (
            <CardContent>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-32">
                {error.stack.split('\n').slice(0, 5).join('\n')}
              </pre>
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>首次: {formatRelativeTime(error.firstSeenAt || error.createdAt)}</span>
                <span>最近: {formatRelativeTime(error.lastSeenAt || error.createdAt)}</span>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
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
    return <div className="text-center py-8">加载中...</div>;
  }

  if (!data?.data) {
    return <div className="text-center py-8">错误记录不存在</div>;
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
            <span
              className={`px-3 py-1 rounded text-sm font-medium ${
                error.level === 'error'
                  ? 'bg-red-100 text-red-800'
                  : error.level === 'warning'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
              }`}
            >
              {error.level}
            </span>
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
              <div className="text-muted-foreground">环境</div>
              <div className="font-semibold">{error.context?.extra?.environment || '-'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 堆栈信息 */}
      {appFrames.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>错误堆栈（应用代码）</CardTitle>
            <CardDescription>已过滤框架和库的内部代码</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {appFrames.map((frame: any, index: number) => {
                const fileName = frame.originalFileName || frame.fileName;
                const lineNumber = frame.originalLineNumber || frame.lineNumber;
                const columnNumber = frame.originalColumnNumber || frame.columnNumber;
                const functionName = frame.functionName || '<anonymous>';
                const snippetKey = `${frame.originalFileName}:${frame.originalLineNumber}`;
                const snippet = error.sourceSnippets?.[snippetKey];

                return (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-mono font-semibold">{functionName}</span>
                      <span className="text-xs text-muted-foreground">
                        {fileName}:{lineNumber}:{columnNumber}
                      </span>
                    </div>

                    {snippet && (
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
                    )}
                  </div>
                );
              })}
            </div>
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
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      crumb.type === 'error'
                        ? 'bg-red-100 text-red-800'
                        : crumb.type === 'http'
                          ? 'bg-blue-100 text-blue-800'
                          : crumb.type === 'navigation'
                            ? 'bg-purple-100 text-purple-800'
                            : crumb.type === 'console'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {crumb.type}
                  </span>
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
  const { data, isLoading } = useQuery({
    queryKey: ['performance', projectId],
    queryFn: () => performanceApi.list(projectId, { limit: 20 }),
  });

  if (isLoading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  if (!data?.data || data.data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>暂无性能数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.data.map((metric: any, index: number) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="text-lg">页面性能</CardTitle>
            <CardDescription>{metric.pageUrl}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {metric.webVitals?.LCP && (
                <div>
                  <div className="text-xs text-muted-foreground">LCP</div>
                  <div className="text-lg font-semibold">
                    {(metric.webVitals.LCP / 1000).toFixed(2)}s
                  </div>
                </div>
              )}
              {metric.webVitals?.FID && (
                <div>
                  <div className="text-xs text-muted-foreground">FID</div>
                  <div className="text-lg font-semibold">{metric.webVitals.FID.toFixed(0)}ms</div>
                </div>
              )}
              {metric.webVitals?.CLS && (
                <div>
                  <div className="text-xs text-muted-foreground">CLS</div>
                  <div className="text-lg font-semibold">{metric.webVitals.CLS.toFixed(3)}</div>
                </div>
              )}
              {metric.webVitals?.TTFB && (
                <div>
                  <div className="text-xs text-muted-foreground">TTFB</div>
                  <div className="text-lg font-semibold">{metric.webVitals.TTFB.toFixed(0)}ms</div>
                </div>
              )}
              {metric.webVitals?.FCP && (
                <div>
                  <div className="text-xs text-muted-foreground">FCP</div>
                  <div className="text-lg font-semibold">
                    {(metric.webVitals.FCP / 1000).toFixed(2)}s
                  </div>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-4">
              {formatRelativeTime(metric.createdAt)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Session Replay 标签页
 */
function SessionsTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['sessions', projectId],
    queryFn: () => sessionApi.list(projectId, { limit: 20 }),
  });

  if (isLoading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  if (!data?.data || data.data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>暂无会话录制</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.data.map((session: any) => (
        <Card key={session.id} className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Session {session.sessionId}</CardTitle>
                <CardDescription>{session.userInfo?.email || '匿名用户'}</CardDescription>
              </div>
              <div className="text-right">
                {session.duration && (
                  <div className="text-sm font-medium">
                    时长: {(session.duration / 1000).toFixed(0)}s
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {formatRelativeTime(session.createdAt)}
                </div>
              </div>
            </div>
          </CardHeader>
          {session.eventCount !== undefined && (
            <CardContent>
              <div className="text-sm text-muted-foreground">事件数量: {session.eventCount}</div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
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

  if (projectLoading) {
    return <div className="p-8">加载中...</div>;
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">项目不存在</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* 页头 */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回项目列表
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground mt-1">创建于 {formatDate(project.createdAt)}</p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <div className="text-sm font-medium mb-1">API Key</div>
          <code className="text-xs font-mono break-all">{project.apiKey}</code>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
      <Tabs defaultValue="errors">
        <TabsList>
          <TabsTrigger value="errors">错误监控</TabsTrigger>
          <TabsTrigger value="performance">性能数据</TabsTrigger>
          <TabsTrigger value="sessions">会话录制</TabsTrigger>
        </TabsList>

        <TabsContent value="errors">
          <ErrorsTab projectId={id!} />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceTab projectId={id!} />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionsTab projectId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
