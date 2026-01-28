'use client'
import { StarIcon, ShoppingCartIcon, ShoppingBag, Eye, Award, Clock, Tag, CheckCircle, BadgePercent, Zap, Sparkles, ShoppingCart, Heart, Share2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { addToCart, removeFromCart } from '@/lib/features/cart/cartSlice'

const ProductCard = ({ product, badgeText, badgeIcon }) => {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [isActionInProgress, setIsActionInProgress] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    
    const dispatch = useDispatch();
    const cart = useSelector(state => state.cart.cartItems);
    const isInCart = cart[product.id];

    // calculate the average rating of the product
    const rating = Math.round(product.rating.reduce((acc, curr) => acc + curr.rating, 0) / (product.rating.length || 1)) || 0;
    
    // Calculate discount percentage
    const discountPercentage = product.mrp && product.price < product.mrp 
        ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
        : 0;
        
    // Calculate promo text
    const promoText = product.flat20 ? `Get it for ${currency}${product.flat20Price || (product.price * 0.8).toFixed(0)} with FLAT20` : 
                      product.flat35 ? `Get it for ${currency}${product.flat35Price || (product.price * 0.65).toFixed(0)} with FLAT35` : '';

    const handleCartAction = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (product.stock <= 0) return;
        
        setIsActionInProgress(true);
        
        if (isInCart) {
            dispatch(removeFromCart({ productId: product.id }));
        } else {
            dispatch(addToCart({ productId: product.id }));
        }
        
        setTimeout(() => {
            setIsActionInProgress(false);
        }, 500);
    };
    
    // Quick view handler
    const handleQuickView = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Implement quick view functionality here
        console.log("Quick view for product:", product.id);
    };
    
    // Toggle favorite
    const handleFavoriteToggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsFavorite(!isFavorite);
    };

    return (
        <Link 
            href={`/product/${product.id}`} 
            className='group max-xl:mx-auto relative block transform transition-all duration-300 hover:-translate-y-1.5 w-full'
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* Product Card Container */}
            <div className='rounded-xl overflow-hidden bg-white border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col'>
                {/* Product Image Container */}
                <div className={`h-48 sm:h-56 w-full flex items-center justify-center overflow-hidden relative
                    ${product.category === 'Hair Growth' ? 'bg-gradient-to-br from-[#ede0d4] to-[#e6ccb2]' : 
                     product.category === 'Shampoo' ? 'bg-gradient-to-br from-[#d8f3dc] to-[#b7e4c7]' : 
                     product.category === 'Anti Dandruff' ? 'bg-gradient-to-br from-[#e9ecef] to-[#dee2e6]' : 
                     'bg-gradient-to-br from-[#dbe7fb] to-[#bfd7fc]'}`}>
                    
                                        {/* Skeleton loader with shimmer effect */}
                    {!imageLoaded && (
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-100 to-slate-200 animate-pulse overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 bottom-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                        </div>
                    )}
                    
                    {/* Product Image */}
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        <Image 
                            width={500} 
                            height={500} 
                            className={`max-h-40 sm:max-h-48 w-auto transition-all duration-500 object-contain z-10 drop-shadow-sm ${
                                imageLoaded ? 'opacity-100' : 'opacity-0'
                            } ${isHovering ? 'scale-110' : 'scale-100'}`} 
                            src={product.images[0]} 
                            alt={product.name}
                            onLoad={() => setImageLoaded(true)}
                        />
                    </div>
                    
                    {/* Favorite button */}
                    {/* <button 
                        className={`absolute top-3 right-3 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-sm z-20 transition-all 
                        }`}
                        aria-label="Quick view"
                        onClick={handleQuickView}
                    >
                        <Eye size={16} fill={isFavorite ? "currentColor" : "none"} />
                    </button> */}

                    
                    
                    {/* Badge */}
                    {badgeText && (
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-full z-20 flex items-center gap-1.5 shadow-sm border border-amber-200/50 backdrop-blur-sm">
                            {badgeIcon || <Sparkles size={12} className="text-amber-600" />} {badgeText}
                        </div>
                    )}

                    {/* Discount badge */}
                    {/* {discountPercentage > 0 && (
                        <div className="absolute top-11 left-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full z-20 flex items-center gap-1.5 shadow-md transform rotate-2 animate-pulse">
                            <BadgePercent size={12} /> {discountPercentage}% OFF
                        </div>
                    )} */}
                    
                    

                    {/* Category pill */}
                    {product.category && (
                        <div className="absolute bottom-3 left-3 bg-white/80 backdrop-blur-sm text-xs text-slate-700 px-2.5 py-1 rounded-full z-20 opacity-90 hover:opacity-100 transition-opacity border border-slate-200/50">
                            {product.category}
                        </div>
                    )}
                </div>
                
                {/* Product Information */}
                <div className='p-3.5 sm:p-5 flex-1 flex flex-col'>
                    {/* Star Rating */}
                    <div className='flex items-center gap-1.5 mb-2'>
                        <div className='flex text-yellow-500'>
                            {Array(5).fill('').map((_, index) => (
                                <StarIcon 
                                    key={index} 
                                    size={14} 
                                    className='text-transparent drop-shadow-sm' 
                                    fill={rating >= index + 1 ? "#F59E0B" : "#E5E7EB"} 
                                    strokeWidth={0}
                                />
                            ))}
                        </div>
                        <span className="text-xs text-slate-600 font-medium">
                            {rating.toFixed(1)} | {product.rating.length} Reviews
                        </span>
                    </div>
                    
                    {/* Product Name with animation on hover */}
                    <h3 className="font-medium text-sm sm:text-base text-slate-800 line-clamp-2 min-h-[2.5rem] mb-1.5 leading-snug group-hover:text-blue-700 transition-colors">
                        {product.name}
                    </h3>
                    
                    {/* Product Short Description */}
                    <div className="flex flex-wrap gap-1 mt-1 mb-2">
                        {product.shortDescription && product.shortDescription.split('|').map((item, index) => (
                            <div key={index} className="text-xs text-slate-500 flex items-center">
                                {index > 0 && <span className="mx-1 text-slate-300">•</span>}
                                {item.trim()}
                            </div>
                        ))}
                    </div>

                    {/* Spacer to push button to bottom */}
                    <div className="flex-grow"></div>

                    {/* Product Price with updated styling */}
                    <div className="flex items-center gap-2 mt-3">
                        <p className="font-semibold text-base text-slate-900">{currency}{product.price}</p>
                        {product.mrp && product.price < product.mrp && (
                            <p className="text-xs text-slate-500 line-through">{currency}{product.mrp}</p>
                        )}
                        {discountPercentage > 0 && (
                            <p className="text-xs text-green-600 font-medium ml-1">{discountPercentage}% OFF</p>
                        )}
                    </div>

                    {/* Promo Text with improved visibility */}
                    {promoText && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs bg-gradient-to-r from-green-50 to-green-100 text-green-700 px-2.5 py-1 rounded-full w-fit border border-green-200/50">
                            <Zap size={12} className="text-green-600" />
                            {promoText}
                        </div>
                    )}

                    {/* Add to Cart Button with improved animations */}
                    <button 
                        onClick={handleCartAction}
                        disabled={product.stock <= 0}
                        className={`mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all duration-300 ${
                            product.stock <= 0 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                : isInCart
                                    ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                    : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-800 font-medium shadow-sm hover:shadow-md'
                        } ${isActionInProgress ? 'scale-95' : ''}`}
                    >
                        {product.stock <= 0 ? (
                            <>
                                <Clock size={16} />
                                OUT OF STOCK
                            </>
                        ) : isInCart ? (
                            <>
                                <CheckCircle size={16} className="text-green-600" />
                                ADDED TO CART
                            </>
                        ) : (
                            <>
                                <ShoppingCart size={16} />
                                ADD TO CART
                            </>
                        )}
                    </button>
                </div>
            </div>
            
            {/* Stock Status Overlay with blur effect */}
            {product.stock === 0 && (
                <div className="absolute inset-0 bg-white/85 flex items-center justify-center rounded-xl z-30 backdrop-blur-[2px]">
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white text-xs font-medium py-2 px-5 rounded-full flex items-center gap-2 shadow-lg">
                        <Clock size={14} />
                        Out of Stock
                    </div>
                </div>
            )}
            
            {/* New Tag with animation */}
            {product.isNew && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold py-1.5 px-3 rounded-full z-20 shadow-md transform rotate-12 animate-bounce">
                    NEW
                </div>
            )}
            
            {/* Fast Delivery Tag */}
            {product.fastDelivery && (
                <div className="absolute -bottom-2 right-4 bg-white text-green-600 text-xs font-medium py-1 px-3 rounded-full z-20 shadow-md border border-green-100 flex items-center gap-1">
                    <Truck size={10} /> Fast Delivery
                </div>
            )}
        </Link>
    )
}

export default ProductCard
