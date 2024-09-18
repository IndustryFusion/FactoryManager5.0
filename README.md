[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FIndustryFusion%2FFactoryManager5.0.svg?type=shield&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2FIndustryFusion%2FFactoryManager5.0?ref=badge_shield&issueType=license)


## Factory Manager 5.0 (For Factory Owners)

The Factory Manager 5.0 IFF application is responsible for managing the linked assets and thier data in the context of factories owned by the user. The assets created in Fleet Manager 5.0 can be imported to Factory Manager using the 'Import Assets' feature in the demo version or using IF-X dataspace manager in upcoming commercial version.

For the setup, Factory Manager 5.0 needs IFF Process Digital Twin (PDT) running on the central IFF factory server with machines connected it using individual gateways. For detailed information on setup of the factory server and gateways to deploy PDT and data agents is described [here](https://github.com/IndustryFusion/DigitalTwin/blob/main/wiki/setup/setup.md). Once the PDT is setup in the factory, the Factory Manager can be deployed on the same network to interact with the PDT semantic model and data. The Factory Manager can only manage and link the assets, the creation must be always done in Fleet Manager.

The PDT is also used in Factory Manager to create and handle Factory and ShopFloor objects. In order to enable the creation of these assets, some predefined ID store objects must be created before deploying Factory Manager. 

Create these below assets. Note: In value, urn:ngsi-ld:factories:2:XXX, the XXX range is your choice. The IDs will then start from XXX+1. Also, replace the PDT URL accordingly. 

```bash

curl --location 'http://<PDT-URL>/ngsi-ld/v1/entities/' \
--header 'Content-Type: application/ld+json' \
--header 'Accept: application/ld+json' \
--data-raw '{
    "@context": "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.3.jsonld",
    "id": "urn:ngsi-ld:factory-id-store",
    "type": "https://industry-fusion.org/base/v0.1/urn-holder",
    "http://www.industry-fusion.org/schema#last-urn": {
        "type": "Property",
        "value": "urn:ngsi-ld:factories:2:000"
    }
}'


curl --location 'http://<PDT-URL>/ngsi-ld/v1/entities/' \
--header 'Content-Type: application/ld+json' \
--header 'Accept: application/ld+json' \
--data-raw '{
    "@context": "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.3.jsonld",
    "id": "urn:ngsi-ld:shopFloor-id-store",
    "type": "https://industry-fusion.org/base/v0.1/urn-holder",
    "last-urn": {
        "type": "Property",
        "value": "urn:ngsi-ld:shopFloors:2:000"
    }
}'

curl --location 'http://<PDT-URL>/ngsi-ld/v1/entities/' \
--header 'Content-Type: application/ld+json' \
--header 'Accept: application/ld+json' \
--data-raw '{
    "@context": "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.3.jsonld",
    "id": "urn:ngsi-ld:global-allocated-assets-store",
    "type": "https://industry-fusion.org/base/v0.1/urn-holder",
    "http://www.industry-fusion.org/schema#last-data": {
        "type": "Relationship",
        "object": ["default"]
    }
}'

curl --location 'http://<PDT-URL>/ngsi-ld/v1/entities/' \
--header 'Content-Type: application/ld+json' \
--header 'Accept: application/ld+json' \
--data-raw '{
    "id": "urn:ngsi-ld:asset-type-store",
    "type": "https://industry-fusion.org/base/v0.1/urn-holder",
    "http://www.industry-fusion.org/schema#type-data": [
        {
            "type": "Property",
            "value": "https://industry-fusion.org/base/v0.1/filterCatridge"
        },
        {
            "type": "Property",
            "value": "https://industry-fusion.org/base/v0.1/gasController"
        },
        {
            "type": "Property",
            "value": "https://industry-fusion.org/base/v0.1/laserCutter"
        },
        {
            "type": "Property",
            "value": "https://industry-fusion.org/base/v0.1/plasmaCutter"
        },
        {
            "type": "Property",
            "value": "https://industry-fusion.org/base/v0.1/powerSource"
        },
        {
            "type": "Property",
            "value": "https://industry-fusion.org/base/v0.1/airTracker"
        },
        {
            "type": "Property",
            "value": "https://industry-fusion.org/base/v0.1/airFilter"
        },
        {
            "type": "Property",
            "value": "https://industry-fusion.org/base/v0.1/bendingMachine"
        },
        {
            "type": "Property",
            "value": "https://industry-fusion.org/base/v0.1/common"
        },
        {
            "type": "Property",
            "value": "https://industry-fusion.org/base/v0.1/deburringMachine"
        },
        {
            "type": "Property",
            "value": "https://industry-fusion.org/base/v0.1/laserCooler"
        },
        {
            "type": "Property",
            "value": "https://industry-fusion.org/base/v0.1/metalWorkpiece"
        }
    ]
}'
```

Aftr the above assets are created, it is also important to create custom functions in PDT Postgres to use in data dashboards. Using, Kubectl enter the acid-cluster pod in PDT. Then using below command, login to Postgres DB.

```bash

psql -U ngb -d tsdb

```

Then execute the following commands one by one,

```sql

CREATE VIEW value_change_state_entries AS SELECT * FROM ( SELECT *, LAG(value) OVER (PARTITION BY "entityId" ORDER BY "observedAt" ASC) AS prev_value FROM entityhistory WHERE "attributeId"='http://www.industry-fusion.org/fields#machine-state' ) AS subquery WHERE value IS DISTINCT FROM prev_value;

CREATE VIEW power_emission_entries_days AS SELECT subquery."entityId", DATE_TRUNC('day', subquery.hour) AS day, SUM(subquery.average_power_consumption) AS total_power_consumption, SUM(subquery.average_power_consumption) * 0.485 AS total_carbon_emission FROM ( SELECT "entityId", DATE_TRUNC('hour', "observedAt") AS hour, AVG(CAST("value" AS FLOAT)) / 1000 AS average_power_consumption FROM entityhistory WHERE "attributeId" = 'http://www.industry-fusion.org/fields#power-consumption' GROUP BY "entityId", DATE_TRUNC('hour', "observedAt") ) AS subquery GROUP BY subquery."entityId", DATE_TRUNC('day', subquery.hour) ORDER BY day;

CREATE VIEW power_emission_entries_months AS SELECT subquery."entityId", DATE_TRUNC('month', subquery.hour) AS month, SUM(subquery.average_power_consumption) AS total_power_consumption, SUM(subquery.average_power_consumption) * 0.485 AS total_carbon_emission FROM ( SELECT "entityId", DATE_TRUNC('hour', "observedAt") AS hour, AVG(CAST("value" AS FLOAT)) / 1000 AS average_power_consumption FROM entityhistory WHERE "attributeId" = 'http://www.industry-fusion.org/fields#power-consumption' GROUP BY "entityId", DATE_TRUNC('hour', "observedAt") ) AS subquery GROUP BY subquery."entityId", DATE_TRUNC('month', subquery.hour) ORDER BY month;

CREATE VIEW power_emission_entries_weeks AS SELECT subquery."entityId", DATE_TRUNC('week', subquery.hour) AS week, SUM(subquery.average_power_consumption) AS total_power_consumption, SUM(subquery.average_power_consumption) * 0.485 AS total_carbon_emission FROM ( SELECT "entityId", DATE_TRUNC('hour', "observedAt") AS hour, AVG(CAST("value" AS FLOAT)) / 1000 AS average_power_consumption FROM entityhistory WHERE "attributeId" = 'http://www.industry-fusion.org/fields#power-consumption' GROUP BY "entityId", DATE_TRUNC('hour', "observedAt") ) AS subquery GROUP BY subquery."entityId", DATE_TRUNC('week', subquery.hour) ORDER BY week;

GRANT SELECT ON value_change_state_entries TO pgrest;

GRANT SELECT ON power_emission_entries_days TO pgrest;

GRANT SELECT ON power_emission_entries_weeks TO pgrest;

GRANT SELECT ON power_emission_entries_months TO pgrest;

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