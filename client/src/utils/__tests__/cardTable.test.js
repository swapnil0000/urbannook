import { describe, it, expect } from 'vitest';
import { unpackCards } from '../cardTable';

describe('unpackCards', () => {
  it('puts the cards back where cardIdx pointed', () => {
    const table = [{ sku: 'A' }, { sku: 'B' }];
    const out = unpackCards({ combos: [{ id: 1, builder: { combos: [{ slots: [{ options: [{ cardIdx: [1, 0, 1] }] }] }] } }], cardTable: table });
    expect(out.cardTable).toBeUndefined();
    expect(out.combos[0].builder.combos[0].slots[0].options[0].cards).toEqual([{ sku: 'B' }, { sku: 'A' }, { sku: 'B' }]);
  });
  it('leaves a response without a cardTable alone', () => {
    const plain = { combos: [{ id: 1, choices: [{ cards: [{ sku: 'A' }] }] }] };
    expect(unpackCards(plain)).toBe(plain);
  });
});
