'use client'

import { Bell, User } from 'lucide-react'
import Image from 'next/image'
import LogoutButton from './LogoutButton'
import { useYear } from '@/contexts/YearContext'

export default function Header() {
  const { tahun, setTahun } = useYear();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden relative">
            <Image 
              src="/logo-tomohon.png" 
              alt="Logo Tomohon" 
              width={40} 
              height={40}
              className="object-contain"
            />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Pemerintah Kota Tomohon</h2>
            <p className="text-xs text-secondary">Aplikasi Monitoring Anggaran SKPD</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <select 
          value={tahun}
          onChange={(e) => setTahun(Number(e.target.value))}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
        >
          <option value={2026}>TA 2026</option>
          <option value={2025}>TA 2025</option>
        </select>
        <button className="rounded-full p-1 text-secondary hover:bg-gray-100 hover:text-foreground">
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-4 border-l pl-4 ml-2 border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden md:block text-sm">
              <p className="font-medium text-gray-700">User Dinas</p>
              <p className="text-xs text-gray-500">Dinas Pendidikan</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
