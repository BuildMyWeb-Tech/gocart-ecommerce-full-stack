'use client'
import ProductCard from "@/components/ProductCard"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { MailIcon, MapPinIcon, PhoneIcon, CheckCircleIcon, ClockIcon, StarIcon, ShieldCheck, Package, Gift, Truck, Sparkles } from "lucide-react"
import Loading from "@/components/Loading"
import Image from "next/image"
import axios from "axios"
import toast from "react-hot-toast"
import Link from "next/link"

export default function StoreShop() {
    const { username } = useParams()
    const [products, setProducts] = useState([])
    const [storeInfo, setStoreInfo] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeCategory, setActiveCategory] = useState('All')

    const fetchStoreData = async () => {
        try {
            const { data } = await axios.get(`/api/store/data?username=${username}`)
            setStoreInfo(data.store)
            setProducts(data.store.Product)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchStoreData()
    }, [])
    
    // Get unique categories from products
    const categories = ['All', ...new Set(products.map(product => product.category).filter(Boolean))]
    
    // Filter products by category
    const filteredProducts = activeCategory === 'All' 
        ? products 
        : products.filter(product => product.category === activeCategory)

    return !loading ? (
        <div className="min-h-[70vh] mx-6">
            {/* Store Info Banner */}
            {storeInfo && (
                <div className="max-w-7xl mx-auto bg-gradient-to-r from-slate-50 via-white to-slate-100 rounded-xl p-6 md:p-10 mt-6 flex flex-col md:flex-row items-center gap-6 shadow-md relative overflow-hidden border border-slate-100">
                    {/* Background decorative elements */}
                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-green-50 rounded-full opacity-30 z-0"></div>
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-50 rounded-full opacity-30 z-0"></div>
                    <div className="absolute top-1/3 left-1/2 w-20 h-20 bg-amber-50 rounded-full opacity-20 z-0"></div>
                    
                    {/* Store Logo */}
                    <div className="relative z-10">
                        <div className="relative inline-block">
                            <Image
                                src={storeInfo.logo}
                                alt={storeInfo.name}
                                className="size-32 sm:size-40 object-cover border-4 border-white rounded-xl shadow-md transition-transform hover:scale-105 duration-300"
                                width={200}
                                height={200}
                                style={{objectFit: 'cover'}}
                            />
                            
                            {/* Verification Badge with animation */}
                            <div className="absolute -bottom-3 -right-3 bg-white rounded-full p-1.5 shadow-lg">
                                <CheckCircleIcon size={24} className="text-green-500" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-center md:text-left relative z-10 flex-1">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">{storeInfo.name}</h1>
                                <div className="flex items-center gap-2 justify-center md:justify-start mt-2 mb-3">
                                    <div className="flex">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <StarIcon 
                                                key={star} 
                                                size={16} 
                                                className="text-yellow-400 drop-shadow-sm" 
                                                fill="#FBBF24"
                                                strokeWidth={0}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-sm text-slate-600">
                                        <span className="font-medium">4.8</span> (120 reviews)
                                    </span>
                                </div>
                            </div>
                            
                            {/* Store stats */}
                            <div className="flex gap-4 justify-center md:justify-start text-sm">
                                <div className="flex flex-col items-center bg-white py-2 px-4 rounded-lg shadow-sm border border-slate-100 hover:border-slate-200 transition-all hover:shadow-md">
                                    <span className="font-bold text-slate-800">{products.length}</span>
                                    <span className="text-xs text-slate-500">Products</span>
                                </div>
                                <div className="flex flex-col items-center bg-white py-2 px-4 rounded-lg shadow-sm border border-slate-100 hover:border-slate-200 transition-all hover:shadow-md">
                                    <span className="font-bold text-slate-800">98%</span>
                                    <span className="text-xs text-slate-500">Satisfaction</span>
                                </div>
                                <div className="flex flex-col items-center bg-white py-2 px-4 rounded-lg shadow-sm border border-slate-100 hover:border-slate-200 transition-all hover:shadow-md">
                                    <span className="font-bold text-slate-800">2d</span>
                                    <span className="text-xs text-slate-500">Shipping</span>
                                </div>
                            </div>
                        </div>
                        
                        <p className="text-sm text-slate-600 mt-4 max-w-2xl leading-relaxed">{storeInfo.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                            <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg shadow-sm border border-slate-100 hover:border-slate-200 transition-all">
                                <div className="bg-slate-100 p-2 rounded-full">
                                    <MapPinIcon className="w-4 h-4 text-slate-700" />
                                </div>
                                <span className="text-sm text-slate-700 font-medium">{storeInfo.address}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg shadow-sm border border-slate-100 hover:border-slate-200 transition-all">
                                <div className="bg-slate-100 p-2 rounded-full">
                                    <MailIcon className="w-4 h-4 text-slate-700" />
                                </div>
                                <span className="text-sm text-slate-700 font-medium">{storeInfo.email}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg shadow-sm border border-slate-100 hover:border-slate-200 transition-all">
                                <div className="bg-slate-100 p-2 rounded-full">
                                    <ClockIcon className="w-4 h-4 text-slate-700" />
                                </div>
                                <span className="text-sm text-slate-700 font-medium">Est. 2023</span>
                            </div>
                        </div>

                        {/* Store features */}
                        <div className="flex flex-wrap gap-3 mt-6">
                            <div className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                <ShieldCheck size={12} className="text-blue-600" />
                                Verified Seller
                            </div>
                            <div className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                <Truck size={12} className="text-green-600" />
                                Fast Delivery
                            </div>
                            <div className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                <Package size={12} className="text-amber-600" />
                                Quality Products
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Tabs */}
            {categories.length > 1 && (
                <div className="max-w-7xl mx-auto mt-8 overflow-x-auto">
                    <div className="flex space-x-1.5 min-w-max pb-1">
                        {categories.map((category) => (
                            <button
                                key={category}
                                className={`px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-300 ${
                                    activeCategory === category
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md transform scale-105'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-sm'
                                }`}
                                onClick={() => setActiveCategory(category)}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Products */}
            <div className="max-w-7xl mx-auto mb-40">
                <div className="flex items-center justify-between mt-12">
                    <h1 className="text-2xl">Shop <span className="text-slate-800 font-semibold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">{activeCategory !== 'All' ? activeCategory : 'Products'}</span></h1>
                    <p className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">{filteredProducts.length} products</p>
                </div>
                
                {filteredProducts.length > 0 ? (
                    <div className="mt-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 xl:gap-8 mx-auto">
                        {filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="bg-slate-100 p-6 rounded-full mb-6 shadow-inner">
                            <MapPinIcon className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-800 mb-2">No products found</h3>
                        <p className="text-sm text-slate-500 max-w-md mb-6">
                            There are no products in this category yet. Please check back later or browse other categories.
                        </p>
                        <button 
                            onClick={() => setActiveCategory('All')} 
                            className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white px-5 py-2.5 rounded-lg transition-all text-sm font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                        >
                            View All Products
                        </button>
                    </div>
                )}
            </div>
        </div>
    ) : <Loading />
}
