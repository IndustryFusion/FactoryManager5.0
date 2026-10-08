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

import { MutableRefObject, useEffect, useState } from "react";
import { Button } from "primereact/button";
import YAML from "yaml";
import { TransformRule } from "@/utility/value-transform/engine";
import { isMachineState, targetFor } from "@/utility/value-transform/presets";
import {
  TRANSFORMS_IMAGE_TAG, buildTransforms, imageAppliesTransforms, ruleFor, seedLegacyRules, setRule,
} from "@/utility/value-transform/rules";
import { OpcUaSpec } from "../spec-editor";
import ParameterCard from "./parameter-card";

interface ValueTransformsStepProps {
  /** The OPC UA mappings the rules act on. */
  opcItems: OpcUaSpec[];
  /** MQTT mappings in this onboarding; their data service does not apply rules. */
  mqttCount: number;
  rules: TransformRule[];
  onRulesChange: (rules: TransformRule[]) => void;
  /** Each property's unit on the asset, by property IRI. */
  units: Record<string, string>;
  /** Parameters already offered a legacy rule, kept by the form across steps. */
  seen: MutableRefObject<Set<string>>;
  /** The data service image the rules run in. */
  image: string;
  onUpgradeImage: () => void;
  /** Add a machine_state mapping read from the server's own status. */
  onAddServerState: () => void;
}

/**
 * The onboarding step where the user says what a machine's values mean, so the
 * gateway can turn them into what the digital twin expects. Every mapped
 * parameter is listed with the same options: map values, convert the unit,
 * and what to send when the machine cannot be read.
 */
const ValueTransformsStep: React.FC<ValueTransformsStepProps> = ({
  opcItems, mqttCount, rules, onRulesChange, units, seen, image, onUpgradeImage, onAddServerState,
}) => {
  const enabled = imageAppliesTransforms(image);
  const parameters = Array.from(new Set(opcItems.map(item => item.parameter).filter(Boolean)));
  const [open, setOpen] = useState<string | null>(null);

  // Parameters the old data service treated as states keep that behaviour
  // (the legacy rule) until the user changes it.
  const parameterKey = parameters.join("|");
  useEffect(() => {
    if (!enabled) return;
    const next = seedLegacyRules(rules, parameters, seen.current);
    if (next !== rules) onRulesChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, parameterKey]);

  const sourceOf = (parameter: string) =>
    opcItems.filter(i => i.parameter === parameter).map(i => `${i.node_id};${i.identifier}`).join(", ");
  const change = (parameter: string, rule: TransformRule | undefined) => onRulesChange(setRule(rules, parameter, rule));

  const transforms = buildTransforms(rules.filter(r => parameters.includes(r.parameter)));

  return (
    <div className="step-content vt">
      <div className="step-header">
        <h4 className="step-title">
          <i className="pi pi-sliders-h"></i>
          Value Transforms
        </h4>
        <p className="step-description">
          Every mapped parameter can have its values mapped, its unit converted, or both. Open a parameter to change what the gateway sends.
        </p>
      </div>

      {!enabled && (
        <div className="vt-banner">
          <i className="pi pi-info-circle" />
          <div>
            <strong>Value transforms need data service {TRANSFORMS_IMAGE_TAG}.</strong>
            <span> The current image ({image || "none"}) handles machine states itself and ignores these settings.</span>
          </div>
          <Button type="button" label="Upgrade data service" icon="pi pi-arrow-up" size="small" onClick={onUpgradeImage} />
        </div>
      )}

      {parameters.length === 0 ? (
        <div className="spec-empty">
          <i className="pi pi-sitemap" />
          <span>
            {mqttCount > 0
              ? "This onboarding has only MQTT mappings. The MQTT data service does not apply value transforms yet."
              : <>No OPC UA mappings yet. Add them in the <strong>Configuration</strong> step.</>}
          </span>
        </div>
      ) : (
        <div className={`vt-sections${enabled ? "" : " is-disabled"}`} aria-disabled={!enabled}>
          {!parameters.some(isMachineState) && (
            <div className="vt-suggest">
              <i className="pi pi-lightbulb" />
              <span>
                No machine state is mapped. Show this machine as Running while its OPC UA server can be reached, and Offline when it can&apos;t?
              </span>
              <Button type="button" label="Add" icon="pi pi-plus" size="small" outlined onClick={onAddServerState} disabled={!enabled} />
            </div>
          )}

          <div className="vt-cards">
            {parameters.map(parameter => (
              <ParameterCard
                key={parameter}
                parameter={parameter}
                source={sourceOf(parameter)}
                target={targetFor(parameter, units[parameter])}
                rule={ruleFor(rules, parameter)}
                onChange={rule => change(parameter, rule)}
                open={open === parameter}
                onToggle={() => setOpen(open === parameter ? null : parameter)}
                disabled={!enabled}
              />
            ))}
          </div>

          {mqttCount > 0 && (
            <p className="vt-hint">The {mqttCount} MQTT {mqttCount === 1 ? "mapping is" : "mappings are"} sent as received; the MQTT data service does not apply transforms yet.</p>
          )}

          <details className="vt-rules">
            <summary>Show the rules sent to the gateway</summary>
            <pre>{transforms ? YAML.stringify({ transforms }, { indent: 2 }) : "No rules: every value is sent as the machine sends it."}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default ValueTransformsStep;
