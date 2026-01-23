/**
 * 下拉菜单组件
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * DropdownMenu 上下文
 */
interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | undefined>(undefined);

function useDropdownMenuContext() {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('DropdownMenu components must be used within a DropdownMenu provider');
  }
  return context;
}

/**
 * DropdownMenu 根组件
 */
export interface DropdownMenuProps {
  children: React.ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div ref={menuRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

/**
 * DropdownMenuTrigger 触发器
 */
export interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function DropdownMenuTrigger({
  className,
  children,
  asChild,
  ...props
}: DropdownMenuTriggerProps) {
  const { open, setOpen } = useDropdownMenuContext();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: () => setOpen(!open),
      ...props,
    });
  }

  return (
    <button type="button" className={cn(className)} onClick={() => setOpen(!open)} {...props}>
      {children}
    </button>
  );
}

/**
 * DropdownMenuContent 内容
 */
export interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'end';
}

export function DropdownMenuContent({
  className,
  align = 'end',
  children,
  ...props
}: DropdownMenuContentProps) {
  const { open } = useDropdownMenuContext();

  if (!open) return null;

  return (
    <div
      className={cn(
        'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        align === 'end' ? 'right-0' : 'left-0',
        'mt-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * DropdownMenuItem 菜单项
 */
export interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function DropdownMenuItem({ className, children, ...props }: DropdownMenuItemProps) {
  const { setOpen } = useDropdownMenuContext();

  return (
    <button
      type="button"
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      onClick={(e) => {
        setOpen(false);
        props.onClick?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}
