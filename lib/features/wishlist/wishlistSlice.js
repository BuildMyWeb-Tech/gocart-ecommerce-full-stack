// lib/features/wishlist/wishlistSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// ── Async: Fetch wishlist from DB ─────────────────────────────────
export const fetchWishlistThunk = createAsyncThunk(
  'wishlist/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/wishlist', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch wishlist');
      return await res.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// ── Async: Toggle wishlist item ───────────────────────────────────
export const toggleWishlistThunk = createAsyncThunk(
  'wishlist/toggle',
  async ({ productId }, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error('Failed to update wishlist');
      return await res.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: {
    items: [],     // array of { productId, product: {...} }
    loading: false,
    error: null,
  },
  reducers: {
    // Optimistic local toggle (before API confirms)
    addToWishlist: (state, action) => {
      const product = action.payload;
      const exists = state.items.find((item) => item.productId === product.id);
      if (!exists) {
        state.items.push({ productId: product.id, product });
      }
    },
    removeFromWishlist: (state, action) => {
      const productId = action.payload;
      state.items = state.items.filter((item) => item.productId !== productId);
    },
    clearWishlist: (state) => {
      state.items = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlistThunk.pending, (state) => { state.loading = true; })
      .addCase(fetchWishlistThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items   = action.payload.items || [];
      })
      .addCase(fetchWishlistThunk.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })
      .addCase(toggleWishlistThunk.fulfilled, (state, action) => {
        const { items } = action.payload;
        if (items !== undefined) state.items = items;
      });
  },
});

export const { addToWishlist, removeFromWishlist, clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;