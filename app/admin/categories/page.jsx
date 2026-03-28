'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '@clerk/nextjs';
import Image from 'next/image';
import {
  LayersIcon,
  PlusCircle,
  Trash2,
  Loader2,
  UploadCloud,
  X,
  AlertTriangle,
  ImageIcon,
} from 'lucide-react';

export default function AdminCategoriesPage() {
  const { getToken } = useAuth();
  const fileInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ name: '', description: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, name: '' });
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/admin/categories');
      setCategories(data.categories || []);
    } catch {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      toast.error('Please upload a category image');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('image', imageFile);

      const token = await getToken();
      const { data } = await axios.post('/api/admin/categories', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(data.message || 'Category created!');
      setCategories((prev) => [data.category, ...prev]);
      setForm({ name: '', description: '' });
      clearImage();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const openDelete = (cat) => setDeleteConfirm({ open: true, id: cat.id, name: cat.name });
  const closeDelete = () => setDeleteConfirm({ open: false, id: null, name: '' });

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      const token = await getToken();
      await axios.delete('/api/admin/categories', {
        headers: { Authorization: `Bearer ${token}` },
        data: { id: deleteConfirm.id },
      });
      setCategories((prev) => prev.filter((c) => c.id !== deleteConfirm.id));
      toast.success('Category deleted');
      closeDelete();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
            <LayersIcon size={22} className="text-green-600" />
            Category Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Create and manage product categories. Store owners will see these when adding products.
          </p>
        </div>

        {/* Create Category Form */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-700 mb-5 flex items-center gap-2">
            <PlusCircle size={16} className="text-green-500" />
            Add New Category
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Image Upload */}
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Category Image</p>
              {imagePreview ? (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-slate-200 group">
                  <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                  >
                    <X size={20} className="text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-all">
                  <UploadCloud size={22} className="text-slate-400 mb-1" />
                  <span className="text-xs text-slate-400 text-center px-2">Upload image</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Name */}
              <label className="flex flex-col gap-1.5 flex-1">
                <span className="text-sm font-medium text-slate-600">Category Name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Electronics"
                  className="p-2.5 px-3 border border-slate-200 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-green-100 text-sm"
                  required
                />
              </label>

              {/* Description */}
              <label className="flex flex-col gap-1.5 flex-[2]">
                <span className="text-sm font-medium text-slate-600">Description</span>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short description of this category"
                  className="p-2.5 px-3 border border-slate-200 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-green-100 text-sm"
                  required
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    <PlusCircle size={16} /> Create Category
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Categories Table */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-700">All Categories</h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              {categories.length} total
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <LayersIcon size={40} className="mb-3 text-slate-300" />
              <p className="font-medium">No categories yet</p>
              <p className="text-sm mt-1">Create your first category above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-3.5 font-medium text-slate-500">Image</th>
                    <th className="text-left px-5 py-3.5 font-medium text-slate-500">Name</th>
                    <th className="text-left px-5 py-3.5 font-medium text-slate-500 hidden md:table-cell">
                      Description
                    </th>
                    <th className="text-left px-5 py-3.5 font-medium text-slate-500 hidden sm:table-cell">
                      Created
                    </th>
                    <th className="text-center px-5 py-3.5 font-medium text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, idx) => (
                    <tr
                      key={cat.id}
                      className={`border-b border-slate-50 hover:bg-slate-50/70 transition-colors ${idx === categories.length - 1 ? 'border-b-0' : ''}`}
                    >
                      <td className="px-5 py-4">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                          {cat.image ? (
                            <Image src={cat.image} alt={cat.name} fill className="object-cover" />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <ImageIcon size={16} className="text-slate-300" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-800">{cat.name}</td>
                      <td className="px-5 py-4 text-slate-500 hidden md:table-cell max-w-xs">
                        <p className="line-clamp-2">{cat.description}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs hidden sm:table-cell">
                        {new Date(cat.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => openDelete(cat)}
                          className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Delete category"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={closeDelete}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Delete Category</h3>
                <p className="text-slate-500 text-sm mt-1">
                  Are you sure you want to delete{' '}
                  <span className="font-medium text-slate-700">"{deleteConfirm.name}"</span>?
                  Products using this category will not be deleted but may lose categorisation.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeDelete}
                disabled={deleting}
                className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60 transition-colors"
              >
                {deleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
