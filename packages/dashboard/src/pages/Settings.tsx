/**
 * 设置页面
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

/**
 * 设置页面
 */
export function Settings() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">设置</h2>
        <p className="text-muted-foreground">管理您的账户和偏好设置</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>账户设置</CardTitle>
            <CardDescription>更新您的账户信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                邮箱
              </label>
              <Input id="email" type="email" placeholder="your@email.com" />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                密码
              </label>
              <Input id="password" type="password" placeholder="••••••••" />
            </div>
            <Button>保存更改</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>通知设置</CardTitle>
            <CardDescription>管理您的通知偏好</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">通知设置功能即将推出</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
