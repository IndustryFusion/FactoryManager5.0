// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

export interface Factory {
  factory_name?: string | undefined ;
  street?: string;
  zip?: number | string;
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
