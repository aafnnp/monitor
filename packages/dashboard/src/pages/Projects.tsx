/**
 * 项目列表页面
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { projectApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

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
  
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createMutation.mutate({ name: name.trim() });
    }
  };
  
  if (isLoading) {
    return <div className="p-8">加载中...</div>;
  }
  
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">我的项目</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-2 h-4 w-4" />
          创建项目
        </Button>
      </div>
      
      {showCreate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>创建新项目</CardTitle>
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects?.map((project) => (
          <Card
            key={project.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>创建于 {formatDate(project.createdAt)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <div className="font-mono bg-muted p-2 rounded text-xs break-all">
                  {project.apiKey}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {projects?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>还没有项目，点击上方按钮创建第一个项目</p>
        </div>
      )}
    </div>
  );
}
