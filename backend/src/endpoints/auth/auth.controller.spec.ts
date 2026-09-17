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
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const authService = {
    logIn: jest.fn(),
    refreshSession: jest.fn(),
    generateToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('signs a user in through the registry flow', async () => {
    const loginResponse = { status: 200, data: { ifricdi: 'masked-access', ifricdr: 'masked-refresh' } };
    authService.logIn.mockResolvedValue(loginResponse);

    const credentials = { email: 'user@factory.test', password: 'secret', product_name: 'Factory Manager' };
    await expect(controller.userLogin(credentials)).resolves.toEqual(loginResponse);
    expect(authService.logIn).toHaveBeenCalledWith(credentials);
  });

  it('refreshes with the masked refresh token', async () => {
    authService.refreshSession.mockResolvedValue({ status: 200, data: { ifricdi: 'a', ifricdr: 'b' } });

    await controller.refreshSession('masked-refresh');
    expect(authService.refreshSession).toHaveBeenCalledWith('masked-refresh');
  });
});
