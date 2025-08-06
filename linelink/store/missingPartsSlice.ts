import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MissingPart {
  id: string;
  work_order: string;
  part_number: string;
  description: string;
  quantity_required: string;
  quantity_supplied: string;
  status: string;
}

interface MissingPartsState {
  parts: MissingPart[];
  loading: boolean;
  lastUpdated: string;
  error: string | null;
}

const initialState: MissingPartsState = {
  parts: [],
  loading: false,
  lastUpdated: '',
  error: null,
};

const missingPartsSlice = createSlice({
  name: 'missingParts',
  initialState,
  reducers: {
    fetchPartsStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchPartsSuccess(state, action: PayloadAction<MissingPart[]>) {
      state.parts = action.payload;
      state.loading = false;
      state.lastUpdated = new Date().toISOString();
    },
    fetchPartsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    dispatchPartStart(state, action: PayloadAction<string>) {
      state.loading = true;
      state.error = null;
    },
    dispatchPartSuccess(state, action: PayloadAction<string>) {
      const partId = action.payload;
      state.parts = state.parts.map(part => 
        part.id === partId 
          ? { ...part, status: 'Dispatched', quantity_supplied: part.quantity_required }
          : part
      );
      state.loading = false;
      state.lastUpdated = new Date().toISOString();
    },
    dispatchPartFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchPartsStart,
  fetchPartsSuccess,
  fetchPartsFailure,
  dispatchPartStart,
  dispatchPartSuccess,
  dispatchPartFailure,
} = missingPartsSlice.actions;

export default missingPartsSlice.reducer;
