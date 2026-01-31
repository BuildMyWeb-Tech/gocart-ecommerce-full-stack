import { configureStore, combineReducers } from '@reduxjs/toolkit';
import storage from 'redux-persist/lib/storage';
import { persistReducer, persistStore } from 'redux-persist';

import cartReducer from './features/cart/cartSlice';
import wishlistReducer from './features/wishlist/wishlistSlice';
import productReducer from './features/product/productSlice';
import addressReducer from './features/address/addressSlice';
import ratingReducer from './features/rating/ratingSlice';

const rootReducer = combineReducers({
    cart: cartReducer,
    wishlist: wishlistReducer,
    product: productReducer,
    address: addressReducer,
    rating: ratingReducer,
});

const persistConfig = {
    key: 'root',
    storage,
    whitelist: ['cart', 'wishlist'], // items to persist
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefault) =>
        getDefault({
            serializableCheck: false,
        }),
});

export const persistor = persistStore(store);