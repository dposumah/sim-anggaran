'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return (
      <div className="flex min-h-screen overflow-hidden bg-gray-50">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 flex flex-col">
          <div className="flex-1">
            {children}
          </div>
          <footer className="mt-auto pt-6 pb-2 text-center text-sm text-gray-500">
            &copy; 2026 [DN] Sekretariat Dikbud Tomohon
          </footer>
        </main>
      </div>
    </div>
  );
}
