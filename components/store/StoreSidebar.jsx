'use client'
import { usePathname } from "next/navigation"
import { 
    HomeIcon, LayoutListIcon, SquarePenIcon, SquarePlusIcon, 
    BarChart2, ShoppingBag, Settings, Users, HelpCircle, DollarSign,
    LogOut, Store, Gift, ChevronDown, ChevronRight, ExternalLink, X
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

const StoreSidebar = ({storeInfo, closeMobileMenu}) => {
    const pathname = usePathname()
    const [expandedSection, setExpandedSection] = useState(null)
    const [collapsed, setCollapsed] = useState(false)

    // Enhanced sidebar links with sections and nested items
    const sidebarSections = [
        { 
            name: 'Main',
            items: [
                { name: 'Dashboard', href: '/store', icon: HomeIcon }
            ]
        },
        { 
            name: 'Products',
            items: [
                { name: 'Add Product', href: '/store/add-product', icon: SquarePlusIcon },
                { name: 'Manage Products', href: '/store/manage-product', icon: SquarePenIcon },
            ]
        },
        { 
            name: 'Orders',
            items: [
                { name: 'All Orders', href: '/store/orders', icon: LayoutListIcon },
                { name: 'Pending', href: '/store/orders/pending', icon: ShoppingBag, badge: "3" },
                { name: 'Completed', href: '/store/orders/completed', icon: Gift },
            ]
        },
        { 
            name: 'Analytics',
            items: [
                { name: 'Sales Report', href: '/store/analytics', icon: BarChart2 },
                { name: 'Customer Insights', href: '/store/customers', icon: Users },
            ]
        },
        { 
            name: 'Account',
            items: [
                { name: 'Store Settings', href: '/store/settings', icon: Settings },
                { name: 'Help & Support', href: '/store/help', icon: HelpCircle },
            ]
        },
    ]

    // Function to toggle section expansion
    const toggleSection = (sectionName) => {
        if (expandedSection === sectionName) {
            setExpandedSection(null);
        } else {
            setExpandedSection(sectionName);
        }
    };

    // Handle link click on mobile
    const handleLinkClick = () => {
        if (closeMobileMenu) {
            closeMobileMenu();
        }
    };

    return (
        <div className={`inline-flex h-full flex-col gap-3 border-r border-slate-200 bg-white shadow-sm transition-all relative ${collapsed ? 'sm:w-20' : 'sm:min-w-64'} w-72`}>
            {/* Close button - mobile only */}
            <div className="flex justify-between items-center p-4 md:hidden border-b border-slate-100">
                <p className="font-medium text-slate-800">Menu</p>
                <button 
                    onClick={closeMobileMenu}
                    className="p-1 rounded-md hover:bg-slate-100 text-slate-500"
                    aria-label="Close menu"
                >
                    <X size={20} />
                </button>
            </div>
            
            {/* Store profile section */}
            <div className={`flex ${collapsed ? 'flex-col' : 'flex-row'} gap-3 items-center pt-6 px-4 pb-2 max-sm:px-5`}>
                <div className="relative">
                    <Image 
                        className="w-12 h-12 rounded-full shadow-md border-2 border-white object-cover" 
                        src={storeInfo?.logo} 
                        alt={storeInfo?.name || "Store"} 
                        width={80} 
                        height={80}
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                {(!collapsed || window.innerWidth < 768) && (
                    <div className="flex-1 min-w-0">
                        <p className="text-slate-800 font-medium truncate">{storeInfo?.name}</p>
                        <div className="flex items-center">
                            <span className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded-full">Active</span>
                        </div>
                    </div>
                )}
                
                {/* Collapse button - desktop only */}
                <button 
                    onClick={() => setCollapsed(!collapsed)} 
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors hidden md:block"
                >
                    {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            {/* Navigation links with sections */}
            <div className="flex-1 overflow-y-auto pt-2 pb-6 hide-scrollbar">
                {sidebarSections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="mb-2">
                        {/* Section heading - only show on expanded view */}
                        {(!collapsed || window.innerWidth < 768) && (
                            <div 
                                className="flex items-center justify-between px-6 py-2 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer"
                                onClick={() => toggleSection(section.name)}
                            >
                                <span>{section.name}</span>
                                <ChevronDown 
                                    size={14} 
                                    className={`transition-transform ${expandedSection === section.name ? 'transform rotate-180' : ''}`} 
                                />
                            </div>
                        )}
                        
                        {/* Section items */}
                        <div className={`transition-all ${expandedSection !== null && expandedSection !== section.name && !collapsed && window.innerWidth >= 768 ? 'hidden' : ''}`}>
                            {section.items.map((link, itemIndex) => (
                                <Link 
                                    key={`${sectionIndex}-${itemIndex}`} 
                                    href={link.href} 
                                    className={`relative flex items-center gap-3 hover:bg-slate-50 p-2.5 ${collapsed && window.innerWidth >= 768 ? 'justify-center' : 'pl-6 pr-3'} transition-all ${pathname === link.href ? 'bg-gradient-to-r from-slate-50 to-slate-100 font-medium sm:text-slate-800' : 'text-slate-500 hover:text-slate-600'}`}
                                    onClick={handleLinkClick}
                                >
                                    <link.icon size={18} className={pathname === link.href ? 'text-green-500' : ''} />
                                    {(!collapsed || window.innerWidth < 768) && <p className="truncate">{link.name}</p>}
                                    {link.badge && (!collapsed || window.innerWidth < 768) && (
                                        <span className="ml-auto text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">{link.badge}</span>
                                    )}
                                    {pathname === link.href && (
                                        <span className="absolute bg-gradient-to-b from-green-400 to-green-600 right-0 top-0 bottom-0 w-1.5 rounded-l"></span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Visit store button */}
            {/* {(!collapsed || window.innerWidth < 768) && storeInfo && (
                <div className="mt-auto border-t border-slate-100 pt-3 pb-4 px-4">
                    <Link 
                        href={`/store/${storeInfo.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 hover:from-green-50 hover:to-green-100 text-slate-700 hover:text-green-600 transition-colors border border-slate-200 text-sm"
                    >
                        <Store size={16} />
                        <span>View Your Store</span>
                        <ExternalLink size={14} className="ml-auto" />
                    </Link>
                </div>
            )} */}
            
            {/* Collapsed view store link */}
            {/* {collapsed && window.innerWidth >= 768 && storeInfo && (
                <div className="mt-auto border-t border-slate-100 pt-3 pb-4 flex justify-center">
                    <Link 
                        href={`/store/${storeInfo.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-lg hover:bg-slate-100 text-green-600 transition-colors"
                    >
                        <Store size={18} />
                    </Link>
                </div>
            )} */}
        </div>
    )
}

export default StoreSidebar
