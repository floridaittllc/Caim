import { describe, expect, it } from '@jest/globals';

import {
  FULL_LAYOUT,
  resolveInsert,
  type KeyDef,
} from '../components/keyboard/layouts';

describe('FULL_LAYOUT', () => {
  it('includes an always-visible number row', () => {
    const labels = FULL_LAYOUT[0].map((k) => k.label);
    expect(labels).toEqual(
      expect.arrayContaining(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']),
    );
  });

  it('resolves shift for letters and symbols', () => {
    const q: KeyDef = { id: 'q', label: 'Q', insert: 'q' };
    expect(resolveInsert(q, false, false)).toBe('q');
    expect(resolveInsert(q, true, false)).toBe('Q');
    expect(resolveInsert(q, false, true)).toBe('Q');
    expect(resolveInsert(q, true, true)).toBe('q');

    const one: KeyDef = { id: '1', label: '1', insert: '1' };
    expect(resolveInsert(one, true, false)).toBe('!');
  });
});
