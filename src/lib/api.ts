const API_BASE = "https://api.gms.moontontech.com/api/gms/source/2669606";
const STATS_ENDPOINT = `${API_BASE}/2756567`;
const RELATIONS_ENDPOINT = `${API_BASE}/2756564`;

const REVALIDATE_SECONDS = 86400;

export type DraftRole = "1" | "2" | "3" | "4" | "5";

export interface MergedHero {
  id: number;
  name: string;
  imageUrl: string;
  appearanceRate: number;
  banRate: number;
  winRate: number;
  roles: DraftRole[];
  roleLabels: string[];
  assistIds: number[];
  strongIds: number[];
  weakIds: number[];
  subHeroInsights: Array<{
    heroId: number;
    increaseWinRate: number;
  }>;
  baseScore: number;
}

const ROLE_MAP: Record<DraftRole, string> = {
  "1": "Exp Lane",
  "2": "Mid Lane",
  "3": "Roam",
  "4": "Jungle",
  "5": "Gold Lane",
};

const statsBody = {
  pageSize: 150,
  pageIndex: 1,
  filters: [
    { field: "bigrank", operator: "eq", value: "9" },
    { field: "match_type", operator: "eq", value: 0 },
  ],
  sorts: [
    {
      data: { field: "main_hero_appearance_rate", order: "desc" },
      type: "sequence",
    },
    { data: { field: "main_heroid", order: "desc" }, type: "sequence" },
  ],
  fields: [
    "main_hero",
    "main_hero_appearance_rate",
    "main_hero_ban_rate",
    "main_hero_channel",
    "main_hero_win_rate",
    "main_heroid",
    "data.sub_hero.hero",
    "data.sub_hero.hero_channel",
    "data.sub_hero.increase_win_rate",
    "data.sub_hero.heroid",
  ],
};

const relationsBody = {
  pageSize: 200,
  pageIndex: 1,
  filters: [
    {
      field: "<hero.data.sortid>",
      operator: "hasAnyOf",
      value: [1, 2, 3, 4, 5, 6],
    },
    {
      field: "<hero.data.roadsort>",
      operator: "hasAnyOf",
      value: ["1", "2", "3", "4", "5"],
    },
  ],
  sorts: [{ data: { field: "hero_id", order: "desc" }, type: "sequence" }],
  fields: [
    "id",
    "hero_id",
    "hero.data.name",
    "hero.data.smallmap",
    "hero.data.sortid",
    "hero.data.roadsort",
    "relation",
  ],
  object: [],
};

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function extractList(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const root = payload as Record<string, unknown>;

  if (Array.isArray(root.data)) {
    return root.data as Record<string, unknown>[];
  }

  if (root.data && typeof root.data === "object") {
    const dataObj = root.data as Record<string, unknown>;

    if (Array.isArray(dataObj.records)) {
      return dataObj.records as Record<string, unknown>[];
    }

    if (Array.isArray(dataObj.list)) {
      return dataObj.list as Record<string, unknown>[];
    }

    if (Array.isArray(dataObj.rows)) {
      return dataObj.rows as Record<string, unknown>[];
    }
  }

  if (Array.isArray(root.list)) {
    return root.list as Record<string, unknown>[];
  }

  if (Array.isArray(root.records)) {
    return root.records as Record<string, unknown>[];
  }

  if (Array.isArray(root.rows)) {
    return root.rows as Record<string, unknown>[];
  }

  return [];
}

function normalizeRelationIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids: number[] = [];

  for (const item of value) {
    if (typeof item === "number") {
      ids.push(item);
      continue;
    }

    if (typeof item === "string") {
      const parsed = Number(item);
      if (Number.isFinite(parsed)) {
        ids.push(parsed);
      }
      continue;
    }

    if (item && typeof item === "object") {
      const objectItem = item as Record<string, unknown>;
      const candidate =
        objectItem.heroid ??
        objectItem.hero_id ??
        objectItem.id ??
        objectItem.value ??
        objectItem.target;

      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) {
        ids.push(parsed);
      }
    }
  }

  return ids;
}

function normalizeSubHeroInsights(value: unknown): Array<{ heroId: number; increaseWinRate: number }> {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: Array<{ heroId: number; increaseWinRate: number }> = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const objectItem = item as Record<string, unknown>;
    const heroId = toNumber(objectItem.heroid ?? objectItem.hero_id ?? objectItem.id);
    const increaseWinRate = Number(objectItem.increase_win_rate ?? objectItem.increaseWinRate ?? 0);

    if (!heroId || !Number.isFinite(increaseWinRate)) {
      continue;
    }

    result.push({
      heroId,
      increaseWinRate,
    });
  }

  return result;
}

