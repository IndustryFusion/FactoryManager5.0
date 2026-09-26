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
import { assetCategoryOf } from './asset-category';

const LASER = 'https://industry-fusion.org/base/v0.1/laserCutter';

describe('assetCategoryOf', () => {
  it('keeps a real category', () => {
    expect(assetCategoryOf({ asset_category: 'Laser Cutter', type: LASER })).toBe('Laser Cutter');
  });

  it("derives one from the type when IFX stored the 'NULL' placeholder", () => {
    // The case from the factory flow: a product created without a category.
    expect(assetCategoryOf({ asset_category: 'NULL', type: LASER })).toBe('laserCutter');
  });

  it('treats absent, empty and whitespace the same as NULL', () => {
    expect(assetCategoryOf({ type: LASER })).toBe('laserCutter');
    expect(assetCategoryOf({ asset_category: '', type: LASER })).toBe('laserCutter');
    expect(assetCategoryOf({ asset_category: '   ', type: LASER })).toBe('laserCutter');
    expect(assetCategoryOf({ asset_category: null as any, type: LASER })).toBe('laserCutter');
  });

  it('shows nothing rather than a word that means nothing', () => {
    expect(assetCategoryOf({ asset_category: 'NULL' })).toBe('');
    expect(assetCategoryOf({})).toBe('');
    expect(assetCategoryOf({ asset_category: 'NULL', type: '' })).toBe('');
  });

  it('never mistakes a category that merely contains the word', () => {
    expect(assetCategoryOf({ asset_category: 'NULL sensor rig', type: LASER })).toBe('NULL sensor rig');
  });
});
