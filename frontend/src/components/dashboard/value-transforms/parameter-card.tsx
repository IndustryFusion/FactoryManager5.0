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

import { useState } from "react";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { SUPPORTED_VERSION, TransformRule, createTransformer, formatNumber, parseTyped } from "@/utility/value-transform/engine";
import { Target, isLegacyRule, propertyLabel } from "@/utility/value-transform/presets";
import {
  Conversion, DEFAULT_DECIMALS, Otherwise, Pair, ParameterSettings, casesOf, conflictingValues, matchLabel, parseMatch,
  ruleFromSettings, settingsFromRule,
} from "@/utility/value-transform/parameter-rule";
import { resolveConversion, unitsLike } from "@/utility/value-transform/units";
import { MACHINE_STATE_OPTIONS } from "@/utility/machine-state";

const NO_CONVERSION = "__none";
const FACTOR = "__factor";

const OTHERWISE_OPTIONS = [
  { label: "Send it as received", value: "raw" },
  { label: "Ignore it", value: "drop" },
  { label: "Send this value", value: "value" },
];

const STATE_LABEL: Record<string, string> = Object.fromEntries(MACHINE_STATE_OPTIONS.map(o => [o.value, o.label]));
const STATE_TONE: Record<string, string> = Object.fromEntries(MACHINE_STATE_OPTIONS.map(o => [o.value, o.tone]));

/** What a rule does, as short tags for the collapsed card. */
const summaryOf = (rule: TransformRule | undefined, target: Target): string[] => {
  if (!rule) return [];
  const s = settingsFromRule(rule);
  const tags: string[] = [];
  const n = casesOf(s.pairs).length;
  if (n) tags.push(`${n} ${n === 1 ? "value" : "values"} mapped`);
  if (s.otherwise === "drop") tags.push("others ignored");
  if (s.otherwise === "value") {
    tags.push(`others → ${target.kind === "state" ? STATE_LABEL[s.otherwiseValue] ?? s.otherwiseValue : s.otherwiseValue}`);
  }
  if (s.conversion.kind === "unit") tags.push(`${s.conversion.from} → ${s.conversion.to}`);
  if (s.conversion.kind === "factor") {
    const { factor, offset } = s.conversion;
    tags.push(`× ${formatNumber(factor)}${offset ? ` ${offset < 0 ? "−" : "+"} ${formatNumber(Math.abs(offset))}` : ""}`);
  }
  if (s.onError !== null) tags.push(`unreadable → ${target.kind === "state" ? STATE_LABEL[s.onError] ?? s.onError : s.onError}`);
  return tags;
};

/** A round sample whose converted value is easy to read (not 0.001 or 1e9). */
const sampleFor = (factor: number, offset: number) =>
  offset !== 0 ? 100 : [1, 10, 100, 1000, 10000].find(s => Math.abs(s * factor) >= 1) ?? 1;

