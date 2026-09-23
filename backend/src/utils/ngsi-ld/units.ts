// Unit symbols used by the IFX templates, mapped to UN/CEFACT Recommendation 20
// common codes, which is what NGSI-LD `unitCode` expects. A symbol missing here
// (e.g. "kgCO₂") has no UN/CEFACT code: the attribute keeps only its `unit`
// symbol and gets no `unitCode`, rather than an invented one.
const UNIT_CODES: Record<string, string> = {
  // electrical
  'W': 'WTT',
  'kW': 'KWT',
  'MW': 'MAW',
  'Wh': 'WHR',
  'kWh': 'KWH',
  'MWh': 'MWH',
  'A': 'AMP',
  'mA': '4K',
  'V': 'VLT',
  'kV': 'KVT',
  'mV': '2Z',
  'Hz': 'HTZ',
  'kHz': 'KHZ',
  'VA': 'D46',
  'kVA': 'KVA',
  // length, area, volume
  'mm': 'MMT',
  'cm': 'CMT',
  'm': 'MTR',
  'km': 'KMT',
  'µm': '4H',
  'm²': 'MTK',
  'm³': 'MTQ',
  'l': 'LTR',
  'L': 'LTR',
  'ml': 'MLT',
  // mass
  'kg': 'KGM',
  'g': 'GRM',
  'mg': 'MGM',
  't': 'TNE',
  // temperature
  '°C': 'CEL',
  '°F': 'FAH',
  'K': 'KEL',
  // pressure
  'bar': 'BAR',
  'Bar': 'BAR',
  'mbar': 'MBR',
  'Pa': 'PAL',
  'kPa': 'KPA',
  'MPa': 'MPA',
  // time, speed, rotation
  's': 'SEC',
  'ms': 'C26',
  'min': 'MIN',
  'h': 'HUR',
  'm/s': 'MTS',
  'mm/s': 'C16',
  'm/min': '2X',
  'rpm': 'RPM',
  'l/min': 'L2',
  'm³/h': 'MQH',
  // force, torque
  'N': 'NEW',
  'kN': 'B47',
  'Nm': 'NU',
  // ratios and counts
  '%': 'P1',
  'units': 'C62',
  'pcs': 'H87',
  'dB': '2N',
};

// The unit a template field uses. A list means "these are allowed", and the
// first entry is the default, since templates carry no separate default field.
export const defaultUnit = (unit: unknown): string | undefined => {
  const first = Array.isArray(unit) ? unit[0] : unit;
  return typeof first === 'string' && first !== '' && first !== 'null' ? first : undefined;
};

export const unitCodeFor = (symbol: string | undefined): string | undefined =>
  symbol === undefined ? undefined : UNIT_CODES[symbol];

// Reverse lookup, used only by fromNgsiLd when no `unit` symbol survived.
export const symbolForUnitCode = (code: string): string | undefined =>
  Object.keys(UNIT_CODES).find((symbol) => UNIT_CODES[symbol] === code);
