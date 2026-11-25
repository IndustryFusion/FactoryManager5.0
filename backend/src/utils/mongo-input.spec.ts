import { BadRequestException } from '@nestjs/common';
import { requireString } from './mongo-input';

describe('requireString', () => {
  it('returns a string unchanged', () => {
    expect(requireString('urn:ngsi-ld:factories:2:1', 'factoryId')).toBe('urn:ngsi-ld:factories:2:1');
  });

  it.each([[{ $ne: null }], [['a']], [42], [null], [undefined], ['']])('refuses %p', (value) => {
    expect(() => requireString(value, 'factoryId')).toThrow(BadRequestException);
  });
});
