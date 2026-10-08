//
// Copyright (c) 2026 IB Systems GmbH
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
import { transformsProblem } from './transforms.validate';

const MS = 'https://industry-fusion.org/base/v0.1/machine_state';
const PW = 'https://industry-fusion.org/base/v0.1/power_consumption';
const withRules = (rules: unknown[], version: unknown = 1) => ({
  fusionopcuadataservice: { specification: [], transforms: { version, rules } },
});

describe('checking the value transforms of an onboarding app config', () => {
  it('accepts configs without transforms, as every existing onboarding has', () => {
    expect(transformsProblem(undefined)).toBeUndefined();
    expect(transformsProblem(null)).toBeUndefined();
    expect(transformsProblem('fusionopcuadataservice: {}')).toBeUndefined();
    expect(transformsProblem({ fusionopcuadataservice: { specification: [] } })).toBeUndefined();
    expect(transformsProblem({ fusionmqttdataservice: { specification: [] } })).toBeUndefined();
  });

  it('accepts the rules the onboarding form writes', () => {
    expect(transformsProblem(withRules([
      { parameter: MS, map: { cases: [{ eq: '1', out: '2' }, { min: 3, max: 9, out: '1' }, { bit: 4, out: '1' }], fallback: { value: '0' } }, on_error: '0' },
      { parameter: PW, linear: { factor: 1000, offset: 0, decimals: 3, from: 'kW', to: 'W' } },
      { parameter: 'https://example.org/legacy', map: { cases: [], fallback: { value: '2' } }, on_error: '0' },
    ]))).toBeUndefined();
  });

  it('checks the MQTT data service\'s rules too', () => {
    const mqtt = (rules: unknown[]) => ({ fusionmqttdataservice: { specification: [], transforms: { version: 1, rules } } });
    expect(transformsProblem(mqtt([{ parameter: MS, map: { cases: [{ eq: 'Running', out: '2' }] } }]))).toBeUndefined();
    expect(transformsProblem(mqtt([{ parameter: PW, linear: { factor: 'abc' } }]))).toMatch(/factor must be a number/);
  });

  it('rejects an unknown version', () => {
    expect(transformsProblem(withRules([], 2))).toMatch(/version/);
  });

  it('accepts a rule that maps and then converts', () => {
    expect(transformsProblem(withRules([{ parameter: PW, map: { cases: [{ eq: '0', out: '10' }], fallback: 'raw' }, linear: { factor: 60, offset: 0 } }]))).toBeUndefined();
  });

  it('rejects a rule that neither maps nor converts', () => {
    expect(transformsProblem(withRules([{ parameter: PW, on_error: '0' }]))).toMatch(/a map, a conversion or both/);
  });

  it('rejects a conversion factor that is not a number', () => {
    expect(transformsProblem(withRules([{ parameter: PW, linear: { factor: 'abc' } }]))).toMatch(/factor must be a number/);
  });

  it('rejects a case without an output', () => {
    expect(transformsProblem(withRules([{ parameter: MS, map: { cases: [{ eq: '1' }] } }]))).toMatch(/needs an "out" value/);
  });

  it('rejects a bit beyond what the gateway can test', () => {
    expect(transformsProblem(withRules([{ parameter: MS, map: { cases: [{ bit: 60, out: '1' }] } }]))).toMatch(/bit/);
  });

  it('rejects two rules for the same parameter', () => {
    expect(transformsProblem(withRules([
      { parameter: MS, map: { cases: [] } },
      { parameter: MS, map: { cases: [] } },
    ]))).toMatch(/two rules/);
  });

  it('agrees with the gateway on which shared rules are well formed', () => {
    // The data service's shared cases: those its engine treats as malformed
    // must be rejected here, every other rule set accepted.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { cases } = require('../../../../frontend/src/utility/value-transform/transform_cases.json');
    const malformed = new Set([
      'malformed rule drops its parameter',
      'malformed rule does not affect other rules',
      'rule with neither map nor linear is malformed',
      'case without out is malformed',
      'hex factor is malformed',
      'null cases is malformed',
      'unknown version drops the listed parameters',
      'unknown version leaves other parameters alone',
    ]);
    for (const c of cases) {
      if (c.transforms == null) continue;
      const problem = transformsProblem({ fusionopcuadataservice: { specification: [], transforms: c.transforms } });
      expect([c.name, problem !== undefined]).toEqual([c.name, malformed.has(c.name)]);
    }
  });
});
