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
import { PgRestController } from './pgrest.controller';
import { PgRestService } from './pgrest.service';
import * as sessionService from '../session/token.service';
import { NotFoundException } from '@nestjs/common';

describe('FactoryManagerController', () => {
  let controller: PgRestController;
  let service: PgRestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PgRestController],
      providers: [PgRestService],
    }).compile();

    controller = module.get<PgRestController>(PgRestController);
    service = module.get<PgRestService>(PgRestService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service method with correct arguments', async () => {
    const mockToken = 'mocked-token';
    const attributeId = 'mocked-attribute-id';
    const entityId = 'mocked-entity-id';

    jest.spyOn(sessionService, 'getSessionToken').mockResolvedValue(mockToken);
    jest.spyOn(service, 'findAll').mockResolvedValue([]);

    await controller.findAll(attributeId, entityId, {} as any);

    expect(service.findAll).toHaveBeenCalledWith(mockToken, attributeId, entityId);
  });

  it('should throw NotFoundException when service method returns empty result', async () => {
    const mockToken = 'mocked-token';
    const attributeId = 'mocked-attribute-id';
    const entityId = 'mocked-entity-id';
  
    jest.spyOn(sessionService, 'getSessionToken').mockResolvedValue(mockToken);
    jest.spyOn(service, 'findAll').mockRejectedValue(new NotFoundException());
  
    await expect(controller.findAll(attributeId, entityId, {} as any)).rejects.toThrowError(NotFoundException);
  });

});
