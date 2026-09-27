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
import { categoryPattern, normalizeCategory } from './asset-category';

const matches = (asked: string, stored: string) =>
  new RegExp(categoryPattern(asked), 'i').test(stored);

describe('matching a relation slot to the assets that can fill it', () => {
  it('finds the air filter however its category is spelled', () => {
    // The case from the flow editor: the slot asks for "Air Filter", the
    // asset's category came from its type and reads "airFilter". Compared
    // literally, a factory full of air filters said "no products available".
    expect(matches('Air Filter', 'airFilter')).toBe(true);
    expect(matches('airFilter', 'Air Filter')).toBe(true);
    expect(matches('Air Filter', 'air_filter')).toBe(true);
    expect(matches('Air filter template', 'airFilter')).toBe(true);
  });

  it('does not match a different category', () => {
    expect(matches('Air Filter', 'laserCutter')).toBe(false);
    expect(matches('Air Filter', 'airFilterHousing')).toBe(false);
    expect(matches('Laser Cutter', 'laserCutter')).toBe(true);
  });

  it('reduces a category to what it says', () => {
    expect(normalizeCategory('Air Filter')).toBe('airfilter');
    expect(normalizeCategory('airFilter')).toBe('airfilter');
    expect(normalizeCategory('Laser Cutter template')).toBe('lasercutter');
    expect(normalizeCategory(undefined)).toBe('');
  });
});
