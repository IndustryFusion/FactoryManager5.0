// 
// Copyright (c) 2024 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

import { useEffect, useRef, useState } from "react";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { parseSpecYaml, specToYaml } from "@/utility/spec-yaml";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OpcUaSpec {
  node_id: string;
  identifier: string;
  parameter: string;
}

export interface MqttSpec {
  topic: string;
  /**
   * Empty: the whole message is the value of the first parameter. Otherwise
   * the message is JSON, and each key (a path, levels separated by commas,
   * e.g. "params,em:0,a_current") fills the parameter at the same position.
   */
  key: string[];
  parameter: string[];
}

export type SpecItem = OpcUaSpec | MqttSpec;

interface SpecEditorProps {
  /** Determines the field shape shown in the editor */
  protocol: "opc-ua" | "mqtt";
  /** Current list of spec items (controlled) */
  items: SpecItem[];
  /** Called whenever items change (add / edit / delete) */
  onChange: (items: SpecItem[]) => void;
  /** Highlights the outer border in error red */
  hasError?: boolean;
  /** Told whether the YAML being typed can be read; the mappings keep their last good state until it can. */
  onValidityChange?: (valid: boolean) => void;
}

type EditorMode = "form" | "yaml";

// The mode last chosen, so leaving the step and coming back keeps it.
let lastMode: EditorMode = "form";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const emptyOpcUa = (): OpcUaSpec => ({ node_id: "", identifier: "", parameter: "" });
const emptyMqtt = (): MqttSpec => ({ topic: "", key: [], parameter: [""] });

/** Returns the last path segment of an IRI, or the full string if no slash */
const shortLabel = (iri: string) => iri.split("/").pop() ?? iri;

// ─── Component ───────────────────────────────────────────────────────────────

