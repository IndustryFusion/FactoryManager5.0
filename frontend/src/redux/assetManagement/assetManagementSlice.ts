import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchAssetManagement } from '@/utility/asset-utility';

export interface Asset {
  id: string;
  asset_serial_number: string;
  type: string;
  product_name: string;
  asset_manufacturer_name: string;
}

interface AssetManagementState {
  assets: Asset[];
  loading: boolean;
  error: string | null;
  selectedAssets: Asset[];
  activeTabIndex: number;
}

const initialState: AssetManagementState = {
  assets: [],
  loading: false,
  error: null,
  selectedAssets: [],
  activeTabIndex: 0,
};

export const fetchAssets = createAsyncThunk<Asset[], void, { rejectValue: string }>(
  'assetManagement/fetchAssets',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchAssetManagement();
      if (!response || !Array.isArray(response)) {
        throw new Error('Invalid response from server');
      }
      return response as Asset[];
    } catch (error) {
      return rejectWithValue('Failed to fetch assets');
    }
  }
);

const assetManagementSlice = createSlice({
  name: 'assetManagement',
  initialState,
  reducers: {
    setSelectedAssets: (state, action: PayloadAction<Asset[]>) => {
      state.selectedAssets = action.payload;
    },
    setActiveTabIndex: (state, action: PayloadAction<number>) => {
      state.activeTabIndex = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssets.fulfilled, (state, action: PayloadAction<Asset[]>) => {
        state.assets = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchAssets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'An error occurred';
        state.assets = []; // Clear assets on error
      });
  },
});

export const { setSelectedAssets, setActiveTabIndex } = assetManagementSlice.actions;

export default assetManagementSlice.reducer;