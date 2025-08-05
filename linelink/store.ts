import { configureStore } from '@reduxjs/toolkit';
import partsRequestedReducer from './store/partsRequestedSlice';

const store = configureStore({
    reducer: {
        partsRequested: partsRequestedReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;