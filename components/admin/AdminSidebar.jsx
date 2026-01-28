'use client'
import { usePathname } from "next/navigation"
import { 
    HomeIcon, 
    ShieldCheckIcon, 
    StoreIcon, 
    TicketPercentIcon,
    LogOutIcon,
    UsersIcon,
    ShoppingBagIcon,
    SettingsIcon,
    LayoutDashboardIcon
    
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { assets } from "@/assets/assets"
import { useUser } from "@clerk/nextjs"

const AdminSidebar = ({ setSidebarOpen }) => {
    const { user } = useUser()
    const pathname = usePathname()

    const sidebarLinks = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboardIcon },
        { name: 'Stores', href: '/admin/stores', icon: StoreIcon },
        { name: 'Approve Store', href: '/admin/approve', icon: ShieldCheckIcon },
        { name: 'Coupons', href: '/admin/coupons', icon: TicketPercentIcon },
        { name: 'Products', href: '/admin/products', icon: ShoppingBagIcon },
        { name: 'Users', href: '/admin/users', icon: UsersIcon },
        { name: 'Settings', href: '/admin/settings', icon: SettingsIcon },
    ]

    return user && (
        <div className="inline-flex h-full flex-col bg-white border-r border-slate-200 shadow-sm min-w-64 w-64">
            
            
            {/* <div className="flex flex-col items-center pt-6 pb-8">
                <div className="relative">
                    <Image className="w-20 h-20 rounded-full object-cover border-2 border-white shadow" src={user.imageUrl} alt="" width={80} height={80} />
                    <span className="absolute bottom-0 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
                </div>
                <h3 className="text-slate-800 font-medium mt-3">{user.fullName}</h3>
                <p className="text-slate-500 text-xs">Administrator</p>
                <div className="bg-green-50 text-green-600 text-xs font-medium px-3 py-1 rounded-full mt-2">
                    Super Admin
                </div>
            </div> */}
            
            {/* <div className="px-3 font-medium text-xs text-slate-400 mt-2">MENU</div> */}
            
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
                                // Close sidebar on mobile after clicking a link
                                if (window.innerWidth < 768) {
                                    setSidebarOpen(false)
                                }
                            }}
                        >
                            <link.icon size={18} />
                            <p className="text-sm font-medium">{link.name}</p>
                            {pathname === link.href && (
                                <span className="absolute inset-y-0 left-0 w-1 bg-green-600 rounded-r-full" aria-hidden="true"></span>
                            )}
                        </Link>
                    ))}
                </nav>
            </div>
            
 
        </div>
    )
}

export default AdminSidebar
