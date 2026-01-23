/**
 * 侧边栏组件
 */
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

/**
 * 导航项配置
 */
const navItems = [
  {
    title: '项目',
    icon: FolderKanban,
    href: '/',
  },
  {
    title: '设置',
    icon: Settings,
    href: '/settings',
  },
];

/**
 * 侧边栏组件
 */
export function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      navigate('/login');
    } catch (error) {
      console.error('登出失败:', error);
      navigate('/login');
    }
  };

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <a href="/" className="flex items-center gap-2 font-semibold">
            <LayoutDashboard className="h-6 w-6" />
            <span className="text-lg">监控系统</span>
          </a>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-accent hover:text-primary',
                      isActive && 'bg-accent text-primary'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </NavLink>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            登出
          </Button>
        </div>
      </div>
    </div>
  );
}
