// components/store/StoreSidebar.jsx
'use client';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  LayoutListIcon,
  SquarePenIcon,
  SquarePlusIcon,
  BarChart2,
  ShoppingBag,
  Settings,
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Package,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

const sidebarLinks = [
  { name: 'Dashboard', href: '/store', icon: HomeIcon },
  { name: 'Product Categories', href: '/store/categories', icon: LayoutListIcon },
  { name: 'Add Product', href: '/store/add-product', icon: SquarePlusIcon },
  { name: 'Manage Products', href: '/store/manage-product', icon: SquarePenIcon },
  { name: 'Inventory', href: '/store/inventory', icon: Package },
  { name: 'Orders', href: '/store/orders', icon: ShoppingBag },
  { name: 'Sales Report', href: '/store/analytics', icon: BarChart2 },
  { name: 'Store Settings', href: '/store/settings', icon: Settings },
  { name: 'Help & Support', href: '/store/help', icon: HelpCircle },
];

const StoreSidebar = ({ storeInfo, closeMobileMenu }) => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const handleLinkClick = () => {
    if (closeMobileMenu) closeMobileMenu();
  };

  return (
    <div
      className={`inline-flex h-full flex-col gap-3 border-r border-slate-200 bg-white shadow-sm transition-all relative ${collapsed ? 'sm:w-20' : 'sm:min-w-64'} w-72`}
    >
      {/* Close button - mobile only */}
      <div className="flex justify-between items-center p-4 md:hidden border-b border-slate-100">
        <p className="font-medium text-slate-800">Menu</p>
        <button
          onClick={closeMobileMenu}
          className="p-1 rounded-md hover:bg-slate-100 text-slate-500"
        >
          <X size={20} />
        </button>
      </div>

      {/* Store profile */}
      <div
        className={`flex ${collapsed ? 'flex-col' : 'flex-row'} gap-3 items-center pt-6 px-4 pb-2`}
      >
        <div className="relative">
          <Image
            className="w-12 h-12 rounded-full shadow-md border-2 border-white object-cover"
            src={storeInfo?.logo || '/placeholder.png'}
            alt={storeInfo?.name || 'Store'}
            width={80}
            height={80}
          />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-slate-800 font-medium truncate">{storeInfo?.name}</p>
            <span className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded-full">
              Active
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 hidden md:block"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav links */}
      <div className="flex-1 overflow-y-auto pt-2 pb-6">
        {sidebarLinks.map((link) => {
          const isActive =
            link.href === '/store' ? pathname === '/store' : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={handleLinkClick}
              className={`relative flex items-center gap-3 p-2.5 ${collapsed ? 'justify-center' : 'pl-6 pr-3'} transition-all hover:bg-slate-50 ${
                isActive
                  ? 'bg-gradient-to-r from-slate-50 to-slate-100 font-medium text-slate-800'
                  : 'text-slate-500 hover:text-slate-600'
              }`}
            >
              <link.icon size={18} className={isActive ? 'text-green-500' : ''} />
              {!collapsed && <p className="truncate">{link.name}</p>}
              {link.badge && !collapsed && (
                <span className="ml-auto text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                  {link.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute bg-gradient-to-b from-green-400 to-green-600 right-0 top-0 bottom-0 w-1.5 rounded-l" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default StoreSidebar;
