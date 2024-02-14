import { FactorySiteProps } from "./facorySiteProperties.dto";
export interface FactorySiteDescriptionDto  {
    type: string;
    title: string;
    description: string;
    properties: FactorySiteProps[];
}