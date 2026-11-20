import { describe, expect, it } from 'vitest';
import { letterOffsets } from './JumpBar';

const buckets = [
  { character: '#', count: 3 },
  { character: 'A', count: 10 },
  { character: 'B', count: 0 },
  { character: 'C', count: 5 },
  { character: 'Œ', count: 1 },
  { character: 'Ж', count: 2 },
];

describe('letterOffsets', () => {
  it('gives each letter the offset of its first item', () => {
    expect(letterOffsets(buckets, 'ASCENDING')).toEqual([
      { character: '#', count: 3, offset: 0 },
      { character: 'A', count: 10, offset: 3 },
      { character: 'C', count: 5, offset: 13 },
      { character: '…', count: 3, other: true, offset: 18 },
    ]);
  });

  it('reverses the bar for a descending listing', () => {
    expect(letterOffsets(buckets, 'DESCENDING').map(({ character, offset }) => [character, offset])).toEqual([
      ['…', 0],
      ['C', 3],
      ['A', 8],
      ['#', 18],
    ]);
  });
});
