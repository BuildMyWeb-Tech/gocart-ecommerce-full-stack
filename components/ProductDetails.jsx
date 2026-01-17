'use client'

import { addToCart } from "@/lib/features/cart/cartSlice";
import {
  StarIcon,
  TagIcon,
  ShieldCheckIcon,
  TruckIcon
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
                ${mainImage === image ? 'ring-2 ring-green-500' : 'hover:ring-1 hover:ring-slate-300'}
              `}
            >
              <Image
                src={image}
                alt={`${product.name} ${index + 1}`}
                width={80}
                height={80}
                className="object-contain p-2"
              />
            </div>
          ))}
        </div>

        <div className="relative flex justify-center items-center h-100 sm:size-113 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg">
          {discountPercentage > 0 && (
            <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              -{discountPercentage}% OFF
            </div>
          )}
          <Image
            src={mainImage}
            alt={product.name}
            width={320}
            height={320}
            className="object-contain p-6"
          />
        </div>
      </div>

      {/* ================= INFO ================= */}
      <div className="flex-1">

        {/* STOCK STATUS (ADMIN CONTROLLED) */}
        <div className="flex items-center gap-3 mb-4">
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
                fill={averageRating >= i + 1 ? "#22c55e" : "#e5e7eb"}
                strokeWidth={0}
              />
            ))}
          </div>
          <span className="text-sm text-slate-600">
            {averageRating.toFixed(1)} ({product.rating.length} reviews)
          </span>
        </div>

        {/* PRICE */}
        <div className="flex items-center gap-4 mb-5">
          <p className="text-3xl font-bold text-slate-800">
            {currency}{product.price}
          </p>
          <p className="text-lg text-slate-400 line-through">
            {currency}{product.mrp}
          </p>
        </div>

        {/* OFFER */}
        {discountPercentage > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 px-4 py-3 rounded-lg mb-6">
            <TagIcon size={16} className="text-amber-600" />
            <p className="text-sm text-amber-800">
              Limited offer — Save {discountPercentage}%
            </p>
          </div>
        )}

        {/* DESCRIPTION */}
        <p className="text-slate-600 mb-6 leading-relaxed">
          {product.description}
        </p>

        {/* TRUST POINTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="flex items-start gap-3">
            <ShieldCheckIcon className="text-green-600 mt-0.5" />
            <p className="text-sm text-slate-700">100% Genuine Product</p>
          </div>
          <div className="flex items-start gap-3">
            <TruckIcon className="text-blue-600 mt-0.5" />
            <p className="text-sm text-slate-700">Fast & Secure Delivery</p>
          </div>
        </div>

        {/* CART ACTIONS */}
        <div className="flex items-end gap-3 mt-6">

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
            className={`text-sm px-5 py-2 rounded-md font-medium border transition-all
              ${
                product.stock > 0 || cart[productId]
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            {cart[productId] ? 'View Cart' : 'Add to Cart'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProductDetails;
