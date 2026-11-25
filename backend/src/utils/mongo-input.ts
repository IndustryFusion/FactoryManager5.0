import { BadRequestException } from '@nestjs/common';

/**
 * A value from the request that is about to go into a Mongo filter.
 *
 * Without a check, a JSON body can send `{"factoryId": {"$ne": null}}` and
 * the filter matches some other record. Requiring a plain string closes that:
 * an object, array or number is refused before it reaches the query.
 */
export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new BadRequestException(`${field} must be a non-empty string`);
  }
  return value;
}
