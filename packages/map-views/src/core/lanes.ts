/** Spread links joining the same pair of nodes (in either direction) into lanes around 0. */
export function assignLanes(links: { from: string; to: string; lane: number }[]) {
  const byPair = new Map<string, typeof links>();
  for (const link of links) {
    const pair = [link.from, link.to].sort().join('\n');
    byPair.set(pair, [...(byPair.get(pair) ?? []), link]);
  }
  for (const group of byPair.values()) {
    group.forEach((link, i) => {
      link.lane = i - (group.length - 1) / 2;
    });
  }
}
