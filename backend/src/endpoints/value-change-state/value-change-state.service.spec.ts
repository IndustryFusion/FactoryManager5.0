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

import { Test, TestingModule } from '@nestjs/testing';
import { ValueChangeStateService } from './value-change-state.service';

describe('ValueChangeStateService', () => {
  let service: ValueChangeStateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValueChangeStateService],
    }).compile();

    service = module.get<ValueChangeStateService>(ValueChangeStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
