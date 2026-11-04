import { describe, expect, it } from 'vitest';
import { mean, pearson, rank, spearman } from '../rankStats';

describe('rank', () => {
  it('assigns zero-based ranks in value order', () => {
    expect(rank([30, 10, 20])).toEqual([2, 0, 1]);
  });

  it('gives tied values the average of their ranks', () => {
    expect(rank([5, 1, 5, 9])).toEqual([1.5, 0, 1.5, 3]);
  });
});

describe('pearson', () => {
  it('is 1 for a perfect linear relationship', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
  });
});

describe('spearman', () => {
  it('is 1 for any monotonic increasing relationship', () => {
    expect(spearman([1, 2, 3, 4], [1, 8, 27, 1000])).toBeCloseTo(1);
  });

  it('is -1 for a monotonic decreasing relationship', () => {
    expect(spearman([1, 2, 3, 4], [9, 5, 2, 1])).toBeCloseTo(-1);
  });

  it('is NaN when one series is constant', () => {
    expect(spearman([1, 2, 3], [4, 4, 4])).toBeNaN();
  });
});

describe('mean', () => {
  it('averages values', () => {
    expect(mean([1, 2, 6])).toBe(3);
  });
});
