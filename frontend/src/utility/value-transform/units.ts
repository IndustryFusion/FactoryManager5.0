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

// Units a machine may send, grouped by what they measure, each with how to
// reach the group's base unit: base = value × factor + offset. The symbols are
// the ones the templates use (backend/src/utils/ngsi-ld/units.ts), and `code`
// is the UN/CEFACT unitCode Scorpio stores next to them.

export interface UnitDef {
  symbol: string;
  code?: string;
  factor: number;
  offset?: number;
}

export interface Dimension {
  name: string;
  units: UnitDef[];
}

export const DIMENSIONS: Dimension[] = [
  { name: "Power", units: [
    { symbol: "W", code: "WTT", factor: 1 }, { symbol: "kW", code: "KWT", factor: 1e3 }, { symbol: "MW", code: "MAW", factor: 1e6 },
  ] },
  { name: "Energy", units: [
    { symbol: "Wh", code: "WHR", factor: 1 }, { symbol: "kWh", code: "KWH", factor: 1e3 }, { symbol: "MWh", code: "MWH", factor: 1e6 },
  ] },
  { name: "Apparent power", units: [
    { symbol: "VA", code: "D46", factor: 1 }, { symbol: "kVA", code: "KVA", factor: 1e3 },
  ] },
  { name: "Current", units: [
    { symbol: "A", code: "AMP", factor: 1 }, { symbol: "mA", code: "4K", factor: 1e-3 },
  ] },
  { name: "Voltage", units: [
    { symbol: "V", code: "VLT", factor: 1 }, { symbol: "kV", code: "KVT", factor: 1e3 }, { symbol: "mV", code: "2Z", factor: 1e-3 },
  ] },
  { name: "Frequency", units: [
    { symbol: "Hz", code: "HTZ", factor: 1 }, { symbol: "kHz", code: "KHZ", factor: 1e3 }, { symbol: "rpm", code: "RPM", factor: 1 / 60 },
  ] },
  { name: "Length", units: [
    { symbol: "µm", code: "4H", factor: 1e-6 }, { symbol: "mm", code: "MMT", factor: 1e-3 }, { symbol: "cm", code: "CMT", factor: 1e-2 },
    { symbol: "m", code: "MTR", factor: 1 }, { symbol: "km", code: "KMT", factor: 1e3 },
  ] },
  { name: "Volume", units: [
    { symbol: "ml", code: "MLT", factor: 1e-3 }, { symbol: "l", code: "LTR", factor: 1 }, { symbol: "L", code: "LTR", factor: 1 },
    { symbol: "m³", code: "MTQ", factor: 1e3 },
  ] },
  { name: "Mass", units: [
    { symbol: "mg", code: "MGM", factor: 1e-6 }, { symbol: "g", code: "GRM", factor: 1e-3 }, { symbol: "kg", code: "KGM", factor: 1 },
    { symbol: "t", code: "TNE", factor: 1e3 },
  ] },
  { name: "Temperature", units: [
    { symbol: "°C", code: "CEL", factor: 1 },
    { symbol: "K", code: "KEL", factor: 1, offset: -273.15 },
    { symbol: "°F", code: "FAH", factor: 5 / 9, offset: -160 / 9 },
  ] },
  { name: "Pressure", units: [
    { symbol: "Pa", code: "PAL", factor: 1 }, { symbol: "kPa", code: "KPA", factor: 1e3 }, { symbol: "MPa", code: "MPA", factor: 1e6 },
    { symbol: "mbar", code: "MBR", factor: 1e2 }, { symbol: "bar", code: "BAR", factor: 1e5 }, { symbol: "Bar", code: "BAR", factor: 1e5 },
  ] },
  { name: "Time", units: [
    { symbol: "ms", code: "C26", factor: 1e-3 }, { symbol: "s", code: "SEC", factor: 1 }, { symbol: "min", code: "MIN", factor: 60 },
    { symbol: "h", code: "HUR", factor: 3600 },
  ] },
  { name: "Speed", units: [
    { symbol: "mm/s", code: "C16", factor: 1e-3 }, { symbol: "m/s", code: "MTS", factor: 1 }, { symbol: "m/min", code: "2X", factor: 1 / 60 },
  ] },
  { name: "Flow", units: [
    { symbol: "l/min", code: "L2", factor: 1 }, { symbol: "m³/h", code: "MQH", factor: 1000 / 60 },
  ] },
  { name: "Force", units: [
    { symbol: "N", code: "NEW", factor: 1 }, { symbol: "kN", code: "B47", factor: 1e3 },
  ] },
];

interface Located {
  dimension: Dimension;
  unit: UnitDef;
}

/**
 * Find a unit by symbol or unitCode. An exact symbol wins; otherwise a
 * case-insensitive match counts only when it is unambiguous ("KW" is kW, but
 * "mw" could be mW or MW and is not guessed).
 */
export const findUnit = (symbolOrCode: string | undefined): Located | undefined => {
  if (!symbolOrCode) return undefined;
  const all = DIMENSIONS.flatMap(dimension => dimension.units.map(unit => ({ dimension, unit })));
  const exact = all.find(({ unit }) => unit.symbol === symbolOrCode || unit.code === symbolOrCode);
  if (exact) return exact;
  const lower = symbolOrCode.toLowerCase();
  const loose = all.filter(({ unit }) => unit.symbol.toLowerCase() === lower);
  const dims = new Set(loose.map(l => l.dimension.name));
  return dims.size === 1 && new Set(loose.map(l => l.unit.factor)).size === 1 ? loose[0] : undefined;
};

/** The units a value measured like `target` may arrive in, `target` included. */
export const unitsLike = (target: string | undefined): UnitDef[] =>
  findUnit(target)?.dimension.units.filter((u, i, all) => all.findIndex(o => o.symbol === u.symbol) === i) ?? [];

/** factor and offset taking a value in `from` to `to`, or undefined when they measure different things. */
export const resolveConversion = (from: string, to: string): { factor: number; offset: number } | undefined => {
  const a = findUnit(from);
  const b = findUnit(to);
  if (!a || !b || a.dimension !== b.dimension) return undefined;
  const aOffset = a.unit.offset ?? 0;
  const bOffset = b.unit.offset ?? 0;
  return { factor: a.unit.factor / b.unit.factor, offset: (aOffset - bOffset) / b.unit.factor };
};
