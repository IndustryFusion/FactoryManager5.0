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

/**
 * A product's category, from whatever a row actually holds.
 *
 * Products arrive from IFX, which stores an empty string field as the text
 * 'NULL'. This field is displayed — it is the line under a product's name on
 * the factory flow — so a product created without a category read as the word
 * "NULL" on the plan. IFX no longer writes it and its rows are being
 * repaired, but nothing here should depend on that: rows imported earlier,
 * and any that arrive from elsewhere, are cleaned on the way in and on the
 * way out.
 *
 * Absent, empty and 'NULL' all mean the same thing — no category — and the
 * type already says what kind of machine it is:
 *
 *   https://industry-fusion.org/base/v0.1/laserCutter  ->  laserCutter
 *
 * With no type either, the answer is an empty string. Nothing to show is
 * better than a word that means nothing to whoever is reading the plan.
 */
export const assetCategoryOf = (row: {
  asset_category?: unknown;
  type?: unknown;
}): string => {
  const given = typeof row?.asset_category === 'string' ? row.asset_category.trim() : '';
  if (given && given !== 'NULL') {
    return given;
  }
  const type = typeof row?.type === 'string' ? row.type.trim() : '';
  if (!type) return '';
  return type.split('/').filter(Boolean).pop() ?? '';
};

/** The same rule for an aggregation pipeline that projects the category. */
export const assetCategoryExpr = {
  $let: {
    vars: { given: { $ifNull: ['$asset_category', ''] } },
    in: {
      $cond: [
        { $in: ['$$given', ['', 'NULL']] },
        { $arrayElemAt: [{ $split: [{ $ifNull: ['$type', ''] }, '/'] }, -1] },
        '$$given',
      ],
    },
  },
};
