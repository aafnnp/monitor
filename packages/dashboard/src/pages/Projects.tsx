/**
 * 项目列表页面
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MoreVertical, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { projectApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

/**
 * 项目列表页面
 */
export function Projects() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectApi.list,
  });

  const createMutation = useMutation({
    mutationFn: projectApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowCreate(false);
      setName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: projectApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createMutation.mutate({ name: name.trim() });
    }
  };

  const handleCopyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个项目吗？此操作不可恢复。')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">项目</h2>
          <p className="text-muted-foreground">管理和监控您的项目</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-2 h-4 w-4" />
          创建项目
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>创建新项目</CardTitle>
            <CardDescription>创建一个新的监控项目</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="项目名称"
                  required
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? '创建中...' : '创建'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreate(false);
                    setName('');
                  }}
                >
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {projects && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl">{project.name}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyApiKey(project.apiKey);
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      复制 API Key
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(project.id);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      删除项目
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground mb-2">
                  创建于 {formatDate(project.createdAt)}
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs font-medium mb-1">API Key</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-muted p-2 rounded flex-1 break-all">
                        {project.apiKey}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyApiKey(project.apiKey);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">还没有项目</h3>
              <p className="text-sm text-muted-foreground mb-4">点击上方按钮创建第一个项目</p>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="mr-2 h-4 w-4" />
                创建项目
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
