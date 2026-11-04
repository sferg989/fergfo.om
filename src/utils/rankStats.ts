export const mean = (xs: number[]): number => xs.reduce((sum, x) => sum + x, 0) / xs.length;

/** Zero-based ranks; tied values share the average of the ranks they span */
export const rank = (xs: number[]): number[] => {
  const order = xs.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const ranks = new Array<number>(xs.length);
  let start = 0;
  while (start < order.length) {
    let end = start;
    while (end + 1 < order.length && order[end + 1].value === order[start].value) end++;
    const averageRank = (start + end) / 2;
    for (let k = start; k <= end; k++) ranks[order[k].index] = averageRank;
    start = end + 1;
  }
  return ranks;
};

export const pearson = (a: number[], b: number[]): number => {
  const meanA = mean(a);
  const meanB = mean(b);
  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (let i = 0; i < a.length; i++) {
    covariance += (a[i] - meanA) * (b[i] - meanB);
    varianceA += (a[i] - meanA) ** 2;
    varianceB += (b[i] - meanB) ** 2;
  }
  return covariance / Math.sqrt(varianceA * varianceB);
};

/** Rank correlation in [-1, 1]; NaN when either series is constant or empty */
export const spearman = (a: number[], b: number[]): number => pearson(rank(a), rank(b));
