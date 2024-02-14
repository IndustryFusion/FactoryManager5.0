
export interface Property {
    type: string;
    title: string;
    description: string;
    contentMediaType?: string;
    contentEncoding?: string;
    relationship: any;
    enum?:[]
  }
  
  export interface Schema {
    $schema:string;
    $id:string;
    type: string;
    title: string;
    description: string;
    properties: Record<string, Property>;
  }