/**
 * 主布局组件
 */
import { Sidebar } from './Sidebar';
import { Header } from './Header';

/**
 * 布局组件属性
 */
interface LayoutProps {
  children: React.ReactNode;
}

/**
 * 主布局组件
 */
export function Layout({ children }: LayoutProps) {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <Sidebar />
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