function normalizeRoles(value: unknown): DraftRole[] {
  const deduped = new Set<DraftRole>();

  const pushRoleCandidate = (candidate: unknown) => {
    if (candidate === null || candidate === undefined) {
      return;
    }

    if (typeof candidate === "object") {
      const objectCandidate = candidate as Record<string, unknown>;
      pushRoleCandidate(objectCandidate.road_sort_id);
      pushRoleCandidate(objectCandidate.roadsort);
      pushRoleCandidate(objectCandidate.role);

      if (objectCandidate.data && typeof objectCandidate.data === "object") {
        const dataObj = objectCandidate.data as Record<string, unknown>;
        pushRoleCandidate(dataObj.road_sort_id);
        pushRoleCandidate(dataObj.roadsort);
        pushRoleCandidate(dataObj.role);
      }

      return;
    }

    const normalized = String(candidate);
    const tokens = normalized.split(/[^1-5]+/).filter(Boolean);
    for (const token of tokens) {
      if (token in ROLE_MAP) {
        deduped.add(token as DraftRole);
      }
    }
  };

  if (Array.isArray(value)) {
    for (const item of value) {
      pushRoleCandidate(item);
    }

    return Array.from(deduped);
  }

  pushRoleCandidate(value);

  return Array.from(deduped);
}

function unwrapDataRow(row: Record<string, unknown>): Record<string, unknown> {
  if (row.data && typeof row.data === "object" && !Array.isArray(row.data)) {
    return row.data as Record<string, unknown>;
  }

  return row;
}

async function fetchMoonton<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`);
  }

  return (await response.json()) as T;
}

function calculateBaseScore(winRate: number, banRate: number, appearanceRate: number): number {
  return winRate * 0.5 + banRate * 0.3 + appearanceRate * 0.2;
}

export async function getMergedHeroes(): Promise<MergedHero[]> {
  try {
    const [statsResponse, relationResponse] = await Promise.all([
      fetchMoonton<unknown>(STATS_ENDPOINT, statsBody),
      fetchMoonton<unknown>(RELATIONS_ENDPOINT, relationsBody),
    ]);

    const statsRows = extractList(statsResponse);
    const relationRows = extractList(relationResponse);

    const relationMap = new Map<number, Record<string, unknown>>();

    for (const row of relationRows) {
      const rawRow = unwrapDataRow(row);
      const heroId = toNumber(rawRow.hero_id);
      if (!heroId) {
        continue;
      }
      relationMap.set(heroId, rawRow);
    }

    const merged: MergedHero[] = statsRows
      .map((row) => {
        const rawRow = unwrapDataRow(row);
        const heroId = toNumber(rawRow.main_heroid);
        if (!heroId) {
          return null;
        }

        const heroInfo = (rawRow.main_hero ?? {}) as Record<string, unknown>;
        const heroData = (heroInfo.data ?? {}) as Record<string, unknown>;

        const relationRow = relationMap.get(heroId) ?? {};
        const relationRoot = (relationRow.relation ?? {}) as Record<string, unknown>;
        const roleSource =
          (relationRow["hero.data.roadsort"] as unknown) ??
          ((relationRow.hero as Record<string, unknown> | undefined)?.data as
            | Record<string, unknown>
            | undefined)?.roadsort;
        const roles = normalizeRoles(roleSource);

        const appearanceRate = toNumber(rawRow.main_hero_appearance_rate);
        const banRate = toNumber(rawRow.main_hero_ban_rate);
        const winRate = toNumber(rawRow.main_hero_win_rate);

        return {
          id: heroId,
          name: String(heroData.name ?? `Hero ${heroId}`),
          imageUrl: String(heroData.head ?? relationRow["hero.data.smallmap"] ?? ""),
          appearanceRate,
          banRate,
          winRate,
          roles,
          roleLabels: roles.map((role) => ROLE_MAP[role]),
          assistIds: normalizeRelationIds(relationRoot.assist),
          strongIds: normalizeRelationIds(relationRoot.strong),
          weakIds: normalizeRelationIds(relationRoot.weak),
          subHeroInsights: normalizeSubHeroInsights(rawRow.sub_hero),
          baseScore: calculateBaseScore(winRate, banRate, appearanceRate),
        } satisfies MergedHero;
      })
      .filter((hero): hero is MergedHero => Boolean(hero));

    return merged.sort((a, b) => b.baseScore - a.baseScore);
  } catch (error) {
    console.error("Failed loading merged heroes from Moonton API", error);
    return [];
  }
}
