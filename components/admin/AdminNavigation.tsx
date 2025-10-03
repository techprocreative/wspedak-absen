/**
 * Admin Navigation Component
 * Navigation for admin pages including monitoring, analytics, alerts, and reports
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Activity, 
  AlertTriangle, 
  FileText,
  Settings,
  Home,
  Users,
  TrendingUp,
  Brain,
  Shield,
  Server
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: Home,
    current: false,
  },
  {
    name: 'System Monitoring',
    href: '/admin/monitoring',
    icon: Activity,
    current: false,
  },
  {
    name: 'Advanced Analytics',
    href: '/admin/analytics',
    icon: Brain,
    current: false,
  },
  {
    name: 'Alert Management',
    href: '/admin/alerts',
    icon: AlertTriangle,
    current: false,
  },
  {
    name: 'Report Builder',
    href: '/admin/reports',
    icon: FileText,
    current: false,
  },
];

const secondaryNavigation = [
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    current: false,
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    current: false,
  },
];

interface AdminNavigationProps {
  className?: string;
}

export function AdminNavigation({ className }: AdminNavigationProps) {
  const pathname = usePathname();
  
  return (
    <nav className={cn('space-y-1', className)}>
      <div className="px-3 py-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Main
        </h2>
        <div className="mt-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-50',
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                )}
              >
                <item.icon
                  className={cn(
                    isActive
                      ? 'text-gray-500'
                      : 'text-gray-400 group-hover:text-gray-500',
                    'mr-3 h-5 w-5 flex-shrink-0'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
      
      <div className="px-3 py-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Secondary
        </h2>
        <div className="mt-3 space-y-1">
          {secondaryNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-50',
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                )}
              >
                <item.icon
                  className={cn(
                    isActive
                      ? 'text-gray-500'
                      : 'text-gray-400 group-hover:text-gray-500',
                    'mr-3 h-5 w-5 flex-shrink-0'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

interface AdminSidebarProps {
  className?: string;
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  return (
    <div className={cn('flex flex-col w-64 bg-white border-r border-gray-200', className)}>
      <div className="flex items-center h-16 px-4 border-b border-gray-200">
        <div className="flex items-center">
          <Server className="h-8 w-8 text-blue-600" />
          <span className="ml-2 text-lg font-semibold text-gray-900">
            Admin Panel
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <AdminNavigation />
      </div>
    </div>
  );
}

interface AdminBreadcrumbProps {
  className?: string;
}

export function AdminBreadcrumb({ className }: AdminBreadcrumbProps) {
  const pathname = usePathname();
  
  const getPathSegments = () => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [];
    
    if (segments[0] === 'admin') {
      breadcrumbs.push({
        name: 'Admin',
        href: '/admin',
      });
      
      if (segments[1]) {
        const navigationItem = navigation.find(item => item.href === `/admin/${segments[1]}`);
        if (navigationItem) {
          breadcrumbs.push({
            name: navigationItem.name,
            href: navigationItem.href,
          });
        } else {
          breadcrumbs.push({
            name: segments[1].charAt(0).toUpperCase() + segments[1].slice(1),
            href: `/admin/${segments[1]}`,
          });
        }
      }
    }
    
    return breadcrumbs;
  };
  
  const breadcrumbs = getPathSegments();
  
  return (
    <nav className={cn('flex', className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={breadcrumb.href} className="flex items-center">
            {index > 0 && (
              <span className="mx-2 text-gray-400">/</span>
            )}
            <Link
              href={breadcrumb.href}
              className={cn(
                index === breadcrumbs.length - 1
                  ? 'text-gray-900'
                  : 'text-gray-500 hover:text-gray-700',
                'text-sm font-medium'
              )}
            >
              {breadcrumb.name}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface AdminHeaderProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminHeader({ 
  title, 
  description, 
  actions, 
  className 
}: AdminHeaderProps) {
  return (
    <div className={cn('border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8', className)}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <AdminBreadcrumb className="mb-2" />
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
        <div className="flex-shrink-0 ml-4">
          {actions}
        </div>
      </div>
    </div>
  );
}