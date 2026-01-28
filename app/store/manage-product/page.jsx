'use client'
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import { productDummyData } from "@/assets/assets"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"
import React from 'react';

import { 
    Box, Tag, CheckCircle, XCircle, Search, PackageOpen, 
    Edit, Trash2, AlertCircle, Filter, ArrowUpDown, 
    SlidersHorizontal, MoreVertical, Tag as TagIcon,
    IndianRupee, AlertOctagon
} from "lucide-react"

export default function StoreManageProducts() {

    const { getToken } = useAuth()
    const { user } = useUser()

    // Set currency symbol to Indian Rupee
    const currencySymbol = '₹'

    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState([])
    const [searchTerm, setSearchTerm] = useState("")
    const [sortBy, setSortBy] = useState("newest")
    const [filterCategory, setFilterCategory] = useState("")
    const [showFilters, setShowFilters] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [deletingProductId, setDeletingProductId] = useState(null)

    // Get unique categories
    const categories = ['All', ...new Set(products.map(product => product.category).filter(Boolean))]

    const fetchProducts = async () => {
        try {
             const token = await getToken()
             const { data } = await axios.get('/api/store/product', {headers: { Authorization: `Bearer ${token}` } })
             setProducts(data.products.sort((a, b)=> new Date(b.createdAt) - new Date(a.createdAt)))
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const toggleStock = async (productId) => {
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/store/stock-toggle',{ productId }, {headers: { Authorization: `Bearer ${token}` } })
            setProducts(prevProducts => prevProducts.map(product =>  product.id === productId ? {...product, inStock: !product.inStock} : product))

            toast.success(data.message)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    // Delete product function
    const deleteProduct = async (productId) => {
        if (deleteLoading) return;
        
        try {
            setDeleteLoading(true)
            setDeletingProductId(productId)
            
            // You can implement the actual API call here
            // For now, we'll simulate with a timeout
            await new Promise(resolve => setTimeout(resolve, 800))
            
            // Remove the product from the state
            setProducts(prevProducts => prevProducts.filter(product => product.id !== productId))
            toast.success("Product deleted successfully")
            
            // Uncomment this when you have the actual API endpoint
            /*
            const token = await getToken()
            const { data } = await axios.delete(`/api/store/product/${productId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast.success(data.message)
            */
            
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setDeleteLoading(false)
            setDeletingProductId(null)
        }
    }

    // Handle edit product
    const handleEditProduct = (productId) => {
        // You can redirect to edit page or open a modal
        // For now, just show a toast
        toast.success(`Editing product ${productId}`)
        // You can implement navigation like:
        // router.push(`/store/edit-product/${productId}`)
    }

    // Filter and sort products
    const filteredProducts = products
        .filter(product => {
            const matchesSearch = searchTerm 
                ? product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  product.description.toLowerCase().includes(searchTerm.toLowerCase())
                : true
                
            const matchesCategory = filterCategory && filterCategory !== 'All' 
                ? product.category === filterCategory
                : true
                
            return matchesSearch && matchesCategory
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'price-low':
                    return a.price - b.price
                case 'price-high':
                    return b.price - a.price
                case 'name':
                    return a.name.localeCompare(b.name)
                case 'newest':
                default:
                    return new Date(b.createdAt) - new Date(a.createdAt)
            }
        })

    useEffect(() => {
        if(user){
            fetchProducts()
        }  
    }, [user])

    if (loading) return <Loading />

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h1 className="text-2xl text-slate-500 flex items-center gap-2">
                    <PackageOpen size={24} className="text-slate-700" />
                    Manage <span className="text-slate-800 font-medium bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Products</span>
                </h1>
                
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-auto pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                    
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
                            showFilters 
                                ? 'bg-slate-800 text-white' 
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        <SlidersHorizontal size={16} />
                        <span className="hidden sm:inline">Filters</span>
                    </button>
                </div>
            </div>
            
            {showFilters && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6 animate-in slide-in-from-top duration-300">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Sort By</label>
                            <select 
                                value={sortBy} 
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                            >
                                <option value="newest">Newest First</option>
                                <option value="name">Name (A-Z)</option>
                                <option value="price-low">Price (Low to High)</option>
                                <option value="price-high">Price (High to Low)</option>
                            </select>
                        </div>
                        
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Filter by Category</label>
                            <select 
                                value={filterCategory} 
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                            >
                                <option value="">All Categories</option>
                                {categories.map((category) => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex justify-between mt-4">
                        <span className="text-sm text-slate-500">
                            Showing <span className="font-medium">{filteredProducts.length}</span> of {products.length} products
                        </span>
                        <button
                            onClick={() => {
                                setSearchTerm("")
                                setSortBy("newest")
                                setFilterCategory("")
                            }} 
                            className="text-sm text-slate-600 hover:text-slate-800 flex items-center gap-1"
                        >
                            <span className="hidden sm:inline">Reset Filters</span>
                            <XCircle size={16} />
                        </button>
                    </div>
                </div>
            )}
            
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-gray-700 uppercase text-xs tracking-wider">
                            <tr>
                                <th className="px-4 py-3.5">
                                    <div className="flex items-center gap-1">
                                        <span>Product</span>
                                        <ArrowUpDown size={14} className="text-slate-400" />
                                    </div>
                                </th>
                                <th className="px-4 py-3.5 hidden md:table-cell">
                                    <div className="flex items-center gap-1">
                                        <span>Description</span>
                                        <ArrowUpDown size={14} className="text-slate-400" />
                                    </div>
                                </th>
                                <th className="px-4 py-3.5 hidden md:table-cell">
                                    <div className="flex items-center gap-1">
                                        <span>MRP</span>
                                        <ArrowUpDown size={14} className="text-slate-400" />
                                    </div>
                                </th>
                                <th className="px-4 py-3.5">
                                    <div className="flex items-center gap-1">
                                        <span>Price</span>
                                        <ArrowUpDown size={14} className="text-slate-400" />
                                    </div>
                                </th>
                                <th className="px-4 py-3.5 text-center">Status</th>
                                <th className="px-4 py-3.5 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-700 divide-y divide-slate-100">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="flex gap-3 items-center">
                                                <div className="relative flex-shrink-0">
                                                    <Image 
                                                        width={48} 
                                                        height={48} 
                                                        className='p-1 shadow rounded-lg object-cover bg-white border border-slate-100' 
                                                        src={product.images[0]} 
                                                        alt={product.name} 
                                                    />
                                                    {product.images.length > 1 && (
                                                        <span className="absolute -top-1 -right-1 bg-slate-800 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                                            {product.images.length}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-800">{product.name}</span>
                                                    <span className="text-xs text-slate-500 mt-0.5">
                                                        {new Date(product.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 max-w-[300px] hidden md:table-cell">
                                            <div className="text-slate-600 line-clamp-2 text-xs">{product.description}</div>
                                        </td>
                                        <td className="px-4 py-4 hidden md:table-cell">
                                            <div className="text-slate-600 line-through flex items-center">
                                                <IndianRupee size={12} className="mr-0.5" /> {product.mrp.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="font-medium text-slate-800 flex items-center">
                                                <IndianRupee size={14} className="mr-0.5" /> {product.price.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <label className="relative inline-flex items-center cursor-pointer text-gray-900">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer" 
                                                    onChange={() => toast.promise(toggleStock(product.id), { loading: "Updating data..." })} 
                                                    checked={product.inStock} 
                                                />
                                                <div className={`w-10 h-5 rounded-full transition-colors duration-200 peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-slate-300 ${product.inStock ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                                <span className={`dot absolute left-[2px] top-[2px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${product.inStock ? 'translate-x-5' : 'translate-x-0'}`}></span>
                                                <span className="sr-only">{product.inStock ? 'In Stock' : 'Out of Stock'}</span>
                                            </label>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-center gap-3">
                                                <button 
                                                    onClick={() => handleEditProduct(product.id)}
                                                    className="p-1.5 rounded-full hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors"
                                                    aria-label="Edit product"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                
                                                <button 
                                                    onClick={() => {
                                                        if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
                                                            deleteProduct(product.id)
                                                        }
                                                    }}
                                                    className={`p-1.5 rounded-full hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors ${
                                                        deleteLoading && deletingProductId === product.id ? 'opacity-50 cursor-not-allowed' : ''
                                                    }`}
                                                    aria-label="Delete product"
                                                    disabled={deleteLoading && deletingProductId === product.id}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                
                                                {/* <button 
                                                    className="p-1.5 rounded-full hover:bg-purple-50 text-purple-600 hover:text-purple-700 transition-colors"
                                                    aria-label="Change category"
                                                >
                                                    <TagIcon size={18} />
                                                </button> */}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center">
                                        <div className="flex flex-col items-center">
                                            <AlertOctagon size={36} className="text-slate-300 mb-2" />
                                            <p className="text-slate-500 mb-1">No products found</p>
                                            <p className="text-slate-400 text-xs">Try adjusting your search or filter criteria</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="mt-4 text-sm text-slate-500 flex justify-between items-center">
                <span>Showing {filteredProducts.length} of {products.length} products</span>
                {filteredProducts.length < products.length && (
                    <button 
                        onClick={() => {
                            setSearchTerm("")
                            setSortBy("newest")
                            setFilterCategory("")
                            setShowFilters(false)
                        }}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                        <Filter size={14} />
                        Clear Filters
                    </button>
                )}
            </div>
        </div>
    )
}
