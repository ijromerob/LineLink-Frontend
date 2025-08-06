import { configureStore, Action, ThunkAction } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { useApi } from '@/contexts/AuthContext';
import partsRequestedReducer from './store/partsRequestedSlice';
import missingPartsReducer from './store/missingPartsSlice';

// Define the thunk API type
export interface ThunkApiConfig {
  state: RootState;
  dispatch: AppDispatch;
  extra: {
    api: ReturnType<typeof useApi>;
  };
}

// Create a function to create the store with the correct middleware
export const createStore = () => {
  const api = useApi();
  
  return configureStore({
    reducer: {
      partsRequested: partsRequestedReducer,
      missingParts: missingPartsReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: {
          extraArgument: { api },
        },
        serializableCheck: false,
      }),
  });
};

const store = createStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;