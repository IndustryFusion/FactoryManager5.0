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
  DataProtocol, SERVICE_KEY, TRANSFORMS_IMAGE_TAG, buildTransforms, imageAppliesTransforms, parametersOf, pruneRules,
  ruleFor, seedLegacyRules, setRule,
} from "@/utility/value-transform/rules";
import { SpecItem } from "../spec-editor";
import ParameterCard from "./parameter-card";

/** One data service of the onboarding: the primary one, or the secondary one. */
export interface TransformSource {
  protocol: DataProtocol;
  items: SpecItem[];
  /** The data service image the rules run in. */
  image: string;
  onUpgradeImage: () => void;
}

const PROTOCOL_LABEL: Record<DataProtocol, string> = { "opc-ua": "OPC UA", mqtt: "MQTT" };

/** Where a parameter's value is read: "ns=4;i=39", or "plant/line1 › temp" for MQTT. */
const sourceLabel = (protocol: DataProtocol, items: any[], parameter: string): string => {
  const labels: string[] = [];
  for (const item of items) {
    if (protocol === "opc-ua") {
      if (item?.parameter === parameter) labels.push(`${item.node_id};${item.identifier}`);
      continue;
    }
    const params: string[] = Array.isArray(item?.parameter) ? item.parameter : [item?.parameter];
    const at = params.indexOf(parameter);
    if (at < 0) continue;
    const key = Array.isArray(item?.key) ? item.key[at] : undefined;
    labels.push(key ? `${item.topic} › ${key}` : String(item.topic));
  }
  return labels.join(", ");
};

interface ValueTransformsStepProps {
  /** The data services the rules act on, primary first. */
  sources: TransformSource[];
  rules: TransformRule[];
  onRulesChange: (rules: TransformRule[]) => void;
  /** Each property's unit on the asset, by property IRI. */
  units: Record<string, string>;
  /** Parameters already offered a legacy rule, kept by the form across steps. */
  seen: MutableRefObject<Set<string>>;
  /** Add a machine_state mapping read from the OPC UA server's own status. */
  onAddServerState: () => void;
}

/**
 * The onboarding step where the user says what a machine's values mean, so the
 * gateway can turn them into what the digital twin expects. Every mapped
 * parameter, OPC UA or MQTT, is listed with the same options: map values,
 * convert the unit, and what to send when the machine cannot be read.
 */
const ValueTransformsStep: React.FC<ValueTransformsStepProps> = ({
  sources, rules, onRulesChange, units, seen, onAddServerState,
}) => {
  const [open, setOpen] = useState<string | null>(null);

  // Every parameter once, with the data service that reads it (the first one,
  // should both list it) and whether that service applies rules
  const parameters: { parameter: string; source: string; enabled: boolean }[] = [];
  for (const s of sources) {
    const enabled = imageAppliesTransforms(s.image);
    for (const parameter of parametersOf(s.items)) {
      if (!parameters.some(p => p.parameter === parameter)) {
        parameters.push({ parameter, source: sourceLabel(s.protocol, s.items, parameter), enabled });
      }
    }
  }
  const outdated = sources.filter(s => s.items.length > 0 && !imageAppliesTransforms(s.image));
  const opcUa = sources.find(s => s.protocol === "opc-ua");

  // Parameters the old data services treated as states keep that behaviour
  // (the legacy rule) until the user changes it.
  const enabledParameters = parameters.filter(p => p.enabled).map(p => p.parameter);
  const parameterKey = enabledParameters.join("|");
  useEffect(() => {
    const next = seedLegacyRules(rules, enabledParameters, seen.current);
    if (next !== rules) onRulesChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parameterKey]);

  const change = (parameter: string, rule: TransformRule | undefined) => onRulesChange(setRule(rules, parameter, rule));

  // What each data service will receive
  const preview = sources.flatMap(s => {
    const transforms = buildTransforms(pruneRules(rules, parametersOf(s.items)));
    return transforms ? [YAML.stringify({ [SERVICE_KEY[s.protocol]]: { transforms } }, { indent: 2 })] : [];
  });

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

      {outdated.map(s => (
        <div key={s.protocol} className="vt-banner">
          <i className="pi pi-info-circle" />
          <div>
            <strong>Value transforms need {PROTOCOL_LABEL[s.protocol]} data service {TRANSFORMS_IMAGE_TAG}.</strong>
            <span> The current image ({s.image || "none"}) handles machine states itself and ignores these settings for its parameters.</span>
          </div>
          <Button type="button" label={`Upgrade ${PROTOCOL_LABEL[s.protocol]} data service`} icon="pi pi-arrow-up" size="small" onClick={s.onUpgradeImage} />
        </div>
      ))}

      {parameters.length === 0 ? (
        <div className="spec-empty">
          <i className="pi pi-sitemap" />
          <span>No data mappings yet. Add them in the <strong>Configuration</strong> step.</span>
        </div>
      ) : (
        <div className="vt-sections">
          {opcUa && imageAppliesTransforms(opcUa.image) && !parameters.some(p => isMachineState(p.parameter)) && (
            <div className="vt-suggest">
              <i className="pi pi-lightbulb" />
              <span>
                No machine state is mapped. Show this machine as Running while its OPC UA server can be reached, and Offline when it can&apos;t?
              </span>
              <Button type="button" label="Add" icon="pi pi-plus" size="small" outlined onClick={onAddServerState} />
            </div>
          )}

          <div className="vt-cards">
            {parameters.map(({ parameter, source, enabled }) => (
              <ParameterCard
                key={parameter}
                parameter={parameter}
                source={source}
                target={targetFor(parameter, units[parameter])}
                rule={ruleFor(rules, parameter)}
                onChange={rule => change(parameter, rule)}
                open={open === parameter}
                onToggle={() => setOpen(open === parameter ? null : parameter)}
                disabled={!enabled}
              />
            ))}
          </div>

          <details className="vt-rules">
            <summary>Show the rules sent to the gateway</summary>
            <pre>{preview.length ? preview.join("\n") : "No rules: every value is sent as the machine sends it."}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default ValueTransformsStep;
