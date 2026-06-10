// C:\Users\Siddharathan\Desktop\gocart-ecommerce-full-stack\components\ProductDetails.jsx
'use client';
import { StarIcon, ShieldCheckIcon, TruckIcon, ShoppingCartIcon, ShareIcon, Zap, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '@/lib/features/cart/cartSlice';
import toast from 'react-hot-toast';

export default function ProductDetails({ product }) {
  const dispatch    = useDispatch();
  const router      = useRouter();
  const cartItems   = useSelector((state) => state.cart.items || []);

  const [mainImage,   setMainImage]   = useState(product.images?.[0]);
  const [imageLoading, setImageLoading] = useState(true);
  const [quantity,    setQuantity]    = useState(1);
  const [isZoomed,    setIsZoomed]    = useState(false);
  const [mousePos,    setMousePos]    = useState({ x: 0, y: 0 });
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize,  setSelectedSize]  = useState(null);
  const imageContainerRef = useRef(null);

  const mrpPrice = product.mrp ? Number(product.mrp) : null;

  // Distinct colors from variants
  const colors = [...new Set((product.variants || []).map((v) => v.color).filter(Boolean))];
  // Sizes available for selected color
  const sizesForColor = selectedColor
    ? (product.variants || []).filter((v) => v.color === selectedColor).map((v) => v.size)
    : [...new Set((product.variants || []).map((v) => v.size).filter(Boolean))];

  // Selected variant
  const selectedVariant = selectedColor && selectedSize
    ? (product.variants || []).find((v) => v.color === selectedColor && v.size === selectedSize)
    : null;

  const variantStock    = selectedVariant?.stock ?? 0;
  const variantPrice    = selectedVariant ? Number(selectedVariant.price) : null;
  const displayPrice    = variantPrice ?? Math.min(...(product.variants || []).map((v) => Number(v.price) || 0).filter((p) => p > 0), Infinity);
  const discountPct     = mrpPrice && displayPrice < mrpPrice
    ? Math.round(((mrpPrice - displayPrice) / mrpPrice) * 100)
    : 0;

  const categoryDisplay = (product.categories || [])
    .map((c) => c.category?.name || c.name).filter(Boolean).join(' + ') ||
    (Array.isArray(product.category) ? product.category.join(' + ') : product.category || '');

  const ratings    = product.ratings || product.rating || [];
  const avgRating  = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;

  // Auto-select first color
  useEffect(() => {
    if (colors.length === 1) setSelectedColor(colors[0]);
  }, [product.id]);

  // Auto-select first size when color changes
  useEffect(() => {
    if (sizesForColor.length === 1) setSelectedSize(sizesForColor[0]);
    else setSelectedSize(null);
  }, [selectedColor]);

  const isInCart       = selectedVariant ? cartItems.some((i) => i.variantId === selectedVariant.id) : false;
  const canAddToCart   = selectedVariant && variantStock > 0 && !isInCart;

  const addToCartHandler = () => {
    if (!selectedColor) { toast.error('Please select a color'); return; }
    if (!selectedSize)  { toast.error('Please select a size'); return; }
    if (!selectedVariant) { toast.error('Please select a valid variant'); return; }
    if (variantStock === 0) { toast.error('This variant is out of stock'); return; }
    if (quantity > variantStock) { toast.error(`Only ${variantStock} available`); return; }

    dispatch(addToCart({
      product: {
        id:          product.id,
        variantId:   selectedVariant.id,
        name:        product.name,
        price:       Number(selectedVariant.price),
        image:       product.images?.[0] || '/placeholder.png',
        quantity,
        category:    categoryDisplay,
        color:       selectedColor,
        size:        selectedSize,
        sku:         selectedVariant.sku,
        stock:       variantStock,
        storeId:     product.storeId,
        productName: product.name,
        productImage: product.images?.[0] || '/placeholder.png',
      },
    }));

    toast.success(`${product.name} (${selectedColor} / ${selectedSize}) added to cart!`, { icon: '🛒' });
  };

  const handleImageMouseMove = (e) => {
    if (!imageContainerRef.current) return;
    const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();
    setMousePos({ x: ((e.clientX - left) / width) * 100, y: ((e.clientY - top) / height) * 100 });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="flex max-lg:flex-col gap-6 lg:gap-12 p-6 lg:p-8">
        {/* Images */}
        <div className="flex max-sm:flex-col-reverse gap-4 md:gap-6 lg:w-[45%]">
          <div className="flex sm:flex-col gap-3 sm:min-w-24">
            {(product.images || []).map((image, index) => (
              <div key={index} onClick={() => setMainImage(image)}
                className={`relative bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center size-24 rounded-xl cursor-pointer transition border-2 overflow-hidden ${mainImage === image ? 'border-blue-500 shadow-sm' : 'border-transparent hover:border-slate-300'}`}>
                <Image src={image} alt={`${product.name} ${index + 1}`} width={80} height={80} className="object-contain p-2 hover:scale-110 transition-all" />
              </div>
            ))}
          </div>

          <div ref={imageContainerRef}
            className="relative flex justify-center items-center h-100 sm:size-113 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl overflow-hidden group"
            onMouseMove={handleImageMouseMove}
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}>
            {imageLoading && <div className="absolute inset-0 bg-gradient-to-r from-slate-100 to-slate-200 animate-pulse" />}
            {isZoomed && mainImage ? (
              <div className="absolute inset-0 overflow-hidden">
                <Image src={mainImage} alt={product.name} width={1000} height={1000} onLoad={() => setImageLoading(false)}
                  className="object-contain absolute w-[200%] h-[200%]"
                  style={{ transformOrigin: 'top left', transform: `translate(-${mousePos.x}%, -${mousePos.y}%) scale(2)` }} />
              </div>
            ) : (
              <Image src={mainImage || product.images?.[0]} alt={product.name} width={500} height={500} onLoad={() => setImageLoading(false)}
                className={`object-contain p-6 transition-transform duration-500 group-hover:scale-110 ${imageLoading ? 'opacity-0' : 'opacity-100'}`} />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">{product.name}</h1>
          {product.brand && <p className="text-sm text-slate-400 mb-2">Brand: <span className="font-medium text-slate-600">{product.brand}</span></p>}

          <div className="flex flex-wrap items-center gap-4 mb-5">
            {categoryDisplay && (
              <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium">{categoryDisplay}</span>
            )}
            <div className="flex items-center gap-3">
              <div className="flex">{Array(5).fill('').map((_, i) => <StarIcon key={i} size={16} fill={avgRating >= i + 1 ? '#fbbf24' : '#e5e7eb'} strokeWidth={0} />)}</div>
              <span className="text-sm text-slate-600"><span className="font-medium">{avgRating.toFixed(1)}</span> ({ratings.length} reviews)</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center gap-4 mb-5">
            <div>
              <p className="text-3xl font-bold text-slate-800">
                {displayPrice > 0 ? `₹${displayPrice.toLocaleString('en-IN')}` : 'Select variant'}
              </p>
              {mrpPrice && displayPrice < mrpPrice && (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-400 line-through">₹{mrpPrice.toLocaleString('en-IN')}</p>
                  <span className="text-xs text-green-600 font-medium">Save {discountPct}%</span>
                </div>
              )}
            </div>
            {selectedVariant && (
              <div className={`ml-auto px-3 py-1.5 rounded-full text-sm font-medium ${variantStock > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {variantStock > 0 ? `In Stock (${variantStock})` : 'Out of Stock'}
              </div>
            )}
          </div>

          {/* Color Selector */}
          {colors.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-semibold text-slate-700 mb-2">
                Color: {selectedColor ? <span className="text-indigo-600">{selectedColor}</span> : <span className="text-amber-500">Select a color</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button key={color} onClick={() => { setSelectedColor(color); setSelectedSize(null); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${selectedColor === color ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'}`}>
                    {selectedColor === color && <Check size={12} className="inline mr-1" />}
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selector */}
          {sizesForColor.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-semibold text-slate-700 mb-2">
                Size: {selectedSize ? <span className="text-indigo-600">{selectedSize}</span> : <span className="text-amber-500">Select a size</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {sizesForColor.map((size) => {
                  const variant = (product.variants || []).find((v) => v.color === selectedColor && v.size === size);
                  const outOfStock = variant?.stock === 0;
                  return (
                    <button key={size} onClick={() => !outOfStock && setSelectedSize(size)} disabled={outOfStock}
                      className={`min-w-[44px] px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all ${outOfStock ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed line-through' : selectedSize === size ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'}`}>
                      {size}
                    </button>
                  );
                })}
              </div>
              {selectedVariant && (
                <p className="text-xs text-slate-500 mt-2">
                  SKU: <span className="font-mono">{selectedVariant.sku}</span>
                  {variantPrices.length > 0 && variantPrice && <span className="ml-2">• ₹{variantPrice.toLocaleString('en-IN')}</span>}
                </p>
              )}
            </div>
          )}

          {/* No variants warning */}
          {(!selectedColor || !selectedSize) && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-700 mb-4">
              <AlertTriangle size={15} className="flex-shrink-0" />
              {!selectedColor ? 'Please select a color to continue' : 'Please select a size to continue'}
            </div>
          )}

          {/* Quantity */}
          <div className="mb-6">
            <p className="text-sm text-slate-700 mb-2 font-medium">
              Quantity {selectedVariant && <span className="text-xs text-slate-400 font-normal">(max {variantStock})</span>}
            </p>
            <div className="flex items-center w-36 border border-slate-200 rounded-lg overflow-hidden">
              <button onClick={() => setQuantity((p) => Math.max(1, p - 1))} disabled={!selectedVariant}
                className="w-12 h-12 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40">–</button>
              <div className="flex-1 h-12 flex items-center justify-center font-medium text-slate-800">{quantity}</div>
              <button onClick={() => { if (quantity >= variantStock) { toast.error(`Only ${variantStock} available`); return; } setQuantity((p) => p + 1); }}
                disabled={!selectedVariant || quantity >= variantStock}
                className="w-12 h-12 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40">+</button>
            </div>
          </div>

          {/* Cart Actions */}
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <button onClick={() => isInCart ? router.push('/cart') : addToCartHandler()}
              disabled={!selectedVariant || variantStock === 0}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isInCart ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'}`}>
              <ShoppingCartIcon size={18} />
              {!selectedVariant ? 'Select Variant' : variantStock === 0 ? 'Out of Stock' : isInCart ? 'View Cart' : 'Add to Cart'}
            </button>
            <button className="px-4 py-3.5 rounded-xl font-medium bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100">
              <ShareIcon size={20} />
            </button>
          </div>

          {/* Feature badges */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            {[
              { Icon: TruckIcon,     color: 'text-blue-500',   bg: 'bg-blue-50',   label: 'Free Delivery',  sub: 'Orders above ₹500' },
              { Icon: RefreshCw,     color: 'text-green-500',  bg: 'bg-green-50',  label: 'Easy Returns',   sub: '30-day policy' },
              { Icon: ShieldCheckIcon, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Secure Payment', sub: '100% safe checkout' },
              { Icon: Zap,           color: 'text-amber-500',  bg: 'bg-amber-50',  label: 'Fast Shipping',  sub: '2-3 business days' },
            ].map(({ Icon, color, bg, label, sub }) => (
              <div key={label} className={`flex items-center gap-2 p-3 rounded-lg ${bg}`}>
                <Icon size={16} className={color} />
                <div><p className="text-xs font-semibold text-slate-700">{label}</p><p className="text-xs text-slate-500">{sub}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}