export interface Datasets {
  label: string;
  data: any;
  fill: boolean;
  backgroundColor: string;
  borderColor: string;
  tension: number;
}

export interface pgData {
  observedAt: string;
  attributeId: string;
  value: string;
}

export interface DataCache {
  [key: string]: {
    newDataset: Datasets;
    labels: string[];
  };
}
