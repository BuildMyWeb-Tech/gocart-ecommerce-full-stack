'use client';
import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
    ShoppingCart, Trash2, Heart, ArrowRight, Plus, Minus, 
    ChevronLeft, CheckCircle, ShieldCheck, Truck, Bookmark, 
    AlertTriangle, X, CreditCard, RefreshCw, Gift, Tag, Package
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { removeFromCart, updateCartQuantity, clearCart } from '@/lib/features/cart/cartSlice';
import { addToWishlist } from '@/lib/features/wishlist/wishlistSlice';

const CartPage = () => {
    const cartItems = useSelector(state => state.cart.items || []);
    const cartTotal = useSelector(state => state.cart.totalPrice || 0);
    const [couponCode, setCouponCode] = useState('');
    const [couponApplied, setCouponApplied] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [productToRemove, setProductToRemove] = useState(null);
    const dispatch = useDispatch();
    
    const applyCoupon = () => {
        if (couponCode.toUpperCase() === 'SAVE10') {
            setDiscount(cartTotal * 0.1);
            setCouponApplied(true);
            toast.success('Coupon applied successfully!', {
                icon: '🎉',
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                }
            });
        } else {
            toast.error('Invalid coupon code', {
                icon: '⚠️',
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                }
            });
        }
    };
    
    const confirmRemoveFromCart = (product) => {
        setProductToRemove(product);
        setShowConfirmation(true);
    };
    
    const removeFromCartHandler = (productId) => {
        dispatch(removeFromCart(productId));
        
        setShowConfirmation(false);
        setProductToRemove(null);
        
        toast.success('Removed from cart', {
            icon: '🗑️',
            style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
            }
        });
    };
    
    const updateQuantityHandler = (productId, quantity) => {
        if (quantity < 1) return;
        
        dispatch(updateCartQuantity({ id: productId, quantity }));
    };
    
    const addToWishlistHandler = (product) => {
        // Create a wishlist-ready product object
        const wishlistProduct = {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            category: product.category,
            inStock: true
        };
        
        dispatch(addToWishlist(wishlistProduct));
        
        toast.success('Added to wishlist', {
            icon: '❤️',
            style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
            }
        });
    };
    
    // Calculate final amounts
    const subtotal = cartTotal;
    const shipping = 0; // Free shipping
    const tax = subtotal * 0.08;
    const totalAmount = subtotal + tax - discount;
    
    if (cartItems.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-slate-100">
                    <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center rounded-full bg-green-50/50">
                        <ShoppingCart size={40} className="text-green-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-3">Your cart is empty</h1>
                    <p className="text-slate-500 mb-8 max-w-md mx-auto">Looks like you haven't added anything to your cart yet.</p>
                    <Link 
                        href="/shop" 
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium py-3 px-8 rounded-full transition-all shadow-sm hover:shadow"
                    >
                        Start Shopping
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Confirmation Dialog */}
            <AnimatePresence>
                {showConfirmation && (
                    <motion.div 
                        className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div 
                            className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 text-red-600 rounded-full">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-800">Remove Item</h3>
                                </div>
                                <button 
                                    className="text-slate-400 hover:text-slate-600"
                                    onClick={() => {
                                        setShowConfirmation(false);
                                        setProductToRemove(null);
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            
                            {productToRemove && (
                                <div className="p-5">
                                    <p className="text-slate-600 mb-4">
                                        Are you sure you want to remove <span className="font-medium text-slate-800">{productToRemove.name}</span> from your cart?
                                    </p>
                                    
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg mb-5">
                                        <div className="relative w-12 h-12 flex-shrink-0 bg-white rounded-md overflow-hidden border border-slate-200">
                                            <Image
                                                src={productToRemove.image || '/placeholder.png'}
                                                alt={productToRemove.name}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-slate-800">{productToRemove.name}</h4>
                                            <p className="text-sm text-slate-500">${productToRemove.price.toFixed(2)} × {productToRemove.quantity}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-3">
                                        <button 
                                            className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
                                            onClick={() => {
                                                setShowConfirmation(false);
                                                setProductToRemove(null);
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center justify-center gap-2"
                                            onClick={() => removeFromCartHandler(productToRemove.id)}
                                        >
                                            <Trash2 size={16} />
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 mb-1 flex items-center gap-3">
                            <ShoppingCart size={24} className="text-green-500" />
                            My Cart
                        </h1>
                        <p className="text-slate-500">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart</p>
                    </div>
                    <Link 
                        href="/shop" 
                        className="mt-4 md:mt-0 inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium group"
                    >
                        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Continue Shopping
                    </Link>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="hidden md:grid grid-cols-12 gap-4 p-6 border-b border-slate-100 text-sm font-medium text-slate-600 bg-slate-50">
                                <div className="col-span-6">Product</div>
                                <div className="col-span-2 text-center">Price</div>
                                <div className="col-span-2 text-center">Quantity</div>
                                <div className="col-span-2 text-right">Total</div>
                            </div>
                            
                            <div className="divide-y divide-slate-100">
                                {cartItems.map((item) => (
                                    <motion.div 
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="grid grid-cols-1 md:grid-cols-12 gap-4 p-6 items-center"
                                    >
                                        {/* Product details */}
                                        <div className="col-span-6 flex gap-4 items-center">
                                            <Link href={`/product/${item.id}`} className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-slate-50 rounded-lg overflow-hidden group/image">
                                                <Image
                                                    src={item.image || '/placeholder.png'}
                                                    alt={item.name}
                                                    fill
                                                    className="object-contain p-2 transition-transform group-hover/image:scale-110"
                                                />
                                            </Link>
                                            <div>
                                                <h3 className="font-medium text-slate-800 mb-1 hover:text-green-600 transition-colors">
                                                    <Link href={`/product/${item.id}`}>
                                                        {item.name}
                                                    </Link>
                                                </h3>
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                                                        <Tag size={10} />
                                                        {item.category}
                                                    </span>
                                                    <button 
                                                        onClick={() => addToWishlistHandler(item)}
                                                        className="text-slate-400 hover:text-red-500 text-xs flex items-center gap-1 transition-colors"
                                                    >
                                                        <Heart size={12} />
                                                        Save for later
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Price */}
                                        <div className="col-span-2 md:text-center order-1 md:order-none">
                                            <span className="md:hidden text-sm text-slate-500 mr-2">Price: </span>
                                            <span className="font-medium text-slate-800">${item.price.toFixed(2)}</span>
                                        </div>
                                        
                                        {/* Quantity */}
                                        <div className="col-span-2 order-2 md:order-none">
                                            <div className="flex items-center justify-center">
                                                <button 
                                                    onClick={() => updateQuantityHandler(item.id, item.quantity - 1)}
                                                    className="p-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span className="w-12 text-center font-medium text-slate-800">
                                                    {item.quantity}
                                                </span>
                                                <button 
                                                    onClick={() => updateQuantityHandler(item.id, item.quantity + 1)}
                                                    className="p-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Total & Remove */}
                                        <div className="col-span-2 flex justify-between md:justify-end items-center gap-3 order-3 md:order-none">
                                            <span className="font-medium text-slate-800">
                                                ${(item.price * item.quantity).toFixed(2)}
                                            </span>
                                            <button 
                                                onClick={() => confirmRemoveFromCart(item)}
                                                                                                className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                                aria-label="Remove item"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Coupon Code */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <Gift size={18} className="text-purple-500" />
                                Apply Coupon Code
                            </h3>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Enter coupon code" 
                                    className="flex-1 p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500 transition-all"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value)}
                                />
                                <button 
                                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-5 rounded-lg transition-colors"
                                    onClick={applyCoupon}
                                    disabled={couponApplied}
                                >
                                    Apply
                                </button>
                            </div>
                                                        {couponApplied && (
                                <div className="flex items-center gap-2 text-green-600 mt-3 bg-green-50 p-2 rounded-md">
                                    <CheckCircle size={16} />
                                    <span className="text-sm font-medium">Coupon applied successfully! You saved ${discount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="mt-3 text-xs text-slate-500">
                                <p>Try code <span className="font-semibold text-purple-600">SAVE10</span> for 10% off your order.</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-24">
                            <h2 className="text-xl font-bold text-slate-800 mb-4">Order Summary</h2>
                            
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-slate-600">
                                    <span>Subtotal ({cartItems.length} items)</span>
                                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                                </div>
                                
                                <div className="flex justify-between text-slate-600">
                                    <span className="flex items-center gap-1">
                                        <Truck size={14} className="text-green-500" />
                                        Shipping
                                    </span>
                                    <span className="font-medium text-green-600">Free</span>
                                </div>
                                
                                <div className="flex justify-between text-slate-600">
                                    <span>Tax</span>
                                    <span className="font-medium">${tax.toFixed(2)}</span>
                                </div>
                                
                                {couponApplied && (
                                    <div className="flex justify-between text-green-600">
                                        <span className="flex items-center gap-1">
                                            <Gift size={14} />
                                            Discount
                                        </span>
                                        <span className="font-medium">-${discount.toFixed(2)}</span>
                                    </div>
                                )}
                                
                                <div className="border-t border-slate-200 pt-3 mt-3"></div>
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span className="text-green-600">${totalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                            
                            <button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium py-3 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2">
                                <CreditCard size={18} />
                                Proceed to Checkout
                            </button>
                            
                            <div className="mt-6 space-y-3">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <ShieldCheck size={16} className="text-green-600" />
                                    <span>Secure payment</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Truck size={16} className="text-green-600" />
                                    <span>Free shipping on orders over $50</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <RefreshCw size={16} className="text-green-600" />
                                    <span>30-day returns policy</span>
                                </div>
                            </div>
                            
                            
                        </div>
                    </div>
                </div>
                
                {/* Recently Viewed / Recommendations */}
                <div className="mt-12">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Bookmark size={20} className="text-green-500" />
                        You might also like
                    </h2>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {/* Placeholder for recommended products - would typically come from an API */}
                        {[1, 2, 3, 4, 5].map((item) => (
                            <div key={item} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                <div className="aspect-square bg-slate-100 relative">
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                        <Package size={24} />
                                    </div>
                                </div>
                                <div className="p-3">
                                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                                    <div className="h-3 bg-slate-200 rounded w-1/2 mb-3"></div>
                                    <div className="h-6 bg-green-200 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default CartPage;
