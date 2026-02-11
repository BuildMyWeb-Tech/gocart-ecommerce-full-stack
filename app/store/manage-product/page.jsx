'use client'
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import { productDummyData } from "@/assets/assets"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"
import React from 'react';
import { AnimatePresence, motion } from "framer-motion"

import { 
    Box, Tag, CheckCircle, XCircle, Search, PackageOpen, 
    Edit, Trash2, AlertCircle, Filter, ArrowUpDown, 
    SlidersHorizontal, MoreVertical, Tag as TagIcon,
    IndianRupee, AlertOctagon, X, AlertTriangle
} from "lucide-react"

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({ isOpen, onClose, onDelete, productName, isDeleting }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        {/* Backdrop */}
                        <motion.div 
                            className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                        />

                        {/* Modal Panel */}
                        <motion.div 
                            className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <AlertTriangle className="h-6 w-6 text-red-600" />
                                    </div>
                                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                        <h3 className="text-lg font-medium leading-6 text-slate-900">Delete Product</h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-slate-600">
                                                Are you sure you want to delete <span className="font-semibold text-slate-800">"{productName}"</span>? This action cannot be undone.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={onDelete}
                                    className={`inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                                        isDeleting ? 'opacity-70 cursor-not-allowed' : ''
                                    }`}
                                >
                                    {isDeleting ? (
                                        <span className="flex items-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Deleting...
                                        </span>
                                    ) : "Delete"}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}

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
    
    // Modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [productToDelete, setProductToDelete] = useState(null)

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

    // Open the delete confirmation modal
    const openDeleteModal = (product) => {
        setProductToDelete(product)
        setIsDeleteModalOpen(true)
    }

    // Close the delete confirmation modal
    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false)
        // Reset after animation completes
        setTimeout(() => {
            setProductToDelete(null)
        }, 100)
    }

    // Delete product function
    const deleteProduct = async () => {
        if (!productToDelete || deleteLoading) return;
        
        try {
            setDeleteLoading(true)
            setDeletingProductId(productToDelete.id)
            
            // You can implement the actual API call here
            // For now, we'll simulate with a timeout
            await new Promise(resolve => setTimeout(resolve, 100))
            
            // Remove the product from the state
            setProducts(prevProducts => prevProducts.filter(product => product.id !== productToDelete.id))
            toast.success("Product deleted successfully")
            
            // Uncomment this when you have the actual API endpoint
            /*
            const token = await getToken()
            const { data } = await axios.delete(`/api/store/product/${productToDelete.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast.success(data.message)
            */
            
            // Close modal
            closeDeleteModal()
            
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
        <>
            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={closeDeleteModal}
                onDelete={deleteProduct}
                productName={productToDelete?.name}
                isDeleting={deleteLoading}
            />
        
            <div className="max-w-6xl mx-auto px-4 ">
                {/* Header section with improved styling */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <h1 className="text-2xl text-slate-800 flex items-center gap-2 font-medium">
                        <div className="bg-slate-100 p-2 rounded-lg">
                            <PackageOpen size={22} className="text-slate-700" />
                        </div>
                        Manage <span className="font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Products</span>
                    </h1>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-auto pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 transition-shadow"
                            />
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg transition-all ${
                                showFilters 
                                    ? 'bg-slate-800 text-white shadow-md' 
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            <SlidersHorizontal size={16} />
                            <span className="hidden sm:inline">Filters</span>
                        </button>
                    </div>
                </div>
                
                {/* Advanced filters section with animation */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <motion.div 
                                className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 mb-6"
                                initial={{ y: -20 }}
                                animate={{ y: 0 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                            >
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Sort By</label>
                                        <select 
                                            value={sortBy} 
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 transition-shadow"
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
                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 transition-shadow"
                                        >
                                            <option value="">All Categories</option>
                                            {categories.filter(cat => cat !== 'All').map((category) => (
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
                                        className="text-sm text-slate-600 hover:text-slate-800 flex items-center gap-1 hover:bg-slate-50 px-2 py-1 rounded transition-colors"
                                    >
                                        <XCircle size={14} />
                                        <span className="hidden sm:inline">Reset Filters</span>
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* Product table with improved styling */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-gray-700 uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="px-4 py-3.5">
                                        <div className="flex items-center gap-1">
                                            <span>Product</span>
                                        </div>
                                    </th>
                                    <th className="px-4 py-3.5 hidden md:table-cell">
                                        <div className="flex items-center gap-1">
                                            <span>Description</span>
                                        </div>
                                    </th>
                                    <th className="px-4 py-3.5 hidden md:table-cell">
                                        <div className="flex items-center gap-1">
                                            <span>MRP</span>
                                        </div>
                                    </th>
                                    <th className="px-4 py-3.5">
                                        <div className="flex items-center gap-1">
                                            <span>Price</span>
                                        </div>
                                    </th>
                                    <th className="px-4 py-3.5 text-center">Status</th>
                                    <th className="px-4 py-3.5 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-700 divide-y divide-slate-100">
                                {filteredProducts.length > 0 ? (
                                    filteredProducts.map((product) => (
                                        <motion.tr 
                                            key={product.id} 
                                            className="hover:bg-slate-50 transition-colors"
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <td className="px-4 py-4">
                                                <div className="flex gap-3 items-center">
                                                    <div className="relative flex-shrink-0">
                                                        <div className="overflow-hidden rounded-lg h-12 w-12 bg-slate-100 flex items-center justify-center border border-slate-200">
                                                            <Image 
                                                                width={48} 
                                                                height={48} 
                                                                className='p-1 rounded-lg object-cover bg-white' 
                                                                src={product.images[0]} 
                                                                alt={product.name} 
                                                            />
                                                        </div>
                                                        {product.images.length > 1 && (
                                                            <span className="absolute -top-1 -right-1 bg-slate-800 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                                                {product.images.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-slate-800">{product.name}</span>
                                                        <span className="text-xs text-slate-500 mt-0.5 flex items-center">
                                                            <TagIcon size={10} className="mr-1" />
                                                            {product.category || 'Uncategorized'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 max-w-[300px] hidden md:table-cell">
                                                <div className="text-slate-600 line-clamp-2 text-xs">{product.description}</div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    {new Date(product.createdAt).toLocaleDateString()}
                                                </div>
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
                                                {product.mrp > product.price && (
                                                    <div className="text-xs text-green-600 mt-1">
                                                        {Math.round((1 - product.price/product.mrp) * 100)}% off
                                                    </div>
                                                )}
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
                                                        onClick={() => openDeleteModal(product)}
                                                        className={`p-1.5 rounded-full hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors ${
                                                            deleteLoading && deletingProductId === product.id ? 'opacity-50 cursor-not-allowed' : ''
                                                        }`}
                                                        aria-label="Delete product"
                                                        disabled={deleteLoading && deletingProductId === product.id}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="bg-slate-100 rounded-full p-3 mb-3">
                                                    <AlertOctagon size={30} className="text-slate-400" />
                                                </div>
                                                <p className="text-slate-600 font-medium mb-1">No products found</p>
                                                <p className="text-slate-400 text-sm">Try adjusting your search or filter criteria</p>
                                                
                                                {(searchTerm || filterCategory || sortBy !== "newest") && (
                                                    <button 
                                                        onClick={() => {
                                                            setSearchTerm("")
                                                            setSortBy("newest")
                                                            setFilterCategory("")
                                                        }}
                                                        className="mt-4 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-md flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
                                                    >
                                                        <Filter size={14} />
                                                        Clear All Filters
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {/* Status bar */}
                {filteredProducts.length > 0 && (
                    <div className="mt-4 text-sm text-slate-500 flex justify-between items-center bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
                        <span>Showing {filteredProducts.length} of {products.length} products</span>
                        {filteredProducts.length < products.length && (
                            <button 
                                onClick={() => {
                                    setSearchTerm("")
                                    setSortBy("newest")
                                    setFilterCategory("")
                                    setShowFilters(false)
                                }}
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-white px-3 py-1 rounded-md hover:bg-blue-50 transition-colors shadow-sm"
                            >
                                <Filter size={14} />
                                Reset Filters
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    )
}
