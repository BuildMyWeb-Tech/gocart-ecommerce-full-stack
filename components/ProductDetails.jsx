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
  BarChart3Icon
} from "lucide-react";
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
  const router = useRouter();

  const [mainImage, setMainImage] = useState(product.images[0]);
  const [isWishlist, setIsWishlist] = useState(false);

  const averageRating =
    product.rating.length > 0
      ? product.rating.reduce((sum, r) => sum + r.rating, 0) / product.rating.length
      : 0;

  const discountPercentage = Math.round(
    ((product.mrp - product.price) / product.mrp) * 100
  );

  const addToCartHandler = () => {
    dispatch(addToCart({ productId }));
  };

  return (
    <div className="flex max-lg:flex-col gap-12 bg-white rounded-2xl p-6 lg:p-8 shadow-sm">

      {/* ================= IMAGES ================= */}
      <div className="flex max-sm:flex-col-reverse gap-3 md:gap-5">
        <div className="flex sm:flex-col gap-3">
          {product.images.map((image, index) => (
            <div
              key={index}
              onClick={() => setMainImage(image)}
              className={`bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center size-26 rounded-lg cursor-pointer transition
                ${mainImage === image ? 'ring-2 ring-green-500 shadow-sm' : 'hover:ring-1 hover:ring-slate-300'}
              `}
            >
              <Image
                src={image}
                alt={`${product.name} ${index + 1}`}
                width={80}
                height={80}
                className="object-contain p-2 group-hover:scale-105 transition-all"
              />
            </div>
          ))}
        </div>

        <div className="relative flex justify-center items-center h-100 sm:size-113 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg overflow-hidden group">
          {/* Wish list and share buttons */}
          {/* <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              <button 
                  onClick={(e) => {
                      e.preventDefault();
                      setIsWishlist(!isWishlist);
                  }}
                  className={`p-2 rounded-full transition-all ${isWishlist ? 'bg-red-500 text-white' : 'bg-white/90 text-slate-600 hover:bg-white hover:text-red-500'}`}
              >
                  <HeartIcon size={18} fill={isWishlist ? "white" : "none"} />
              </button>
              <button className="p-2 bg-white/90 text-slate-600 rounded-full hover:bg-white hover:text-blue-500 transition-all">
                  <ShareIcon size={18} />
              </button>
          </div> */}

          {discountPercentage > 0 && (
            <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md">
              -{discountPercentage}% OFF
            </div>
          )}
          
          <Image
            src={mainImage}
            alt={product.name}
            width={320}
            height={320}
            className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
          />
          
          {/* Zoom hint */}
          {/* <div className="absolute bottom-3 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-slate-600 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full">
                  Hover to zoom
              </span>
          </div> */}
        </div>
      </div>

      {/* ================= INFO ================= */}
      <div className="flex-1">

        {/* STOCK STATUS (ADMIN CONTROLLED) */}
        <div className="flex flex-wrap gap-3 mb-4">
          {product.stock > 0 ? (
            <span className="flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">
              <span className="size-2 rounded-full bg-green-600"></span>
              In Stock ({product.stock})
            </span>
          ) : (
            <span className="flex items-center gap-2 text-xs font-semibold text-red-700 bg-red-100 px-3 py-1 rounded-full">
              <span className="size-2 rounded-full bg-red-600"></span>
              Out of Stock
            </span>
          )}

          {product.category && (
            <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              {product.category}
            </span>
          )}
        </div>

        {/* PRODUCT NAME */}
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
          {product.name}
        </h1>

        {/* RATING */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex">
            {Array(5).fill('').map((_, i) => (
              <StarIcon
                key={i}
                size={18}
                fill={averageRating >= i + 1 ? "#fbbf24" : "#e5e7eb"}
                strokeWidth={0}
              />
            ))}
          </div>
          <span className="text-sm text-slate-600">
            <span className="font-medium">{averageRating.toFixed(1)}</span> ({product.rating.length} reviews)
          </span>
          
          {/* <a href="#reviews" className="text-sm text-green-600 hover:underline">Read reviews</a> */}
        </div>

        {/* PRICE */}
        <div className="flex items-center gap-4 mb-5">
          <p className="text-3xl font-bold text-slate-800">
            {currency}{product.price}
          </p>
          {product.mrp && product.price < product.mrp && (
            <>
              <p className="text-lg text-slate-400 line-through">
                {currency}{product.mrp}
              </p>
              <span className="text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded-md">
                Save {currency}{(product.mrp - product.price).toFixed(2)}
              </span>
            </>
          )}
        </div>

        {/* OFFER */}
        {discountPercentage > 0 && (
          <div className="flex items-start gap-2 bg-amber-50 px-4 py-3 rounded-lg mb-6">
            <TagIcon size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Limited time offer — Save {discountPercentage}%
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Hurry! Offer ends in 2 days
              </p>
            </div>
          </div>
        )}

        {/* DESCRIPTION */}
        <p className="text-slate-600 mb-6 leading-relaxed">
          {product.description && product.description.length > 250 
            ? `${product.description.substring(0, 250)}...` 
            : product.description}
        </p>
        
        {/* Key features */}
        {product.keyFeatures && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Key Features:</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {product.keyFeatures.split('|').map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckIcon size={14} className="text-green-600 flex-shrink-0" />
                  {feature.trim()}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* TRUST POINTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="flex items-start gap-3">
            <div className="bg-green-50 p-2 rounded-full flex-shrink-0">
              <ShieldCheckIcon size={16} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">100% Genuine Product</p>
              <p className="text-xs text-slate-500">Authentic product guarantee</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-50 p-2 rounded-full flex-shrink-0">
              <TruckIcon size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Fast & Secure Delivery</p>
              <p className="text-xs text-slate-500">Ships in 1-2 business days</p>
            </div>
          </div>
          
          {/* Additional trust badges */}
          <div className="flex items-start gap-3">
            <div className="bg-purple-50 p-2 rounded-full flex-shrink-0">
              <BarChart3Icon size={16} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Trusted by 10,000+ customers</p>
              <p className="text-xs text-slate-500">Highest rated in category</p>
            </div>
          </div>
        </div>

        {/* CART ACTIONS */}
        <div className="flex flex-wrap items-center gap-4 mt-6">
          {cart[productId] && (
            <div>
              <p className="text-xs text-slate-600 mb-1">Quantity</p>
              <Counter productId={productId} />
            </div>
          )}

          <button
            onClick={() =>
              cart[productId]
                ? router.push('/cart')
                : addToCartHandler()
            }
            disabled={product.stock <= 0 && !cart[productId]}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium shadow-sm hover:shadow transition-all ${
              product.stock > 0 || cart[productId]
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          >
            <ShoppingCartIcon size={18} />
            {cart[productId] ? 'View Cart' : 'Add to Cart'}
          </button>
          
          {/* <button
            className="flex items-center justify-center px-4 py-3 rounded-lg font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={() => setIsWishlist(!isWishlist)}
          >
            <HeartIcon size={18} fill={isWishlist ? "#ef4444" : "none"} className={isWishlist ? "text-red-500" : ""} />
          </button> */}
        </div>

      </div>
    </div>
  );
};

export default ProductDetails;
