'use client'
import { assets } from "@/assets/assets"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import Image from "next/image"
import { useEffect, useState, useRef } from "react"
import { toast } from "react-hot-toast"
import {
  PlusCircle,
  Camera,
  ImagePlus,
  Tag,
  Search,
  ArrowLeft,
  X,
  Edit,
  Trash2,
  Upload,
  Scissors,
  CheckCircle,
  Pencil,
  AlertTriangle,
  Info,
  SlidersHorizontal,
  ChevronLeft,
  Package,
  ShoppingBag,
  Layers,
  BarChart,
  Filter,
  LayoutGrid,
  List,
  Clock,
  TrendingUp,
  Star,
  ChevronRight
} from "lucide-react";


export default function ProductCategoryManagement() {
    const [productCategories, setProductCategories] = useState([
      { id: 1, name: "Electronics", description: "Smartphones, Laptops, Tablets, and more", image: "/images/electronics.jpg" },
      { id: 2, name: "Fashion", description: "Clothing, Shoes, Accessories, and more", image: "/images/fashion.jpg"  },
      
    ])
    const [showAddForm, setShowAddForm] = useState(false)
    const [showEditForm, setShowEditForm] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [loading, setLoading] = useState(false)
    const [viewMode, setViewMode] = useState('grid')
    const [formData, setFormData] = useState({
      name: "",
      description: "",
    })
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const fileInputRef = useRef(null)
    
    const { getToken } = useAuth()

    // Filter categories based on search term
    const filteredCategories = productCategories.filter(
      category => 
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    // Handle image upload
    const handleImageUpload = (e) => {
      const file = e.target.files[0]
      if (!file) return
      
      setImageFile(file)
      
      const reader = new FileReader()
      reader.onload = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
    
    // Handle form input changes
    const handleInputChange = (e) => {
      const { name, value } = e.target
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    
    // Reset form data
    const resetForm = () => {
      setFormData({ name: "", description: "" })
      setImageFile(null)
      setImagePreview(null)
    }
    
    // Open edit form with selected category data
    const openEditForm = (category) => {
      setSelectedCategory(category)
      setFormData({
        name: category.name,
        description: category.description,
      })
      setImagePreview(category.image)
      setShowEditForm(true)
    }
    
    // Open delete confirmation modal
    const openDeleteModal = (category) => {
      setSelectedCategory(category)
      setShowDeleteModal(true)
    }
    
    // Handle form submission (Add/Edit)
    const handleSubmit = async (e) => {
      e.preventDefault()
      setLoading(true)
      
      try {
        if (!formData.name.trim()) {
          throw new Error("Category name is required")
        }
        
        if (!imageFile && !imagePreview) {
          throw new Error("Category image is required")
        }
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800))
        
        if (showEditForm && selectedCategory) {
          // Update existing category
          const updatedCategories = productCategories.map(cat => 
            cat.id === selectedCategory.id 
              ? { 
                  ...cat, 
                  name: formData.name, 
                  description: formData.description,
                  image: imagePreview || cat.image
                } 
              : cat
          )
          setProductCategories(updatedCategories)
          toast.success("Product category updated successfully")
        } else {
          // Add new category
          const newCategory = {
            id: Date.now(),
            name: formData.name,
            description: formData.description,
            image: imagePreview,
            productCount: 0
          }
          setProductCategories([...productCategories, newCategory])
          toast.success("Product category added successfully")
        }
        
        // Close forms and reset data
        setShowAddForm(false)
        setShowEditForm(false)
        resetForm()
      } catch (error) {
        toast.error(error.message)
      } finally {
        setLoading(false)
      }
    }
    
    // Handle category deletion
    const handleDeleteCategory = async () => {
      if (!selectedCategory) return
      setLoading(true)
      
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800))
        
        const updatedCategories = productCategories.filter(
          category => category.id !== selectedCategory.id
        )
        setProductCategories(updatedCategories)
        toast.success("Product category deleted successfully")
        setShowDeleteModal(false)
      } catch (error) {
        toast.error(error.message)
      } finally {
        setLoading(false)
      }
    }
    
    // Determine which view to show
    const renderView = () => {
      if (showAddForm) {
        return renderAddForm()
      } else if (showEditForm) {
        return renderEditForm()
      } else {
        return renderCategoriesList()
      }
    }
    
    // Render the categories list
    const renderCategoriesList = () => (
      <>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl text-slate-800 font-bold flex items-center gap-2">
              <div className="p-2 bg-green-50 rounded-lg text-green-600">
                <Layers size={24} />
              </div>
              Product Categories
            </h1>
            <p className="text-slate-500 text-sm mt-1">Organize your store with customizable product categories</p>
          </div>
          
          <button 
            onClick={() => {
              setShowAddForm(true)
              resetForm()
            }}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-5 py-2.5 rounded-lg transition-all shadow-sm flex items-center gap-2 text-sm font-medium"
          >
            <PlusCircle size={18} />
            Add Category
          </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-3">
            <div className="relative flex-grow max-w-md">
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-300 transition-all bg-slate-50"
              />
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="border border-slate-200 rounded-lg flex overflow-hidden">
                <button 
                  onClick={() => setViewMode('grid')} 
                  className={`p-2.5 ${viewMode === 'grid' ? 'bg-green-50 text-green-600' : 'text-slate-500 hover:bg-slate-50'} transition-colors`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('list')} 
                  className={`p-2.5 ${viewMode === 'list' ? 'bg-green-50 text-green-600' : 'text-slate-500 hover:bg-slate-50'} transition-colors`}
                >
                  <List size={18} />
                </button>
              </div>
              
              {/* <button className="p-2.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
                <Filter size={18} />
              </button> */}
            </div>
          </div>
          
          {viewMode === 'grid' ? (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.length > 0 ? (
                filteredCategories.map(category => (
                  <div key={category.id} className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
                    <div className="relative h-48 overflow-hidden bg-slate-100">
                      <Image 
                        src={category.image} 
                        alt={category.name}
                        fill
                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                      />
                      {/* <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent"></div>
                      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 flex items-center">
                        <Package size={12} className="mr-1 text-green-500" />
                        {category.productCount} Products
                      </div> */}
                    </div>
                    
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-slate-800 mb-1">{category.name}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2">{category.description}</p>
                      
                      <div className="flex mt-4 justify-between items-center">
                        <button
                          onClick={() => openEditForm(category)}
                          className="text-green-600 text-sm font-medium hover:text-green-700 flex items-center gap-1"
                        >
                          Edit <ChevronRight size={16} />
                        </button>
                        
                        <button 
                          onClick={() => openDeleteModal(category)}
                          className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full bg-slate-50 rounded-lg p-8 text-center">
                  <div className="bg-white p-4 rounded-full inline-flex items-center justify-center mb-3">
                    <Info size={24} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-800 mb-1">No categories found</h3>
                  <p className="text-slate-500 text-sm">
                    {searchTerm ? "Try a different search term" : "Add your first product category"}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Image</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4 hidden md:table-cell">Description</th>
                    {/* <th className="px-6 py-4 text-center">Products</th> */}
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map(category => (
                      <tr key={category.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="h-16 w-20 relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                            <Image 
                              src={category.image} 
                              alt={category.name}
                              fill
                              className="object-cover h-full w-full"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800">{category.name}</td>
                        <td className="px-6 py-4 text-slate-600 max-w-md truncate hidden md:table-cell">
                          {category.description}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-green-50 text-green-600 px-2.5 py-1 rounded-full text-xs font-medium">
                            {category.productCount}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3">
                            <button 
                              onClick={() => openEditForm(category)}
                              className="p-2 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                              aria-label="Edit"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => openDeleteModal(category)}
                              className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                              aria-label="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        <div className="flex flex-col items-center">
                          <div className="bg-slate-100 p-4 rounded-full mb-3">
                            <Info size={24} className="text-slate-400" />
                          </div>
                          <p className="text-slate-700 font-medium mb-1">No product categories found</p>
                          <p className="text-sm text-slate-500">
                            {searchTerm ? "Try a different search term" : "Add your first product category"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {filteredCategories.length > 0 && (
          <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-sm text-green-700 flex items-start gap-3">
            <Info size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800 mb-1">Category Management Tips</p>
              <ul className="list-disc pl-4 space-y-1 text-green-700">
                <li>Create specific categories to make products easier to find</li>
                <li>Use high-quality images that represent each category clearly</li>
                <li>Keep descriptions concise but informative</li>
                <li>Regularly review and update categories as your inventory changes</li>
              </ul>
            </div>
          </div>
        )}
      </>
    )
    
    // Render the add form
    const renderAddForm = () => (
      <div className="bg-white rounded-xl shadow-md border border-slate-200 max-w-3xl mx-auto animate-in slide-in-from-right-1/4 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowAddForm(false)}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-800">Add New Product Category</h2>
          </div>
          
          <button 
            onClick={() => setShowAddForm(false)}
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Category Image <span className="text-red-500">*</span>
            </label>
            <div 
              className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center p-6 h-48 relative overflow-hidden cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <>
                  <Image 
                    src={imagePreview}
                    alt="Category preview"
                    fill
                    className="object-cover group-hover:opacity-80 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                    <div className="bg-white rounded-full p-2.5 shadow-md">
                      <Upload size={20} className="text-green-600" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-green-50 p-3 rounded-full mb-2 text-green-500">
                    <ImagePlus size={28} />
                  </div>
                  <p className="text-slate-700 text-center text-sm font-medium">Upload category image</p>
                  <p className="text-slate-500 text-center text-xs mt-1">Click to browse</p>
                </>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
            {/* <p className="mt-2 text-xs text-slate-500">
              Recommended: Square image, at least 600x600px
            </p> */}
          </div>
          
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Electronics, Clothing, Home & Kitchen"
                className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-300 bg-slate-50"
                required
              />
              {/* <p className="mt-1 text-xs text-slate-500">
                A clear name helps customers find products easily
              </p> */}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe what types of products are included in this category..."
                rows={5}
                className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-300 bg-slate-50 resize-none"
                required
              />
              {/* <p className="mt-1 text-xs text-slate-500">
                Include keywords that customers might search for
              </p> */}
            </div>
            
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2 mt-6">
              <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p>
                Categories are used to organize products and improve store navigation. Creating clear categories enhances the shopping experience.
              </p>
            </div>
          </div>
          
          <div className="md:col-span-3 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 rounded-lg text-white hover:from-green-700 hover:to-green-800 transition-all flex items-center gap-1.5 text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                  Processing...
                </>
              ) : (
                <>
                  <PlusCircle size={16} />
                  Add Category
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    )
    
    // Render the edit form
    const renderEditForm = () => (
      <div className="bg-white rounded-xl shadow-md border border-slate-200 max-w-3xl mx-auto animate-in slide-in-from-right-1/4 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowEditForm(false)}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-800">Edit Product Category</h2>
          </div>
          
          <button 
            onClick={() => setShowEditForm(false)}
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Category Image <span className="text-red-500">*</span>
            </label>
            <div 
              className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center p-6 h-48 relative overflow-hidden cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <>
                  <Image 
                    src={imagePreview}
                    alt="Category preview"
                    fill
                    className="object-cover group-hover:opacity-80 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                    <div className="bg-white rounded-full p-2.5 shadow-md">
                      <Upload size={20} className="text-green-600" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-green-50 p-3 rounded-full mb-2 text-green-500">
                    <ImagePlus size={28} />
                  </div>
                  <p className="text-slate-700 text-center text-sm font-medium">Upload category image</p>
                  <p className="text-slate-500 text-center text-xs mt-1">Click to browse</p>
                </>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Recommended: Square image, at least 600x600px
            </p>
          </div>
          
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Electronics, Clothing, Home & Kitchen"
                className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-300 bg-slate-50"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe what types of products are included in this category..."
                rows={5}
                className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-300 bg-slate-50 resize-none"
                required
              />
            </div>
            
            {selectedCategory?.productCount > 0 && (
              <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-green-700 flex items-start gap-2 mt-4">
                <Info size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <p>
                  This category contains <strong>{selectedCategory.productCount} products</strong>. 
                  Changing the category name will affect how these products are organized and displayed in your store.
                </p>
              </div>
            )}
          </div>
          
          <div className="md:col-span-3 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowEditForm(false)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 rounded-lg text-white hover:from-green-700 hover:to-green-800 transition-all flex items-center gap-1.5 text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                  Processing...
                </>
              ) : (
                <>
                  <Pencil size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    )

    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        {renderView()}
        
        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-5 bg-gradient-to-r from-red-50 to-white border-b border-red-100">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-red-100 rounded-full flex-shrink-0">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Delete Category</h3>
                    <p className="text-slate-600 text-sm mt-1">
                      Are you sure you want to delete the category <span className="font-semibold text-slate-800">"{selectedCategory?.name}"</span>?
                      {selectedCategory?.productCount > 0 && (
                        <span className="text-red-600 font-medium"> This will affect {selectedCategory.productCount} products.</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-5">
                {selectedCategory?.productCount > 0 && (
                  <div className="mb-4 bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-800">
                    <p className="flex items-start gap-2">
                      <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>
                        Products in this category may become harder to find if the category is deleted. Consider 
                        reassigning products to another category before deletion.
                      </span>
                    </p>
                  </div>
                )}
                
                <div className="flex justify-end gap-3 mt-2">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteCategory}
                    className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 rounded-lg text-white hover:from-red-600 hover:to-red-700 transition-all flex items-center gap-1.5 text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Delete Category
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <style jsx>{`
          @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
          }
          
          @keyframes slideInRight {
              from { transform: translateX(25%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
          }
          
          @keyframes zoomIn {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
          }
          
          .animate-in {
              animation-duration: 300ms;
              animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
              animation-fill-mode: both;
          }
          
          .fade-in { animation-name: fadeIn; }
          .slide-in-from-right-1\\/4 { animation-name: slideInRight; }
          .zoom-in-95 { animation-name: zoomIn; }
          .duration-200 { animation-duration: 200ms; }
          .duration-300 { animation-duration: 300ms; }
          
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}</style>
      </div>
    )
}
