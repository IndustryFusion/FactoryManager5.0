import { workCenterProps } from "./workCenterProperties.dto";
export interface workCenterDescriptionDto  {
    type: string;
    title: string;
    description: string;
    properties: workCenterProps[];
}