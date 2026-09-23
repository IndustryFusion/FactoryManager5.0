import { HttpException, HttpStatus } from '@nestjs/common';
import { validateNgsiLd } from './validate';

/**
 * Refuses a Scorpio write that is not compliant, before anything is sent.
 * `requireId: false` checks an attrs-only payload (POST .../attrs).
 * Every write to FactoryManager's Scorpio goes through this, so nothing
 * non-compliant can land there, whichever code path produced it.
 */
export const assertCompliant = (payload: Record<string, any>, { requireId = true, label = 'entity' } = {}) => {
  const payloads = Array.isArray(payload) ? payload : [payload];
  const errors = payloads.flatMap((p) => validateNgsiLd(p, { requireId }).errors);
  if (errors.length) {
    throw new HttpException(
      { errorCode: 'FS_422', message: `Refused to write a non-compliant NGSI-LD ${label}`, errors },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
};
