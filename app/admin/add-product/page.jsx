// app/admin/add-product/page.jsx
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
  Hash,
  Pencil,
  Zap,
  Plus,
  Trash2,
  Globe,
} from 'lucide-react';

export default function AdminAddProductPage() {
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

  const [productInfo, setProductInfo] = useState({
    name: '',
    description: '',
    mrp: '',
    price: '',
    quantity: '',
    selectedCategories: [],
  });

  // ── Fetch ALL categories (admin + store) ──────────────────────
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
        // Admin products are fetched via /api/products
        const { data } = await axios.get('/api/products', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const product = (data.products || []).find((p) => p.id === editId);
        if (!product) {
          toast.error('Product not found');
          router.replace('/admin/manage-product');
          return;
        }
        setProductInfo({
          name: product.name,
          description: product.description,
          mrp: product.mrp,
          price: product.price,
          quantity: product.quantity,
          selectedCategories: product.category || [],
        });
        setExistingImages(product.images || []);
        setKeyFeatures(
          Array.isArray(product.keyFeatures) && product.keyFeatures.length > 0
            ? product.keyFeatures
            : ['']
        );
      } catch {
        toast.error('Failed to load product');
      } finally {
        setPageLoading(false);
      }
    };
    fetchProduct();
  }, [isEditMode, editId]);

  const onChangeHandler = (e) =>
    setProductInfo({ ...productInfo, [e.target.name]: e.target.value });

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

  const addFeatureField = () => setKeyFeatures((prev) => [...prev, '']);
  const updateFeature = (index, value) =>
    setKeyFeatures((prev) => prev.map((f, i) => (i === index ? value : f)));
  const removeFeature = (index) => setKeyFeatures((prev) => prev.filter((_, i) => i !== index));

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

    const cleanedFeatures = keyFeatures.filter((f) => f.trim() !== '');

    try {
      setLoading(true);
      const token = await getToken();

      if (isEditMode) {
        // PUT /api/products?id=xxx — admin can edit any product
        await axios.put(
          `/api/products?id=${editId}`,
          {
            name: productInfo.name,
            description: productInfo.description,
            mrp: Number(productInfo.mrp),
            price: Number(productInfo.price),
            quantity: Number(productInfo.quantity) || 0,
            category: productInfo.selectedCategories,
            existingImages,
            keyFeatures: cleanedFeatures,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        toast.success('Product updated successfully');
        router.push('/admin/manage-product');
      } else {
        // POST /api/products — admin global product
        const formData = new FormData();
        formData.append('name', productInfo.name);
        formData.append('description', productInfo.description);
        formData.append('mrp', productInfo.mrp);
        formData.append('price', productInfo.price);
        formData.append('quantity', productInfo.quantity || 0);
        formData.append('category', JSON.stringify(productInfo.selectedCategories));
        formData.append('keyFeatures', JSON.stringify(cleanedFeatures));
        imageFiles.forEach((file) => formData.append('images', file));

        const { data } = await axios.post('/api/products', formData, {
          headers: { Authorization: `Bearer ${token}` },
        });

        toast.success(data.message || 'Global product created successfully');

        setProductInfo({
          name: '',
          description: '',
          mrp: '',
          price: '',
          quantity: '',
          selectedCategories: [],
        });
        imagePreviews.forEach((url) => URL.revokeObjectURL(url));
        setImageFiles([]);
        setImagePreviews([]);
        setKeyFeatures(['']);
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
                <PlusCircle size={24} className="text-green-500" />
                Add Global Product
              </>
            )}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {isEditMode
              ? 'Update the details below to edit this product'
              : 'This product will be visible to all users globally'}
          </p>
        </div>

        {!isEditMode && (
          <div className="mb-6 flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-lg p-3 text-sm text-purple-700">
            <Globe size={16} className="text-purple-500 flex-shrink-0" />
            <p>
              Products created here are <strong>global</strong> — visible to all users on the public
              shop page, not tied to any store.
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6"
        >
          {/* ── Images ─────────────────────────────────────────── */}
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

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-6 cursor-pointer hover:border-green-300 hover:bg-green-50/30 transition-all">
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
              onChange={onChangeHandler}
              placeholder="Enter product name"
              required
              className="w-full p-3 px-4 outline-none border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-100 bg-slate-50 placeholder:text-slate-400"
            />
          </label>

          {/* ── Description ──────────────────────────────────── */}
          <label className="flex flex-col gap-2">
            <span className="font-medium text-slate-700 flex items-center gap-2">
              <Tag size={16} className="text-amber-500" />
              Description
            </span>
            <textarea
              name="description"
              value={productInfo.description}
              onChange={onChangeHandler}
              placeholder="Describe your product"
              rows={4}
              required
              className="w-full p-3 px-4 outline-none border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-green-100 bg-slate-50 placeholder:text-slate-400"
            />
          </label>

          {/* ── Prices + Stock ─────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex flex-col gap-2 flex-1">
              <span className="font-medium text-slate-700 flex items-center gap-2">
                <IndianRupee size={16} className="text-red-500" />
                Actual Price (MRP)
              </span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  name="mrp"
                  value={productInfo.mrp}
                  onChange={onChangeHandler}
                  placeholder="0.00"
                  min="0"
                  required
                  className="w-full p-3 pl-8 outline-none border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-100 bg-slate-50"
                />
              </div>
            </label>
            <label className="flex flex-col gap-2 flex-1">
              <span className="font-medium text-slate-700 flex items-center gap-2">
                <IndianRupee size={16} className="text-green-500" />
                Offer Price
              </span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  name="price"
                  value={productInfo.price}
                  onChange={onChangeHandler}
                  placeholder="0.00"
                  min="0"
                  required
                  className="w-full p-3 pl-8 outline-none border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-100 bg-slate-50"
                />
              </div>
            </label>
            <label className="flex flex-col gap-2 flex-1">
              <span className="font-medium text-slate-700 flex items-center gap-2">
                <Hash size={16} className="text-blue-500" />
                Stock Quantity
              </span>
              <input
                type="number"
                name="quantity"
                value={productInfo.quantity}
                onChange={onChangeHandler}
                placeholder="0"
                min="0"
                required
                className="w-full p-3 px-4 outline-none border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-100 bg-slate-50"
              />
            </label>
          </div>

          {/* ── Key Features ─────────────────────────────────── */}
          <div>
            <p className="font-medium text-slate-700 flex items-center gap-2 mb-3">
              <Zap size={16} className="text-yellow-500" />
              Key Features
              <span className="text-xs text-slate-400 font-normal">
                (optional — shown on product page)
              </span>
            </p>
            <div className="space-y-2">
              {keyFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-50 text-green-500 text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    placeholder="e.g. Fast charging, Lightweight design..."
                    className="flex-1 p-2.5 px-4 outline-none border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-100 bg-slate-50 placeholder:text-slate-400 text-sm"
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
              className="mt-3 flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium px-3 py-2 rounded-lg hover:bg-green-50 transition-all border border-dashed border-green-200"
            >
              <Plus size={15} />
              Add Feature
            </button>
          </div>

          {/* ── Categories ───────────────────────────────────── */}
          <div>
            <p className="font-medium text-slate-700 flex items-center gap-2 mb-3">
              <Package size={16} className="text-blue-500" />
              Categories
              {productInfo.selectedCategories.length > 0 && (
                <span className="ml-1 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
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
                No categories found. Create categories first.
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
                          ? 'bg-green-600 text-white border-green-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-green-300 hover:text-green-600'
                      }`}
                    >
                      {isSelected && <span className="mr-1">✓</span>}
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}
            {productInfo.selectedCategories.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                Selected: {productInfo.selectedCategories.join(', ')}
              </p>
            )}
          </div>

          {/* ── Submit ─────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-2">
            {isEditMode && (
              <button
                type="button"
                onClick={() => router.push('/admin/manage-product')}
                className="px-6 py-3 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {isEditMode ? 'Saving...' : 'Creating Product...'}
                </>
              ) : isEditMode ? (
                <>
                  <Pencil size={18} />
                  Save Changes
                </>
              ) : (
                <>
                  <PlusCircle size={18} />
                  Create Global Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
