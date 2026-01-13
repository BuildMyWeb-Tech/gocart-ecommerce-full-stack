'use client'
import ProductCard from "@/components/ProductCard"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { MailIcon, MapPinIcon, PhoneIcon, CheckCircleIcon, ClockIcon, StarIcon } from "lucide-react"
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
                <div className="max-w-7xl mx-auto bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 md:p-10 mt-6 flex flex-col md:flex-row items-center gap-6 shadow-md relative overflow-hidden">
                    {/* Background decorative elements */}
                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-green-50 rounded-full opacity-30 z-0"></div>
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-50 rounded-full opacity-30 z-0"></div>
                    
                    {/* Store Logo */}
                    <div className="relative z-10">
                        <Image
                            src={storeInfo.logo}
                            alt={storeInfo.name}
                            className="size-32 sm:size-38 object-cover border-4 border-white rounded-xl shadow-md"
                            width={200}
                            height={200}
                        />
                        
                        {/* Verification Badge */}
                        <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm">
                            <CheckCircleIcon size={20} className="text-green-500" />
                        </div>
                    </div>
                    
                    <div className="text-center md:text-left relative z-10 flex-1">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-800">{storeInfo.name}</h1>
                                <div className="flex items-center gap-2 justify-center md:justify-start mt-2 mb-3">
                                    <div className="flex">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <StarIcon 
                                                key={star} 
                                                size={16} 
                                                className="text-yellow-400" 
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
                                <div className="flex flex-col items-center bg-white py-2 px-4 rounded-lg shadow-sm">
                                    <span className="font-bold text-slate-800">{products.length}</span>
                                    <span className="text-xs text-slate-500">Products</span>
                                </div>
                                <div className="flex flex-col items-center bg-white py-2 px-4 rounded-lg shadow-sm">
                                    <span className="font-bold text-slate-800">98%</span>
                                    <span className="text-xs text-slate-500">Satisfaction</span>
                                </div>
                                <div className="flex flex-col items-center bg-white py-2 px-4 rounded-lg shadow-sm">
                                    <span className="font-bold text-slate-800">2d</span>
                                    <span className="text-xs text-slate-500">Shipping</span>
                                </div>
                            </div>
                        </div>
                        
                        <p className="text-sm text-slate-600 mt-4 max-w-2xl leading-relaxed">{storeInfo.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                            <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm">
                                <div className="bg-slate-100 p-2 rounded-full">
                                    <MapPinIcon className="w-4 h-4 text-slate-700" />
                                </div>
                                <span className="text-sm text-slate-700">{storeInfo.address}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm">
                                <div className="bg-slate-100 p-2 rounded-full">
                                    <MailIcon className="w-4 h-4 text-slate-700" />
                                </div>
                                <span className="text-sm text-slate-700">{storeInfo.email}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm">
                                <div className="bg-slate-100 p-2 rounded-full">
                                    <ClockIcon className="w-4 h-4 text-slate-700" />
                                </div>
                                <span className="text-sm text-slate-700">Est. 2023</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Tabs */}
            {categories.length > 1 && (
                <div className="max-w-7xl mx-auto mt-8 overflow-x-auto">
                    <div className="flex space-x-1 min-w-max">
                        {categories.map((category) => (
                            <button
                                key={category}
                                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                                    activeCategory === category
                                        ? 'bg-green-500 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                    <h1 className="text-2xl">Shop <span className="text-slate-800 font-semibold">{activeCategory !== 'All' ? activeCategory : 'Products'}</span></h1>
                    <p className="text-sm text-slate-600">{filteredProducts.length} products</p>
                </div>
                
                {filteredProducts.length > 0 ? (
                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 xl:gap-8 mx-auto">
                        {filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="bg-slate-100 p-4 rounded-full mb-4">
                            <MapPinIcon className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-800 mb-1">No products found</h3>
                        <p className="text-sm text-slate-500 max-w-md mb-4">
                            There are no products in this category yet. Please check back later or browse other categories.
                        </p>
                        <button 
                            onClick={() => setActiveCategory('All')} 
                            className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                        >
                            View All Products
                        </button>
                    </div>
                )}
            </div>
        </div>
    ) : <Loading />
}
