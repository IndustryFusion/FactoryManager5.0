export interface Factory {
  factory_name?: string;
  street?: string;
  zip?: number | null;
  country?: string | null;
  thumbnail?: string | null;
  hasShopFloor?: {} | null;
  id?: string | undefined;
  $schema?: any;
  title?: any;
  $id?: any;
  [key: string]: any;
}

export interface FactoryFormProps {
  onSave?: (data: Factory) => void;
  initialData?: Factory;
  visibleProp:boolean,
  setVisibleProp: React.Dispatch<React.SetStateAction<boolean>>;
}
export interface FactoryDeletionProps {
  factories: Factory[];
  onDeleteFactory: (factory: Factory) => void;
}

export interface FactoryEditProps {
  factory: Factory;
  onSave: (editedData: Factory) => void;
}