interface ParameterCardProps {
  parameter: string;
  /** The OPC UA node(s) the value is read from. */
  source: string;
  target: Target;
  rule: TransformRule | undefined;
  onChange: (rule: TransformRule | undefined) => void;
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/**
 * One parameter and everything the gateway does to its values, in the order it
 * does it: map values, then convert the unit; plus what to send when the
 * machine cannot be read. Every parameter has the same options.
 */
const ParameterCard: React.FC<ParameterCardProps> = ({ parameter, source, target, rule, onChange, open, onToggle, disabled }) => {
  const isState = target.kind === "state";
  const twinUnit = target.kind === "unit" ? target.unit : undefined;
  const settings = settingsFromRule(rule);
  // Rows being typed, including ones not filled in yet; the rule keeps only complete ones
  const [draft, setDraft] = useState<Pair[]>(() => (settings.pairs.length ? settings.pairs : [{ from: "", to: "" }]));
  const [trial, setTrial] = useState("");

  const update = (next: Partial<ParameterSettings>) => onChange(ruleFromSettings(parameter, { ...settings, pairs: draft, ...next }));

  const setPairs = (pairs: Pair[]) => {
    setDraft(pairs);
    // "Running whenever readable" only stood in for the machine's real codes;
    // with the first code, an unknown value is better taken as Idle.
    const legacy = isState && isLegacyRule(rule) && casesOf(pairs).length > 0;
    onChange(ruleFromSettings(parameter, { ...settings, pairs, ...(legacy ? { otherwiseValue: "1" } : {}) }));
  };
  const setPair = (i: number, field: keyof Pair, value: string) => setPairs(draft.map((p, j) => (j === i ? { ...p, [field]: value } : p)));

  const conflicts = new Set(conflictingValues(draft));
  const tags = summaryOf(rule, target);
  const legacy = isLegacyRule(rule);

  // Conversion choices: the units this value can be measured in, or a factor
  const units = unitsLike(twinUnit).map(u => u.symbol).filter(u => u !== twinUnit);
  const conversionValue = settings.conversion.kind === "unit" && units.includes(settings.conversion.from)
    ? settings.conversion.from
    : settings.conversion.kind === "none" ? NO_CONVERSION : FACTOR;
  const conversionOptions = [
    { label: twinUnit ? `No conversion (sends ${twinUnit})` : "No conversion", value: NO_CONVERSION },
    ...units.map(u => ({ label: `Machine sends ${u}`, value: u })),
    { label: "Multiply by a factor", value: FACTOR },
  ];
  const decimals = settings.conversion.kind === "none" ? DEFAULT_DECIMALS : settings.conversion.decimals;
  const chooseConversion = (value: string) => {
    let conversion: Conversion = { kind: "none" };
    if (value === FACTOR) {
      const current = settings.conversion.kind === "none" ? { factor: 1, offset: 0 } : settings.conversion;
      conversion = { kind: "factor", factor: current.factor, offset: current.offset, decimals };
    } else if (value !== NO_CONVERSION && twinUnit) {
      const c = resolveConversion(value, twinUnit);
      if (c) conversion = { kind: "unit", from: value, to: twinUnit, ...c, decimals };
    }
    update({ conversion });
  };
  const setFactor = (key: "factor" | "offset", value: number | null | undefined) => {
    if (settings.conversion.kind === "none") return;
    const { factor, offset } = settings.conversion;
    update({ conversion: { kind: "factor", factor, offset, decimals, [key]: value ?? (key === "factor" ? 1 : 0) } });
  };

  let example: string | undefined;
  if (settings.conversion.kind !== "none") {
    const { factor, offset } = settings.conversion;
    const sample = sampleFor(factor, offset);
    const conversionOnly = ruleFromSettings(parameter, { ...settings, pairs: [], otherwise: "raw", onError: null });
    const out = createTransformer({ version: SUPPORTED_VERSION, rules: conversionOnly ? [conversionOnly] : [] }).convert(parameter, sample);
    const from = settings.conversion.kind === "unit" ? ` ${settings.conversion.from}` : "";
    example = `${formatNumber(sample)}${from} → ${out ?? "—"}${twinUnit ? ` ${twinUnit}` : ""}`;
  }

  const result = createTransformer({ version: SUPPORTED_VERSION, rules: rule ? [rule] : [] }).convert(parameter, parseTyped(trial));
  const outsideStates = isState
    ? casesOf(draft).map(c => c.out).concat(settings.otherwise === "value" ? [settings.otherwiseValue] : [])
        .filter(v => v !== "" && !STATE_LABEL[v])
    : [];

  return (
    <div className={`vt-card${open ? " is-open" : ""}${legacy ? " is-review" : ""}`}>
      <div className="vt-card-head" role="button" tabIndex={0} aria-expanded={open} onClick={onToggle}
        onKeyDown={e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onToggle())}>
        <div className="vt-prop">
          <strong title={parameter}>{propertyLabel(parameter)}</strong>
          <span className="vt-node" title={`OPC UA node ${source}`}>{source}</span>
        </div>
        <div className="vt-tags">
          {legacy && <span className="vt-tag is-review"><i className="pi pi-flag" /> As before</span>}
          {!legacy && tags.length === 0 && <span className="vt-tag is-plain">Sent as received</span>}
          {!legacy && tags.map(t => <span key={t} className="vt-tag">{t}</span>)}
        </div>
        <i className={`pi pi-chevron-${open ? "up" : "down"} vt-chevron`} />
      </div>

      {open && (
        <div className="vt-card-body">
          {legacy && (
            <div className="vt-note vt-note-warn">
              <i className="pi pi-flag" />
              <span>
                {isState
                  ? "Until now the gateway sent Running (2) whenever it could read this node. Map the machine's real codes below."
                  : "Until now the gateway sent 2 whenever it could read this node. Map the real values below, or set any other value to “Send it as received”."}
              </span>
            </div>
          )}

          <section className="vt-step">
            <div className="vt-step-head">
              <span className="vt-step-no">1</span>
              <div>
                <h6>Map values</h6>
                <p>
                  Replace values the machine sends. A range like <code>3-9</code>, <code>&gt;=5</code> or a bit like <code>bit 4</code> also works.
                  {isState && " The dashboard understands 0 = Offline, 1 = Idle, 2 = Running."}
                </p>
              </div>
            </div>
            <div className="vt-pairs">
              <div className="vt-pairs-head"><span>Machine sends</span><span /><span>Send instead</span></div>
              {draft.map((pair, i) => {
                const match = parseMatch(pair.from);
                const clash = !!match && conflicts.has(matchLabel(match));
                return (
                  <div key={i} className="vt-pair">
                    <InputText value={pair.from} placeholder="e.g. 0" aria-label="Machine sends" disabled={disabled}
                      className={clash ? "p-invalid" : ""} onChange={e => setPair(i, "from", e.target.value)} />
                    <i className="pi pi-arrow-right vt-arrow" />
                    {isState ? (
                      <Dropdown value={pair.to} editable options={MACHINE_STATE_OPTIONS.map(o => ({ label: `${o.value} · ${o.label}`, value: o.value }))}
                        placeholder="choose or type" aria-label="Send instead" disabled={disabled}
                        onChange={e => setPair(i, "to", String(e.value ?? ""))} className="vt-state-pick" />
                    ) : (
                      <InputText value={pair.to} placeholder="e.g. 10" aria-label="Send instead" disabled={disabled}
                        onChange={e => setPair(i, "to", e.target.value)} />
                    )}
                    <button type="button" className="vt-remove" aria-label="Remove this value" disabled={disabled}
                      onClick={() => setPairs(draft.length > 1 ? draft.filter((_, j) => j !== i) : [{ from: "", to: "" }])}>
                      <i className="pi pi-times" />
                    </button>
                  </div>
                );
              })}
              {conflicts.size > 0 && (
                <span className="vt-error">{Array.from(conflicts).join(", ")} is listed twice with different values</span>
              )}
              {outsideStates.length > 0 && (
                <span className="vt-warn">{outsideStates.join(", ")} is not a machine state; the dashboard counts it as Offline</span>
              )}
              <button type="button" className="vt-add" onClick={() => setDraft([...draft, { from: "", to: "" }])} disabled={disabled}>
                <i className="pi pi-plus" /> Add value
              </button>
              <div className="vt-options">
                <label className="vt-option">
                  Any other value
                  <Dropdown value={settings.otherwise} options={OTHERWISE_OPTIONS} disabled={disabled}
                    onChange={e => update({ otherwise: e.value as Otherwise, otherwiseValue: e.value === "value" ? settings.otherwiseValue : "" })} />
                </label>
                {settings.otherwise === "value" && (isState ? (
                  <Dropdown value={settings.otherwiseValue} editable options={MACHINE_STATE_OPTIONS.map(o => ({ label: `${o.value} · ${o.label}`, value: o.value }))}
                    aria-label="Value to send for any other value" disabled={disabled} className="vt-state-pick"
                    onChange={e => update({ otherwiseValue: String(e.value ?? "") })} />
                ) : (
                  <InputText value={settings.otherwiseValue} placeholder="value" aria-label="Value to send for any other value" disabled={disabled}
                    onChange={e => update({ otherwiseValue: e.target.value })} />
                ))}
              </div>
            </div>
          </section>

          <section className="vt-step">
            <div className="vt-step-head">
              <span className="vt-step-no">2</span>
              <div>
                <h6>Convert unit</h6>
                <p>Applied after mapping, to numbers.{twinUnit ? ` The digital twin keeps this value in ${twinUnit}.` : ""}</p>
              </div>
            </div>
            <div className="vt-options">
              <Dropdown value={conversionValue} options={conversionOptions} onChange={e => chooseConversion(e.value)}
                aria-label="Unit conversion" disabled={disabled} className="vt-conversion" />
              {settings.conversion.kind === "factor" && (
                <span className="vt-factor">
                  ×
                  <InputNumber value={settings.conversion.factor} onValueChange={e => setFactor("factor", e.value)} mode="decimal"
                    useGrouping={false} maxFractionDigits={10} inputClassName="vt-num" aria-label="Multiply by" disabled={disabled} />
                  +
                  <InputNumber value={settings.conversion.offset} onValueChange={e => setFactor("offset", e.value)} mode="decimal"
                    useGrouping={false} maxFractionDigits={10} inputClassName="vt-num" aria-label="Then add" disabled={disabled} />
                </span>
              )}
              {example && <span className="vt-example">{example}</span>}
            </div>
          </section>

          <section className="vt-step vt-step-plain">
            <div className="vt-options">
              <label className="vt-option">
                When the machine can&apos;t be read
                <Dropdown value={settings.onError === null ? "none" : "value"} disabled={disabled}
                  options={[{ label: "Send nothing", value: "none" }, { label: isState ? "Send Offline (0)" : "Send a value", value: "value" }]}
                  onChange={e => update({ onError: e.value === "none" ? null : isState ? "0" : settings.onError ?? "" })} />
              </label>
              {settings.onError !== null && !isState && (
                <InputText value={settings.onError} placeholder="value" aria-label="Value to send when the machine can't be read" disabled={disabled}
                  onChange={e => update({ onError: e.target.value })} />
              )}
            </div>
          </section>

          <div className="vt-try">
            <span><strong>Try it:</strong> the machine sends</span>
            <InputText value={trial} onChange={e => setTrial(e.target.value)} placeholder="e.g. 0" aria-label="Value the machine sends" />
            <i className="pi pi-arrow-right vt-arrow" />
            {result === null ? (
              <span className="vt-result">nothing is sent</span>
            ) : isState && STATE_TONE[result] ? (
              <span className={`vt-result vt-tone-${STATE_TONE[result]}`}><span className="vt-dot" />{result} · {STATE_LABEL[result]}</span>
            ) : (
              <span className="vt-result is-value">{result}{twinUnit ? ` ${twinUnit}` : ""}</span>
            )}
            {trial.trim() === "" && <span className="vt-why">empty means the machine could not be read</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ParameterCard;
