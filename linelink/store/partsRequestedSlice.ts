import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type RequestedPart = {
    workOrderId: string;
    part: string;
    qty: number;
    status?: string;
};

interface PartsRequestedState {
    parts: RequestedPart[];
}

const initialState: PartsRequestedState = {
    parts: [],
};

const partsRequestedSlice = createSlice({
    name: 'partsRequested',
    initialState,
    reducers: {
        addPartRequest(state, action: PayloadAction<RequestedPart>) {
            state.parts.push(action.payload);
        },
        updatePartStatus(state, action: PayloadAction<{ workOrderId: string; part: string; status: string }>) {
            const part = state.parts.find(
                p => p.workOrderId === action.payload.workOrderId && p.part === action.payload.part
            );
            if (part) part.status = action.payload.status;
        },
        clearParts(state) {
            state.parts = [];
        },
    },
});

export const { addPartRequest, updatePartStatus, clearParts } = partsRequestedSlice.actions;
export default partsRequestedSlice.reducer;