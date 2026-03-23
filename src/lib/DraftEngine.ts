import { type DraftRole, type MergedHero } from "@/src/lib/api";

export type PickOrder = "FP" | "SP";

export interface HeroRecommendation {
  hero: MergedHero;
  totalScore: number;
  counterModifier: number;
  synergyModifier: number;
}

interface RecommendInput {
  heroes: MergedHero[];
  allyHeroIds: number[];
  enemyHeroIds: number[];
  limit?: number;
}

export function calculateBaseScore(hero: MergedHero): number {
  return hero.baseScore;
}

export function getBanRecommendations(
  heroes: MergedHero[],
  pickOrder: PickOrder,
): MergedHero[] {
  const sorted = [...heroes].sort((a, b) => b.baseScore - a.baseScore);

  if (pickOrder === "FP") {
    return sorted.slice(1, 4);
  }

  return sorted.slice(0, 1);
}

function collectTakenRoles(allies: MergedHero[]): Set<DraftRole> {
  const roleSet = new Set<DraftRole>();

  for (const ally of allies) {
    for (const role of ally.roles) {
      roleSet.add(role);
    }
  }

  return roleSet;
}

export function recommendHeroes({
  heroes,
  allyHeroIds,
  enemyHeroIds,
  limit = 3,
}: RecommendInput): HeroRecommendation[] {
  const allySet = new Set(allyHeroIds);
  const enemySet = new Set(enemyHeroIds);

  const allies = heroes.filter((hero) => allySet.has(hero.id));
  const takenRoles = collectTakenRoles(allies);

  const recommendations = heroes
    .filter((hero) => !allySet.has(hero.id) && !enemySet.has(hero.id))
    .map((hero) => {
      let counterModifier = 0;
      let synergyModifier = 0;
      let totalScore = calculateBaseScore(hero);

      for (const enemyId of enemyHeroIds) {
        if (hero.strongIds.includes(enemyId)) {
          counterModifier += 20;
        }
        if (hero.weakIds.includes(enemyId)) {
          counterModifier -= 25;
        }
      }

      for (const allyId of allyHeroIds) {
        if (hero.assistIds.includes(allyId)) {
          synergyModifier += 15;
        }
      }

      totalScore += counterModifier + synergyModifier;

      if (hero.roles.length === 1 && takenRoles.has(hero.roles[0])) {
        totalScore = -1000;
      }

      return {
        hero,
        totalScore,
        counterModifier,
        synergyModifier,
      } satisfies HeroRecommendation;
    })
    .sort((a, b) => b.totalScore - a.totalScore);

  return recommendations.slice(0, limit);
}
