'use client'
import { useEffect, useState } from "react"
import Loading from "../Loading"
import Link from "next/link"
import { ArrowRightIcon, ShieldAlert, Store, ShoppingBag, ExternalLink, Menu, X } from "lucide-react"
import SellerNavbar from "./StoreNavbar"
import SellerSidebar from "./StoreSidebar"
import { dummyStoreData } from "@/assets/assets"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"

const StoreLayout = ({ children }) => {

    const { getToken } = useAuth()

    const [isSeller, setIsSeller] = useState(false)
    const [loading, setLoading] = useState(true)
    const [storeInfo, setStoreInfo] = useState(null)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const fetchIsSeller = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/store/is-seller', { headers: { Authorization: `Bearer ${token}` }})
            setIsSeller(data.isSeller)
            setStoreInfo(data.storeInfo)
        } catch (error) {
            console.log(error)
        }
        finally{
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchIsSeller()
    }, [])

    // Close mobile menu when clicking outside or on a link
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (mobileMenuOpen && e.target.closest('.mobile-menu-content') === null && 
                e.target.closest('.mobile-menu-toggle') === null) {
                setMobileMenuOpen(false)
            }
        }

        document.addEventListener('mousedown', handleOutsideClick)
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick)
        }
    }, [mobileMenuOpen])

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'auto'
        }
        return () => {
            document.body.style.overflow = 'auto'
        }
    }, [mobileMenuOpen])

    return loading ? (
        <Loading />
    ) : isSeller ? (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
            <SellerNavbar 
                storeInfo={storeInfo} 
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
            />
            <div className="flex flex-1 h-full overflow-hidden relative">
                {/* Mobile menu overlay */}
                {mobileMenuOpen && (
                    <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)}></div>
                )}
                
                {/* Mobile sidebar */}
                <div className={`fixed md:relative md:flex h-full z-50 transition-transform duration-300 ease-in-out transform ${
                    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                } mobile-menu-content`}>
                    <SellerSidebar 
                        storeInfo={storeInfo} 
                        closeMobileMenu={() => setMobileMenuOpen(false)} 
                    />
                </div>
                
                {/* Main content */}
                <div className="flex-1 h-full overflow-y-auto hide-scrollbar bg-slate-50 relative">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-green-100/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 z-0 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-slate-100/30 to-transparent rounded-full translate-y-1/2 -translate-x-1/2 z-0 pointer-events-none"></div>
                    
                    {/* Page content */}
                    <div className="relative z-10 p-5 lg:pl-12 lg:pt-12 pb-20">
                        {children}
                    </div>
                    
                    {/* Store footer */}
                    <div className="pb-4 text-center text-xs text-slate-400 relative z-10">
                        <p>© {new Date().getFullYear()} {storeInfo?.name || 'Seller Dashboard'} • All Rights Reserved</p>
                    </div>
                </div>
            </div>
            
            {/* Visit store button (fixed position) */}
            {/* {storeInfo && (
                <Link 
                    href={`/store/${storeInfo.username}`}
                    className="fixed bottom-6 right-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full shadow-lg flex items-center gap-2 py-2.5 px-5 text-sm font-medium hover:shadow-xl transition-all hover:-translate-y-0.5 group z-50"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Store size={16} />
                    <span>View Your Store</span>
                    <ExternalLink size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                </Link>
            )} */}
        </div>
    ) : (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-md bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
                <div className="bg-red-50 w-20 h-20 flex items-center justify-center rounded-full mx-auto mb-6">
                    <ShieldAlert size={36} className="text-red-500" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 mb-3">Access Denied</h1>
                <p className="text-slate-500 mb-6">You don't have seller privileges to access the store dashboard.</p>
                <Link href="/" className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white flex items-center gap-2 py-3 px-6 rounded-lg max-sm:text-sm mx-auto w-fit shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                    Back to Homepage <ArrowRightIcon size={18} />
                </Link>
            </div>
        </div>
    )
}

export default StoreLayout