const SpecEditor: React.FC<SpecEditorProps> = ({ protocol, items, onChange, hasError, onValidityChange }) => {
  // editingIndex: null = no row open, -1 = new-row form at bottom, ≥0 = editing that row
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<OpcUaSpec | MqttSpec>(
    protocol === "opc-ua" ? emptyOpcUa() : emptyMqtt()
  );
  const [draftErrors, setDraftErrors] = useState<Record<string, boolean>>({});

  const isEditing = editingIndex !== null;

  // ── YAML mode: the same mappings as text, kept in step with the form ─────
  const [mode, setModeState] = useState<EditorMode>(lastMode);
  const [yamlText, setYamlText] = useState(() => (lastMode === "yaml" ? specToYaml(protocol, items) : ""));
  const [yamlError, setYamlError] = useState<{ message: string; line?: number } | null>(null);
  const [yamlNote, setYamlNote] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);
  // The mappings the text currently stands for
  const synced = useRef(JSON.stringify(items));

  const resetYaml = (next: SpecItem[]) => {
    synced.current = JSON.stringify(next);
    setYamlText(specToYaml(protocol, next));
    setYamlError(null);
    setYamlNote(undefined);
    onValidityChange?.(true);
  };

  // A step left with broken YAML comes back showing the mappings it kept.
  useEffect(() => {
    onValidityChange?.(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mappings changed from outside (the asset's prefill, the value transforms
  // step) rewrite the text; mappings changed by typing here do not.
  useEffect(() => {
    if (mode === "yaml" && JSON.stringify(items) !== synced.current) resetYaml(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, mode, protocol]);

  const setMode = (next: EditorMode) => {
    if (next === mode || (next === "form" && yamlError) || isEditing) return;
    if (next === "yaml") resetYaml(items);
    lastMode = next;
    setModeState(next);
  };

  const onYamlChange = (value: string) => {
    setYamlText(value);
    setCopied(false);
    const result = parseSpecYaml(protocol, value);
    if ("error" in result) {
      setYamlError({ message: result.error, line: result.line });
      onValidityChange?.(false);
      return;
    }
    setYamlError(null);
    setYamlNote(result.note);
    onValidityChange?.(true);
    synced.current = JSON.stringify(result.items);
    onChange(result.items);
  };

  const copyYaml = async () => {
    try {
      await navigator.clipboard.writeText(yamlText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  // ── Draft field setters ──────────────────────────────────────────────────
  const setOpcField = (field: keyof OpcUaSpec, value: string) => {
    setDraft(d => ({ ...(d as OpcUaSpec), [field]: value }));
    setDraftErrors(prev => ({ ...prev, [field]: false }));
  };

  const setMqttTopic = (value: string) => {
    setDraft(d => ({ ...(d as MqttSpec), topic: value }));
    setDraftErrors(prev => ({ ...prev, topic: false }));
  };

  // MQTT rows: the JSON field and the parameter it fills, kept the same length
  const updateParam = (idx: number, value: string) => {
    setDraft(d => {
      const params = [...(d as MqttSpec).parameter];
      params[idx] = value;
      return { ...(d as MqttSpec), parameter: params };
    });
    setDraftErrors(prev => ({ ...prev, parameter: false }));
  };

  const updateKey = (idx: number, value: string) => {
    setDraft(d => {
      const keys = [...(d as MqttSpec).key];
      keys[idx] = value;
      return { ...(d as MqttSpec), key: keys };
    });
    setDraftErrors(prev => ({ ...prev, parameter: false }));
  };

  const addParam = () =>
    setDraft(d => ({ ...(d as MqttSpec), key: [...(d as MqttSpec).key, ""], parameter: [...(d as MqttSpec).parameter, ""] }));

  const removeParam = (idx: number) =>
    setDraft(d => ({
      ...(d as MqttSpec),
      key: (d as MqttSpec).key.filter((_, i) => i !== idx),
      parameter: (d as MqttSpec).parameter.filter((_, i) => i !== idx),
    }));

  // Whether the MQTT mapping being edited reads JSON fields (keys) or takes the whole message
  const [jsonFields, setJsonFields] = useState(false);

  // ── Actions ──────────────────────────────────────────────────────────────
  const startAdd = () => {
    setDraft(protocol === "opc-ua" ? emptyOpcUa() : emptyMqtt());
    setJsonFields(false);
    setDraftErrors({});
    setEditingIndex(-1);
  };

  const startEdit = (idx: number) => {
    const item = items[idx];
    if (protocol === "opc-ua") {
      setDraft({ ...(item as OpcUaSpec) });
    } else {
      const mqtt = item as MqttSpec;
      const keys = Array.isArray(mqtt.key) ? mqtt.key : [];
      const params = mqtt.parameter.length ? [...mqtt.parameter] : [""];
      setDraft({ ...mqtt, parameter: params, key: params.map((_, i) => keys[i] ?? "") });
      setJsonFields(keys.length > 0);
    }
    setDraftErrors({});
    setEditingIndex(idx);
  };

  const cancel = () => setEditingIndex(null);

  const validate = (): boolean => {
    const errs: Record<string, boolean> = {};
    if (protocol === "opc-ua") {
      const d = draft as OpcUaSpec;
      if (!d.node_id.trim()) errs.node_id = true;
      if (!d.identifier.trim()) errs.identifier = true;
      if (!d.parameter.trim()) errs.parameter = true;
    } else {
      const d = draft as MqttSpec;
      if (!d.topic.trim()) errs.topic = true;
      if (jsonFields) {
        // Every row needs both its field and its parameter, and there must be one
        const rows = d.parameter.map((p, i) => [d.key[i] ?? "", p].map(v => v.trim()));
        const filled = rows.filter(([k, p]) => k || p);
        if (filled.length === 0 || filled.some(([k, p]) => !k || !p)) errs.parameter = true;
      } else if (!(d.parameter[0] ?? "").trim()) {
        errs.parameter = true;
      }
    }
    setDraftErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveDraft = () => {
    if (!validate()) return;

    let item: SpecItem = draft;
    if (protocol === "mqtt") {
      const d = draft as MqttSpec;
      if (jsonFields) {
        const rows = d.parameter
          .map((p, i) => ({ key: (d.key[i] ?? "").trim(), parameter: p.trim() }))
          .filter(r => r.key && r.parameter);
        item = { ...d, topic: d.topic.trim(), key: rows.map(r => r.key), parameter: rows.map(r => r.parameter) };
      } else {
        // The whole message is one value, so it fills one parameter
        item = { ...d, topic: d.topic.trim(), key: [], parameter: [d.parameter[0].trim()] };
      }
    }

    const newItems =
      editingIndex === -1
        ? [...items, item]
        : items.map((it, i) => (i === editingIndex ? item : it));

    onChange(newItems);
    setEditingIndex(null);
  };

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  // ── Edit form (shared between existing-row edit and new-row add) ──────────
  const renderEditForm = (autoFocus = false) => (
    <div className="spec-card-edit-form">
      {protocol === "opc-ua" ? (
        <>
          <div className="spec-edit-row">
            <div className="spec-edit-field">
              <label className="spec-edit-label">
                Node ID <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <InputText
                value={(draft as OpcUaSpec).node_id}
                onChange={e => setOpcField("node_id", e.target.value)}
                placeholder="e.g. ns=4"
                className={`w-full${draftErrors.node_id ? " p-invalid" : ""}`}
                autoFocus={autoFocus}
              />
              {draftErrors.node_id && <small className="p-error">Required</small>}
            </div>
            <div className="spec-edit-field">
              <label className="spec-edit-label">
                Identifier <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <InputText
                value={(draft as OpcUaSpec).identifier}
                onChange={e => setOpcField("identifier", e.target.value)}
                placeholder="e.g. i=39"
                className={`w-full${draftErrors.identifier ? " p-invalid" : ""}`}
              />
              {draftErrors.identifier && <small className="p-error">Required</small>}
            </div>
          </div>
          <div className="spec-edit-field spec-edit-field-full">
            <label className="spec-edit-label">
              Parameter IRI <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <InputText
              value={(draft as OpcUaSpec).parameter}
              onChange={e => setOpcField("parameter", e.target.value)}
              placeholder="https://industry-fusion.org/base/v0.1/machine_state"
              className={`w-full${draftErrors.parameter ? " p-invalid" : ""}`}
            />
            {draftErrors.parameter && <small className="p-error">Required</small>}
          </div>
        </>
      ) : (
        <>
          <div className="spec-edit-field spec-edit-field-full">
            <label className="spec-edit-label">
              Topic <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <InputText
              value={(draft as MqttSpec).topic}
              onChange={e => setMqttTopic(e.target.value)}
              placeholder="e.g. airtracker-74145/relay1"
              className={`w-full${draftErrors.topic ? " p-invalid" : ""}`}
              autoFocus={autoFocus}
            />
            {draftErrors.topic && <small className="p-error">Required</small>}
          </div>
          <div className="spec-edit-field spec-edit-field-full">
            <label className="spec-edit-label">The message</label>
            <div className="spec-payload-toggle" role="group" aria-label="What the message holds">
              <button type="button" className={!jsonFields ? "is-active" : ""} onClick={() => setJsonFields(false)}>
                Is the value itself
              </button>
              <button type="button" className={jsonFields ? "is-active" : ""} onClick={() => setJsonFields(true)}>
                Is JSON: read fields
              </button>
            </div>
          </div>

          {!jsonFields ? (
            <div className="spec-edit-field spec-edit-field-full">
              <label className="spec-edit-label">
                Parameter (IRI) <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <InputText
                value={(draft as MqttSpec).parameter[0] ?? ""}
                onChange={e => updateParam(0, e.target.value)}
                placeholder="https://industry-fusion.org/base/v0.1/..."
                className={`w-full${draftErrors.parameter ? " p-invalid" : ""}`}
              />
              {draftErrors.parameter && <small className="p-error">Required</small>}
              {(draft as MqttSpec).parameter.filter(p => p.trim()).length > 1 && (
                <small className="spec-edit-hint">
                  Only the first parameter is kept: a message that is a single value fills one parameter.
                  To fill several, choose &ldquo;Is JSON: read fields&rdquo;.
                </small>
              )}
            </div>
          ) : (
            <div className="spec-edit-field spec-edit-field-full">
              <div className="spec-json-head">
                <span>JSON field <span style={{ color: "#ef4444" }}>*</span></span>
                <span />
                <span>Parameter (IRI) <span style={{ color: "#ef4444" }}>*</span></span>
              </div>
              {(draft as MqttSpec).parameter.map((p, pi) => (
                <div key={pi} className="spec-json-row">
                  <InputText
                    value={(draft as MqttSpec).key[pi] ?? ""}
                    onChange={e => updateKey(pi, e.target.value)}
                    placeholder="e.g. temp or params,em:0,a_current"
                    className={draftErrors.parameter && !((draft as MqttSpec).key[pi] ?? "").trim() ? "p-invalid" : ""}
                  />
                  <i className="pi pi-arrow-right spec-json-arrow" />
                  <InputText
                    value={p}
                    onChange={e => updateParam(pi, e.target.value)}
                    placeholder="https://industry-fusion.org/base/v0.1/..."
                    className={draftErrors.parameter && !p.trim() ? "p-invalid" : ""}
                  />
                  <button type="button" className="spec-remove-param-btn" onClick={() => removeParam(pi)}
                    disabled={(draft as MqttSpec).parameter.length === 1} aria-label="Remove this field">
                    <i className="pi pi-minus" />
                  </button>
                </div>
              ))}
              {draftErrors.parameter && <small className="p-error">Every row needs a JSON field and a parameter</small>}
              <small className="spec-edit-hint">
                Separate nested levels with commas: <code>params,em:0,a_current</code> reads
                {" "}<code>{"{\"params\": {\"em:0\": {\"a_current\": …}}}"}</code>. A message without the field sends nothing for it.
              </small>
              <button type="button" className="spec-add-param-btn" onClick={addParam}>
                <i className="pi pi-plus" /> Add field
              </button>
            </div>
          )}
        </>
      )}

      <div className="spec-edit-actions">
        <button type="button" className="spec-cancel-btn" onClick={cancel}>
          <i className="pi pi-times" /> Cancel
        </button>
        <button type="button" className="spec-save-btn" onClick={saveDraft}>
          <i className="pi pi-check" /> Save Mapping
        </button>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`spec-editor${hasError ? " spec-editor-error" : ""}`}>

      {/* Header: count + Add button */}
      <div className="spec-editor-header">
        <div className="spec-header-left">
          <span className={`spec-protocol-badge spec-protocol-${protocol}`}>
            {protocol === "opc-ua" ? "OPC-UA" : "MQTT"}
          </span>
          <span className="spec-count">
            {items.length} {items.length === 1 ? "mapping" : "mappings"}
          </span>
        </div>
        <div className="spec-header-right">
          <div className="spec-mode-toggle" role="group" aria-label="Edit mappings as">
            <button
              type="button"
              className={mode === "form" ? "is-active" : ""}
              onClick={() => setMode("form")}
              disabled={!!yamlError}
              title={yamlError ? "Fix the YAML first, or undo the changes" : "Edit one mapping at a time"}
            >
              <i className="pi pi-list" /> Form
            </button>
            <button
              type="button"
              className={mode === "yaml" ? "is-active" : ""}
              onClick={() => setMode("yaml")}
              disabled={isEditing}
              title={isEditing ? "Save or cancel the open mapping first" : "Paste or edit all mappings as YAML"}
            >
              <i className="pi pi-code" /> YAML
            </button>
          </div>
          {mode === "form" && (
            <button
              type="button"
              className="spec-add-btn"
              onClick={startAdd}
              disabled={isEditing}
            >
              <i className="pi pi-plus" /> Add Mapping
            </button>
          )}
        </div>
      </div>

      {mode === "yaml" && (
        <div className="spec-yaml">
          <InputTextarea
            value={yamlText}
            onChange={e => onYamlChange(e.target.value)}
            autoResize
            rows={10}
            spellCheck={false}
            className={`spec-yaml-input${yamlError ? " p-invalid" : ""}`}
            placeholder={protocol === "opc-ua"
              ? "fusionopcuadataservice:\n  specification:\n    - node_id: ns=4\n      identifier: i=39\n      parameter: https://industry-fusion.org/base/v0.1/machine_state"
              : "fusionmqttdataservice:\n  specification:\n    - topic: airtracker-74145/relay1\n      key: []\n      parameter:\n        - https://industry-fusion.org/base/v0.1/machine_state"}
          />
          <div className="spec-yaml-bar">
            {yamlError ? (
              <span className="spec-yaml-status is-error">
                <i className="pi pi-times-circle" />
                {yamlError.line ? `Line ${yamlError.line}: ` : ""}{yamlError.message}
              </span>
            ) : (
              <span className="spec-yaml-status is-ok">
                <i className="pi pi-check-circle" />
                In sync with the form · {items.length} {items.length === 1 ? "mapping" : "mappings"}
              </span>
            )}
            <div className="spec-yaml-actions">
              {yamlError ? (
                <button type="button" className="spec-yaml-btn" onClick={() => resetYaml(items)}>
                  <i className="pi pi-undo" /> Undo changes
                </button>
              ) : (
                <button type="button" className="spec-yaml-btn" onClick={() => resetYaml(items)}>
                  <i className="pi pi-align-left" /> Tidy up
                </button>
              )}
              <button type="button" className="spec-yaml-btn" onClick={copyYaml}>
                <i className={copied ? "pi pi-check" : "pi pi-copy"} /> {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          {yamlNote && <div className="spec-yaml-note"><i className="pi pi-info-circle" /> {yamlNote}</div>}
        </div>
      )}

      {/* Empty state */}
      {mode === "form" && items.length === 0 && !isEditing && (
        <div className="spec-empty">
          <i className={protocol === "opc-ua" ? "pi pi-sitemap" : "pi pi-wifi"} />
          <span>
            No data mappings defined. Click <strong>Add Mapping</strong> to create the first
            connection between machine data and digital twin properties.
          </span>
        </div>
      )}

      {/* Existing item cards */}
      {mode === "form" && items.map((item, idx) => (
        <div key={idx} className={`spec-card${editingIndex === idx ? " spec-card-active" : ""}`}>
          {editingIndex === idx ? (
            renderEditForm()
          ) : (
            <>
              <div className="spec-card-body">
                <div className="spec-card-index">{idx + 1}</div>
                <div className="spec-card-fields">
                  {protocol === "opc-ua" ? (
                    <>
                      <div className="spec-card-row">
                        <span className="spec-field-key">Node ID</span>
                        <span className="spec-field-val">{(item as OpcUaSpec).node_id}</span>
                        <span className="spec-field-sep">·</span>
                        <span className="spec-field-key">Identifier</span>
                        <span className="spec-field-val">{(item as OpcUaSpec).identifier}</span>
                      </div>
                      <div className="spec-card-iri" title={(item as OpcUaSpec).parameter}>
                        <span className="spec-field-key">Parameter</span>
                        <span className="spec-field-iri">{(item as OpcUaSpec).parameter}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="spec-card-row">
                        <span className="spec-field-key">Topic</span>
                        <span className="spec-field-val">{(item as MqttSpec).topic}</span>
                      </div>
                      <div className="spec-card-row spec-card-tags">
                        <span className="spec-field-key">{(item as MqttSpec).key?.length ? "JSON fields" : "Whole message"}</span>
                        <div className="spec-tags">
                          {(item as MqttSpec).key?.length
                            ? (item as MqttSpec).parameter.map((p, pi) => (
                                <span key={pi} className="spec-tag" title={`${(item as MqttSpec).key[pi] ?? ""} → ${p}`}>
                                  <span className="spec-tag-key">{(item as MqttSpec).key[pi] ?? "?"}</span> → {shortLabel(p)}
                                </span>
                              ))
                            : (item as MqttSpec).parameter.slice(0, 1).map((p, pi) => (
                                <span key={pi} className="spec-tag" title={p}>{shortLabel(p)}</span>
                              ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="spec-card-actions">
                  <button
                    type="button"
                    className="spec-action-btn"
                    onClick={() => startEdit(idx)}
                    disabled={isEditing}
                    title="Edit mapping"
                  >
                    <i className="pi pi-pencil" />
                  </button>
                  <button
                    type="button"
                    className="spec-action-btn spec-action-delete"
                    onClick={() => remove(idx)}
                    disabled={isEditing}
                    title="Delete mapping"
                  >
                    <i className="pi pi-trash" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ))}

      {/* New-row form appended at bottom */}
      {editingIndex === -1 && (
        <div className="spec-card spec-card-new spec-card-active">
          {renderEditForm(true)}
        </div>
      )}
    </div>
  );
};

export default SpecEditor;
