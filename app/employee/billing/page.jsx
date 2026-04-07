'use client';
/**
 * /app/employee/billing/page.jsx
 * ─────────────────────────────────────────────────────────────
 * Offline-first POS Billing System
 * • IndexedDB for instant local saves (no API blocking)
 * • Background sync queue → /api/store/billing
 * • /api/inventory/deduct for stock updates
 * • Barcode scan / name / SKU search
 * • Keyboard-optimized (Tab, Enter, ESC, arrows)
 * • Thermal-friendly browser print
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Printer,
  CheckCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  X,
  Tag,
  Receipt,
  ChevronDown,
  AlertCircle,
  Zap,
  CreditCard,
  Banknote,
  Smartphone,
  Clock,
} from 'lucide-react';
import { getStoreSettings, calculateTax, formatCurrency } from '@/lib/storeSettings';

// ─── IndexedDB helpers ────────────────────────────────────────────────────────
const DB_NAME = 'pos_billing_db';
const DB_VERSION = 1;
const STORE_LOCAL = 'bills_local';
const STORE_QUEUE = 'bills_queue';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_LOCAL)) {
        const s = db.createObjectStore(STORE_LOCAL, { keyPath: 'localId' });
        s.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'localId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(storeName, value) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  const st = tx.objectStore(storeName);
  return new Promise((res, rej) => {
    const r = st.put(value);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function idbGetAll(storeName) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readonly');
  const st = tx.objectStore(storeName);
  return new Promise((res, rej) => {
    const r = st.getAll();
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function idbDelete(storeName, key) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  const st = tx.objectStore(storeName);
  return new Promise((res, rej) => {
    const r = st.delete(key);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

async function idbCount(storeName) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readonly');
  const st = tx.objectStore(storeName);
  return new Promise((res, rej) => {
    const r = st.count();
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

// ─── Bill number generator ────────────────────────────────────────────────────
function generateBillNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const ms = String(now.getTime()).slice(-5);
  return `BILL-${date}-${ms}`;
}

// ─── Payment modes ────────────────────────────────────────────────────────────
const PAYMENT_MODES = [
  { id: 'CASH', label: 'Cash', icon: Banknote },
  { id: 'CARD', label: 'Card', icon: CreditCard },
  { id: 'UPI', label: 'UPI', icon: Smartphone },
  { id: 'OTHER', label: 'Other', icon: Receipt },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BillingPage() {
  // ── State ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [billDiscount, setBillDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [note, setNote] = useState('');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [successBill, setSuccessBill] = useState(null);
  const [queueCount, setQueueCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [duplicateModal, setDuplicateModal] = useState(null);
  const [recentBills, setRecentBills] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const [editingQty, setEditingQty] = useState(null); // { idx, value }

  // ── Refs ───────────────────────────────────────────────────
  const searchRef = useRef(null);
  const syncTimerRef = useRef(null);
  const searchTimer = useRef(null);

  // ── Computed totals ────────────────────────────────────────
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity - (i.itemDiscount || 0), 0);
  const discounted = Math.max(0, subtotal - Number(billDiscount || 0));
  const taxResult = calculateTax(discounted, settings);
  const grandTotal = taxResult.total;

  // ─────────────────────────────────────────────────────────────
  // Initialise
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Load settings
    getStoreSettings().then(setSettings).catch(console.error);

    // Online/offline listener
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    // Queue count
    refreshQueueCount();

    // Load recent local bills
    idbGetAll(STORE_LOCAL).then((bills) => {
      setRecentBills(bills.sort((a, b) => b.createdAt - a.createdAt).slice(0, 20));
    });

    // Auto-focus
    searchRef.current?.focus();

    // ESC key → clear cart
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setSuggestions([]);
        setShowSuggestions(false);
        setActiveSuggestionIdx(-1);
      }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleKey);
      clearTimeout(syncTimerRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Product search (debounced)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(searchQuery)}&limit=8`);
        const data = await res.json();
        setSuggestions(data.products || []);
        setShowSuggestions(true);
        setActiveSuggestionIdx(-1);
      } catch (e) {
        console.error(e);
      } finally {
        setSearchLoading(false);
      }
    }, 220);

    return () => clearTimeout(searchTimer.current);
  }, [searchQuery]);

  // ─────────────────────────────────────────────────────────────
  // Keyboard navigation in suggestions
  // ─────────────────────────────────────────────────────────────
  const handleSearchKeyDown = (e) => {
    if (!showSuggestions || !suggestions.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = activeSuggestionIdx >= 0 ? activeSuggestionIdx : 0;
      if (suggestions[idx]) addToCart(suggestions[idx]);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Add product to cart
  // ─────────────────────────────────────────────────────────────
  const addToCart = useCallback(
    (product) => {
      const existing = cartItems.findIndex((i) => i.productId === product.id);

      if (existing >= 0) {
        // Duplicate scan — ask user
        setDuplicateModal({ product, existingIdx: existing });
        setSearchQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setCartItems((prev) => [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          itemDiscount: 0,
          total: product.price,
          sku: product.sku || '',
          barcode: product.barcode || '',
          stock: product.quantity || 0,
        },
      ]);

      setSearchQuery('');
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveSuggestionIdx(-1);
      searchRef.current?.focus();
    },
    [cartItems]
  );

  // ─────────────────────────────────────────────────────────────
  // Duplicate modal handlers
  // ─────────────────────────────────────────────────────────────
  const handleDuplicateIncreaseQty = () => {
    if (!duplicateModal) return;
    updateQuantity(duplicateModal.existingIdx, cartItems[duplicateModal.existingIdx].quantity + 1);
    setDuplicateModal(null);
    searchRef.current?.focus();
  };

  const handleDuplicateNewRow = () => {
    if (!duplicateModal) return;
    const p = duplicateModal.product;
    setCartItems((prev) => [
      ...prev,
      {
        productId: p.id + '_' + Date.now(),
        name: p.name,
        price: p.price,
        quantity: 1,
        itemDiscount: 0,
        total: p.price,
        sku: p.sku || '',
        barcode: p.barcode || '',
        stock: p.quantity || 0,
        _originalId: p.id,
      },
    ]);
    setDuplicateModal(null);
    searchRef.current?.focus();
  };

  // ─────────────────────────────────────────────────────────────
  // Cart manipulation
  // ─────────────────────────────────────────────────────────────
  const updateQuantity = (idx, qty) => {
    const item = cartItems[idx];
    const newQty = Math.max(1, Math.min(qty, item.stock || 9999));
    setCartItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? { ...it, quantity: newQty, total: it.price * newQty - (it.itemDiscount || 0) }
          : it
      )
    );
  };

  const updateItemDiscount = (idx, disc) => {
    const item = cartItems[idx];
    const d = Math.max(0, Math.min(Number(disc || 0), item.price * item.quantity));
    setCartItems((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, itemDiscount: d, total: it.price * it.quantity - d } : it
      )
    );
  };

  const removeItem = (idx) => {
    setCartItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearCart = () => {
    setCartItems([]);
    setBillDiscount(0);
    setNote('');
    setPaymentMode('CASH');
    searchRef.current?.focus();
  };

  // ─────────────────────────────────────────────────────────────
  // Complete bill — save locally first, then trigger sync
  // ─────────────────────────────────────────────────────────────
  const completeBill = async () => {
    if (!cartItems.length) return;
    setLoading(true);

    const localId = `bill_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const billNumber = generateBillNumber();
    const now = Date.now();

    const billData = {
      localId,
      billNumber,
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount: parseFloat(Number(billDiscount || 0).toFixed(2)),
      taxAmount: parseFloat(taxResult.taxAmount.toFixed(2)),
      total: parseFloat(grandTotal.toFixed(2)),
      paymentMode,
      note: note || null,
      createdAt: now,
      items: cartItems.map((it) => ({
        productId: it._originalId || it.productId,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        discount: it.itemDiscount || 0,
        total: parseFloat((it.price * it.quantity - (it.itemDiscount || 0)).toFixed(2)),
      })),
      settings: {
        storeName: settings?.storeName,
        gstNumber: settings?.gstNumber,
        address: settings?.address,
        taxType: settings?.taxType,
        taxPercent: settings?.taxPercent,
        cgst: settings?.cgst,
        sgst: settings?.sgst,
        footerMessage: settings?.footerMessage,
        currency: settings?.currency,
        showGST: settings?.showGST,
        showStoreName: settings?.showStoreName,
      },
    };

    try {
      // 1. Save locally (instant)
      await idbPut(STORE_LOCAL, billData);
      // 2. Add to sync queue
      await idbPut(STORE_QUEUE, billData);

      // 3. Deduct inventory (fire-and-forget — not blocking UI)
      const deductItems = cartItems.map((it) => ({
        productId: it._originalId || it.productId,
        quantity: it.quantity,
      }));
      fetch('/api/inventory/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: deductItems }),
      }).catch(console.error);

      // 4. Update UI state
      setSuccessBill(billData);
      setRecentBills((prev) => [billData, ...prev].slice(0, 20));
      await refreshQueueCount();

      // 5. Clear cart
      setCartItems([]);
      setBillDiscount(0);
      setNote('');
      setPaymentMode('CASH');

      // 6. Trigger background sync
      triggerSync();

      // 7. Auto-print
      setTimeout(() => printBill(billData), 400);
    } catch (err) {
      console.error('completeBill error:', err);
      alert('Failed to save bill locally. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Background sync
  // ─────────────────────────────────────────────────────────────
  const triggerSync = useCallback(() => {
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(runSync, 1500);
  }, []);

  const runSync = async () => {
    if (syncing) return;
    const queue = await idbGetAll(STORE_QUEUE);
    if (!queue.length) return;

    setSyncing(true);
    try {
      const res = await fetch('/api/store/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queue),
      });
      if (!res.ok) throw new Error('sync failed');

      const { saved = [], failed = [] } = await res.json();

      // Remove successfully synced items from queue
      for (const { localId } of saved) {
        await idbDelete(STORE_QUEUE, localId);
      }

      await refreshQueueCount();

      // Retry failed ones later
      if (failed.length) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(runSync, 30000);
      }
    } catch (err) {
      console.error('Sync error:', err);
      // Retry in 30s
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(runSync, 30000);
    } finally {
      setSyncing(false);
    }
  };

  const refreshQueueCount = async () => {
    const c = await idbCount(STORE_QUEUE).catch(() => 0);
    setQueueCount(c);
  };

  // ─────────────────────────────────────────────────────────────
  // Print
  // ─────────────────────────────────────────────────────────────
  const printBill = (bill) => {
    const s = bill.settings || {};
    const currency = s.currency || 'INR';
    const fmt = (n) =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format(n);
    const dateStr = new Date(bill.createdAt).toLocaleString('en-IN');

    const itemRows = bill.items
      .map(
        (it) => `
      <tr>
        <td style="padding:3px 6px;border-bottom:1px solid #eee">${it.name}</td>
        <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:center">${it.quantity}</td>
        <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right">${fmt(it.price)}</td>
        <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right">${fmt(it.total)}</td>
      </tr>`
      )
      .join('');

    let taxRows = '';
    if (s.taxType === 'GST_SPLIT') {
      taxRows = `
        <tr><td colspan="3" style="padding:2px 6px">CGST (${s.cgst}%)</td><td style="text-align:right;padding:2px 6px">${fmt(bill.taxAmount / 2)}</td></tr>
        <tr><td colspan="3" style="padding:2px 6px">SGST (${s.sgst}%)</td><td style="text-align:right;padding:2px 6px">${fmt(bill.taxAmount / 2)}</td></tr>
      `;
    } else if (bill.taxAmount > 0) {
      taxRows = `<tr><td colspan="3" style="padding:2px 6px">Tax (${s.taxPercent}%)</td><td style="text-align:right;padding:2px 6px">${fmt(bill.taxAmount)}</td></tr>`;
    }

    const html = `
      <html><head><title>${bill.billNumber}</title>
      <style>
        body { font-family: monospace; font-size: 13px; max-width: 320px; margin: 0 auto; }
        h2 { text-align:center; margin:4px 0; font-size:16px; }
        p  { text-align:center; margin:2px 0; font-size:11px; color:#555; }
        table { width:100%; border-collapse:collapse; }
        th { background:#f5f5f5; padding:4px 6px; text-align:left; border-bottom:2px solid #ccc; }
        .total-row td { font-weight:bold; font-size:14px; border-top:2px solid #ccc; padding:4px 6px; }
        .footer { text-align:center; margin-top:12px; font-size:11px; color:#888; border-top:1px dashed #ccc; padding-top:6px; }
        @media print { body { max-width:100%; } }
      </style></head><body>
      ${s.showStoreName && s.storeName ? `<h2>${s.storeName}</h2>` : ''}
      ${s.address ? `<p>${s.address}</p>` : ''}
      ${s.showGST && s.gstNumber ? `<p>GST: ${s.gstNumber}</p>` : ''}
      <p>─────────────────────</p>
      <p><strong>${bill.billNumber}</strong></p>
      <p>${dateStr}</p>
      <p>Payment: ${bill.paymentMode}</p>
      <p>─────────────────────</p>
      <table>
        <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amt</th></tr></thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr><td colspan="3" style="padding:2px 6px">Subtotal</td><td style="text-align:right;padding:2px 6px">${fmt(bill.subtotal)}</td></tr>
          ${bill.discount > 0 ? `<tr><td colspan="3" style="padding:2px 6px">Discount</td><td style="text-align:right;padding:2px 6px">- ${fmt(bill.discount)}</td></tr>` : ''}
          ${taxRows}
          <tr class="total-row"><td colspan="3">TOTAL</td><td style="text-align:right">${fmt(bill.total)}</td></tr>
        </tfoot>
      </table>
      ${s.footerMessage ? `<div class="footer">${s.footerMessage}</div>` : ''}
      </body></html>`;

    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 300);
  };

  // ─────────────────────────────────────────────────────────────
  // UI helpers
  // ─────────────────────────────────────────────────────────────
  const fmt = (n) => formatCurrency(n, settings);

  const taxLabel =
    settings?.taxType === 'GST_SPLIT'
      ? `GST (CGST ${settings.cgst}% + SGST ${settings.sgst}%)`
      : `Tax (${settings?.taxPercent || 0}%)`;

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 shadow-sm z-20">
        <div className="flex items-center gap-2">
          <Receipt size={20} className="text-amber-500" />
          <span className="font-bold text-slate-800 text-base tracking-tight">POS Billing</span>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
            LIVE
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Sync status */}
          <button
            onClick={runSync}
            disabled={syncing || queueCount === 0}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
              queueCount > 0
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                : 'bg-slate-50 text-slate-400 border border-slate-200'
            }`}
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {queueCount > 0 ? `${queueCount} unsynced` : 'All synced'}
          </button>

          {/* Online indicator */}
          <div
            className={`flex items-center gap-1 text-xs font-medium ${isOnline ? 'text-green-600' : 'text-red-500'}`}
          >
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? 'Online' : 'Offline'}
          </div>

          {/* History */}
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Clock size={14} />
            History
          </button>
        </div>
      </div>

      {/* ── Main area ───────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden gap-0">
        {/* LEFT: Search + product suggestions ──────────── */}
        <div className="flex flex-col w-full lg:w-[55%] xl:w-[60%] border-r border-slate-200 bg-white overflow-hidden">
          {/* Search bar */}
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-400">
                {searchLoading ? (
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-amber-500 rounded-full animate-spin" />
                ) : (
                  <Search size={16} />
                )}
              </div>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => suggestions.length && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                placeholder="Scan barcode, or type product name / SKU…"
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all placeholder:text-slate-400"
                autoComplete="off"
                spellCheck={false}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-300">
                <Barcode size={14} />
                <span className="text-[10px] font-mono">SCAN</span>
              </div>
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-30 mt-1 w-[calc(55%-2rem)] xl:w-[calc(60%-2rem)] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                {suggestions.map((p, i) => (
                  <button
                    key={p.id}
                    onMouseDown={() => addToCart(p)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-amber-50 ${
                      i === activeSuggestionIdx ? 'bg-amber-50' : ''
                    } ${i !== 0 ? 'border-t border-slate-100' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.sku && (
                          <span className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</span>
                        )}
                        {p.barcode && (
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                            <Barcode size={9} />
                            {p.barcode}
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            p.quantity > 10
                              ? 'bg-green-100 text-green-700'
                              : p.quantity > 0
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {p.quantity > 0 ? `${p.quantity} in stock` : 'Out of stock'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-slate-800">{fmt(p.price)}</p>
                      {p.mrp > p.price && (
                        <p className="text-[10px] text-slate-400 line-through">{fmt(p.mrp)}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 gap-3">
                <ShoppingCart size={48} strokeWidth={1} className="text-slate-200" />
                <div>
                  <p className="font-medium text-slate-500">Cart is empty</p>
                  <p className="text-sm mt-1">Search or scan a product to add it</p>
                </div>
                <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mt-2">
                  <Zap size={12} className="text-amber-500" />
                  <span>
                    Tip: Press{' '}
                    <kbd className="bg-white border border-slate-300 rounded px-1 font-mono text-[10px]">
                      Enter
                    </kbd>{' '}
                    to add first result
                  </span>
                </div>
              </div>
            ) : (
              cartItems.map((item, idx) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Item number */}
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                    {idx + 1}
                  </div>

                  {/* Name + discount */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">{fmt(item.price)} each</span>
                      {item.stock !== undefined && item.stock <= 10 && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 rounded-full">
                          Low stock: {item.stock}
                        </span>
                      )}
                    </div>
                    {/* Per-item discount */}
                    <div className="flex items-center gap-1 mt-1.5">
                      <Tag size={10} className="text-slate-400" />
                      <span className="text-[10px] text-slate-400">Item discount:</span>
                      <input
                        type="number"
                        min="0"
                        value={item.itemDiscount || ''}
                        onChange={(e) => updateItemDiscount(idx, e.target.value)}
                        placeholder="0"
                        className="w-16 text-[11px] border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-300"
                      />
                    </div>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => updateQuantity(idx, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    >
                      <Minus size={13} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={editingQty?.idx === idx ? editingQty.value : item.quantity}
                      onChange={(e) => setEditingQty({ idx, value: e.target.value })}
                      onBlur={() => {
                        if (editingQty?.idx === idx) {
                          updateQuantity(idx, parseInt(editingQty.value) || 1);
                          setEditingQty(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateQuantity(idx, parseInt(editingQty?.value || item.quantity) || 1);
                          setEditingQty(null);
                          searchRef.current?.focus();
                        }
                      }}
                      className="w-12 text-center text-sm font-bold border border-slate-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                    <button
                      onClick={() => updateQuantity(idx, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Line total */}
                  <div className="text-right flex-shrink-0 w-20">
                    <p className="text-sm font-bold text-slate-800">
                      {fmt(item.price * item.quantity - (item.itemDiscount || 0))}
                    </p>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(idx)}
                    className="w-7 h-7 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Clear cart button */}
          {cartItems.length > 0 && (
            <div className="p-3 border-t border-slate-100">
              <button
                onClick={clearCart}
                className="w-full text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 size={12} />
                Clear all items (ESC)
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Summary + payment ─────────────────────── */}
        <div className="flex flex-col w-full lg:w-[45%] xl:w-[40%] bg-white overflow-y-auto">
          <div className="flex-1 p-4 space-y-4">
            {/* Bill summary */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Bill Summary
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    Items ({cartItems.reduce((s, i) => s + i.quantity, 0)})
                  </span>
                  <span className="font-medium">{fmt(subtotal)}</span>
                </div>

                {/* Bill-level discount */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Tag size={12} className="text-slate-400" />
                    <span className="text-sm text-slate-600">Bill discount</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-slate-500">-</span>
                    <input
                      type="number"
                      min="0"
                      value={billDiscount || ''}
                      onChange={(e) => setBillDiscount(e.target.value)}
                      placeholder="0.00"
                      className="w-24 text-right text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                    />
                  </div>
                </div>

                {Number(billDiscount) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>After discount</span>
                    <span className="font-medium">{fmt(discounted)}</span>
                  </div>
                )}

                {taxResult.taxAmount > 0 && (
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>{taxLabel}</span>
                    <span>+{fmt(taxResult.taxAmount)}</span>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-2 mt-1 flex justify-between">
                  <span className="font-bold text-slate-800">Total</span>
                  <span className="font-bold text-xl text-slate-900">{fmt(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Payment mode */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Payment Mode
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_MODES.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => setPaymentMode(pm.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-xs font-medium ${
                      paymentMode === pm.id
                        ? 'border-amber-400 bg-amber-50 text-amber-700'
                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <pm.icon size={18} />
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Note (optional)
              </h3>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Customer name, phone, or any note…"
                rows={2}
                className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-slate-50 resize-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Complete bill button */}
          <div className="p-4 border-t border-slate-200">
            <button
              onClick={completeBill}
              disabled={!cartItems.length || loading}
              className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
                cartItems.length && !loading
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 hover:shadow-xl active:scale-[0.98]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Complete Bill · {fmt(grandTotal)}
                </>
              )}
            </button>
            <p className="text-center text-xs text-slate-400 mt-2">
              Saves locally immediately · Prints automatically
            </p>
          </div>
        </div>
      </div>

      {/* ── Success toast ──────────────────────────────── */}
      {successBill && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-medium animate-in slide-in-from-bottom-4">
          <CheckCircle size={18} />
          <span>Bill {successBill.billNumber} saved!</span>
          <button
            onClick={() => printBill(successBill)}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg text-xs transition-colors"
          >
            <Printer size={12} />
            Reprint
          </button>
          <button
            onClick={() => setSuccessBill(null)}
            className="ml-1 hover:text-white/70 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Duplicate product modal ─────────────────────── */}
      {duplicateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Product already in cart</h3>
                <p className="text-sm text-slate-500">{duplicateModal.product.name}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-5">What would you like to do?</p>
            <div className="space-y-2">
              <button
                onClick={handleDuplicateIncreaseQty}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition-colors"
              >
                + Increase quantity (now {cartItems[duplicateModal.existingIdx]?.quantity + 1})
              </button>
              <button
                onClick={handleDuplicateNewRow}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-colors"
              >
                Add as separate line item
              </button>
              <button
                onClick={() => {
                  setDuplicateModal(null);
                  searchRef.current?.focus();
                }}
                className="w-full py-2.5 text-slate-400 hover:text-slate-600 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bill history drawer ─────────────────────────── */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="bg-white w-full max-w-md flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock size={18} className="text-amber-500" />
                Recent Bills (local)
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {recentBills.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">No bills yet</p>
              ) : (
                recentBills.map((bill) => (
                  <div
                    key={bill.localId}
                    className="bg-slate-50 rounded-xl p-3 border border-slate-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{bill.billNumber}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(bill.createdAt).toLocaleString('en-IN')} · {bill.paymentMode}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{bill.items.length} item(s)</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800">{fmt(bill.total)}</p>
                        <button
                          onClick={() => printBill(bill)}
                          className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 mt-1"
                        >
                          <Printer size={11} />
                          Print
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
