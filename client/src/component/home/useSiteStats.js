import { useGetPublicStatsQuery } from '../../store/api/statsApi';

/** Fills `source` items from GET /stats/public and drops the ones with no real data yet (0 / missing → hidden, never faked). */
export const useSiteStats = (items) => {
  const { data } = useGetPublicStatsQuery();
  const live = data?.data || {};
  return items
    .map((i) => {
      if (!i.source) return i;
      const raw = Number(live[i.source]) || 0;
      return { ...i, value: i.round && raw >= 100 ? Math.floor(raw / i.round) * i.round : raw };
    })
    .filter((i) => !i.source || i.value > 0);
};
