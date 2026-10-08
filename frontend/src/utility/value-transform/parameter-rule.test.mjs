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

// A parameter's settings in the form must become rules the gateway applies as
// the form reads. Run with `npm run test:transforms`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { conflictingValues, matchLabel, matchText, parseMatch, ruleFromSettings, settingsFromRule } from "./parameter-rule.ts";
import { createTransformer, ruleError } from "./engine.ts";

const P = "https://industry-fusion.org/base/v0.1/cutting_velocity";
const MS = "https://industry-fusion.org/base/v0.1/machine_state";
const send = (rule, raw, parameter = P) => createTransformer({ version: 1, rules: rule ? [rule] : [] }).convert(parameter, raw);
const settings = (over) => ({ pairs: [], otherwise: "raw", otherwiseValue: "", conversion: { kind: "none" }, onError: null, ...over });

test("reads what people type for a machine value", () => {
  assert.deepEqual(parseMatch(" 1 "), { eq: "1" });
  assert.deepEqual(parseMatch("Running"), { eq: "Running" });
  assert.deepEqual(parseMatch("3-9"), { min: 3, max: 9 });
  assert.deepEqual(parseMatch("9 – 3"), { min: 3, max: 9 });
  assert.deepEqual(parseMatch("-5"), { eq: "-5" });
  assert.deepEqual(parseMatch(">= 5"), { min: 5 });
  assert.deepEqual(parseMatch("≤3"), { max: 3 });
  assert.deepEqual(parseMatch("bit 4"), { bit: 4 });
  assert.equal(parseMatch("   "), undefined);
  for (const text of ["1", "Running", "3-9", ">=5", "<=3", "bit 4"]) assert.equal(matchText(parseMatch(text)), text);
  assert.equal(matchLabel({ min: 3, max: 9 }), "3–9");
});

test("nothing set means no rule: values go through as received", () => {
  assert.equal(ruleFromSettings(P, settings({})), undefined);
  assert.equal(ruleFromSettings(P, settings({ pairs: [{ from: "", to: "" }, { from: "1", to: "" }] })), undefined);
});

test("map then convert, as in the cutting velocity example", () => {
  const rule = ruleFromSettings(P, settings({
    pairs: [{ from: "0", to: "10" }],
    conversion: { kind: "unit", from: "m/s", to: "m/min", factor: 60, offset: 0, decimals: 3 },
  }));
  assert.equal(ruleError(rule), undefined);
  assert.equal(send(rule, 0), "600");
  assert.equal(send(rule, 2), "120");
});

test("only a conversion makes a conversion-only rule", () => {
  const rule = ruleFromSettings(P, settings({ conversion: { kind: "factor", factor: 2, offset: 1, decimals: 3 } }));
  assert.equal(rule.map, undefined);
  assert.equal(send(rule, 4), "9");
});

test("machine state codes, with exact codes before ranges", () => {
  const rule = ruleFromSettings(MS, settings({
    pairs: [{ from: "1-9", to: "1" }, { from: "1", to: "2" }, { from: "Run", to: "2" }, { from: "0", to: "0" }],
    otherwise: "value", otherwiseValue: "1", onError: "0",
  }));
  assert.equal(send(rule, 1, MS), "2");
  assert.equal(send(rule, "run", MS), "2");
  assert.equal(send(rule, 5, MS), "1");
  assert.equal(send(rule, 42, MS), "1");
  assert.equal(send(rule, null, MS), "0");
});

test("only 'when unreadable' still makes a rule that lets values through", () => {
  const rule = ruleFromSettings(P, settings({ onError: "0" }));
  assert.equal(ruleError(rule), undefined);
  assert.equal(send(rule, 7.5), "7.5");
  assert.equal(send(rule, null), "0");
});

test("other values can be ignored or replaced", () => {
  assert.equal(send(ruleFromSettings(P, settings({ otherwise: "drop" })), 3), null);
  assert.equal(send(ruleFromSettings(P, settings({ otherwise: "value", otherwiseValue: "n/a" })), 3), "n/a");
});

test("a rule reads back into the same settings", () => {
  const s = settings({
    pairs: [{ from: "0", to: "10" }, { from: "3-9", to: "5" }],
    otherwise: "value", otherwiseValue: "1",
    conversion: { kind: "unit", from: "m/s", to: "m/min", factor: 60, offset: 0, decimals: 3 },
    onError: "0",
  });
  assert.deepEqual(settingsFromRule(ruleFromSettings(P, s)), s);
  const legacy = settingsFromRule({ parameter: MS, map: { cases: [], fallback: { value: "2" } }, on_error: "0" });
  assert.deepEqual(legacy, settings({ otherwise: "value", otherwiseValue: "2", onError: "0" }));
});

test("a value listed twice with different meanings is flagged", () => {
  assert.deepEqual(conflictingValues([{ from: "1", to: "2" }, { from: "1.0", to: "1" }, { from: "3", to: "1" }, { from: "3", to: "1" }]), ["1.0"]);
});
