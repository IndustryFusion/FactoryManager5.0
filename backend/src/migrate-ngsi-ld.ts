// One-time migration of FactoryManager's Scorpio to compliant NGSI-LD.
//
//   npm run migrate:ngsi-ld            report only: changes nothing
//   npm run migrate:ngsi-ld -- --apply  rewrites every entity that needs it
//
// Products go through the IFX adapter (typed by their template); FactoryManager's
// own entities (factory sites, shop floors, allocated-assets stores) through the
// normalizer. Every entity is replaced in one request, never deleted first. The
// report (JSON, in the working directory) lists what changed or could not be fixed.
import * as fs from 'fs';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import axios from 'axios';
import { AppModule } from './app.module';
import { AssetService } from './endpoints/asset/asset.service';
import { FactorySiteService } from './endpoints/factory-site/factory-site.service';
import { ShopFloorService } from './endpoints/shop-floor/shop-floor.service';
import { AllocatedAssetService } from './endpoints/allocated-asset/allocated-asset.service';
import { TokenService } from './endpoints/session/token.service';
import { normalizeForScorpio, replaceEntity, templateCache, toNgsiLd, validateNgsiLd } from './utils/ngsi-ld';

type Kind = 'product' | 'factory site' | 'shop floor' | 'allocated assets';

interface Row {
  id: string;
  kind: Kind;
  status: 'compliant' | 'fixed' | 'would fix' | 'unfixable' | 'failed';
  errorsBefore: number;
  droppedEmpty?: number;
  errors?: string[];
  warnings?: string[];
  // Fields the template does not type (custom fields); typed like similar fields.
  customFields?: string[];
}

const withoutContext = ({ '@context': _c, ...rest }: Record<string, any>) => rest;

async function migrate() {
  const logger = new Logger('migrate-ngsi-ld');
  const apply = process.argv.includes('--apply');
  const app = await NestFactory.createApplicationContext(AppModule);
  const scorpioUrl = process.env.SCORPIO_URL;
  const token = await app.get(TokenService).getToken();
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/ld+json', Accept: 'application/ld+json' };

  const assetService = app.get(AssetService);
  const factorySiteService = app.get(FactorySiteService);
  const shopFloorService = app.get(ShopFloorService);
  const allocatedAssetService = app.get(AllocatedAssetService);

  // Owner and model of each product, for its company's custom template fields.
  const cacheRows: any[] = await (assetService as any).factoryPdtCacheModel.find({}, { id: 1, company_ifric_id: 1, product_name: 1 }).lean();
  const owner = new Map(cacheRows.map((row) => [row.id, row]));

  const entities: Array<{ kind: Kind; entity: Record<string, any> }> = [];
  for (const entity of await assetService.getAssetData(token)) entities.push({ kind: 'product', entity });
  for (const factory of await factorySiteService.findAll(token)) {
    entities.push({ kind: 'factory site', entity: factory });
    for (const floor of await shopFloorService.findAll(factory.id, token)) entities.push({ kind: 'shop floor', entity: floor });
  }
  for (const store of await allocatedAssetService.findAll(token)) entities.push({ kind: 'allocated assets', entity: store });
  try {
    const global = await axios.get(`${scorpioUrl}/urn:ngsi-ld:global-allocated-assets-store`, { headers });
    entities.push({ kind: 'allocated assets', entity: global.data });
  } catch (err) {
    if (err.response?.status !== 404) throw err;
  }

  const templateFor = templateCache();
  const rows: Row[] = [];
  for (const { kind, entity } of entities) {
    const before = validateNgsiLd(entity);
    const row: Row = { id: entity.id, kind, status: 'compliant', errorsBefore: before.errors.length };
    try {
      let converted: Record<string, any>;
      if (kind === 'product') {
        const cache = owner.get(entity.id);
        const template = await templateFor(entity.type, cache?.company_ifric_id ?? '', cache?.product_name).catch(() => ({}));
        const result = toNgsiLd(entity, template);
        converted = result.entity;
        row.droppedEmpty = result.dropped.length;
        if (result.warnings.length) row.warnings = result.warnings;
        if (result.inferred.length) row.customFields = result.inferred;
      } else {
        converted = normalizeForScorpio(entity);
      }

      const after = validateNgsiLd(converted);
      if (!after.valid) {
        rows.push({ ...row, status: 'unfixable', errors: after.errors });
        continue;
      }
      if (JSON.stringify(withoutContext(converted)) === JSON.stringify(withoutContext(entity))) {
        rows.push(row);
        continue;
      }
      if (apply) {
        await replaceEntity(scorpioUrl, converted, headers);
        rows.push({ ...row, status: 'fixed' });
      } else {
        rows.push({ ...row, status: 'would fix' });
      }
    } catch (err) {
      rows.push({ ...row, status: 'failed', errors: [err?.response?.data ? JSON.stringify(err.response.data) : err.message] });
    }
  }

  const summary: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    summary[row.kind] ??= {};
    summary[row.kind][row.status] = (summary[row.kind][row.status] ?? 0) + 1;
  }
  const file = `ngsi-ld-migration-${apply ? 'applied' : 'report'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(file, JSON.stringify({ apply, summary, rows }, null, 2));
  logger.log(`${apply ? 'Applied' : 'Report only (nothing changed)'}: ${JSON.stringify(summary)}`);
  logger.log(`Details in ${file}`);
  await app.close();
}

migrate().catch((err) => {
  new Logger('migrate-ngsi-ld').error(err);
  process.exit(1);
});
