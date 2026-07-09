'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  FolderTree, 
  Database, 
  ShieldAlert, 
  Tags,
  Users,
  Upload,
  FileDown,
  FileText
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Budget Explorer', href: '/explorer', icon: FolderTree },
  { name: 'Kebutuhan Gaji', href: '/kebutuhan-gaji', icon: Users },
  { name: 'Laporan', href: '/laporan', icon: FileText },
  { name: 'Sumber Dana', href: '/sumber-dana', icon: Database },
  { name: 'Kontrol Pagu', href: '/pagu', icon: ShieldAlert },
  { name: 'Standar Harga', href: '/standar-harga', icon: Tags },
  { name: 'Master Jabatan', href: '/master-jabatan', icon: Users },
  { name: 'Master Gaji', href: '/master-gaji', icon: Database },
  { name: 'Upload Data', href: '/upload', icon: Upload },
  { name: 'Control Sumber Dana', href: '/control-sumber-dana', icon: ShieldAlert },
  { name: 'Export Laporan', href: '/export', icon: FileDown },
  { name: 'Manajemen User', href: '/users', icon: Users },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-primary text-white">
      <div className="flex h-16 shrink-0 items-center px-6">
        <h1 className="text-xl font-bold tracking-tight">Tomohon Budget</h1>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
        <nav className="flex-1 space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center rounded-md px-3 py-2 text-sm font-medium
                  ${isActive 
                    ? 'bg-primary-hover text-white' 
                    : 'text-gray-300 hover:bg-primary-hover hover:text-white'}
                `}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
