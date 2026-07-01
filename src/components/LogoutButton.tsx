'use client';

import { LogOut } from 'lucide-react';
import { logout } from '@/app/login/actions';

export default function LogoutButton() {
  return (
    <button 
      onClick={() => logout()}
      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
    >
      <LogOut className="w-4 h-4" />
      <span>Keluar</span>
    </button>
  );
}
