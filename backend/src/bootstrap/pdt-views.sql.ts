//
// Copyright (c) 2024 IB Systems GmbH
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
 * The views the data dashboards read, and the role PostgREST reads them as.
 *
 * Copied verbatim from the project README, which until now asked an operator
 * to paste them into the PDT database by hand after every deployment. The
 * only change is CREATE ROLE, which the README writes bare: that fails once
 * the role exists, so it would break every restart after the first.
 *
 * Every statement is written to be safe to run again — CREATE OR REPLACE for
 * the views, a guarded CREATE for the role, and GRANT, which is idempotent.
 */
export const PDT_VIEW_STATEMENTS: ReadonlyArray<{ label: string; sql: string }> = [
  {
    label: "view value_change_state_entries",
    sql: `CREATE OR REPLACE VIEW value_change_state_entries AS
SELECT *
FROM (
    SELECT
        -- normalize value *in place*
        CASE
            WHEN value IS NULL THEN '0'
            WHEN value ILIKE 'null' THEN '0'
            ELSE value
        END AS value,

        -- normalize prev_value *in place*
        CASE
            WHEN LAG(value) OVER (
                     PARTITION BY "entityId"
                     ORDER BY "observedAt" ASC
                 ) IS NULL
                THEN '0'
            WHEN LAG(value) OVER (
                     PARTITION BY "entityId"
                     ORDER BY "observedAt" ASC
                 ) ILIKE 'null'
                THEN '0'
            ELSE LAG(value) OVER (
                     PARTITION BY "entityId"
                     ORDER BY "observedAt" ASC
                 )
        END AS prev_value,

        -- keep all other columns untouched
        "id",
        "entityId",
        "attributeId",
        "observedAt",
        "modifiedAt",
        "datasetId",
        "nodeType",
        "attributeType",
        "valueType",
        "unitCode",
        "lang",
        "deleted"

    FROM attributes
    WHERE "attributeId" = 'https://industry-fusion.org/base/v0.1/machine_state'
) sub
WHERE value IS DISTINCT FROM prev_value`,
  },
  {
    label: "view power_emission_entries_days",
    sql: `CREATE OR REPLACE VIEW power_emission_entries_days AS
SELECT
  subquery."entityId",
  DATE_TRUNC('day', subquery.hour) AS day,
  SUM(subquery.average_power_consumption) AS total_power_consumption,
  SUM(subquery.average_power_consumption) * 0.485 AS total_carbon_emission
FROM (
  SELECT
    "entityId",
    DATE_TRUNC('hour', "observedAt") AS hour,
    AVG(
      COALESCE(
        NULLIF(REGEXP_REPLACE("value", '^[Nn][Uu][Ll][Ll]$', '0'), '')::FLOAT,
        0
      ) / 1000
    ) AS average_power_consumption
  FROM attributes
  WHERE "attributeId" = 'https://industry-fusion.org/base/v0.1/power_consumption'
  GROUP BY "entityId", DATE_TRUNC('hour', "observedAt")
) AS subquery
GROUP BY subquery."entityId", DATE_TRUNC('day', subquery.hour)
ORDER BY day`,
  },
  {
    label: "view power_emission_entries_weeks",
    sql: `CREATE OR REPLACE VIEW power_emission_entries_weeks AS
SELECT
  subquery."entityId",
  DATE_TRUNC('week', subquery.hour) AS week,
  SUM(subquery.average_power_consumption) AS total_power_consumption,
  SUM(subquery.average_power_consumption) * 0.485 AS total_carbon_emission
FROM (
  SELECT
    "entityId",
    DATE_TRUNC('hour', "observedAt") AS hour,
    AVG(
      COALESCE(
        NULLIF(REGEXP_REPLACE("value", '^[Nn][Uu][Ll][Ll]$', '0'), '')::FLOAT,
        0
      ) / 1000
    ) AS average_power_consumption
  FROM attributes
  WHERE "attributeId" = 'https://industry-fusion.org/base/v0.1/power_consumption'
  GROUP BY "entityId", DATE_TRUNC('hour', "observedAt")
) AS subquery
GROUP BY subquery."entityId", DATE_TRUNC('week', subquery.hour)
ORDER BY week`,
  },
  {
    label: "view power_emission_entries_months",
    sql: `CREATE OR REPLACE VIEW power_emission_entries_months AS
SELECT
  subquery."entityId",
  DATE_TRUNC('month', subquery.hour) AS month,
  SUM(subquery.average_power_consumption) AS total_power_consumption,
  SUM(subquery.average_power_consumption) * 0.485 AS total_carbon_emission
FROM (
  SELECT
    "entityId",
    DATE_TRUNC('hour', "observedAt") AS hour,
    AVG(
      COALESCE(
        NULLIF(REGEXP_REPLACE("value", '^[Nn][Uu][Ll][Ll]$', '0'), '')::FLOAT,
        0
      ) / 1000
    ) AS average_power_consumption
  FROM attributes
  WHERE "attributeId" = 'https://industry-fusion.org/base/v0.1/power_consumption'
  GROUP BY "entityId", DATE_TRUNC('hour', "observedAt")
) AS subquery
GROUP BY subquery."entityId", DATE_TRUNC('month', subquery.hour)
ORDER BY month`,
  },
  {
    label: "view machine_state_daily_stats",
    sql: `CREATE OR REPLACE VIEW machine_state_daily_stats AS
WITH cleaned AS (
    SELECT
        ("observedAt" AT TIME ZONE 'UTC')::date AS day,
        CASE 
            WHEN "value" IS NULL THEN 0
            WHEN "value"::text ILIKE 'null' THEN 0
            WHEN "value" ~ '^[0-2]$' THEN "value"::int
            ELSE 0
        END AS state
    FROM attributes
    WHERE "attributeId" = 'https://industry-fusion.org/base/v0.1/machine_state'
      AND "observedAt" >= now() - INTERVAL '10 days'
),
counts AS (
    SELECT
        day,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE state = 0) AS count_0,
        COUNT(*) FILTER (WHERE state = 1) AS count_1,
        COUNT(*) FILTER (WHERE state = 2) AS count_2
    FROM cleaned
    GROUP BY day
),
percentages AS (
    SELECT
        to_char(day, 'DD.MM.YYYY') AS date,
        round((count_0::decimal / NULLIF(total,0)) * 100, 2) AS pct_0,
        round((count_1::decimal / NULLIF(total,0)) * 100, 2) AS pct_1,
        round((count_2::decimal / NULLIF(total,0)) * 100, 2) AS pct_2,

        round((count_0::decimal / NULLIF(total, 0)) * 24, 2) AS hours_0,
        round((count_1::decimal / NULLIF(total, 0)) * 24, 2) AS hours_1,
        round((count_2::decimal / NULLIF(total, 0)) * 24, 2) AS hours_2,

        day   -- keep for sorting, not exposed in final select
    FROM counts
)
SELECT
    date,
    pct_0, pct_1, pct_2,
    hours_0, hours_1, hours_2
FROM percentages
ORDER BY day DESC`,
  },
  {
    label: "view machine_state_2h_stats",
    sql: `CREATE OR REPLACE VIEW machine_state_2h_stats AS
WITH cleaned AS (
    SELECT
        ("observedAt" AT TIME ZONE 'UTC')::date AS day,
        EXTRACT(HOUR FROM ("observedAt" AT TIME ZONE 'UTC')) AS time,
        CASE 
            WHEN "value" IS NULL THEN 0
            WHEN "value"::text ILIKE 'null' THEN 0
            WHEN "value" ~ '^[0-2]$' THEN "value"::int
            ELSE 0
        END AS state
    FROM attributes
    WHERE "attributeId" = 'https://industry-fusion.org/base/v0.1/machine_state'
      AND "observedAt" >= now() - INTERVAL '10 days'
),
intervals AS (
    SELECT
        day,
        FLOOR(time / 2)::int AS interval_index,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE state = 0) AS count_0,
        COUNT(*) FILTER (WHERE state = 1) AS count_1,
        COUNT(*) FILTER (WHERE state = 2) AS count_2
    FROM cleaned
    GROUP BY day, interval_index
),
formatted AS (
    SELECT
        day,
        to_char(day, 'DD.MM.YYYY') AS date,
        interval_index,

        -- Label only end of the interval: 02:00, 04:00, ...
        LPAD(((interval_index * 2) + 2)::text, 2, '0') || ':00'
        AS hour_mark,

        round((count_0::decimal / NULLIF(total,0)) * 100, 2) AS pct_0,
        round((count_1::decimal / NULLIF(total,0)) * 100, 2) AS pct_1,
        round((count_2::decimal / NULLIF(total,0)) * 100, 2) AS pct_2,

        round((count_0::decimal / NULLIF(total, 0)) * 2, 2) AS hours_0,
        round((count_1::decimal / NULLIF(total, 0)) * 2, 2) AS hours_1,
        round((count_2::decimal / NULLIF(total, 0)) * 2, 2) AS hours_2
    FROM intervals
)
SELECT
    date,
    hour_mark AS "time",
    pct_0, pct_1, pct_2,
    hours_0, hours_1, hours_2
FROM formatted
ORDER BY day DESC, interval_index ASC`,
  },
  {
    label: "role pgrest",
    sql: `DO $do$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pgrest') THEN
    CREATE ROLE pgrest;
  END IF;
END
$do$`,
  },
  {
    label: "grant on value_change_state_entries",
    sql: `GRANT SELECT ON value_change_state_entries TO pgrest`,
  },
  {
    label: "grant on power_emission_entries_days",
    sql: `GRANT SELECT ON power_emission_entries_days TO pgrest`,
  },
  {
    label: "grant on power_emission_entries_weeks",
    sql: `GRANT SELECT ON power_emission_entries_weeks TO pgrest`,
  },
  {
    label: "grant on power_emission_entries_months",
    sql: `GRANT SELECT ON power_emission_entries_months TO pgrest`,
  },
  {
    label: "grant on machine_state_daily_stats",
    sql: `GRANT SELECT ON machine_state_daily_stats TO pgrest`,
  },
  {
    label: "grant on machine_state_2h_stats",
    sql: `GRANT SELECT ON machine_state_2h_stats TO pgrest`,
  },
];
