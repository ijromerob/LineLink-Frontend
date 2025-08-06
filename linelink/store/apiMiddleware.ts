import { Middleware } from '@reduxjs/toolkit';
import { useApi } from '@/contexts/AuthContext';

const apiMiddleware: Middleware = (store) => (next) => (action) => {
  // Skip processing for non-function actions (regular actions)
  if (typeof action !== 'function') {
    return next(action);
  }

  // For thunk functions, provide the api instance as the third argument
  return action(store.dispatch, store.getState, { api: useApi() });
};

export default apiMiddleware;
