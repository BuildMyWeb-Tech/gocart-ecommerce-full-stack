'use client'
import { assets } from "@/assets/assets"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import Image from "next/image"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { Upload, PlusCircle, XCircle, HelpCircle, SparklesIcon, Loader2 } from "lucide-react"

export default function StoreAddProduct() {
    const categories = [
        'Electronics', 'Clothing', 'Home & Kitchen', 'Beauty & Health', 
        'Toys & Games', 'Sports & Outdoors', 'Books & Media', 
        'Food & Drink', 'Hobbies & Crafts', 'Others'
    ]

    const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null })
    const [imagePreviews, setImagePreviews] = useState({ 1: null, 2: null, 3: null, 4: null })
    const [productInfo, setProductInfo] = useState({
        name: "",
        description: "",
        mrp: 0,
        price: 0,
        category: "",
        stock: 1,
        // Additional fields for specifications
        material: "",
        weight: "",
        dimensions: "",
        brand: "",
        madeIn: "",
        warranty: ""
    })
    const [loading, setLoading] = useState(false)
    const [aiUsed, setAiUsed] = useState(false)
    const [aiLoading, setAiLoading] = useState(false)
    const [features, setFeatures] = useState(["", "", "", "", ""])
    const [showSpecFields, setShowSpecFields] = useState(false)

    const { getToken } = useAuth()

    const onChangeHandler = (e) => {
        setProductInfo({ ...productInfo, [e.target.name]: e.target.value })
    }

    const updateFeature = (index, value) => {
        const newFeatures = [...features];
        newFeatures[index] = value;
        setFeatures(newFeatures);
    }

    const handleImageUpload = async (key, file) => {
        if (file) {
            setImages(prev => ({ ...prev, [key]: file }))
            setImagePreviews(prev => ({ ...prev, [key]: URL.createObjectURL(file) }))

            if (key === "1" && file && !aiUsed) {
                const reader = new FileReader()
                reader.readAsDataURL(file)
                reader.onloadend = async () => {
                    const base64String = reader.result.split(",")[1]
                    const mimeType = file.type
                    const token = await getToken()

                    try {
                        setAiLoading(true)
                        await toast.promise(
                            axios.post(
                                "/api/store/ai",
                                { base64Image: base64String, mimeType },
                                { headers: { Authorization: `Bearer ${token}` } }
                            ),
                            {
                                loading: "Analyzing image with AI...",
                                success: (res) => {
                                    const data = res.data
                                    if (data.name && data.description) {
                                        setProductInfo(prev => ({
                                            ...prev,
                                            name: data.name,
                                            description: data.description
                                        }))
                                        
                                        // Generate features from AI description
                                        const sentences = data.description.split('. ');
                                        const newFeatures = sentences.slice(0, 5).map(s => 
                                            s.trim().replace(/^[^a-zA-Z]+/, '').replace(/[.!]+$/, '')
                                        );
                                        setFeatures(newFeatures.length < 5 ? 
                                            [...newFeatures, ...Array(5-newFeatures.length).fill("")] : 
                                            newFeatures.slice(0, 5)
                                        );
                                        
                                        setAiUsed(true)
                                        return "AI filled product info 🎉"
                                    }
                                    return "AI could not analyze the image"
                                },
                                error: (err) => err?.response?.data?.error || err.message
                            }
                        )
                    } catch (error) {
                        console.error(error)
                    } finally {
                        setAiLoading(false)
                    }
                }
            }
        }
    }

    const clearImage = (key) => {
        setImages(prev => ({ ...prev, [key]: null }))
        setImagePreviews(prev => ({ ...prev, [key]: null }))
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        try {
            if (!images[1] && !images[2] && !images[3] && !images[4]) {
                return toast.error('Please upload at least one image')
            }
            
            if (productInfo.price > productInfo.mrp) {
                return toast.error('Sale price cannot be greater than regular price')
            }
            
            setLoading(true)

            const formData = new FormData()
            
            // Basic product info
            formData.append('name', productInfo.name)
            formData.append('description', productInfo.description)
            formData.append('mrp', productInfo.mrp)
            formData.append('price', productInfo.price)
            formData.append('category', productInfo.category)
            formData.append('stock', productInfo.stock)
            
            // Specifications
            formData.append('material', productInfo.material)
            formData.append('weight', productInfo.weight)
            formData.append('dimensions', productInfo.dimensions)
            formData.append('brand', productInfo.brand)
            formData.append('madeIn', productInfo.madeIn)
            formData.append('warranty', productInfo.warranty)
            
            // Features
            features.forEach((feature, index) => {
                if (feature.trim()) formData.append(`feature${index + 1}`, feature.trim())
            })

            // Images
            Object.keys(images).forEach((key) => {
                images[key] && formData.append('images', images[key])
            })

            const token = await getToken()
            const { data } = await axios.post('/api/store/product', formData, { headers: { Authorization: `Bearer ${token}` } })
            toast.success(data.message)

            // Reset form
            setProductInfo({
                name: "", description: "", mrp: 0, price: 0, category: "", stock: 1,
                material: "", weight: "", dimensions: "", brand: "", madeIn: "", warranty: ""
            })
            setImages({ 1: null, 2: null, 3: null, 4: null })
            setImagePreviews({ 1: null, 2: null, 3: null, 4: null })
            setAiUsed(false)
            setFeatures(["", "", "", "", ""])
            setShowSpecFields(false)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={e => toast.promise(onSubmitHandler(e), { loading: "Adding Product..." })} className="text-slate-600 mb-28">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h1 className="text-2xl text-slate-800 font-bold">Add New Product</h1>
                    <p className="text-slate-500 text-sm mt-1">Create a new product listing for your store</p>
                </div>
                <div className="flex gap-3 mt-4 md:mt-0">
                    <button 
                        type="button" 
                        className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
                        onClick={() => setShowSpecFields(!showSpecFields)}
                    >
                        {showSpecFields ? "Hide Specifications" : "Add Specifications"}
                    </button>
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 active:scale-98 transition-all flex items-center gap-2"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
                        {loading ? "Adding..." : "Add Product"}
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    {/* Product Images */}
                    <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-slate-800 text-lg">Product Images</h2>
                            <div 
                                className="text-xs flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded cursor-help"
                                title="Upload high-quality images of your product. First image will be used as the main display image."
                            >
                                <HelpCircle size={12} /> Upload Tips
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-4">
                            {Object.keys(images).map((key) => (
                                <div key={key} className="relative">
                                    <label 
                                        htmlFor={`images${key}`} 
                                        className={`block w-32 h-32 border-2 border-dashed rounded-lg overflow-hidden cursor-pointer transition-all ${
                                            images[key] ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                                        }`}
                                    >
                                        {imagePreviews[key] ? (
                                            <img 
                                                src={imagePreviews[key]} 
                                                alt={`Product preview ${key}`} 
                                                className="w-full h-full object-contain p-2" 
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                                                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                                <span className="text-xs text-slate-500">
                                                    {key === "1" ? "Main Image" : `Image ${key}`}
                                                </span>
                                            </div>
                                        )}
                                    </label>
                                    <input
                                        type="file"
                                        accept='image/*'
                                        id={`images${key}`}
                                        onChange={e => handleImageUpload(key, e.target.files[0])}
                                        hidden
                                    />
                                    {imagePreviews[key] && (
                                        <button 
                                            type="button"
                                            onClick={() => clearImage(key)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    )}
                                    {key === "1" && (
                                        <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-md">
                                            Primary
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        {aiLoading && (
                            <div className="flex items-center gap-2 mt-4 bg-blue-50 text-blue-700 p-3 rounded-lg">
                                <Loader2 size={18} className="animate-spin" />
                                <span className="text-sm">AI is analyzing your product image...</span>
                            </div>
                        )}
                        
                        {aiUsed && (
                            <div className="flex items-center gap-2 mt-4 bg-green-50 text-green-700 p-3 rounded-lg">
                                <SparklesIcon size={18} />
                                <span className="text-sm">AI filled in product details based on your image!</span>
                            </div>
                        )}
                    </div>
                    
                    {/* Basic Information */}
                    <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
                        <h2 className="font-semibold text-slate-800 text-lg mb-4">Basic Information</h2>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="name">
                                    Product Name <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    id="name"
                                    name="name" 
                                    onChange={onChangeHandler} 
                                    value={productInfo.name} 
                                    placeholder="Enter product name" 
                                    className="w-full p-2.5 px-4 outline-none border border-slate-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500" 
                                    required 
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="description">
                                    Description <span className="text-red-500">*</span>
                                </label>
                                <textarea 
                                    id="description"
                                    name="description" 
                                    onChange={onChangeHandler} 
                                    value={productInfo.description} 
                                    placeholder="Enter product description" 
                                    rows={5} 
                                    className="w-full p-2.5 px-4 outline-none border border-slate-200 rounded-lg resize-none focus:border-green-500 focus:ring-1 focus:ring-green-500" 
                                    required 
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Provide a detailed description that highlights key features and benefits of your product.
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="category">
                                        Category <span className="text-red-500">*</span>
                                    </label>
                                    <select 
                                        id="category"
                                        onChange={e => setProductInfo({ ...productInfo, category: e.target.value })} 
                                        value={productInfo.category} 
                                        className="w-full p-2.5 px-4 outline-none border border-slate-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 appearance-none bg-white" 
                                        required
                                    >
                                        <option value="">Select a category</option>
                                        {categories.map((category) => (
                                            <option key={category} value={category}>{category}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="stock">
                                        Stock Quantity <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="number" 
                                        id="stock"
                                        name="stock" 
                                        min="0"
                                        onChange={onChangeHandler} 
                                        value={productInfo.stock} 
                                        className="w-full p-2.5 px-4 outline-none border border-slate-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500" 
                                        required 
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="mrp">
                                        Regular Price ({currency || '$'}) <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="number" 
                                        id="mrp"
                                        name="mrp" 
                                        min="0"
                                        step="0.01"
                                        onChange={onChangeHandler} 
                                        value={productInfo.mrp} 
                                        className="w-full p-2.5 px-4 outline-none border border-slate-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500" 
                                        required 
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Original price before any discounts</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="price">
                                        Sale Price ({currency || '$'}) <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="number" 
                                        id="price"
                                        name="price"
                                        min="0"
                                        step="0.01" 
                                        onChange={onChangeHandler} 
                                        value={productInfo.price} 
                                        className="w-full p-2.5 px-4 outline-none border border-slate-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500" 
                                        required 
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Current selling price (must be less than or equal to regular price)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Product Features */}
                    <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
                        <h2 className="font-semibold text-slate-800 text-lg mb-4">Key Features</h2>
                        <p className="text-sm text-slate-500 mb-4">Add up to 5 key features or selling points that highlight your product's benefits.</p>
                        
                        <div className="space-y-3">
                            {features.map((feature, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                                        {index + 1}
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder={`Feature ${index + 1} (e.g., Water resistant, Long battery life)`}
                                        value={feature}
                                        onChange={(e) => updateFeature(index, e.target.value)}
                                        className="w-full p-2.5 px-4 outline-none border border-slate-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500" 
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Specifications */}
                    {showSpecFields && (
                        <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
                            <h2 className="font-semibold text-slate-800 text-lg mb-4">Product Specifications</h2>
                            <p className="text-sm text-slate-500 mb-4">Add detailed specifications to help customers make informed decisions.</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="brand">
                                        Brand
                                    </label>
                                    <input 
                                        type="text" 
                                        id="brand"
                                        name="brand" 
                                        onChange={onChangeHandler} 
                                        value={productInfo.brand} 
                                        placeholder="Enter brand name" 
                                        className="w-full p-2.5 px-4 outline-none border border-slate-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500" 
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="material">
                                        Material
                                    </label>
                                    <input 
                                        type="text" 
                                        id="material"
                                        name="material" 
                                        onChange={onChangeHandler} 
                                        value={productInfo.material} 
                                        placeholder="e.g., Cotton, Plastic, Metal" 
                                        className="w-full p-2.5 px-4 outline-none border border-slate-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500" 
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="weight">
                                        Weight
                                    </label>
                                    <input 
                                        type="text" 
                                        id="weight"
                                        name="weight" 
                                        onChange={onChangeHandler} 
                                        value={productInfo.weight} 
                                        placeholder="e.g., 500g, 2.5 kg" 
                                        className="w-full p-2.5 px-4 outline-none border border-slate-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500" 
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="dimensions">
                                        Dimensions
                                    </label>
                                    <input 
                                        type="text" 
                                        id="dimensions"
                                        name="dimensions" 
                                        onChange={onChangeHandler} 
                                        value={productInfo.dimensions} 
                                        placeholder="e.g., 10 x 15 x 5 cm" 
                                        className="w-full p-2.5 px-4 outline-none border border-slate-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500" 
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="madeIn">
                                        Made In
                                    </label>
                                    <input 
                                        type="text" 
                                        id="madeIn"
                                        name="madeIn" 
                                        onChange={onChangeHandler} 
                                        value={productInfo.madeIn} 
                                        placeholder="Country of origin" 
                                        className="w-full p-2.5 px-4 outline-none border border-slate-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500" 
                                    />
                                </div>
                                
                                <div>
                                                                        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="warranty">
                                        Warranty
                                    </label>
                                    <input 
                                        type="text" 
                                        id="warranty"
                                        name="warranty" 
                                        onChange={onChangeHandler} 
                                        value={productInfo.warranty} 
                                        placeholder="e.g., 1 Year Limited Warranty" 
                                        className="w-full p-2.5 px-4 outline-none border border-slate-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500" 
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Sidebar - Preview and Tips */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-xl shadow-sm mb-6 sticky top-20">
                        <h2 className="font-semibold text-slate-800 text-lg mb-4">Product Preview</h2>
                        
                        <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
                            <div className="aspect-square bg-slate-50 flex items-center justify-center">
                                {imagePreviews[1] ? (
                                    <img 
                                        src={imagePreviews[1]} 
                                        alt="Product preview" 
                                        className="max-w-full max-h-full object-contain p-4" 
                                    />
                                ) : (
                                    <div className="text-center p-6 text-slate-400">
                                        <Upload className="w-10 h-10 mx-auto mb-2" />
                                        <p className="text-sm">Upload primary image</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-4">
                                <h3 className="font-medium text-slate-800 line-clamp-1">
                                    {productInfo.name || "Product Name"}
                                </h3>
                                
                                <div className="flex items-center gap-2 mt-2">
                                    <p className="font-bold text-slate-800">${productInfo.price || "0"}</p>
                                    {productInfo.mrp > productInfo.price && productInfo.mrp > 0 && (
                                        <>
                                            <p className="text-sm text-slate-500 line-through">${productInfo.mrp}</p>
                                            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                                {productInfo.mrp > 0 ? Math.round(((productInfo.mrp - productInfo.price) / productInfo.mrp) * 100) : 0}% OFF
                                            </span>
                                        </>
                                    )}
                                </div>
                                
                                {productInfo.category && (
                                    <div className="mt-2">
                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                                            {productInfo.category}
                                        </span>
                                    </div>
                                )}
                                
                                <p className="text-sm text-slate-600 mt-3 line-clamp-2">
                                    {productInfo.description || "Your product description will appear here."}
                                </p>
                            </div>
                        </div>
                        
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                            <h3 className="font-medium text-blue-800 flex items-center gap-1.5 mb-2">
                                <SparklesIcon size={16} className="text-blue-500" />
                                AI Product Description
                            </h3>
                            <p className="text-sm text-blue-600 mb-3">
                                Upload your primary product image and let AI help you generate a product name and description automatically.
                            </p>
                            <button 
                                type="button"
                                className="w-full bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-center gap-2"
                                disabled={aiLoading || !images[1]}
                                onClick={() => {
                                    if (images[1]) {
                                        const fileInput = document.getElementById('images1');
                                        const event = { target: { files: [images[1]] } };
                                        handleImageUpload(1, images[1]);
                                    } else {
                                        toast.error("Upload a primary image first");
                                    }
                                }}
                            >
                                {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <SparklesIcon size={16} />}
                                {aiLoading ? "Analyzing..." : "Generate with AI"}
                            </button>
                        </div>
                        
                        <div className="mt-4 space-y-3">
                            <div className="flex items-start gap-2">
                                <div className="bg-green-100 text-green-600 p-1 rounded-full mt-0.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <p className="text-xs text-slate-600">
                                    <span className="font-medium text-slate-700">High-quality images:</span> Upload clear, well-lit photos from multiple angles.
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <div className="bg-green-100 text-green-600 p-1 rounded-full mt-0.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <p className="text-xs text-slate-600">
                                    <span className="font-medium text-slate-700">Detailed description:</span> Include materials, dimensions, and use cases.
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <div className="bg-green-100 text-green-600 p-1 rounded-full mt-0.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <p className="text-xs text-slate-600">
                                    <span className="font-medium text-slate-700">Competitive pricing:</span> Research market rates for similar products.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    )
}
