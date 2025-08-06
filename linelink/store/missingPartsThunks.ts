import { createAsyncThunk } from '@reduxjs/toolkit';
import { AppThunk, ThunkApiConfig } from '../store';
import { 
  fetchPartsStart, 
  fetchPartsSuccess, 
  fetchPartsFailure,
} from './missingPartsSlice';
import type { MissingPart } from './missingPartsSlice';

export const fetchMissingParts = createAsyncThunk<
  void,
  void,
  ThunkApiConfig
>('missingParts/fetchMissingParts', async (_, { dispatch, extra: { api } }) => {
  try {
    dispatch(fetchPartsStart());
    const response = await api.get("/parts/needed_parts");
    if (Array.isArray(response)) {
      const formattedParts = response.map((part: any) => ({
        ...part,
        id: `${part.work_order}-${part.part_number}`,
        status: part.quantity_supplied === "0" ? "Requested" : "Dispatched"
      }));
      dispatch(fetchPartsSuccess(formattedParts));
    }
  } catch (error) {
    console.error("Failed to fetch missing parts:", error);
    dispatch(fetchPartsFailure("Failed to fetch missing parts. Please try again later."));
    throw error;
  }
});

export const dispatchPart = createAsyncThunk<
  void,
  { id: string; part_number: string; quantity_required: string; work_order: string },
  ThunkApiConfig
>(
  'missingParts/dispatchPart',
  async ({ part_number, quantity_required, work_order }, { dispatch, extra: { api } }) => {
    try {
      await api.post("/warehouse/dispatch", {
        part_number,
        quantity_supplied: parseInt(quantity_required, 10),
        station_number: "1",
        work_order_id: work_order,
      });
      // The success case will be handled by the component
    } catch (error) {
      console.error("Failed to dispatch part:", error);
      throw error;
    }
  }
);

// Action creator for optimistic updates
export const updatePartStatus = (partId: string, status: string): AppThunk => 
  (dispatch, getState) => {
    const { missingParts } = getState();
    const updatedParts = missingParts.parts.map(part => 
      part.id === partId ? { ...part, status } : part
    );
    dispatch(fetchPartsSuccess(updatedParts));
  };
