// C:\Users\Siddharathan\Desktop\gocart-ecommerce-full-stack\app\store\add-product\page.jsx
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '@clerk/nextjs';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShoppingBag,
  Tag,
  IndianRupee,
  Package,
  UploadCloud,
  X,
  PlusCircle,
  Loader2,
  Pencil,
  Zap,
  Plus,
  Trash2,
  Layers,
  Barcode,
  Hash,
} from 'lucide-react';

// ── Available sizes ───────────────────────────────────────────────
const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

// ── Default variant row ───────────────────────────────────────────
const emptyVariant = (size) => ({ size, barcode: '', price: '', stock: '' });

export default function AddProductPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const editId = searchParams.get('id');
  const isEditMode = Boolean(editId);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEditMode);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [keyFeatures, setKeyFeatures] = useState(['']);

  // ── Variant state ─────────────────────────────────────────────
  const [selectedSizes, setSelectedSizes] = useState([]);   // ['S','M','XL']
  const [variants, setVariants] = useState({});              // { S: {barcode,price,stock}, ... }

  const [productInfo, setProductInfo] = useState({
    name: '',
    description: '',
    mrp: '',
    selectedCategories: [],
  });

  // ── Fetch categories ──────────────────────────────────────────
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get('/api/categories', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCategories(data.categories || []);
      } catch {
        toast.error('Failed to load categories');
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // ── Fetch product for edit mode ───────────────────────────────
  useEffect(() => {
    if (!isEditMode) return;
    const fetchProduct = async () => {
      try {
        setPageLoading(true);
        const token = await getToken();
        const { data } = await axios.get('/api/store/product', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const product = (data.products || []).find((p) => p.id === editId);
        if (!product) {
          toast.error('Product not found');
          router.replace('/store/manage-product');
          return;
        }
        setProductInfo({
          name: product.name,
          description: product.description,
          mrp: product.mrp,
          selectedCategories: product.category || [],
        });
        setExistingImages(product.images || []);
        setKeyFeatures(
          Array.isArray(product.keyFeatures) && product.keyFeatures.length > 0
            ? product.keyFeatures
            : ['']
        );
        // Load existing variants
        if (product.variants && product.variants.length > 0) {
          const sizes = product.variants.map((v) => v.size);
          const variantMap = {};
          product.variants.forEach((v) => {
            variantMap[v.size] = {
              id: v.id,
              size: v.size,
              barcode: v.barcode,
              price: v.price,
              stock: v.stock,
            };
          });
          setSelectedSizes(sizes);
          setVariants(variantMap);
        }
      } catch {
        toast.error('Failed to load product');
      } finally {
        setPageLoading(false);
      }
    };
    fetchProduct();
  }, [isEditMode, editId, getToken, router]);

  // ── Size toggle ───────────────────────────────────────────────
  const toggleSize = (size) => {
    setSelectedSizes((prev) => {
      if (prev.includes(size)) {
        // Remove size → remove variant data too
        setVariants((v) => {
          const copy = { ...v };
          delete copy[size];
          return copy;
        });
        return prev.filter((s) => s !== size);
      } else {
        setVariants((v) => ({ ...v, [size]: emptyVariant(size) }));
        return [...prev, size];
      }
    });
  };

  const updateVariant = (size, field, value) => {
    setVariants((prev) => ({
      ...prev,
      [size]: { ...prev[size], [field]: value },
    }));
  };

  // ── Image handlers ────────────────────────────────────────────
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setImageFiles((prev) => [...prev, ...files]);
    setImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeNewImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeExistingImage = (index) =>
    setExistingImages((prev) => prev.filter((_, i) => i !== index));

  // ── Key Features ─────────────────────────────────────────────
  const addFeatureField = () => setKeyFeatures((prev) => [...prev, '']);
  const updateFeature = (index, value) =>
    setKeyFeatures((prev) => prev.map((f, i) => (i === index ? value : f)));
  const removeFeature = (index) => setKeyFeatures((prev) => prev.filter((_, i) => i !== index));

  const toggleCategory = (categoryName) => {
    setProductInfo((prev) => {
      const already = prev.selectedCategories.includes(categoryName);
      return {
        ...prev,
        selectedCategories: already
          ? prev.selectedCategories.filter((c) => c !== categoryName)
          : [...prev.selectedCategories, categoryName],
      };
    });
  };

  // ── Validation ────────────────────────────────────────────────
  const validateVariants = () => {
    if (selectedSizes.length === 0) {
      toast.error('Please select at least one size');
      return false;
    }
    for (const size of selectedSizes) {
      const v = variants[size];
      if (!v?.barcode?.trim()) {
        toast.error(`Please enter barcode for size ${size}`);
        return false;
      }
      if (!v?.price || Number(v.price) <= 0) {
        toast.error(`Please enter a valid price for size ${size}`);
        return false;
      }
      if (v?.stock === '' || v?.stock === undefined || Number(v.stock) < 0) {
        toast.error(`Please enter stock for size ${size}`);
        return false;
      }
    }
    return true;
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    const totalImages = existingImages.length + imageFiles.length;
    if (totalImages === 0) {
      toast.error('Please upload at least one product image');
      return;
    }
    if (productInfo.selectedCategories.length === 0) {
      toast.error('Please select at least one category');
      return;
    }
    if (!validateVariants()) return;

    const cleanedFeatures = keyFeatures.filter((f) => f.trim() !== '');
    const variantList = selectedSizes.map((size) => ({
      ...variants[size],
      price: Number(variants[size].price),
      stock: Number(variants[size].stock),
    }));

    try {
      setLoading(true);
      const token = await getToken();

      if (isEditMode) {
        await axios.put(
          `/api/store/product?id=${editId}`,
          {
            name: productInfo.name,
            description: productInfo.description,
            mrp: Number(productInfo.mrp),
            category: productInfo.selectedCategories,
            existingImages,
            keyFeatures: cleanedFeatures,
            variants: variantList,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        toast.success('Product updated successfully');
        router.push('/store/manage-product');
      } else {
        const formData = new FormData();
        formData.append('name', productInfo.name);
        formData.append('description', productInfo.description);
        formData.append('mrp', productInfo.mrp);
        formData.append('category', JSON.stringify(productInfo.selectedCategories));
        formData.append('keyFeatures', JSON.stringify(cleanedFeatures));
        formData.append('variants', JSON.stringify(variantList));
        imageFiles.forEach((file) => formData.append('images', file));

        const { data } = await axios.post('/api/store/product', formData, {
          headers: { Authorization: `Bearer ${token}` },
        });

        toast.success(data.message || 'Product added successfully');

        // Reset form
        setProductInfo({ name: '', description: '', mrp: '', selectedCategories: [] });
        imagePreviews.forEach((url) => URL.revokeObjectURL(url));
        setImageFiles([]);
        setImagePreviews([]);
        setKeyFeatures(['']);
        setSelectedSizes([]);
        setVariants({});
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          <span>Loading product...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
            {isEditMode ? (
              <>
                <Pencil size={24} className="text-indigo-500" />
                Edit Product
              </>
            ) : (
              <>
                <PlusCircle size={24} className="text-indigo-500" />
                Add New Product
              </>
            )}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {isEditMode
              ? 'Update product details and variants'
              : 'Fill in details and add size variants with barcodes'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6"
        >
          {/* ── Images ───────────────────────────────────────── */}
          <div>
            <p className="font-medium text-slate-700 flex items-center gap-2 mb-3">
              <UploadCloud size={16} className="text-indigo-500" />
              Product Images
            </p>

            {existingImages.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-slate-400 mb-2">Current images</p>
                <div className="flex flex-wrap gap-3">
                  {existingImages.map((src, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-lg overflow-hidden border border-slate-200"
                    >
                      <Image
                        width={96}
                        height={96}
                        src={src}
                        alt={`Existing ${idx + 1}`}
                        className="h-24 w-24 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {imagePreviews.length > 0 && (
              <div className="mb-4">
                {isEditMode && <p className="text-xs text-slate-400 mb-2">New images to add</p>}
                <div className="flex flex-wrap gap-3">
                  {imagePreviews.map((src, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-lg overflow-hidden border border-slate-200"
                    >
                      <Image
                        width={96}
                        height={96}
                        src={src}
                        alt={`Preview ${idx + 1}`}
                        className="h-24 w-24 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-6 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
              <UploadCloud size={28} className="text-slate-400 mb-2" />
              <span className="text-sm text-slate-500">
                {isEditMode ? 'Click to add more images' : 'Click to upload images'}
              </span>
              <span className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP (multiple allowed)</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>

          {/* ── Product Name ──────────────────────────────────── */}
          <label className="flex flex-col gap-2">
            <span className="font-medium text-slate-700 flex items-center gap-2">
              <ShoppingBag size={16} className="text-purple-500" />
              Product Name
            </span>
            <input
              type="text"
              name="name"
              value={productInfo.name}
              onChange={(e) => setProductInfo({ ...productInfo, name: e.target.value })}
              placeholder="Enter product name"
              required
              className="w-full p-3 px-4 outline-none border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 bg-slate-50 placeholder:text-slate-400"
            />
          </label>

          {/* ── Description ───────────────────────────────────── */}
          <label className="flex flex-col gap-2">
            <span className="font-medium text-slate-700 flex items-center gap-2">
              <Tag size={16} className="text-amber-500" />
              Description
            </span>
            <textarea
              value={productInfo.description}
              onChange={(e) => setProductInfo({ ...productInfo, description: e.target.value })}
              placeholder="Describe your product"
              rows={4}
              required              
              className="w-full p-3 px-4 outline-none border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-indigo-100 bg-slate-50 placeholder:text-slate-400"
            />
          </label>

          {/* ── MRP ───────────────────────────────────────────── */}
          <label className="flex flex-col gap-2 max-w-xs">
            <span className="font-medium text-slate-700 flex items-center gap-2">
              <IndianRupee size={16} className="text-red-500" />
              MRP (Display Price)
              <span className="text-xs text-slate-400 font-normal">(base price shown on product page)</span>
            </span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
              <input
                type="number"
                value={productInfo.mrp}
                onChange={(e) => setProductInfo({ ...productInfo, mrp: e.target.value })}
                placeholder="0.00"
                min="0"
                required
                className="w-full p-3 pl-8 outline-none border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 bg-slate-50"
              />
            </div>
          </label>

          {/* ── SIZE SELECTOR + VARIANT INPUTS ───────────────── */}
          <div>
            <p className="font-medium text-slate-700 flex items-center gap-2 mb-1">
              <Layers size={16} className="text-indigo-500" />
              Sizes &amp; Variants
              <span className="text-xs text-slate-400 font-normal">(select sizes, then fill barcode / price / stock)</span>
            </p>

            {/* Size chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {ALL_SIZES.map((size) => {
                const active = selectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    {active && <span className="mr-1">✓</span>}
                    {size}
                  </button>
                );
              })}
            </div>

            {/* Variant rows */}
            {selectedSizes.length > 0 && (
              <div className="space-y-3">
                {/* Header row */}
                <div className="grid grid-cols-[80px_1fr_1fr_1fr] gap-3 px-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Size</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Barcode *</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Price (₹) *</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Stock *</span>
                </div>

                {selectedSizes.map((size) => (
                  <div
                    key={size}
                    className="grid grid-cols-[80px_1fr_1fr_1fr] gap-3 items-center bg-indigo-50/40 border border-indigo-100 rounded-lg p-3"
                  >
                    {/* Size badge */}
                    <span className="inline-flex items-center justify-center w-12 h-8 bg-indigo-600 text-white rounded-lg text-sm font-bold">
                      {size}
                    </span>

                    {/* Barcode */}
                    <div className="relative">
                      <Barcode size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. 8901234567890"
                        value={variants[size]?.barcode || ''}
                        onChange={(e) => updateVariant(size, 'barcode', e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 bg-white placeholder:text-slate-300"
                      />
                    </div>

                    {/* Price */}
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        min="0"
                        value={variants[size]?.price || ''}
                        onChange={(e) => updateVariant(size, 'price', e.target.value)}
                        className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 bg-white placeholder:text-slate-300"
                      />
                    </div>

                    {/* Stock */}
                    <div className="relative">
                      <Hash size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={variants[size]?.stock === undefined ? '' : variants[size].stock}
                        onChange={(e) => updateVariant(size, 'stock', e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 bg-white placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                ))}

                <p className="text-xs text-slate-400 mt-1">
                  ✦ Each barcode must be unique across all products and variants.
                </p>
              </div>
            )}

            {selectedSizes.length === 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-700">
                <Layers size={14} className="flex-shrink-0" />
                Select at least one size to add variant details.
              </div>
            )}
          </div>

          {/* ── Key Features ──────────────────────────────────── */}
          <div>
            <p className="font-medium text-slate-700 flex items-center gap-2 mb-3">
              <Zap size={16} className="text-yellow-500" />
              Key Features
              <span className="text-xs text-slate-400 font-normal">(optional)</span>
            </p>
            <div className="space-y-2">
              {keyFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 text-indigo-500 text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    placeholder="e.g. Fast charging, Lightweight design..."
                    className="flex-1 p-2.5 px-4 outline-none border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 bg-slate-50 placeholder:text-slate-400 text-sm"
                  />
                  {keyFeatures.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addFeatureField}
              className="mt-3 flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium px-3 py-2 rounded-lg hover:bg-indigo-50 transition-all border border-dashed border-indigo-200"
            >
              <Plus size={15} />
              Add Feature
            </button>
          </div>

          {/* ── Categories ────────────────────────────────────── */}
          <div>
            <p className="font-medium text-slate-700 flex items-center gap-2 mb-3">
              <Package size={16} className="text-blue-500" />
              Categories
              {productInfo.selectedCategories.length > 0 && (
                <span className="ml-1 text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                  {productInfo.selectedCategories.length} selected
                </span>
              )}
            </p>
            {categoriesLoading ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                <Loader2 size={16} className="animate-spin" />
                Loading categories...
              </div>
            ) : categories.length === 0 ? (
              <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
                No categories found. Ask the admin to create categories first.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isSelected = productInfo.selectedCategories.includes(cat.name);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.name)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                    >
                      {isSelected && <span className="mr-1">✓</span>}
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Submit ────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-2">
            {isEditMode && (
              <button
                type="button"
                onClick={() => router.push('/store/manage-product')}
                className="px-6 py-3 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {isEditMode ? 'Saving...' : 'Adding Product...'}
                </>
              ) : isEditMode ? (
                <>
                  <Pencil size={18} />
                  Save Changes
                </>
              ) : (
                <>
                  <PlusCircle size={18} />
                  Add Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}