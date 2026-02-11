'use client'
import { addToCart } from "@/lib/features/cart/cartSlice";
import {
  StarIcon,
  TagIcon,
  ShieldCheckIcon,
  TruckIcon,
  ShoppingCartIcon,
  HeartIcon,
  ShareIcon,
  CheckIcon,
  BarChart3Icon,
  ArrowLeftIcon,
  Truck,
  Zap,
  Award,
  RefreshCw,
  ThumbsUp,
  Clock
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Counter from "./Counter";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";

const ProductDetails = ({ product }) => {
  const productId = product.id;
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹';

  const cart = useSelector(state => state.cart.cartItems);
  const dispatch = useDispatch();
  const router = useRouter();

  const [mainImage, setMainImage] = useState(product.images[0]);
  const [isWishlist, setIsWishlist] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const averageRating =
    product.rating.length > 0
      ? product.rating.reduce((sum, r) => sum + r.rating, 0) / product.rating.length
      : 0;

  const discountPercentage = Math.round(
    ((product.mrp - product.price) / product.mrp) * 100
  );

  const addToCartHandler = () => {
    if (product.stock <= 0) return;
    
    dispatch(addToCart({ productId }));
    toast.success(`${product.name} added to your cart!`, {
      icon: '🛒',
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      }
    });
  };
  
  // Features for product
  const features = [
    { icon: TruckIcon, color: 'blue', title: 'Free Delivery', description: 'For orders above ₹50' },
    { icon: RefreshCw, color: 'green', title: 'Easy Returns', description: '30-day returns policy' },
    { icon: ShieldCheckIcon, color: 'purple', title: 'Secure Payment', description: '100% secure checkout' },
    { icon: Zap, color: 'amber', title: 'Fast Shipping', description: 'Delivered in 2-3 days' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Breadcrumb navigation (simple version) */}
      {/* <div className="flex items-center gap-1 text-xs text-slate-500 p-4 border-b border-slate-100">
        <button onClick={() => router.back()} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
          <ArrowLeftIcon size={14} />
          Back
        </button>
        <span>/</span>
        <span>{product.category}</span>
        <span>/</span>
        <span className="text-slate-800 font-medium truncate max-w-[150px]">{product.name}</span>
      </div> */}

      <div className="flex max-lg:flex-col gap-6 lg:gap-12 p-6 lg:p-8">
        {/* ================= IMAGES ================= */}
        <div className="flex max-sm:flex-col-reverse gap-4 md:gap-6 lg:w-[45%]">
          <div className="flex sm:flex-col gap-3 sm:min-w-24">
            {product.images.map((image, index) => (
              <div
                key={index}
                onClick={() => setMainImage(image)}
                className={`relative bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center size-24 rounded-xl cursor-pointer transition border-2 overflow-hidden
                  ${mainImage === image ? 'border-blue-500 shadow-sm' : 'border-transparent hover:border-slate-300'}
                `}
              >
                <Image
                  src={image}
                  alt={`${product.name} ${index + 1}`}
                  width={80}
                  height={80}
                  className="object-contain p-2 transition-all duration-300 hover:scale-110"
                />
              </div>
            ))}
          </div>

          <div className="relative flex justify-center items-center h-100 sm:size-113 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl overflow-hidden group">
            {/* Image skeleton loader */}
            {imageLoading && (
              <div className="absolute inset-0 bg-gradient-to-r from-slate-100 to-slate-200 animate-pulse">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              </div>
            )}
            
            {discountPercentage > 0 && (
              <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg z-20 shadow-md flex items-center gap-1.5">
                <TagIcon size={14} />
                {discountPercentage}% OFF
              </div>
            )}
            
            {/* Stock status badge */}
            <div className={`absolute top-4 right-4 text-xs font-semibold px-3 py-1.5 rounded-lg z-20 flex items-center gap-1.5 ${
              product.stock > 0 
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {product.stock > 0 ? (
                <>
                  <span className="size-2 rounded-full bg-green-600"></span>
                  In Stock ({product.stock})
                </>
              ) : (
                <>
                  <Clock size={14} />
                  Out of Stock
                </>
              )}
            </div>
            
            <Image
              src={mainImage}
              alt={product.name}
              width={500}
              height={500}
              onLoad={() => setImageLoading(false)}
              className={`object-contain p-6 transition-transform duration-500 group-hover:scale-110 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
            />
            
            {/* Zoom hint */}
            <div className="absolute bottom-3 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-slate-600 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full">
                Hover to zoom
              </span>
            </div>
          </div>
        </div>

        {/* ================= INFO ================= */}
        <div className="flex-1">
          {/* PRODUCT NAME */}
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
            {product.name}
          </h1>

          {/* CATEGORY & RATING */}
          <div className="flex flex-wrap items-center gap-4 mb-5">
            {product.category && (
              <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium">
                {product.category}
              </span>
            )}
            
            <div className="flex items-center gap-3">
              <div className="flex">
                {Array(5).fill('').map((_, i) => (
                  <StarIcon
                    key={i}
                    size={16}
                    fill={averageRating >= i + 1 ? "#fbbf24" : "#e5e7eb"}
                    strokeWidth={0}
                  />
                ))}
              </div>
              <span className="text-sm text-slate-600">
                <span className="font-medium">{averageRating.toFixed(1)}</span> ({product.rating.length} reviews)
              </span>
            </div>
          </div>

          {/* PRICE */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex flex-col">
              <p className="text-3xl font-bold text-slate-800">
                ₹{product.price}
              </p>
              
              {product.mrp && product.price < product.mrp && (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-400 line-through">
                    ₹{product.mrp}
                  </p>
                  <span className="text-xs text-green-600 font-medium">
                    Save ₹{(product.mrp - product.price).toFixed(2)} ({discountPercentage}%)
                  </span>
                </div>
              )}
            </div>
            
            {/* Stock pill directly on the product page */}
            <div className={`ml-auto px-3 py-1.5 rounded-full text-sm font-medium ${
              product.stock > 0 
                ? 'bg-green-50 text-green-700' 
                : 'bg-red-50 text-red-700'
            }`}>
              {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
            </div>
          </div>

          {/* OFFER BANNER */}
          {discountPercentage > 0 && (
            <div className="flex items-start gap-3 bg-gradient-to-r from-amber-50 to-amber-100 px-4 py-3 rounded-xl mb-6 border border-amber-200/50">
              <Zap size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Limited time offer — Save {discountPercentage}% today!
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Hurry! Offer ends soon. Free shipping on this item.
                </p>
              </div>
            </div>
          )}

          {/* DESCRIPTION */}
          <div className="mb-6">
            <h3 className="font-semibold text-slate-800 mb-2">Description</h3>
            <p className="text-slate-600 leading-relaxed">
              {product.description && product.description.length > 250 
                ? `${product.description.substring(0, 250)}...` 
                : product.description}
            </p>
          </div>
          
          {/* Key features */}
          {product.keyFeatures && (
            <div className="mb-6 bg-slate-50 p-4 rounded-xl">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Key Features:</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {product.keyFeatures.split('|').map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="bg-green-100 p-1 rounded-full">
                      <CheckIcon size={12} className="text-green-600" />
                    </div>
                    {feature.trim()}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CART ACTIONS */}
          <div className="flex flex-wrap items-center gap-4 mt-6">
            {cart[productId] ? (
              <div className="flex flex-col">
                <p className="text-xs text-slate-600 mb-1">Quantity</p>
                <Counter productId={productId} />
              </div>
            ) : (
              <div className="w-32">
                <p className="text-xs text-slate-600 mb-1">Quantity</p>
                <div className="flex items-center justify-between bg-slate-100 rounded-lg p-2">
                  <span className="px-3 text-sm">1</span>
                </div>
              </div>
            )}

            <button
              onClick={() =>
                cart[productId]
                  ? router.push('/cart')
                  : addToCartHandler()
              }
              disabled={product.stock <= 0 && !cart[productId]}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium shadow-sm hover:shadow transition-all ${
                product.stock > 0 || cart[productId]
                  ? cart[productId]
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              <ShoppingCartIcon size={18} />
              {cart[productId] ? 'View Cart' : 'Add to Cart'}
            </button>
            
            {/* <button
              className="flex items-center justify-center p-3.5 rounded-xl font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                setIsWishlist(!isWishlist);
                if (!isWishlist) {
                  toast.success('Added to wishlist!', {
                    icon: '❤️',
                    style: {
                      borderRadius: '10px',
                      background: '#333',
                      color: '#fff',
                    }
                  });
                }
              }}
            >
              <HeartIcon size={20} fill={isWishlist ? "#ef4444" : "none"} className={isWishlist ? "text-red-500" : ""} />
            </button> */}
          </div>
          
          {/* TRUST FEATURES */}
          <div className="grid grid-cols-2 gap-3 mt-8">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className={`bg-${feature.color}-100 p-2 rounded-full flex-shrink-0`}>
                  <feature.icon size={16} className={`text-${feature.color}-600`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{feature.title}</p>
                  <p className="text-xs text-slate-500">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              <span className="text-xs font-medium text-slate-700">Trusted Quality</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheckIcon size={18} className="text-green-600" />
              <span className="text-xs font-medium text-slate-700">Secure Payment</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck size={18} className="text-green-500" />
              <span className="text-xs font-medium text-slate-700">Free Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <ThumbsUp size={18} className="text-purple-500" />
              <span className="text-xs font-medium text-slate-700">24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
