import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchAssetManagement } from '@/utility/asset-utility';
import {setFactoryOwnerAssets} from "@/utility/asset"
import { fetchAllAllocatedAssets } from '@/utility/factory-site-utility';
import { getAccessGroup } from '@/utility/indexed-db';

export interface Asset {
  id: string;
  asset_serial_number: string;
  type: string;
  product_name: string;
  asset_manufacturer_name: string;
}
export interface AllocatedAssetData {
  factoryName: string;
  assets: string[];
}
interface AssetManagementState {
  assets: Asset[];
  loading: boolean;
  error: string | null;
  selectedAssets: Asset[];
  activeTabIndex: number;
  allocatedAssets: AllocatedAssetData[];
  allocatedAssetsLoading: boolean;
  allocatedAssetsError: string | null;
}

const initialState: AssetManagementState = {
  assets: [],
  loading: false,
  error: null,
  selectedAssets: [],
  activeTabIndex: 0,
  allocatedAssets: [],
  allocatedAssetsLoading: false,
  allocatedAssetsError: null,
};

export const fetchAssets = createAsyncThunk<Asset[], void, { rejectValue: string }>(
  'assetManagement/fetchAssets',
  async (_, { rejectWithValue }) => {
    try {
      const accessGroup = await getAccessGroup();
      if (!accessGroup?.company_ifric_id) {
        throw new Error('Company IFRIC ID not found');
      }
      await setFactoryOwnerAssets(accessGroup.company_ifric_id);
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

export const fetchAllocatedAssetsAsync = createAsyncThunk(
  'assetManagement/fetchAllocatedAssets',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchAllAllocatedAssets();
      
      if (response?.status === 404) {
        return rejectWithValue('Error fetching allocated assets');
      }

      let transformedArray: AllocatedAssetData[] = [];
      if (Object.keys(response).length > 0) {
        for (let factoryName in response) {
          transformedArray.push({
            factoryName: factoryName,
            assets: response[factoryName]
          });
        }
      }
      return transformedArray;
    } catch (error) {
      return rejectWithValue('Failed to fetch allocated assets');
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
      })

       // Allocated Assets Cases

      .addCase(fetchAllocatedAssetsAsync.pending, (state) => {
        state.allocatedAssetsLoading = true;
        state.allocatedAssetsError = null;
      })
      .addCase(fetchAllocatedAssetsAsync.fulfilled, (state, action) => {
        state.allocatedAssetsLoading = false;
        state.allocatedAssets = action.payload;
        state.allocatedAssetsError = null;
        state.isInitialized = true;
      })
      .addCase(fetchAllocatedAssetsAsync.rejected, (state, action) => {
        state.allocatedAssetsLoading = false;
        state.allocatedAssetsError = action.payload as string;
        state.allocatedAssets = [];
      });
  },
});

export const { setSelectedAssets, setActiveTabIndex } = assetManagementSlice.actions;

export default assetManagementSlice.reducer;