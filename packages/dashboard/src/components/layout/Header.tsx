/**
 * 顶部导航栏组件
 */
import { Search, Bell, User } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

/**
 * 顶部导航栏
 */
export function Header() {
  return (
    <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 border-b px-4 lg:h-[60px] lg:px-6">
        <div className="flex flex-1 items-center gap-4 md:gap-2 md:ml-auto">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="搜索..."
                className="w-full appearance-none bg-background pl-8 shadow-none md:w-64"
              />
            </div>
          </div>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive"></span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-4 w-4" />
                <span className="sr-only">用户菜单</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>个人资料</DropdownMenuItem>
              <DropdownMenuItem>设置</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
