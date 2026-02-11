'use client'
import { assets } from "@/assets/assets"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import Image from "next/image"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { PlusCircle, Camera, ImagePlus, Tag, IndianRupee  ,  Package, Sparkles, RotateCcw, Cpu, ShoppingBag, Save, UploadCloud, ArrowRight } from "lucide-react"

export default function StoreAddProduct() {

    const categories = ['Electronics', 'Clothing', 'Home & Kitchen', 'Beauty & Health', 'Toys & Games', 'Sports & Outdoors', 'Books & Media', 'Food & Drink', 'Hobbies & Crafts', 'Others']

    const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null })
    const [productInfo, setProductInfo] = useState({
        name: "",
        description: "",
        mrp: "",
        price: "",
        category: "",
    })
    const [loading, setLoading] = useState(false)
    const [aiUsed, setAiUsed] = useState(false)

    const { getToken } = useAuth()

    const onChangeHandler = (e) => {
        setProductInfo({ ...productInfo, [e.target.name]: e.target.value })
    }

    const handleImageUpload = async (key, file) => {
        setImages(prev => ({ ...prev, [key]: file }))

        if (key === "1" && file && !aiUsed) {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onloadend = async () => {
                const base64String = reader.result.split(",")[1]
                const mimeType = file.type
                const token = await getToken()

                try {
                    await toast.promise(
                        axios.post(
                            "/api/store/ai",
                            { base64Image: base64String, mimeType },
                            { headers: { Authorization: `Bearer ${token}` } }
                        ),
                        {
                            loading: "Analyzing image with AI...",
                            success: (res) => {
                                console.log(res);
                                
                                const data = res.data
                                if (data.name && data.description) {
                                    setProductInfo(prev => ({
                                        ...prev,
                                        name: data.name,
                                        description: data.description
                                    }))
                                    setAiUsed(true)
                                    return "AI filled product info 🎉"
                                }
                                return "AI could not analyze the image"
                            },
                            error: (err) =>
                                err?.response?.data?.error || err.message
                        }
                    )
                } catch (error) {
                    console.error(error)
                }
            }
        }
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        try {
            if (!images[1] && !images[2] && !images[3] && !images[4]) {
                return toast.error('Please upload at least one image')
            }
            setLoading(true)

            const formData = new FormData()
            formData.append('name', productInfo.name)
            formData.append('description', productInfo.description)
            formData.append('mrp', productInfo.mrp)
            formData.append('price', productInfo.price)
            formData.append('category', productInfo.category)

            Object.keys(images).forEach((key) => {
                images[key] && formData.append('images', images[key])
            })

            const token = await getToken()
            const { data } = await axios.post('/api/store/product', formData, { headers: { Authorization: `Bearer ${token}` } })
            toast.success(data.message)

            setProductInfo({ name: "", description: "", mrp: "", price: "", category: "" })
            setImages({ 1: null, 2: null, 3: null, 4: null })
            setAiUsed(false)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={e => toast.promise(onSubmitHandler(e), { loading: "Adding Product..." })} className="text-slate-500 mb-28 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl flex items-center gap-2">
                    <PlusCircle className="text-green-500" size={24} />
                    Add New <span className="text-slate-800 font-medium bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Products</span>
                </h1>
                
                <div className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 ${aiUsed ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-slate-100 text-slate-600'}`}>
                    {aiUsed ? <Sparkles size={12} className="text-green-500" /> : <Cpu size={12} />}
                    {aiUsed ? 'AI Assisted' : 'AI Ready'}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                <p className="font-medium text-slate-700 flex items-center gap-2 mb-4">
                    <Camera size={18} className="text-blue-500" />
                    Product Images
                    <span className="text-xs text-slate-500 font-normal">(Upload the main image first for AI analysis)</span>
                </p>

                <div className="flex flex-wrap gap-3 mt-4">
                    {Object.keys(images).map((key) => (
                        <label 
                            key={key} 
                            htmlFor={`images${key}`}
                            className={`relative group transition-all duration-200 ${key === '1' ? 'ring-2 ring-blue-300 rounded-lg' : ''}`}
                        >
                            <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-slate-200 group-hover:border-slate-300 transition-colors">
                                <Image
                                    width={300}
                                    height={300}
                                    className={`h-24 w-24 object-cover cursor-pointer transition-transform duration-300 ${images[key] ? 'group-hover:scale-105' : ''}`}
                                    src={images[key] ? URL.createObjectURL(images[key]) : assets.upload_area}
                                    alt=""
                                />
                                {!images[key] && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50 bg-opacity-70 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <UploadCloud size={20} className="text-slate-500" />
                                    </div>
                                )}
                                {key === '1' && !images[key] && (
                                    <div className="absolute bottom-1 right-1 bg-blue-500 text-white rounded-full p-1">
                                        <ArrowRight size={10} />
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                accept='image/*'
                                id={`images${key}`}
                                onChange={e => handleImageUpload(key, e.target.files[0])}
                                hidden
                            />
                        </label>
                    ))}
                </div>

                <p className="text-xs text-slate-500 mt-4 italic">Upload high-quality images for better product presentation. First image will be used as the main product image.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="space-y-6">
                    <label className="flex flex-col gap-2">
                        <span className="font-medium text-slate-700 flex items-center gap-2">
                            <ShoppingBag size={16} className="text-purple-500" />
                            Product Name
                        </span>
                        <input 
                            type="text" 
                            name="name" 
                            onChange={onChangeHandler} 
                            value={productInfo.name} 
                            placeholder="Enter product name" 
                            className="w-full p-3 px-4 outline-none border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-200 transition-all bg-slate-50 placeholder:text-slate-400" 
                            required 
                        />
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="font-medium text-slate-700 flex items-center gap-2">
                            <Tag size={16} className="text-amber-500" />
                            Description
                        </span>
                        <textarea 
                            name="description" 
                            onChange={onChangeHandler} 
                            value={productInfo.description} 
                            placeholder="Enter product description" 
                            rows={5} 
                            className="w-full p-3 px-4 outline-none border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-slate-200 transition-all bg-slate-50 placeholder:text-slate-400" 
                            required 
                        />
                    </label>

                    <div className="flex flex-col sm:flex-row gap-5">
                        <label className="flex flex-col gap-2 flex-1">
                            <span className="font-medium text-slate-700 flex items-center gap-2">
                                <IndianRupee  size={16} className="text-red-500" />
                                Actual Price
                            </span>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                                <input 
                                    type="number" 
                                    name="mrp" 
                                    onChange={onChangeHandler} 
                                    value={productInfo.mrp} 
                                    placeholder="" 
                                    className="w-full p-3 pl-8 outline-none border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-200 transition-all bg-slate-50" 
                                    required 
                                />
                            </div>
                        </label>
                        
                        <label className="flex flex-col gap-2 flex-1">
                            <span className="font-medium text-slate-700 flex items-center gap-2">
                                <IndianRupee  size={16} className="text-green-500" />
                                Offer Price
                            </span>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                                <input 
                                    type="number" 
                                    name="price" 
                                    onChange={onChangeHandler} 
                                    value={productInfo.price} 
                                    placeholder="" 
                                    className="w-full p-3 pl-8 outline-none border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-200 transition-all bg-slate-50" 
                                    required 
                                />
                            </div>
                        </label>
                    </div>

                    <label className="flex flex-col gap-2">
                        <span className="font-medium text-slate-700 flex items-center gap-2">
                            <Package size={16} className="text-blue-500" />
                            Category
                        </span>
                        <div className="relative">
                            <select 
                                onChange={e => setProductInfo({ ...productInfo, category: e.target.value })} 
                                value={productInfo.category} 
                                className="w-full p-3 px-4 outline-none border border-slate-200 rounded-lg appearance-none bg-slate-50 focus:ring-2 focus:ring-slate-200 transition-all" 
                                required
                            >
                                <option value="">Select a category</option>
                                {categories.map((category) => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                <Package size={16} className="text-slate-500" />
                            </div>
                        </div>
                    </label>
                </div>
            </div>

            <div className="flex justify-between items-center mt-6">
                <button 
                    type="button" 
                    onClick={() => {
                        setProductInfo({ name: "", description: "", mrp: "", price: "", category: "" })
                        setImages({ 1: null, 2: null, 3: null, 4: null })
                        setAiUsed(false)
                    }}
                    className="flex items-center gap-2 text-slate-600 px-4 py-2.5 hover:bg-slate-100 rounded-lg transition"
                >
                    <RotateCcw size={16} />
                    Reset Form
                </button>
                
                <button 
                    disabled={loading} 
                    className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-6 py-3 hover:from-slate-800 hover:to-slate-900 rounded-lg transition-all flex items-center gap-2 shadow hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    <Save size={18} />
                    Add Product
                </button>
            </div>
        </form>
    )
}
