import { describe, expect, it } from 'vitest';
import { orderedSelection, reviewPhotos } from '../mediaCuration';

describe('media curation', () => {
  it('keeps automatic order and uses exact review photo choices in custom order', () => {
    const available = reviewPhotos([{ id: 'one', images: ['a.webp', 'b.webp'] }, { id: 'two', images: ['c.webp'] }]);
    expect(orderedSelection(available, null, (item) => item.id, (item) => item.image)).toEqual(available);
    expect(orderedSelection(available, [{ id: 'two', image: 'c.webp' }, { id: 'one', image: 'b.webp' }], (item) => item.id, (item) => item.image).map((item) => item.image)).toEqual(['c.webp', 'b.webp']);
    expect(orderedSelection(available, [], (item) => item.id, (item) => item.image)).toEqual([]);
  });
});
