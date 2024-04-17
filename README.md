[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FIndustryFusion%2FFactoryManager5.0.svg?type=shield&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2FIndustryFusion%2FFactoryManager5.0?ref=badge_shield&issueType=license)


## Factory Manager 5.0 (For Factory Owners)

The Factory Manager 5.0 IFF application is responsible for managing the linked assets and thier data in the context of factories owned by the user. The assets created in Fleet Manager 5.0 can be imported to Factory Manager using the 'Import Assets' feature in the demo version or using IF-X dataspace manager in upcoming commercial version.

For the setup, Factory Manager 5.0 needs IFF Process Digital Twin (PDT) running on the central IFF factory server with machines connected it using individual gateways. For detailed information on setup of the factory server and gateways to deploy PDT and data agents is described (here)[https://github.com/IndustryFusion/DigitalTwin/blob/main/wiki/setup/setup.md]. Once the PDT is setup in the factory, the Factory Manager can be deployed on the same network to interact with the PDT semantic model and data. The Factory Manager can only manage and link the assets, the creation must be always done in Fleet Manager.

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
```

The application also uses S3 as object storage, MongoDB for UI object storage and redis as cache storage. Create a demo S3 bucket in your favourite cloud provider, deploy redis using (this)[https://github.com/OT-CONTAINER-KIT/redis-operator#quickstart] or using Docker and deploy MongoDB instance using Docker or Community Mongo Operator (link)[https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/docs/install-upgrade.md]. Then feed the details in .env of backend folder together with PDT endpoint information as shown below.


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