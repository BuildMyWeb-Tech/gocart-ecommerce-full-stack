'use client'
import { useUser, UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { ShoppingBag, Bell, Settings, ChevronDown, Moon, Sun, Store, ExternalLink, Menu, X } from "lucide-react"
import { useState } from "react"
import Image from "next/image"

const StoreNavbar = ({ storeInfo, mobileMenuOpen, setMobileMenuOpen }) => {
    const { user } = useUser()
    
    const [showProfileMenu, setShowProfileMenu] = useState(false)
    const [theme, setTheme] = useState("light")

    

    // Toggle mobile menu
    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen)
    }

    return (
        <div className="flex items-center justify-between px-4 sm:px-8 lg:px-12 py-3 border-b border-slate-200 transition-all bg-white shadow-sm sticky top-0 z-40">
            <div className="flex items-center">
                {/* Mobile menu toggle button */}
                <button 
                    className="mr-3 p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden mobile-menu-toggle" 
                    onClick={toggleMobileMenu}
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                
                <Link href="/store" className="relative text-4xl font-semibold text-slate-700 flex items-center">
                    <span className="text-green-600">King</span>cart<span className="text-green-600 text-5xl leading-0">.</span>
                    <div className="absolute text-xs font-semibold -top-1.5 -right-12 px-3 py-0.5 rounded-full flex items-center gap-1 text-white bg-gradient-to-r from-green-500 to-green-600 shadow-sm">
                        <Store size={10} />
                        Store
                    </div>
                </Link>
                
               
            </div>
            
            <div className="flex items-center gap-3 sm:gap-5">
                {/* Theme toggle */}
                <button
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
                >
                    {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                
                
                
                
                {/* User info */}
                <div className="flex items-center gap-2 ml-1">
                    <div className="hidden sm:block text-right">
                        <p className="text-sm font-medium text-slate-800">Hi, {user?.firstName}</p>
                        <p className="text-xs text-slate-500">Seller</p>
                    </div>
                    <div className="relative">
                        <UserButton />
                    </div>
                </div>
                
                    
            </div>
        </div>
    )
}

export default StoreNavbar
