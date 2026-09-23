//
// Copyright (c) 2024 IB Systems GmbH
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import axios from 'axios';
import { HttpException } from '@nestjs/common';
import { FactorySiteService } from './factory-site.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

/**
 * Factory identifiers now come from the IFRIC registry rather than a counter
 * entity in this Scorpio instance. Nothing covered the counter, so this is the
 * first test of how a factory gets its id.
 */

const COMPANY = 'urn:ifric:ifx-eur-com-nap-42ced491-b35d-41f7-9949-fcbb5fa4dcd9';
const MINTED = 'urn:ifric:ifx-eur-loc-fac-bd063b72-8748-461f-888d-3ea75058f205';
const CALLER = 'Bearer caller-token';

const payload = () =>
  ({
    type: 'https://industry-fusion.org/types/v0.1/factorySite',
    title: 'factory',
    description: 'a factory',
    properties: {
      factory_name: 'Plant 1',
      street: 'Main St 1',
      zip: '10115',
      country: 'Germany',
      thumbnail: '',
      hasShopFloor: '',
      // What the browser used to assert. It must be ignored.
      company_ifric_id: 'urn:ifric:some-other-company',
    },
  }) as any;

function service() {
  process.env.SCORPIO_URL = 'http://scorpio.test/entities';
  process.env.IFRIC_REGISTRY_BACKEND_URL = 'http://registry.test';
  return new FactorySiteService({} as any);
}

/** No factory of that name yet, then a successful Scorpio write. */
function happyScorpio() {
  mockedAxios.get.mockResolvedValue({ data: [] } as any);
  mockedAxios.post.mockImplementation(((url: string) =>
    url.includes('registry.test')
      ? Promise.resolve({ data: { status: 201, factory_id: MINTED } })
      : Promise.resolve({ status: 201, statusText: 'Created', data: {} })) as any);
}

describe('FactorySiteService.create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gives the factory the identifier the registry minted', async () => {
    happyScorpio();

    const result: any = await service().create(payload(), 'svc', CALLER, COMPANY);

    expect(result.id).toBe(MINTED);
    const scorpioWrite = mockedAxios.post.mock.calls.find(
      ([url]: any) => !String(url).includes('registry.test'),
    );
    expect(scorpioWrite![1]).toMatchObject({ id: MINTED });
  });

  it('registers the factory against the company from the session', async () => {
    happyScorpio();

    await service().create(payload(), 'svc', CALLER, COMPANY);

    const [url, body, config]: any = mockedAxios.post.mock.calls.find(
      ([u]: any) => String(u).includes('registry.test'),
    );
    expect(url).toContain('/company/factories');
    expect(body.owner_company_ifric_id).toBe(COMPANY);
    // Derived from the company, never from the request body.
    expect(body.owner_company_ifric_id).not.toBe('urn:ifric:some-other-company');
    expect(config.headers.Authorization).toBe(CALLER);
  });

  it('derives the identifier from a key, not from the factory name', async () => {
    happyScorpio();

    await service().create(payload(), 'svc', CALLER, COMPANY);

    const [, body]: any = mockedAxios.post.mock.calls.find(([u]: any) =>
      String(u).includes('registry.test'),
    );
    // A rename must not be able to change a factory's identity.
    expect(body.factory_key).toEqual(expect.any(String));
    expect(body.factory_key).not.toBe('Plant 1');
    expect(body.location_name).toBe('Plant 1');
  });

  it('overwrites the company the browser claimed', async () => {
    happyScorpio();

    await service().create(payload(), 'svc', CALLER, COMPANY);

    const scorpioWrite: any = mockedAxios.post.mock.calls.find(
      ([u]: any) => !String(u).includes('registry.test'),
    );
    const entity = scorpioWrite[1];
    const key = Object.keys(entity).find((k) => k.includes('company_ifric_id'));
    expect(entity[key!].value).toBe(COMPANY);
  });

  it('never reaches the old Scorpio counter entity', async () => {
    happyScorpio();

    await service().create(payload(), 'svc', CALLER, COMPANY);

    const touched = [
      ...mockedAxios.get.mock.calls,
      ...mockedAxios.post.mock.calls,
      ...mockedAxios.patch.mock.calls,
    ].map(([url]: any) => String(url));
    expect(touched.some((url) => url.includes('factory-id-store'))).toBe(false);
  });

  it('releases the registry record when the Scorpio write fails', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] } as any);
    mockedAxios.post.mockImplementation(((url: string) =>
      url.includes('registry.test')
        ? Promise.resolve({ data: { status: 201, factory_id: MINTED } })
        : Promise.reject(new Error('scorpio down'))) as any);
    mockedAxios.delete.mockResolvedValue({} as any);

    await expect(
      service().create(payload(), 'svc', CALLER, COMPANY),
    ).rejects.toThrow(HttpException);

    // Otherwise the registry holds a factory that exists nowhere else.
    expect(mockedAxios.delete).toHaveBeenCalledWith(
      expect.stringContaining('/company/factories/'),
      expect.anything(),
    );
  });

  it('refuses rather than falling back to a local id', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] } as any);
    // A registry that accepts the call but mints nothing.
    mockedAxios.post.mockResolvedValue({ data: { status: 201 } } as any);

    await expect(
      service().create(payload(), 'svc', CALLER, COMPANY),
    ).rejects.toThrow(HttpException);
  });

  it('still refuses a duplicate factory name before registering anything', async () => {
    mockedAxios.get.mockResolvedValue({ data: [{ id: 'existing' }] } as any);

    const result: any = await service().create(payload(), 'svc', CALLER, COMPANY);

    expect(result.status).toBe(409);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});
