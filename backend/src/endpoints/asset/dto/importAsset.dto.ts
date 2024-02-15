import { IcsField } from "./../../types/template-fields";
export interface ImportAssetDto  {
    id: string;
    type: string;
    title: string;
    description: string;
    properties: IcsField[];
}