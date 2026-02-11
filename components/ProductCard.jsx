'use client'
import { 
    StarIcon, Eye, Clock, Tag, CheckCircle, BadgePercent, Zap, 
    Sparkles, ShoppingCart, Heart, ExternalLink, Shield, Truck, Package, Award
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { addToCart, removeFromCart } from '@/lib/features/cart/cartSlice'
import { addToWishlist, removeFromWishlist } from '@/lib/features/wishlist/wishlistSlice'
import toast from 'react-hot-toast'

const ProductCard = ({ product, badgeText, badgeIcon }) => {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [isActionInProgress, setIsActionInProgress] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    
    const dispatch = useDispatch();
    const cartItems = useSelector(state => state.cart.items || []);
    const wishlistItems = useSelector(state => state.wishlist.items || []);
    const isInCart = cartItems.some(item => item.id === product.id);
    const isInWishlist = wishlistItems.some(item => item.id === product.id);

    // Calculate the average rating of the product
    const rating = Math.round(product.rating?.reduce((acc, curr) => acc + curr.rating, 0) / (product.rating?.length || 1)) || 0;
    
    // Calculate discount percentage
    const discountPercentage = product.mrp && product.price < product.mrp 
        ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
        : 0;
        
    // Calculate promo text
    const promoText = product.flat20 ? `Get it for ₹${product.flat20Price || (product.price * 0.8).toFixed(0)} with FLAT20` : 
                      product.flat35 ? `Get it for ₹${product.flat35Price || (product.price * 0.65).toFixed(0)} with FLAT35` : '';

    // Cycle through product images on hover
    useEffect(() => {
        if (isHovering && product.images?.length > 1) {
            const interval = setInterval(() => {
                setActiveImageIndex(prev => (prev + 1) % product.images.length);
            }, 2000);
            return () => clearInterval(interval);
        } else {
            setActiveImageIndex(0);
        }
    }, [isHovering, product.images?.length]);

    const handleCartAction = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (product.stock <= 0) return;
        
        setIsActionInProgress(true);
        
        if (isInCart) {
            dispatch(removeFromCart(product.id));
            toast.error(`${product.name} removed from cart`, {
                icon: '🛒',
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                }
            });
        } else {
            // Create a cart-ready product object
            const cartProduct = {
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.images?.[0] || '/placeholder.png',
                quantity: 1,
                category: product.category,
                stock: product.stock
            };
            
            dispatch(addToCart({ product: cartProduct }));
            
            // Save cart to localStorage
            setTimeout(() => {
                const state = JSON.stringify({
                    cart: {
                        items: cartItems.concat([cartProduct]),
                        totalPrice: cartItems.reduce((total, item) => total + item.price * item.quantity, 0) + product.price,
                        total: cartItems.length + 1
                    }
                });
                localStorage.setItem('redux-state', state);
            }, 100);
            
            toast.success(`${product.name} added to cart!`, {
                icon: '🛒',
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                }
            });
        }
        
        setTimeout(() => {
            setIsActionInProgress(false);
        }, 500);
    };

    const toggleWishlist = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Create a wishlist-ready product object
        const wishlistProduct = {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.images?.[0] || '/placeholder.png',
            category: product.category,
            inStock: product.stock > 0
        };
        
        if (isInWishlist) {
            dispatch(removeFromWishlist(product.id));
            toast.error(`Removed from wishlist`, {
                icon: '💔',
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                }
            });
        } else {
            dispatch(addToWishlist(wishlistProduct));
            toast.success(`Added to wishlist`, {
                icon: '❤️',
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                }
            });
        }
    };

    return (
        <div 
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
                    
                    {/* Product Images with fade transition */}
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        {product.images && product.images.map((image, index) => (
                            <Image 
                                key={index}
                                width={500} 
                                height={500} 
                                className={`absolute inset-0 h-full w-full object-contain object-center p-4 transition-opacity duration-500 ${
                                    index === activeImageIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                                } ${imageLoaded ? '' : 'opacity-0'}`}
                                src={image} 
                                alt={`${product.name} - Image ${index + 1}`}
                                onLoad={() => {
                                    if (index === 0) setImageLoaded(true);
                                }}
                            />
                        ))}
                    </div>
                    
                    {/* Image indicators */}
                    {product.images && product.images.length > 1 && (
                        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-20">
                            {product.images.map((_, index) => (
                                <div 
                                    key={index}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                        activeImageIndex === index 
                                            ? 'w-4 bg-slate-800' 
                                            : 'w-1.5 bg-slate-400/50'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                    
                    {/* Main Badge */}
                    {badgeText && (
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full z-20 flex items-center gap-1.5 shadow-md">
                            {badgeIcon || <Sparkles size={12} className="text-yellow-200" />} {badgeText}
                        </div>
                    )}
                    
                    {/* OUT OF STOCK Badge - Positioned in top right corner */}
                    {product.stock <= 0 && (
                        <div className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full z-30 flex items-center gap-1.5 shadow-md">
                            <Clock size={12} />
                            OUT OF STOCK
                        </div>
                    )}
                    
                    {/* Wishlist button */}
                    <button 
                        className={`absolute top-3 right-3 z-30 p-2 rounded-full shadow-md transition-all duration-300 ${
                            isInWishlist 
                                ? 'bg-red-500 text-white' 
                                : 'bg-white/80 backdrop-blur-sm text-slate-600 hover:bg-white hover:text-red-500'
                        }`}
                        onClick={toggleWishlist}
                        aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
                    >
                        <Heart size={18} fill={isInWishlist ? "white" : "none"} />
                    </button>
                    
                    {/* Quick action overlay - now with lower opacity and no blur for better product visibility */}
                    <div className={`absolute inset-0 bg-slate-900/30 flex items-center justify-center z-20 
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                        ${product.stock <= 0 ? 'pointer-events-none' : ''}`}>
                        {product.stock > 0 && (
                            <div className="flex flex-col gap-3">
                                <Link 
                                    href={`/product/${product.id}`}
                                    className="bg-white text-slate-800 hover:text-green-600 hover:bg-green-50 font-medium px-2 py-1.5 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink size={16} />
                                    View Details
                                </Link>
                                <button 
                                    onClick={handleCartAction}
                                    className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-medium px-5 py-2.5 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
                                >
                                    <ShoppingCart size={18} /> 
                                    {isInCart ? 'Added to Cart' : 'Add to Cart'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Category pill - Positioned in bottom left corner with improved styling */}
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-xs text-slate-700 px-2.5 py-1 rounded-full z-20 opacity-90 hover:opacity-100 transition-opacity border border-slate-200/50 shadow-sm flex items-center gap-1.5">
                        <Tag size={10} className="text-slate-500" />
                        {product.category}
                    </div>
                </div>
                
                {/* Product Information */}
                <div className='p-3.5 sm:p-5 flex-1 flex flex-col'>
                    {/* Product Name with animation on hover */}
                    <Link href={`/product/${product.id}`} className="group/title">
                        <h3 className="font-medium text-sm sm:text-base text-slate-800 line-clamp-2 min-h-[2.5rem] mb-2 leading-snug group-hover:text-green-700 transition-colors">
                            {product.name}
                            <span className="block w-0 group-hover/title:w-full h-0.5 bg-green-500 mt-0.5 transition-all duration-300 opacity-0 group-hover/title:opacity-100"></span>
                        </h3>
                    </Link>
                    
                    {/* Product Short Description with icon */}
                    {product.shortDescription && (
                        <div className="flex flex-wrap gap-1.5 mt-1 mb-3 bg-slate-50 p-2 rounded-md">
                            {product.shortDescription.split('|').map((item, index) => (
                                <div key={index} className="text-xs text-slate-600 flex items-center">
                                    {index > 0 && <div className="w-1 h-1 rounded-full bg-slate-300 mx-1"></div>}
                                    <span className="flex items-center">
                                        {index === 0 && <Shield size={10} className="mr-1 text-emerald-500" />}
                                        {index === 1 && <Truck size={10} className="mr-1 text-blue-500" />}
                                        {index === 2 && <Package size={10} className="mr-1 text-purple-500" />}
                                        {item.trim()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Spacer to push button to bottom */}
                    <div className="flex-grow"></div>

                    {/* Product Price with updated styling */}
                    <div className="flex items-center gap-2 mt-1 mb-2 bg-slate-50 p-2 rounded-md">
                        <p className="font-bold text-base sm:text-lg text-slate-900">{currency}{product.price}</p>
                        {product.mrp && product.price < product.mrp && (
                            <p className="text-xs text-slate-500 line-through">{currency}{product.mrp}</p>
                        )}
                        {discountPercentage > 0 && (
                            <p className="text-xs text-white font-medium ml-auto bg-green-500 px-2 py-0.5 rounded">
                                SAVE {currency}{(product.mrp - product.price).toFixed(0)}
                            </p>
                        )}
                    </div>

                    {/* Star Rating */}
                    <div className='flex items-center justify-between mb-2'>
                        <div className='flex items-center gap-1.5'>
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
                                {rating.toFixed(1)} | {product.rating?.length || 0} Reviews
                            </span>
                        </div>
                        
                        {/* Stock indicator dot */}
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${
                            product.stock > 0 
                                ? 'text-green-600' 
                                : 'text-red-600'
                        }`}>
                            <span className={`h-2 w-2 rounded-full ${
                                product.stock > 0 ? 'bg-green-500' : 'bg-red-500'
                            }`}></span>
                            {product.stock > 0 
                                ? product.stock > 10 ? 'In Stock' : `Only ${product.stock} left` 
                                : 'Out of Stock'}
                        </div>
                    </div>

                    {/* Promo Text with improved visibility */}
                    {promoText && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 px-3 py-1.5 rounded-md w-fit border border-amber-200/50">
                            <Zap size={12} className="text-amber-600" />
                            {promoText}
                        </div>
                    )}

                    {/* Add to Cart and View Details buttons for non-hover state (mobile-friendly) */}
                    <div className="flex flex-col sm:flex-row gap-1 mt-4">
                        <Link 
                            href={`/product/${product.id}`}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-md transition-all duration-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium border border-slate-200 hover:border-slate-300"
                        >
                            <ExternalLink size={16} />
                            View Details
                        </Link>
                        <button 
                            onClick={handleCartAction}
                            disabled={product.stock <= 0}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-md transition-all duration-200 text-sm font-medium ${
                                product.stock <= 0 
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                    : isInCart
                                        ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 hover:border-red-300'
                                        : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-sm hover:shadow border border-transparent'
                            } ${isActionInProgress ? 'scale-95' : ''}`}
                        >
                            {product.stock <= 0 ? (
                                <>
                                    <Clock size={16} />
                                    Out of Stock
                                </>
                            ) : isInCart ? (
                                <>
                                    <CheckCircle size={16} className="text-red-500" />                                    
                                    Added to Cart
                                </>
                            ) : (
                                <>
                                    <ShoppingCart size={16} />
                                    Add to Cart
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            
            {/* New Tag with animation */}
            {product.isNew && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-green-600 text-white text-xs font-bold py-1.5 px-3 rounded-full z-20 shadow-md transform rotate-12">
                    <span className="animate-pulse inline-block">NEW</span>
                </div>
            )}

            {/* Express Delivery Tag */}
            {product.expressDelivery && (
                <div className="absolute -top-2 -left-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white text-xs font-bold py-1.5 px-3 rounded-full z-20 shadow-md transform -rotate-12">
                    <span className="flex items-center gap-1">
                        <Truck size={10} />
                        EXPRESS
                    </span>
                </div>
            )}
        </div>
    )
}

export default ProductCard
