// C:\Users\Siddharathan\Desktop\gocart-ecommerce-full-stack\app\store\manage-product\page.jsx

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '@clerk/nextjs';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, PackageOpen, Loader2, AlertTriangle, Minus, Plus, Check } from 'lucide-react';

// ── Inline Stock Control ──────────────────────────────────────────────────────
function StockControl({ product, onQuantityChange }) {
    const { getToken } = useAuth();
    const [qty, setQty] = useState(product.quantity ?? 0);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const inputRef = useRef(null);
    const saveTimeoutRef = useRef(null);

    // Keep in sync if parent refreshes products
    useEffect(() => {
        setQty(product.quantity ?? 0);
    }, [product.quantity]);

    const saveQuantity = useCallback(async (newQty) => {
        const clamped = Math.max(0, Number(newQty));
        if (clamped === (product.quantity ?? 0) && !editing) return; // no change

        try {
            setSaving(true);
            const token = await getToken();
            const { data } = await axios.patch('/api/store/stock-toggle', {
                productId: product.id,
                quantity: clamped,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setQty(data.quantity);
            onQuantityChange(product.id, data.quantity, data.inStock);

            // Show brief checkmark
            setSaved(true);
            saveTimeoutRef.current = setTimeout(() => setSaved(false), 1500);
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Failed to update stock');
            setQty(product.quantity ?? 0); // revert on error
        } finally {
            setSaving(false);
            setEditing(false);
        }
    }, [getToken, product.id, product.quantity, onQuantityChange, editing]);

    const handleMinus = () => {
        const next = Math.max(0, qty - 1);
        setQty(next);
        saveQuantity(next);
    };

    const handlePlus = () => {
        const next = qty + 1;
        setQty(next);
        saveQuantity(next);
    };

    const handleClick = () => {
        setEditing(true);
        setTimeout(() => inputRef.current?.select(), 0);
    };

    const handleBlur = () => {
        saveQuantity(qty);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            inputRef.current?.blur();
        }
        if (e.key === 'Escape') {
            setQty(product.quantity ?? 0);
            setEditing(false);
        }
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        if (val === '' || /^\d+$/.test(val)) {
            setQty(val === '' ? 0 : Number(val));
        }
    };

    return (
        <div className="flex items-center gap-1">
            {/* Minus button */}
            <button
                onClick={handleMinus}
                disabled={saving || qty <= 0}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500
                           hover:border-red-300 hover:text-red-500 hover:bg-red-50
                           disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Decrease stock"
            >
                <Minus size={12} />
            </button>

            {/* Qty display / input */}
            {editing ? (
                <input
                    ref={inputRef}
                    type="number"
                    min="0"
                    value={qty}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="w-14 h-7 text-center text-sm font-semibold text-slate-700
                               border border-indigo-400 rounded-md outline-none ring-2 ring-indigo-100
                               bg-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
            ) : (
                <button
                    onClick={handleClick}
                    title="Click to edit stock"
                    className="w-14 h-7 text-center text-sm font-semibold text-slate-700
                               border border-slate-200 rounded-md hover:border-indigo-300 hover:bg-indigo-50
                               transition-colors cursor-text"
                >
                    {saving ? (
                        <Loader2 size={12} className="animate-spin mx-auto text-indigo-400" />
                    ) : saved ? (
                        <Check size={12} className="mx-auto text-green-500" />
                    ) : (
                        qty
                    )}
                </button>
            )}

            {/* Plus button */}
            <button
                onClick={handlePlus}
                disabled={saving}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500
                           hover:border-green-300 hover:text-green-600 hover:bg-green-50
                           disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Increase stock"
            >
                <Plus size={12} />
            </button>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ManageProductPage() {
    const { getToken } = useAuth();
    const router = useRouter();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [deleteConfirm, setDeleteConfirm] = useState({
        open: false,
        productId: null,
        productName: '',
    });
    const [deleting, setDeleting] = useState(false);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const token = await getToken();
            const { data } = await axios.get('/api/store/product', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setProducts(data.products || []);
        } catch (error) {
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // ── Called by StockControl after a successful save ──
    const handleQuantityChange = useCallback((productId, newQty, newInStock) => {
        setProducts(prev =>
            prev.map(p =>
                p.id === productId
                    ? { ...p, quantity: newQty, inStock: newInStock }
                    : p
            )
        );
    }, []);

    const handleEdit = (product) => {
        router.push(`/store/add-product?id=${product.id}`);
    };

    const openDeleteConfirm = (product) => {
        setDeleteConfirm({ open: true, productId: product.id, productName: product.name });
    };

    const closeDeleteConfirm = () => {
        setDeleteConfirm({ open: false, productId: null, productName: '' });
    };

    const confirmDelete = async () => {
        try {
            setDeleting(true);
            const token = await getToken();
            await axios.delete(`/api/store/product?id=${deleteConfirm.productId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setProducts(prev => prev.filter(p => p.id !== deleteConfirm.productId));
            toast.success('Product deleted successfully');
            closeDeleteConfirm();
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Failed to delete product');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-800">Manage Products</h1>
                        <p className="text-slate-500 mt-1 text-sm">
                            View, edit, or remove your listed products
                        </p>
                    </div>
                    <span className="text-sm text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
                        {products.length} product{products.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
                            <Loader2 size={20} className="animate-spin" />
                            <span>Loading products...</span>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <PackageOpen size={48} className="mb-3 text-slate-300" />
                            <p className="text-lg font-medium">No products yet</p>
                            <p className="text-sm mt-1">Add your first product from the Add Product page</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50">
                                        <th className="text-left px-5 py-4 font-medium text-slate-500">Product</th>
                                        <th className="text-left px-5 py-4 font-medium text-slate-500 hidden md:table-cell">
                                            Description
                                        </th>
                                        <th className="text-left px-5 py-4 font-medium text-slate-500">MRP</th>
                                        <th className="text-left px-5 py-4 font-medium text-slate-500">Offer Price</th>
                                        <th className="text-left px-5 py-4 font-medium text-slate-500 hidden sm:table-cell">
                                            Stock Qty
                                        </th>
                                        <th className="text-left px-5 py-4 font-medium text-slate-500">Status</th>
                                        <th className="text-center px-5 py-4 font-medium text-slate-500">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product, idx) => (
                                        <tr
                                            key={product.id}
                                            className={`border-b border-slate-50 hover:bg-slate-50/70 transition-colors ${idx === products.length - 1 ? 'border-b-0' : ''}`}
                                        >
                                            {/* Product Name + Image */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    {product.images?.[0] && (
                                                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0">
                                                            <Image
                                                                src={product.images[0]}
                                                                alt={product.name}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                    <span className="font-medium text-slate-800 line-clamp-1 max-w-[140px]">
                                                        {product.name}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Description */}
                                            <td className="px-5 py-4 hidden md:table-cell">
                                                <p className="text-slate-500 line-clamp-2 max-w-[200px]">
                                                    {product.description}
                                                </p>
                                            </td>

                                            {/* MRP */}
                                            <td className="px-5 py-4 text-slate-500">
                                                <span className="">₹{product.mrp.toLocaleString('en-IN')}</span>
                                            </td>

                                            {/* Offer Price */}
                                            <td className="px-5 py-4 text-green-600 font-medium">
                                                ₹{product.price.toLocaleString('en-IN')}
                                            </td>

                                            {/* ── Stock Qty Control ── */}
                                            <td className="px-5 py-4 hidden sm:table-cell">
                                                <StockControl
                                                    product={product}
                                                    onQuantityChange={handleQuantityChange}
                                                />
                                            </td>

                                            {/* Status — auto-updates when qty changes */}
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${product.inStock
                                                        ? 'bg-green-50 text-green-700'
                                                        : 'bg-red-50 text-red-600'
                                                        }`}
                                                >
                                                    <span
                                                        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${product.inStock ? 'bg-green-500' : 'bg-red-500'}`}
                                                    />
                                                    {product.inStock ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(product)}
                                                        className="p-2 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                        title="Edit product"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteConfirm(product)}
                                                        className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                        title="Delete product"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
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
                        onClick={closeDeleteConfirm}
                    />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertTriangle size={20} className="text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800">Delete Product</h3>
                                <p className="text-slate-500 mt-1 text-sm">
                                    Are you sure you want to delete{' '}
                                    <span className="font-medium text-slate-700">"{deleteConfirm.productName}"</span>?
                                    This action cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={closeDeleteConfirm}
                                disabled={deleting}
                                className="px-4 py-2.5 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                            >
                                {deleting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={16} />
                                        Yes, Delete
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