// lib/features/cart/cartSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    items: [],
    totalPrice: 0,
    total: 0
};

export const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        addToCart: (state, action) => {
            const { product } = action.payload;
            const existingItem = state.items.find(item => item.id === product.id);

            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                state.items.push({...product, quantity: 1 });
            }

            state.totalPrice = state.items.reduce(
                (total, item) => total + item.price * item.quantity, 0
            );
            state.total = state.items.length;
        },
        removeFromCart: (state, action) => {
            const productId = action.payload;
            state.items = state.items.filter(item => item.id !== productId);

            state.totalPrice = state.items.reduce(
                (total, item) => total + item.price * item.quantity, 0
            );
            state.total = state.items.length;
        },
        updateCartQuantity: (state, action) => {
            const { id, quantity } = action.payload;
            const item = state.items.find(item => item.id === id);

            if (item) {
                item.quantity = quantity;
            }

            state.totalPrice = state.items.reduce(
                (total, item) => total + item.price * item.quantity, 0
            );
        },
        clearCart: (state) => {
            state.items = [];
            state.totalPrice = 0;
            state.total = 0;
        }
    }
});

export const { addToCart, removeFromCart, updateCartQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;