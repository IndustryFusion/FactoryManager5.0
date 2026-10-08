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

// The preview must give what the gateway sends. transform_cases.json is
// copied from fusionopcuadataservice/tests, where the same cases run against
// src/transform.py. Run with `npm run test:transforms` (Node 22.18 or later).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createTransformer } from "./engine.ts";

const { cases } = JSON.parse(readFileSync(new URL("./transform_cases.json", import.meta.url), "utf8"));
const SPECIAL = { nan: NaN, inf: Infinity, list: [1, 2] };
const decode = raw => (raw && typeof raw === "object" && "$special" in raw ? SPECIAL[raw.$special] : raw);

for (const c of cases) {
  test(c.name, () => {
    assert.equal(createTransformer(c.transforms).convert(c.parameter, decode(c.raw)), c.expected);
  });
}
