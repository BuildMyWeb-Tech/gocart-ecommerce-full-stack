'use client'

import { addToCart } from "@/lib/features/cart/cartSlice";
import { StarIcon, TagIcon, EarthIcon, CreditCardIcon, UserIcon, ShieldCheckIcon, TruckIcon, RotateCcwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Counter from "./Counter";
import { useDispatch, useSelector } from "react-redux";

const ProductDetails = ({ product }) => {
    const productId = product.id;
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';

    const cart = useSelector(state => state.cart.cartItems);
    const dispatch = useDispatch();

    const router = useRouter()

    const [mainImage, setMainImage] = useState(product.images[0]);

    const addToCartHandler = () => {
        dispatch(addToCart({ productId }))
    }

    const averageRating = product.rating.reduce((acc, item) => acc + item.rating, 0) / product.rating.length;
    
    return (
        <div className="flex max-lg:flex-col gap-12 bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex max-sm:flex-col-reverse gap-3">
                <div className="flex sm:flex-col gap-3">
                    {product.images.map((image, index) => (
                        <div 
                            key={index} 
                            onClick={() => setMainImage(product.images[index])} 
                            className={`bg-slate-100 flex items-center justify-center size-26 rounded-lg group cursor-pointer transition-all duration-300 ${mainImage === product.images[index] ? 'ring-2 ring-green-500' : 'hover:ring-1 hover:ring-slate-300'}`}
                        >
                            <Image 
                                src={image} 
                                className="group-hover:scale-103 group-active:scale-95 transition-transform duration-300" 
                                alt="" 
                                width={45} 
                                height={45}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-center items-center h-100 sm:size-113 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <Image 
                        src={mainImage} 
                        alt={product.name} 
                        width={250} 
                        height={250} 
                        className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                    />
                </div>
            </div>
            <div className="flex-1">
                <div className="flex flex-col">
                    <span className="text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full self-start mb-2">
                        In Stock
                    </span>
                    <h1 className="text-3xl font-semibold text-slate-800 leading-tight">{product.name}</h1>
                </div>
                <div className='flex items-center mt-2'>
                    {Array(5).fill('').map((_, index) => (
                        <StarIcon 
                            key={index} 
                            size={16} 
                            className='text-transparent mt-0.5' 
                            fill={averageRating >= index + 1 ? "#00C950" : "#D1D5DB"} 
                            strokeWidth={0}
                        />
                    ))}
                    <p className="text-sm ml-3 text-slate-500 font-medium">{product.rating.length} Reviews</p>
                </div>
                <div className="flex items-start my-6 gap-3">
                    <p className="text-2xl font-semibold text-slate-800">{currency}{product.price}</p>
                    <div className="flex flex-col">
                        <p className="text-xl text-slate-500 line-through">{currency}{product.mrp}</p>
                        <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded font-medium">
                            {((product.mrp - product.price) / product.mrp * 100).toFixed(0)}% OFF
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-slate-500 bg-amber-50 px-3 py-2 rounded-lg">
                    <TagIcon size={14} className="text-amber-500" />
                    <p className="text-amber-700 text-sm font-medium">Limited time offer: Save {((product.mrp - product.price) / product.mrp * 100).toFixed(0)}% right now!</p>
                </div>
                
                {/* Product Features - New Section */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                        <div className="bg-blue-50 p-1.5 rounded mt-0.5">
                            <ShieldCheckIcon size={16} className="text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-700">Genuine Product</p>
                            <p className="text-xs text-slate-500">100% authentic guarantee</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="bg-purple-50 p-1.5 rounded mt-0.5">
                            <TruckIcon size={16} className="text-purple-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-700">Fast Delivery</p>
                            <p className="text-xs text-slate-500">Ships in 1-2 business days</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-end gap-5 mt-10">
                    {
                        cart[productId] && (
                            <div className="flex flex-col gap-3">
                                <p className="text-lg text-slate-800 font-semibold">Quantity</p>
                                <Counter productId={productId} />
                            </div>
                        )
                    }
                    <button 
                        onClick={() => !cart[productId] ? addToCartHandler() : router.push('/cart')} 
                        className="bg-slate-800 text-white px-10 py-3.5 text-sm font-medium rounded-lg hover:bg-slate-900 active:scale-95 transition-all duration-300 shadow-md hover:shadow-lg flex-1 max-w-xs"
                    >
                        {!cart[productId] ? 'Add to Cart' : 'View Cart'}
                    </button>
                </div>
                <hr className="border-gray-200 my-6" />
                <div className="flex flex-col gap-4 text-slate-500 bg-slate-50 p-4 rounded-lg">
                    <h3 className="font-medium text-slate-700">Shipping & Returns</h3>
                    <p className="flex gap-3 items-center text-sm">
                        <EarthIcon className="text-slate-400" size={18} /> 
                        <span>Free shipping worldwide <span className="text-green-600 font-medium">on orders over $50</span></span>
                    </p>
                    <p className="flex gap-3 items-center text-sm">
                        <CreditCardIcon className="text-slate-400" size={18} /> 
                        <span>100% Secured Payment with encrypted checkout</span>
                    </p>
                    <p className="flex gap-3 items-center text-sm">
                        <RotateCcwIcon className="text-slate-400" size={18} /> 
                        <span>Easy 30-day returns policy</span>
                    </p>
                    <p className="flex gap-3 items-center text-sm">
                        <UserIcon className="text-slate-400" size={18} /> 
                        <span>Trusted by <span className="font-medium text-slate-700">10,000+</span> satisfied customers</span>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default ProductDetails
