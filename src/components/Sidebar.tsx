'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { 
  LayoutDashboard, 
  FolderTree, 
  Database, 
  ShieldAlert, 
  Tags,
  Users,
  Upload,
  FileDown,
  FileText,
  Calculator,
  Wallet,
  Menu,
  ChevronDown,
  ChevronRight,
  Activity,
  Settings,
  Banknote,
  Briefcase,
  CreditCard,
  ShieldCheck,
  CheckCircle,
  Package
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Budget Explorer', href: '/explorer', icon: FolderTree },
  { name: 'Kontrol Anggaran', href: '/kontrol-gaji', icon: Activity },
  { name: 'Kontrol Sumber Dana', href: '/control-sumber-dana', icon: ShieldCheck },
  { name: 'Kontrol Kegiatan Teknis', href: '/kontrol-kegiatan', icon: Package },
  { name: 'Laporan & Rekapitulasi', href: '/laporan', icon: FileText },
  { name: 'Upload Data', href: '/upload', icon: Upload },
  {
    name: 'Menu Lainnya',
    icon: Menu,
    children: [
      { name: 'Kebutuhan Gaji', href: '/kebutuhan-gaji', icon: Calculator },
      { name: 'Kontrol Honor Jasa', href: '/kontrol-honor', icon: Wallet },
      { name: 'Kontrol Pagu', href: '/pagu', icon: Settings },
      { name: 'Sumber Dana', href: '/sumber-dana', icon: Banknote },
      { name: 'Standar Harga', href: '/standar-harga', icon: Tags },
      { name: 'Master Jabatan', href: '/master-jabatan', icon: Briefcase },
      { name: 'Master Gaji', href: '/master-gaji', icon: CreditCard },
      { name: 'Realisasi Anggaran', href: '/realisasi', icon: CheckCircle },
      { name: 'Export Laporan', href: '/export', icon: FileDown },
      { name: 'Manajemen User', href: '/users', icon: Users },
    ]
  }
]

export default function Sidebar() {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ 'Menu Lainnya': true })

  const toggleMenu = (name: string) => {
    setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }))
  }

  return (
    <div className="flex h-full w-64 flex-col bg-gradient-to-b from-primary to-primary-hover text-white shadow-xl z-20 relative">
      <div className="flex h-16 shrink-0 items-center gap-3 px-6 border-b border-white/10 bg-black/10">
        <h1 className="text-lg font-bold tracking-tight text-white leading-tight">SIM-Anggaran<br/>Dikbud</h1>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
        <nav className="flex-1 space-y-1 px-3">
          {navigation.map((item) => {
            if (item.children) {
              const isOpen = openMenus[item.name]
              const isChildActive = item.children.some(child => pathname === child.href || pathname.startsWith(child.href + '/'))
              
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={`
                      w-full group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium
                      ${isChildActive 
                        ? 'text-white' 
                        : 'text-gray-300 hover:bg-primary-hover hover:text-white'}
                    `}
                  >
                    <div className="flex items-center">
                      <item.icon
                        className={`mr-3 h-5 w-5 flex-shrink-0 ${isChildActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </div>
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {isOpen && (
                    <div className="ml-4 space-y-1 border-l-2 border-primary-hover pl-2">
                      {item.children.map((child) => {
                        const isActive = pathname === child.href || pathname.startsWith(child.href + '/')
                        return (
                          <Link
                            key={child.name}
                            href={child.href}
                            className={`
                              group flex items-center rounded-md px-3 py-2 text-sm font-medium
                              ${isActive 
                                ? 'bg-primary-hover text-white' 
                                : 'text-gray-300 hover:bg-primary-hover hover:text-white'}
                            `}
                          >
                            <child.icon
                              className={`mr-3 h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}
                              aria-hidden="true"
                            />
                            {child.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

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
