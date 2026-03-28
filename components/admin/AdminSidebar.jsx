'use client'
import { usePathname } from "next/navigation"
import {
  ShieldCheckIcon,
  StoreIcon,
  TicketPercentIcon,
  ShoppingBagIcon,
  UsersIcon,
  SettingsIcon,
  LayoutDashboardIcon,
  LayersIcon,
} from 'lucide-react';
import Link from "next/link"
import { useUser } from "@clerk/nextjs"

const AdminSidebar = ({ setSidebarOpen }) => {
    const { user } = useUser()
    const pathname = usePathname()

    const sidebarLinks = [
      { name: 'Dashboard',    href: '/admin',          icon: LayoutDashboardIcon },
      { name: 'Categories',   href: '/admin/categories', icon: LayersIcon },
      { name: 'Stores',       href: '/admin/stores',   icon: StoreIcon },
      { name: 'Approve Store',href: '/admin/approve',  icon: ShieldCheckIcon },
      { name: 'Coupons',      href: '/admin/coupons',  icon: TicketPercentIcon },
      { name: 'Products',     href: '/admin/products', icon: ShoppingBagIcon },
      { name: 'Users',        href: '/admin/users',    icon: UsersIcon },
      { name: 'Settings',     href: '/admin/settings', icon: SettingsIcon },
    ];

    return user && (
        <div className="inline-flex h-full flex-col bg-white border-r border-slate-200 shadow-sm min-w-64 w-64">
            <div className="flex-1 overflow-y-auto py-2">
                <nav className="px-3 space-y-1">
                    {sidebarLinks.map((link, index) => (
                        <Link
                            key={index}
                            href={link.href}
                            className={`relative flex items-center gap-3 p-3 rounded-lg transition-colors duration-150 ${
                                pathname === link.href
                                ? 'bg-green-50 text-green-600'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-700'
                            }`}
                            onClick={() => {
                                if (window.innerWidth < 768) setSidebarOpen(false)
                            }}
                        >
                            <link.icon size={18} />
                            <p className="text-sm font-medium">{link.name}</p>
                            {pathname === link.href && (
                                <span className="absolute inset-y-0 left-0 w-1 bg-green-600 rounded-r-full" aria-hidden="true" />
                            )}
                        </Link>
                    ))}
                </nav>
            </div>
        </div>
    )
}

export default AdminSidebar