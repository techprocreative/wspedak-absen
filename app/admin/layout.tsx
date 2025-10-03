/**
 * Admin Layout
 * Layout for all admin pages with sidebar navigation
 * Protected by authentication
 */

"use client"

// Consolidated guard: Layout now wraps admin pages (except login)
// with AdminAuthGuard and AdminLayout, so pages don't need their own guard.
import { usePathname } from 'next/navigation';
import { AdminAuthGuard } from '@/components/admin-auth-guard';
import { AdminLayout as AdminChrome } from '@/components/admin-layout';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Compute login page synchronously to keep SSR/CSR output identical
  const isLoginPage = pathname === '/admin/login';

  // Don't render any wrappers for login page
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Consolidated: guard + chrome here
  return (
    <AdminAuthGuard>
      <AdminChrome>{children}</AdminChrome>
    </AdminAuthGuard>
  );
}
