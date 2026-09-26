[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FIndustryFusion%2FFactoryManager5.0.svg?type=shield&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2FIndustryFusion%2FFactoryManager5.0?ref=badge_shield&issueType=license)


## Factory Manager 5.0 (For Factory Owners)

The Factory Manager 5.0 IFF application is responsible for managing the linked assets and thier data in the context of factories owned by the user. The assets created in Fleet Manager 5.0 can be imported to Factory Manager using the 'Import Assets' feature in the demo version or using IF-X dataspace manager in upcoming commercial version.

For the setup, Factory Manager 5.0 needs IFF Process Digital Twin (PDT) running on the central IFF factory server with machines connected it using individual gateways. For detailed information on setup of the factory server and gateways to deploy PDT and data agents is described [here](https://github.com/IndustryFusion/DigitalTwin/blob/main/wiki/setup/setup.md). Once the PDT is setup in the factory, the Factory Manager can be deployed on the same network to interact with the PDT semantic model and data. The Factory Manager can only manage and link the assets, the creation must be always done in Fleet Manager.

The PDT is used in Factory Manager to create and handle Factory and ShopFloor objects.

Two records are kept for that bookkeeping: a counter for shop floor ids, and the list of allocated assets across every factory. **They live in this application's own MongoDB (the `urn_holders` collection) and are created at startup, so there is nothing to do here.** Neither describes the factory, so neither belongs in Scorpio: one is a sequence, the other is rebuilt from entities Scorpio already holds.

On an installation that has been running against Scorpio, the first value is inherited rather than reset — from the old `urn:ngsi-ld:shopFloor-id-store` if it is still there, otherwise from the highest shop floor id Scorpio holds. Ids therefore continue where they left off. A record that already exists in MongoDB is never touched. Set `FACTORY_AUTO_PROVISION=false` to opt out.

The old `urn:ngsi-ld:shopFloor-id-store` and `urn:ngsi-ld:global-allocated-assets-store` entities are no longer read or written. Nothing removes them, so they can stay where they are.

Factories need no counter at all: a factory's identifier is minted by the IFRIC registry when the factory is created, which is what makes it unique across deployments rather than only within one PDT. Set `IFRIC_REGISTRY_BACKEND_URL` instead.

The data dashboards read a set of views in the PDT's Postgres.

**The backend creates these itself at startup too**, provided it is given a connection: set `PDT_DB_HOST`, `PDT_DB_PORT`, `PDT_DB_NAME`, `PDT_DB_USER` and `PDT_DB_PASSWORD`. Without `PDT_DB_HOST` it leaves the database alone and you create them by hand, as below. Every statement is safe to run again, so restarts cost nothing.

To do it manually: using Kubectl enter the acid-cluster pod in PDT, then login to Postgres DB with the below command.

```bash

psql -U ngb -d tsdb

```

Then execute the following commands one by one,

```sql

CREATE OR REPLACE VIEW value_change_state_entries AS
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
WHERE value IS DISTINCT FROM prev_value;

CREATE OR REPLACE VIEW power_emission_entries_days AS
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
ORDER BY day;


CREATE OR REPLACE VIEW power_emission_entries_weeks AS
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
ORDER BY week;


CREATE OR REPLACE VIEW power_emission_entries_months AS
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
ORDER BY month;

CREATE OR REPLACE VIEW machine_state_daily_stats AS
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
ORDER BY day DESC;

CREATE OR REPLACE VIEW machine_state_2h_stats AS
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
ORDER BY day DESC, interval_index ASC;

CREATE ROLE PGREST;

GRANT SELECT ON value_change_state_entries TO pgrest;

GRANT SELECT ON power_emission_entries_days TO pgrest;

GRANT SELECT ON power_emission_entries_weeks TO pgrest;

GRANT SELECT ON power_emission_entries_months TO pgrest;

GRANT SELECT ON machine_state_daily_stats TO pgrest;

GRANT SELECT ON machine_state_2h_stats TO pgrest;
```

After creation, close the pod console and refresh the timescale bridge. For more information, use [this](https://github.com/IndustryFusion/DigitalTwin/blob/main/wiki/setup/setup.md#pdt-endpoints) document.

The application also uses S3 as object storage, MongoDB for UI object storage and redis as cache storage. Create a demo S3 bucket in your favourite cloud provider, deploy redis using [this](https://github.com/OT-CONTAINER-KIT/redis-operator#quickstart) or using Docker and deploy MongoDB instance using Docker or Community Mongo Operator [link](https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/docs/install-upgrade.md). Then feed the details in .env of backend folder together with PDT endpoint information as shown below.


Exmaple .env of backend root folder:

```

GITHUB_BASE_URL=https://api.github.com/repos/<owner>/<repo>/contents
GITHUB_TOKEN=<git token for above repo>
API_URL=http://<PDT-URL>/auth/realms/iff/protocol/openid-connect/token
CLIENT_ID=scorpio
SCORPIO_URL=http://<PDT-URL>/scorpio/ngsi-ld/v1/entities
S3_URL=<S3 URL>
S3_ACCESS_KEY=<S3 Access Key>
S3_SECRET_KEY=<S3 Secret Key>
S3_BUCKET=<S3 Bukect Name>
ALERTA_URL=http://<PDT-URL>/alerta/api
ALERTA_KEY=<Alerta Key>
TIMESCALE_URL=http://<PDT-URL>/pgrest/
MONGO_URL=mongodb://<username>:<password>@<hostname or IP>:<port>/<DB_Name>?directconnection=true&retryWrites=true&w=majority
CORS_ORIGIN=http://localhost:3002
REDIS_SERVER=<hostname or IP>
REDIS_PORT=6379

```

Once the .env is added to the code, install dependencies in 'backend' and 'frontend' projects using,

```
npm install
```

And then run the backend project using,

```
npm run start

```

And then run the frontend project using,

```
npm run dev

```

The UI application will be available at localhost:3002.

Copyrights: IB Systems GmbH.
