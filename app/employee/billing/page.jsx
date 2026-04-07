'use client';
/**
 * /app/employee/billing/page.jsx
 * ─────────────────────────────────────────────────────────────
 * Employee POS Billing — v3
 *
 * ✅ Full Billing History tab — merges DB bills + offline local bills
 * ✅ Today stats, search, filters, expandable items
 * ✅ Correct stock deduction (online: immediate, offline: on sync)
 * ✅ No duplicate deduction via billNumber dedup key
 * ✅ Employee permission gate
 * ✅ Blue theme (vs amber for store owner)
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Barcode, ShoppingCart, Trash2, Plus, Minus,
  Printer, CheckCircle, Wifi, WifiOff, RefreshCw, X,
  Tag, Receipt, AlertCircle, Zap, CreditCard, Banknote,
  Smartphone, Clock, Maximize, Minimize, ShieldAlert,
  History, TrendingUp, Filter, ChevronDown, Eye,
  AlertTriangle,
} from 'lucide-react';
import { calculateTax, formatCurrency } from '@/lib/storeSettings';

// ─── localStorage keys ────────────────────────────────────────────────────────
const LS_PRODUCTS    = 'emp_pos_products_cache';
const LS_PRODUCTS_TS = 'emp_pos_products_cache_ts';
const PRODUCT_CACHE_TTL = 10 * 60 * 1000;

// ─── IndexedDB (separate DB — avoids conflicts with store owner) ──────────────
const DB_NAME     = 'emp_pos_billing_db';
const DB_VERSION  = 2;
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
    req.onerror   = () => reject(req.error);
  });
}

async function idbPut(storeName, value) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  const st = tx.objectStore(storeName);
  return new Promise((res, rej) => {
    const r = st.put(value);
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  });
}

async function idbGetAll(storeName) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readonly');
  const st = tx.objectStore(storeName);
  return new Promise((res, rej) => {
    const r = st.getAll();
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  });
}

async function idbDelete(storeName, key) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  const st = tx.objectStore(storeName);
  return new Promise((res, rej) => {
    const r = st.delete(key);
    r.onsuccess = () => res();
    r.onerror   = () => rej(r.error);
  });
}

async function idbCount(storeName) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readonly');
  const st = tx.objectStore(storeName);
  return new Promise((res, rej) => {
    const r = st.count();
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  });
}

// ─── Product cache ────────────────────────────────────────────────────────────
function saveProductsToCache(products) {
  try {
    localStorage.setItem(LS_PRODUCTS, JSON.stringify(products));
    localStorage.setItem(LS_PRODUCTS_TS, String(Date.now()));
  } catch (_) {}
}

function getProductsFromCache() {
  try {
    const ts = Number(localStorage.getItem(LS_PRODUCTS_TS) || 0);
    if (Date.now() - ts > PRODUCT_CACHE_TTL) return null;
    const raw = localStorage.getItem(LS_PRODUCTS);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function searchLocal(products, query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return products
    .filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q)
    )
    .slice(0, 8);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateBillNumber() {
  const now  = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const ms   = String(now.getTime()).slice(-5);
  return `EBILL-${date}-${ms}`;
}

function getEmpToken() {
  return localStorage.getItem('empToken') || localStorage.getItem('employeeToken') || '';
}

const PAYMENT_MODES = [
  { id: 'CASH',  label: 'Cash',  icon: Banknote  },
  { id: 'CARD',  label: 'Card',  icon: CreditCard },
  { id: 'UPI',   label: 'UPI',   icon: Smartphone },
  { id: 'OTHER', label: 'Other', icon: Receipt    },
];

const PM_COLORS = {
  CASH:  'bg-green-100 text-green-700',
  CARD:  'bg-blue-100 text-blue-700',
  UPI:   'bg-purple-100 text-purple-700',
  OTHER: 'bg-slate-100 text-slate-600',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function EmployeeBillingPage() {
  // ── Auth/settings ──────────────────────────────────────────────
  const [employee,      setEmployee]      = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [settings,      setSettings]      = useState(null);

  // ── Tab ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('billing');

  // ── Billing state ──────────────────────────────────────────────
  const [searchQuery,    setSearchQuery]    = useState('');
  const [suggestions,    setSuggestions]    = useState([]);
  const [showSuggestions,setShowSuggestions]= useState(false);
  const [cartItems,      setCartItems]      = useState([]);
  const [billDiscount,   setBillDiscount]   = useState(0);
  const [paymentMode,    setPaymentMode]    = useState('CASH');
  const [note,           setNote]           = useState('');
  const [loading,        setLoading]        = useState(false);
  const [searchLoading,  setSearchLoading]  = useState(false);
  const [successBill,    setSuccessBill]    = useState(null);
  const [queueCount,     setQueueCount]     = useState(0);
  const [isOnline,       setIsOnline]       = useState(true);
  const [syncing,        setSyncing]        = useState(false);
  const [duplicateModal, setDuplicateModal] = useState(null);
  const [activeSuggIdx,  setActiveSuggIdx]  = useState(-1);
  const [editingQty,     setEditingQty]     = useState(null);
  const [isFullscreen,   setIsFullscreen]   = useState(false);
  const [localProducts,  setLocalProducts]  = useState([]);

  // ── History state ──────────────────────────────────────────────
  const [historyBills,    setHistoryBills]    = useState([]);
  const [localBills,      setLocalBills]      = useState([]);
  const [historyLoading,  setHistoryLoading]  = useState(false);
  const [historyTotal,    setHistoryTotal]    = useState(0);
  const [historyPage,     setHistoryPage]     = useState(1);
  const [todayStats,      setTodayStats]      = useState({ count: 0, revenue: 0 });
  const [historySearch,   setHistorySearch]   = useState('');
  const [historyPM,       setHistoryPM]       = useState('');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo,   setHistoryDateTo]   = useState('');
  const [expandedBill,    setExpandedBill]    = useState(null);
  const [showFilters,     setShowFilters]     = useState(false);
  const [queueBillIds,    setQueueBillIds]    = useState(new Set());

  // ── Refs ───────────────────────────────────────────────────────
  const searchRef    = useRef(null);
  const syncTimerRef = useRef(null);
  const searchTimer  = useRef(null);
  const apiCache     = useRef({});
  const historyTimer = useRef(null);

  // ── Computed ───────────────────────────────────────────────────
  const subtotal   = cartItems.reduce((s, i) => s + i.price * i.quantity - (i.itemDiscount || 0), 0);
  const discounted = Math.max(0, subtotal - Number(billDiscount || 0));
  const taxResult  = calculateTax(discounted, settings);
  const grandTotal = taxResult.total;
  const fmt        = (n) => formatCurrency(n, settings);

  // ─────────────────────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Read employee data from localStorage
    const empRaw = localStorage.getItem('empData') || localStorage.getItem('employeeData');
    if (empRaw) {
      try {
        const emp    = JSON.parse(empRaw);
        setEmployee(emp);
        const canBill = emp?.role === 'STORE_OWNER' || emp?.permissions?.billing === true;
        setHasPermission(canBill);
      } catch { setHasPermission(false); }
    } else {
      setHasPermission(false);
    }

    const token = getEmpToken();
    if (token) {
      fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => setSettings(d.settings || null))
        .catch(console.error);
    }

    const onOnline  = () => { setIsOnline(true); triggerSync(); refreshProductCache(); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    setIsOnline(navigator.onLine);

    refreshQueueCount();

    idbGetAll(STORE_LOCAL).then(bills => {
      setLocalBills(bills.sort((a, b) => b.createdAt - a.createdAt));
    });

    idbGetAll(STORE_QUEUE).then(q => {
      setQueueBillIds(new Set(q.map(b => b.localId)));
    });

    const onFS = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFS);

    const cached = getProductsFromCache();
    if (cached) setLocalProducts(cached);
    if (navigator.onLine) refreshProductCache();

    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('fullscreenchange', onFS);
      clearTimeout(syncTimerRef.current);
    };
  }, []); // eslint-disable-line

  // ESC closes suggestions
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { setSuggestions([]); setShowSuggestions(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Auto-focus when permission confirmed
  useEffect(() => {
    if (hasPermission) setTimeout(() => searchRef.current?.focus(), 100);
  }, [hasPermission]);

  // Load history on tab switch or filter change
  useEffect(() => {
    if (activeTab === 'history') loadHistory(1);
  }, [activeTab, historyPM, historyDateFrom, historyDateTo]); // eslint-disable-line

  useEffect(() => {
    if (activeTab !== 'history') return;
    clearTimeout(historyTimer.current);
    historyTimer.current = setTimeout(() => loadHistory(1), 400);
    return () => clearTimeout(historyTimer.current);
  }, [historySearch]); // eslint-disable-line

  // ─────────────────────────────────────────────────────────────
  // Product cache
  // ─────────────────────────────────────────────────────────────
  const refreshProductCache = async () => {
    try {
      const token = getEmpToken();
      const res   = await fetch('/api/products?limit=500', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data  = await res.json();
      const products = data.products || [];
      setLocalProducts(products);
      saveProductsToCache(products);
    } catch (e) { console.warn('Product cache refresh failed:', e); }
  };

  // ─────────────────────────────────────────────────────────────
  // History loader
  // ─────────────────────────────────────────────────────────────
  const loadHistory = async (page = 1) => {
    setHistoryLoading(true);
    try {
      const token  = getEmpToken();
      const params = new URLSearchParams({
        page:  String(page),
        limit: '50',
        ...(historySearch   && { search:      historySearch   }),
        ...(historyPM       && { paymentMode: historyPM       }),
        ...(historyDateFrom && { dateFrom:    historyDateFrom }),
        ...(historyDateTo   && { dateTo:      historyDateTo   }),
      });
      const res  = await fetch(`/api/store/billing?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setHistoryBills(data.bills || []);
      setHistoryTotal(data.total || 0);
      setHistoryPage(page);
      setTodayStats(data.todayStats || { count: 0, revenue: 0 });
    } catch (e) { console.warn('History load failed:', e); }
    finally     { setHistoryLoading(false); }
  };

  // ─────────────────────────────────────────────────────────────
  // Search
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(searchTimer.current);
    const q = searchQuery.trim();
    if (!q) { setSuggestions([]); setShowSuggestions(false); return; }

    if (!isOnline) {
      const results = searchLocal(localProducts, q);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setActiveSuggIdx(-1);
      return;
    }

    if (apiCache.current[q]) {
      setSuggestions(apiCache.current[q]);
      setShowSuggestions(apiCache.current[q].length > 0);
      setActiveSuggIdx(-1);
    }

    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const token = getEmpToken();
        const res   = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=8`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data  = await res.json();
        const results = data.products || [];
        apiCache.current[q] = results;
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setActiveSuggIdx(-1);
      } catch {
        const results = searchLocal(localProducts, q);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } finally { setSearchLoading(false); }
    }, 150);

    return () => clearTimeout(searchTimer.current);
  }, [searchQuery, isOnline]); // eslint-disable-line

  // ─────────────────────────────────────────────────────────────
  // Fullscreen
  // ─────────────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement)
      document.documentElement.requestFullscreen().catch(console.error);
    else document.exitFullscreen().catch(console.error);
  };

  // ─────────────────────────────────────────────────────────────
  // Keyboard nav
  // ─────────────────────────────────────────────────────────────
  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setActiveSuggIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setActiveSuggIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && showSuggestions && suggestions.length) {
      e.preventDefault();
      const idx = activeSuggIdx >= 0 ? activeSuggIdx : 0;
      if (suggestions[idx]) addToCart(suggestions[idx]);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Cart
  // ─────────────────────────────────────────────────────────────
  const addToCart = useCallback((product) => {
    const existing = cartItems.findIndex(i => i.productId === product.id);
    if (existing >= 0) {
      setDuplicateModal({ product, existingIdx: existing });
      setSearchQuery(''); setSuggestions([]); setShowSuggestions(false);
      return;
    }
    setCartItems(prev => [...prev, {
      productId: product.id, name: product.name, price: product.price,
      quantity: 1, itemDiscount: 0, total: product.price,
      sku: product.sku || '', barcode: product.barcode || '', stock: product.quantity || 0,
    }]);
    setSearchQuery(''); setSuggestions([]); setShowSuggestions(false);
    setActiveSuggIdx(-1);
    searchRef.current?.focus();
  }, [cartItems]);

  const handleDuplicateIncreaseQty = () => {
    if (!duplicateModal) return;
    updateQuantity(duplicateModal.existingIdx, cartItems[duplicateModal.existingIdx].quantity + 1);
    setDuplicateModal(null); searchRef.current?.focus();
  };

  const handleDuplicateNewRow = () => {
    if (!duplicateModal) return;
    const p = duplicateModal.product;
    setCartItems(prev => [...prev, {
      productId: p.id + '_' + Date.now(), name: p.name, price: p.price,
      quantity: 1, itemDiscount: 0, total: p.price,
      sku: p.sku || '', barcode: p.barcode || '', stock: p.quantity || 0, _originalId: p.id,
    }]);
    setDuplicateModal(null); searchRef.current?.focus();
  };

  const updateQuantity = (idx, qty) => {
    const item   = cartItems[idx];
    const newQty = Math.max(1, Math.min(qty, item.stock || 9999));
    setCartItems(prev =>
      prev.map((it, i) => i === idx
        ? { ...it, quantity: newQty, total: it.price * newQty - (it.itemDiscount || 0) }
        : it
      )
    );
  };

  const updateItemDiscount = (idx, disc) => {
    const item = cartItems[idx];
    const d    = Math.max(0, Math.min(Number(disc || 0), item.price * item.quantity));
    setCartItems(prev =>
      prev.map((it, i) => i === idx
        ? { ...it, itemDiscount: d, total: it.price * it.quantity - d }
        : it
      )
    );
  };

  const removeItem = (idx) => setCartItems(prev => prev.filter((_, i) => i !== idx));
  const clearCart  = () => {
    setCartItems([]); setBillDiscount(0); setNote(''); setPaymentMode('CASH');
    searchRef.current?.focus();
  };

  // ─────────────────────────────────────────────────────────────
  // Complete bill
  // ─────────────────────────────────────────────────────────────
  const completeBill = async () => {
    if (!cartItems.length) return;
    setLoading(true);

    const localId    = `ebill_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const billNumber = generateBillNumber();
    const now        = Date.now();

    const billData = {
      localId, billNumber,
      subtotal:   parseFloat(subtotal.toFixed(2)),
      discount:   parseFloat(Number(billDiscount || 0).toFixed(2)),
      taxAmount:  parseFloat(taxResult.taxAmount.toFixed(2)),
      total:      parseFloat(grandTotal.toFixed(2)),
      paymentMode, note: note || null, createdAt: now, synced: false,
      items: cartItems.map(it => ({
        productId: it._originalId || it.productId,
        name: it.name, price: it.price, quantity: it.quantity,
        discount: it.itemDiscount || 0,
        total: parseFloat((it.price * it.quantity - (it.itemDiscount || 0)).toFixed(2)),
      })),
      settings: {
        storeName: settings?.storeName, gstNumber: settings?.gstNumber,
        address: settings?.address, taxType: settings?.taxType,
        taxPercent: settings?.taxPercent, cgst: settings?.cgst, sgst: settings?.sgst,
        footerMessage: settings?.footerMessage, currency: settings?.currency,
        showGST: settings?.showGST, showStoreName: settings?.showStoreName,
      },
    };

    try {
      await idbPut(STORE_LOCAL, billData);
      await idbPut(STORE_QUEUE, billData);

      setLocalBills(prev => [billData, ...prev].slice(0, 200));
      setQueueBillIds(prev => new Set([...prev, localId]));

      // Online: deduct stock immediately with dedup key
      if (isOnline) {
        const token = getEmpToken();
        fetch('/api/inventory/deduct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            billId: billNumber,
            items:  cartItems.map(it => ({
              productId: it._originalId || it.productId,
              quantity:  it.quantity,
            })),
          }),
        }).catch(console.error);
      }

      setSuccessBill(billData);
      await refreshQueueCount();
      setCartItems([]); setBillDiscount(0); setNote(''); setPaymentMode('CASH');
      triggerSync();
      setTimeout(() => printBill(billData), 400);

      if (activeTab === 'history') loadHistory(1);
    } catch (err) {
      console.error('completeBill error:', err);
      alert('Failed to save bill. Please try again.');
    } finally { setLoading(false); }
  };

  // ─────────────────────────────────────────────────────────────
  // Sync
  // ─────────────────────────────────────────────────────────────
  const triggerSync = useCallback(() => {
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(runSync, 1500);
  }, []); // eslint-disable-line

  const runSync = async () => {
    if (syncing) return;
    const queue = await idbGetAll(STORE_QUEUE);
    if (!queue.length) return;
    setSyncing(true);
    try {
      const token = getEmpToken();
      const res   = await fetch('/api/store/billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(queue),
      });
      if (!res.ok) throw new Error('sync failed');
      const { saved = [], failed = [] } = await res.json();

      for (const { localId } of saved) {
        await idbDelete(STORE_QUEUE, localId);
        const allLocal = await idbGetAll(STORE_LOCAL);
        const bill = allLocal.find(b => b.localId === localId);
        if (bill) await idbPut(STORE_LOCAL, { ...bill, synced: true });
      }

      const remaining = await idbGetAll(STORE_QUEUE);
      setQueueBillIds(new Set(remaining.map(b => b.localId)));
      idbGetAll(STORE_LOCAL).then(bills =>
        setLocalBills(bills.sort((a, b) => b.createdAt - a.createdAt))
      );

      await refreshQueueCount();
      if (failed.length) syncTimerRef.current = setTimeout(runSync, 30000);
      if (activeTab === 'history') loadHistory(historyPage);
    } catch {
      syncTimerRef.current = setTimeout(runSync, 30000);
    } finally { setSyncing(false); }
  };

  const refreshQueueCount = async () => {
    const c = await idbCount(STORE_QUEUE).catch(() => 0);
    setQueueCount(c);
  };

  // ─────────────────────────────────────────────────────────────
  // Print
  // ─────────────────────────────────────────────────────────────
  const printBill = (bill) => {
    const s        = bill.settings || {};
    const currency = s.currency || 'INR';
    const fmtN     = (n) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
    const dateStr  = new Date(bill.createdAt).toLocaleString('en-IN');

    const itemRows = bill.items.map(it => `
      <tr>
        <td style="padding:3px 6px;border-bottom:1px solid #eee">${it.name}</td>
        <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:center">${it.quantity}</td>
        <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right">${fmtN(it.price)}</td>
        <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right">${fmtN(it.total)}</td>
      </tr>`).join('');

    let taxRows = '';
    if (s.taxType === 'GST_SPLIT') {
      taxRows = `<tr><td colspan="3" style="padding:2px 6px">CGST (${s.cgst}%)</td><td style="text-align:right;padding:2px 6px">${fmtN(bill.taxAmount / 2)}</td></tr>
                 <tr><td colspan="3" style="padding:2px 6px">SGST (${s.sgst}%)</td><td style="text-align:right;padding:2px 6px">${fmtN(bill.taxAmount / 2)}</td></tr>`;
    } else if (bill.taxAmount > 0) {
      taxRows = `<tr><td colspan="3" style="padding:2px 6px">Tax (${s.taxPercent}%)</td><td style="text-align:right;padding:2px 6px">${fmtN(bill.taxAmount)}</td></tr>`;
    }

    const html = `<html><head><title>${bill.billNumber}</title>
      <style>
        body{font-family:monospace;font-size:13px;max-width:320px;margin:0 auto;}
        h2{text-align:center;margin:4px 0;font-size:16px;}
        p{text-align:center;margin:2px 0;font-size:11px;color:#555;}
        table{width:100%;border-collapse:collapse;}
        th{background:#f5f5f5;padding:4px 6px;text-align:left;border-bottom:2px solid #ccc;}
        .total-row td{font-weight:bold;font-size:14px;border-top:2px solid #ccc;padding:4px 6px;}
        .footer{text-align:center;margin-top:12px;font-size:11px;color:#888;border-top:1px dashed #ccc;padding-top:6px;}
        @media print{body{max-width:100%;}}
      </style></head><body>
      ${s.showStoreName && s.storeName ? `<h2>${s.storeName}</h2>` : ''}
      ${s.address       ? `<p>${s.address}</p>` : ''}
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
          <tr><td colspan="3" style="padding:2px 6px">Subtotal</td><td style="text-align:right;padding:2px 6px">${fmtN(bill.subtotal)}</td></tr>
          ${bill.discount > 0 ? `<tr><td colspan="3" style="padding:2px 6px">Discount</td><td style="text-align:right;padding:2px 6px">-${fmtN(bill.discount)}</td></tr>` : ''}
          ${taxRows}
          <tr class="total-row"><td colspan="3">TOTAL</td><td style="text-align:right">${fmtN(bill.total)}</td></tr>
        </tfoot>
      </table>
      ${s.footerMessage ? `<div class="footer">${s.footerMessage}</div>` : ''}
      </body></html>`;

    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write(html); win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  // ─────────────────────────────────────────────────────────────
  // Merge DB + local bills
  // ─────────────────────────────────────────────────────────────
  const mergedHistoryBills = () => {
    const dbSet        = new Set(historyBills.map(b => b.billNumber));
    const unsyncedLocal = localBills.filter(b => !dbSet.has(b.billNumber));
    return [
      ...unsyncedLocal.map(b => ({ ...b, _source: 'local', _synced: !queueBillIds.has(b.localId) })),
      ...historyBills.map(b => ({ ...b, _source: 'db', _synced: true })),
    ];
  };

  const taxLabel =
    settings?.taxType === 'GST_SPLIT'
      ? `GST (CGST ${settings.cgst}% + SGST ${settings.sgst}%)`
      : `Tax (${settings?.taxPercent || 0}%)`;

  // ─────────────────────────────────────────────────────────────
  // Permission gate
  // ─────────────────────────────────────────────────────────────
  if (hasPermission === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <ShieldAlert size={32} className="text-red-500" />
        </div>
        <div>
          <h2 className="font-bold text-slate-800 text-lg">Access Denied</h2>
          <p className="text-slate-500 text-sm mt-1">You don't have permission to access billing.</p>
          <p className="text-slate-400 text-xs mt-1">Ask your store owner to enable billing permission.</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">

      {/* ── TOP BAR ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 shadow-sm z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Receipt size={20} className="text-blue-500" />
            <span className="font-bold text-slate-800 text-base tracking-tight">POS Billing</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">EMPLOYEE</span>
          </div>

          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 ml-2">
            <button
              onClick={() => setActiveTab('billing')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'billing' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ShoppingCart size={12} /> New Bill
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <History size={12} /> History
              {localBills.length > 0 && (
                <span className="bg-blue-400 text-white text-[9px] px-1.5 rounded-full ml-0.5">
                  {localBills.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-1 rounded-lg font-semibold border border-orange-200">
              ⚡ Offline — {localProducts.length} cached
            </span>
          )}
          <button
            onClick={runSync} disabled={syncing || queueCount === 0}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
              queueCount > 0
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                : 'bg-slate-50 text-slate-400 border border-slate-200'
            }`}
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {queueCount > 0 ? `${queueCount} unsynced` : 'Synced'}
          </button>
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg ${
            isOnline ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'
          }`}>
            {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
          <button onClick={toggleFullscreen} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors">
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────── */}
      {activeTab === 'billing' ? (
        /* ══════════════════ BILLING TAB ══════════════════ */
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT */}
          <div className="flex flex-col w-full lg:w-[58%] xl:w-[62%] border-r border-slate-200 bg-white overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-slate-100 relative">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {searchLoading
                    ? <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                    : <Search size={15} />}
                </div>
                <input
                  ref={searchRef} type="text" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => suggestions.length && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                  placeholder={isOnline ? 'Scan barcode or type name / SKU…' : '🔌 Offline — searching local cache…'}
                  className="w-full pl-9 pr-20 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-slate-400"
                  autoComplete="off" spellCheck={false}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-300">
                  <Barcode size={14} /><span className="text-[10px] font-mono">SCAN</span>
                </div>
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-4 right-4 top-[68px] z-40 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                  {suggestions.map((p, i) => (
                    <button
                      key={p.id} onMouseDown={() => addToCart(p)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50 ${
                        i === activeSuggIdx ? 'bg-blue-50' : ''
                      } ${i !== 0 ? 'border-t border-slate-100' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {p.sku    && <span className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</span>}
                          {p.barcode && <span className="text-[10px] text-slate-400 font-mono"><Barcode size={9} className="inline" />{p.barcode}</span>}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            p.quantity > 10 ? 'bg-green-100 text-green-700' :
                            p.quantity > 0  ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {p.quantity > 0 ? `${p.quantity} in stock` : 'Out of stock'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-slate-800">{fmt(p.price)}</p>
                        {p.mrp > p.price && <p className="text-[10px] text-slate-400 line-through">{fmt(p.mrp)}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                  <ShoppingCart size={52} strokeWidth={1} className="text-slate-200" />
                  <div>
                    <p className="font-medium text-slate-500">Cart is empty</p>
                    <p className="text-sm text-slate-400 mt-1">Search or scan a product to add it</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <Zap size={12} className="text-blue-500" />
                    <span className="text-blue-700">
                      Press <kbd className="bg-white border border-blue-300 rounded px-1 font-mono text-[10px]">Enter</kbd> to add first result
                    </span>
                  </div>
                </div>
              ) : (
                cartItems.map((item, idx) => (
                  <div key={item.productId} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">{fmt(item.price)} each</span>
                        {item.stock !== undefined && item.stock <= 10 && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 rounded-full">Low: {item.stock}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Tag size={9} className="text-slate-400" />
                        <span className="text-[10px] text-slate-400">Discount:</span>
                        <input type="number" min="0" value={item.itemDiscount || ''} placeholder="0"
                          onChange={e => updateItemDiscount(idx, e.target.value)}
                          className="w-16 text-[11px] border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => updateQuantity(idx, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                        <Minus size={13} />
                      </button>
                      <input type="number" min="1"
                        value={editingQty?.idx === idx ? editingQty.value : item.quantity}
                        onChange={e => setEditingQty({ idx, value: e.target.value })}
                        onBlur={() => {
                          if (editingQty?.idx === idx) { updateQuantity(idx, parseInt(editingQty.value) || 1); setEditingQty(null); }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { updateQuantity(idx, parseInt(editingQty?.value || item.quantity) || 1); setEditingQty(null); searchRef.current?.focus(); }
                        }}
                        className="w-12 text-center text-sm font-bold border border-slate-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                      <button onClick={() => updateQuantity(idx, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                        <Plus size={13} />
                      </button>
                    </div>
                    <div className="text-right flex-shrink-0 w-20">
                      <p className="text-sm font-bold text-slate-800">
                        {fmt(item.price * item.quantity - (item.itemDiscount || 0))}
                      </p>
                    </div>
                    <button onClick={() => removeItem(idx)} className="w-7 h-7 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="p-3 border-t border-slate-100 flex-shrink-0">
                <button onClick={clearCart} className="w-full text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                  <Trash2 size={12} /> Clear all items
                </button>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="flex flex-col w-full lg:w-[42%] xl:w-[38%] bg-white overflow-y-auto">
            <div className="flex-1 p-4 space-y-4">
              {/* Summary */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Bill Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Items ({cartItems.reduce((s, i) => s + i.quantity, 0)})</span>
                    <span className="font-medium">{fmt(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5"><Tag size={12} className="text-slate-400" /><span className="text-sm text-slate-600">Bill discount</span></div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-slate-500">-</span>
                      <input type="number" min="0" value={billDiscount || ''} onChange={e => setBillDiscount(e.target.value)} placeholder="0.00"
                        className="w-24 text-right text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                      />
                    </div>
                  </div>
                  {Number(billDiscount) > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>After discount</span><span className="font-medium">{fmt(discounted)}</span>
                    </div>
                  )}
                  {taxResult.taxAmount > 0 && (
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>{taxLabel}</span><span>+{fmt(taxResult.taxAmount)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 flex justify-between">
                    <span className="font-bold text-slate-800">Total</span>
                    <span className="font-bold text-xl text-slate-900">{fmt(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Payment Mode</h3>
                <div className="grid grid-cols-4 gap-2">
                  {PAYMENT_MODES.map(pm => (
                    <button key={pm.id} onClick={() => setPaymentMode(pm.id)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-xs font-medium ${
                        paymentMode === pm.id
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <pm.icon size={18} />{pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Note</h3>
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Customer name, phone, or any note…" rows={2}
                  className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-slate-50 resize-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Complete button */}
            <div className="p-4 border-t border-slate-200 flex-shrink-0">
              <button
                onClick={completeBill} disabled={!cartItems.length || loading}
                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
                  cartItems.length && !loading
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:shadow-xl active:scale-[0.98]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                {loading
                  ? <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
                  : <><CheckCircle size={20} /> Complete Bill · {fmt(grandTotal)}</>
                }
              </button>
              <p className="text-center text-xs text-slate-400 mt-2">
                {isOnline ? 'Saves & syncs instantly · Prints automatically' : '⚡ Saves offline · Syncs when online'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ══════════════════ HISTORY TAB ══════════════════ */
        <div className="flex flex-col flex-1 overflow-hidden bg-slate-50">

          {/* Header + stats */}
          <div className="bg-white border-b border-slate-200 px-5 py-4 flex-shrink-0">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
                <TrendingUp size={16} className="text-blue-600" />
                <div>
                  <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wide">Today's Revenue</p>
                  <p className="text-base font-bold text-blue-700">{fmt(todayStats.revenue)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                <Receipt size={16} className="text-slate-600" />
                <div>
                  <p className="text-[10px] text-slate-600 font-medium uppercase tracking-wide">Today's Bills</p>
                  <p className="text-base font-bold text-slate-700">{todayStats.count}</p>
                </div>
              </div>
              {queueCount > 0 && (
                <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
                  <AlertTriangle size={16} className="text-orange-600" />
                  <div>
                    <p className="text-[10px] text-orange-600 font-medium uppercase tracking-wide">Unsynced</p>
                    <p className="text-base font-bold text-orange-700">{queueCount}</p>
                  </div>
                </div>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => loadHistory(1)} disabled={historyLoading}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors">
                  <RefreshCw size={12} className={historyLoading ? 'animate-spin' : ''} /> Refresh
                </button>
                <button onClick={() => setShowFilters(v => !v)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${
                    showFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}>
                  <Filter size={12} /> Filters
                  <ChevronDown size={11} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={historySearch} onChange={e => setHistorySearch(e.target.value)}
                placeholder="Search bills by number, note…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>

            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wide block mb-1">Payment Mode</label>
                  <select value={historyPM} onChange={e => setHistoryPM(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                    <option value="">All modes</option>
                    {PAYMENT_MODES.map(pm => <option key={pm.id} value={pm.id}>{pm.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wide block mb-1">From Date</label>
                  <input type="date" value={historyDateFrom} onChange={e => setHistoryDateFrom(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wide block mb-1">To Date</label>
                  <input type="date" value={historyDateTo} onChange={e => setHistoryDateTo(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div className="flex items-end">
                  <button onClick={() => { setHistorySearch(''); setHistoryPM(''); setHistoryDateFrom(''); setHistoryDateTo(''); }}
                    className="w-full text-sm text-slate-500 hover:text-red-500 border border-slate-200 rounded-lg px-3 py-2 hover:bg-red-50 transition-colors">
                    Clear filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bills list */}
          <div className="flex-1 overflow-y-auto p-5">
            {historyLoading && historyBills.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-sm text-slate-400">Loading bills…</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {mergedHistoryBills().map((bill) => {
                    const isSynced   = bill._synced !== false;
                    const isExpanded = expandedBill === (bill.id || bill.localId);
                    const createdAt  = bill.createdAt instanceof Date
                      ? bill.createdAt : new Date(bill.createdAt);

                    return (
                      <div key={bill.id || bill.localId}
                        className={`bg-white rounded-xl border transition-all ${
                          isExpanded ? 'border-blue-200 shadow-md' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 p-3.5">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            isSynced ? 'bg-green-400' : 'bg-orange-400 animate-pulse'
                          }`} title={isSynced ? 'Synced' : 'Pending sync'} />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-slate-800">{bill.billNumber}</p>
                              {!isSynced && (
                                <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">OFFLINE</span>
                              )}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PM_COLORS[bill.paymentMode] || PM_COLORS.OTHER}`}>
                                {bill.paymentMode}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <p className="text-xs text-slate-400">{createdAt.toLocaleString('en-IN')}</p>
                              <span className="text-xs text-slate-400">{bill.items?.length || 0} item(s)</span>
                              {bill.note && <span className="text-xs text-slate-400 truncate max-w-[120px]">"{bill.note}"</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <p className="font-bold text-slate-800 text-sm">{fmt(bill.total)}</p>
                            <button onClick={() => printBill(bill)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Print">
                              <Printer size={14} />
                            </button>
                            <button onClick={() => setExpandedBill(isExpanded ? null : (bill.id || bill.localId))}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="View items">
                              <Eye size={14} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && bill.items?.length > 0 && (
                          <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                            <div className="bg-slate-50 rounded-lg overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-slate-200">
                                    <th className="text-left py-2 px-3 text-slate-500 font-medium">Item</th>
                                    <th className="text-center py-2 px-3 text-slate-500 font-medium">Qty</th>
                                    <th className="text-right py-2 px-3 text-slate-500 font-medium">Price</th>
                                    <th className="text-right py-2 px-3 text-slate-500 font-medium">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {bill.items.map((item, i) => (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                      <td className="py-2 px-3 text-slate-700 font-medium">{item.name}</td>
                                      <td className="py-2 px-3 text-center text-slate-600">{item.quantity}</td>
                                      <td className="py-2 px-3 text-right text-slate-600">{fmt(item.price)}</td>
                                      <td className="py-2 px-3 text-right font-medium text-slate-800">{fmt(item.total)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="border-t border-slate-200">
                                  {bill.discount > 0 && (
                                    <tr>
                                      <td colSpan={3} className="py-1.5 px-3 text-slate-500 text-right">Discount</td>
                                      <td className="py-1.5 px-3 text-right text-green-600">-{fmt(bill.discount)}</td>
                                    </tr>
                                  )}
                                  {bill.taxAmount > 0 && (
                                    <tr>
                                      <td colSpan={3} className="py-1.5 px-3 text-slate-500 text-right">Tax</td>
                                      <td className="py-1.5 px-3 text-right text-slate-600">+{fmt(bill.taxAmount)}</td>
                                    </tr>
                                  )}
                                  <tr>
                                    <td colSpan={3} className="py-2 px-3 text-right font-bold text-slate-700">Grand Total</td>
                                    <td className="py-2 px-3 text-right font-bold text-blue-600">{fmt(bill.total)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {mergedHistoryBills().length === 0 && !historyLoading && (
                    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
                      <Receipt size={40} strokeWidth={1} />
                      <p className="text-sm font-medium">No bills found</p>
                      <p className="text-xs">Bills you create will appear here</p>
                    </div>
                  )}
                </div>

                {historyTotal > 50 && (
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <button onClick={() => loadHistory(historyPage - 1)} disabled={historyPage <= 1 || historyLoading}
                      className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                      Previous
                    </button>
                    <span className="text-sm text-slate-500">Page {historyPage} · {historyTotal} total</span>
                    <button onClick={() => loadHistory(historyPage + 1)} disabled={historyPage * 50 >= historyTotal || historyLoading}
                      className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* SUCCESS TOAST */}
      {successBill && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-medium">
          <CheckCircle size={18} />
          <span>Bill {successBill.billNumber} saved!</span>
          <button onClick={() => printBill(successBill)} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg text-xs">
            <Printer size={12} /> Reprint
          </button>
          <button onClick={() => setSuccessBill(null)} className="ml-1 hover:text-white/70"><X size={14} /></button>
        </div>
      )}

      {/* DUPLICATE MODAL */}
      {duplicateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Already in cart</h3>
                <p className="text-sm text-slate-500">{duplicateModal.product.name}</p>
              </div>
            </div>
            <div className="space-y-2">
              <button onClick={handleDuplicateIncreaseQty} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium text-sm">
                + Increase qty (→ {cartItems[duplicateModal.existingIdx]?.quantity + 1})
              </button>
              <button onClick={handleDuplicateNewRow} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm">
                Add as new line
              </button>
              <button onClick={() => { setDuplicateModal(null); searchRef.current?.focus(); }} className="w-full py-2.5 text-slate-400 hover:text-slate-600 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}