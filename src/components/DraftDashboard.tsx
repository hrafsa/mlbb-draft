"use client";
/* eslint-disable @next/next/no-img-element */

import { Crown, Search, ShieldBan, Sparkles, Swords, Users, X } from "lucide-react";
import { useMemo, useState } from "react";

import { recommendHeroes, type PickOrder } from "@/src/lib/DraftEngine";
import { type MergedHero } from "@/src/lib/api";
import { cn } from "@/src/lib/utils";

import { SpotlightCard } from "./SpotlightCard";

interface DraftDashboardProps {
    heroes: MergedHero[];
}

type TeamSide = "ally" | "enemy";
type DraftRank = "epic" | "legend" | "mythic";

interface RankConfig {
    key: DraftRank;
    label: string;
    bansPerTeam: number;
    picksPerTeam: number;
    banChunks: number[];
}

interface SelectorState {
    mode: "ban" | "pick";
    side: TeamSide;
    slotIndex: number;
}

interface BanPhaseMeta {
    phaseIndex: number;
    isFinalPhase: boolean;
}

type SlotTone = "primary" | "secondary";

const RANK_CONFIG: Record<DraftRank, RankConfig> = {
    epic: {
        key: "epic",
        label: "Epic",
        bansPerTeam: 3,
        picksPerTeam: 3,
        banChunks: [2, 1],
    },
    legend: {
        key: "legend",
        label: "Legend",
        bansPerTeam: 4,
        picksPerTeam: 4,
        banChunks: [2, 2],
    },
    mythic: {
        key: "mythic",
        label: "Mythic",
        bansPerTeam: 5,
        picksPerTeam: 5,
        banChunks: [3, 2],
    },
};

const FP_PICK_SEQUENCE: TeamSide[] = [
    "ally",
    "enemy",
    "enemy",
    "ally",
    "ally",
    "enemy",
    "enemy",
    "ally",
    "ally",
    "enemy",
];

function mirrorSide(side: TeamSide): TeamSide {
    return side === "ally" ? "enemy" : "ally";
}

function buildPickSequence(pickOrder: PickOrder, totalPicks: number): TeamSide[] {
    const base = FP_PICK_SEQUENCE.slice(0, totalPicks);
    if (pickOrder === "FP") {
        return base;
    }

    return base.map((side) => mirrorSide(side));
}

function buildBanSequence(chunks: number[]): TeamSide[] {
    const sequence: TeamSide[] = [];

    for (const chunk of chunks) {
        for (let i = 0; i < chunk; i += 1) {
            sequence.push("ally");
        }
        for (let i = 0; i < chunk; i += 1) {
            sequence.push("enemy");
        }
    }

    return sequence;
}

function getBanPhaseMeta(chunks: number[], banCount: number): BanPhaseMeta {
    let cursor = 0;

    for (let phaseIndex = 0; phaseIndex < chunks.length; phaseIndex += 1) {
        const phaseTotal = chunks[phaseIndex] * 2;
        if (banCount < cursor + phaseTotal) {
            return {
                phaseIndex,
                isFinalPhase: phaseIndex === chunks.length - 1,
            };
        }
        cursor += phaseTotal;
    }

    return {
        phaseIndex: Math.max(0, chunks.length - 1),
        isFinalPhase: true,
    };
}

function TeamHeroSlot({
    hero,
    onClick,
    active,
    ariaLabel,
    suggestedHeroes,
    rightHeroes,
    tone = "primary",
}: {
    hero?: MergedHero;
    onClick?: () => void;
    active?: boolean;
    ariaLabel?: string;
    suggestedHeroes?: MergedHero[];
    rightHeroes?: MergedHero[];
    tone?: SlotTone;
}) {
    const interactive = Boolean(onClick && !hero && active);
    const toneStyle =
        tone === "primary"
            ? {
                  strong: "border-cyan-300/45 bg-cyan-500/10",
                  soft: "border-cyan-300/20 bg-cyan-500/5",
              }
            : {
                  strong: "border-rose-300/45 bg-rose-500/10",
                  soft: "border-rose-300/20 bg-rose-500/5",
              };

    if (!hero) {
        return (
            <button
                type="button"
                aria-label={ariaLabel ?? "Select hero slot"}
                onClick={onClick}
                disabled={!interactive}
                className={cn(
                    "flex h-16 w-full items-center justify-between rounded-xl border border-dashed bg-white/[0.02] px-3 text-left transition",
                    interactive
                        ? `${toneStyle.strong} cursor-pointer shadow-[0_0_0_1px_rgba(94,106,210,0.28)] hover:bg-white/[0.10]`
                        : "cursor-not-allowed border-white/[0.12] bg-white/[0.02] opacity-70",
                    interactive ? "ring-1 ring-accent/60" : "",
                )}
            >
                <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                    {active ? "Select Hero" : "Pick Slot"}
                </span>
                <span className="flex items-center gap-1.5">
                    {(suggestedHeroes ?? []).slice(0, 4).map((item) => (
                        <img
                            key={`slot-suggestion-${item.id}`}
                            src={item.imageUrl || "/next.svg"}
                            alt={item.name}
                            className="h-8 w-8 rounded-full border border-white/[0.12] object-cover"
                        />
                    ))}
                </span>
            </button>
        );
    }

    return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
            <div className="flex items-center gap-3">
                <img
                    src={hero.imageUrl || "/next.svg"}
                    alt={hero.name}
                    className="h-10 w-10 rounded-full border border-white/[0.12] object-cover"
                />
                <div>
                    <p className="text-sm font-medium text-text-primary">{hero.name}</p>
                    <p className="mt-1 text-xs text-text-muted">{hero.roleLabels.join(" • ") || "Flex Role"}</p>
                </div>
            </div>
            {rightHeroes && rightHeroes.length > 0 ? (
                <div className="flex items-center gap-1.5">
                    {rightHeroes.slice(0, 4).map((item) => (
                        <img
                            key={`counter-right-${hero.id}-${item.id}`}
                            src={item.imageUrl || "/next.svg"}
                            alt={item.name}
                            className="h-8 w-8 rounded-full border border-cyan-300/35 object-cover"
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function BanIconSlot({
    hero,
    onClick,
    active,
    tone = "primary",
}: {
    hero?: MergedHero;
    onClick?: () => void;
    active?: boolean;
    tone?: SlotTone;
}) {
    const interactive = Boolean(onClick && !hero && active);
    const toneStyle =
        tone === "primary"
            ? {
                  strong: "border-cyan-300/45 bg-cyan-500/10",
                  soft: "border-cyan-300/20 bg-cyan-500/5",
              }
            : {
                  strong: "border-rose-300/45 bg-rose-500/10",
                  soft: "border-rose-300/20 bg-rose-500/5",
              };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!interactive}
            className={cn(
                "h-14 w-14 rounded-full border bg-bg-elevated/70 p-1 transition",
                interactive
                    ? `${toneStyle.strong} cursor-pointer shadow-[0_0_0_1px_rgba(94,106,210,0.28)] hover:bg-white/[0.10]`
                    : "cursor-not-allowed border-white/[0.12] bg-white/[0.02] opacity-70",
                interactive ? "ring-1 ring-accent/60" : "",
            )}
        >
            {hero ? (
                <img
                    src={hero.imageUrl || "/next.svg"}
                    alt={hero.name}
                    className="h-full w-full rounded-full object-cover grayscale"
                />
            ) : (
                <div className="h-full w-full rounded-full border border-dashed border-white/[0.15]" />
            )}
        </button>
    );
}

function TeamHeader({ side, title }: { side: TeamSide; title: string }) {
    return (
        <div
            className={cn(
                "rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]",
                side === "ally"
                    ? "border-accent/30 bg-accent/10 text-accent"
                    : "border-rose-300/30 bg-rose-500/10 text-rose-200",
            )}
        >
            {title}
        </div>
    );
}

export function DraftDashboard({ heroes }: DraftDashboardProps) {
    const createSlots = (size: number) => Array.from({ length: size }, () => null as number | null);

    const [rank, setRank] = useState<DraftRank>("mythic");
    const [pickOrder, setPickOrder] = useState<PickOrder>("FP");
    const [allyBans, setAllyBans] = useState<(number | null)[]>(() => createSlots(RANK_CONFIG.mythic.bansPerTeam));
    const [enemyBans, setEnemyBans] = useState<(number | null)[]>(() => createSlots(RANK_CONFIG.mythic.bansPerTeam));
    const [allyDraft, setAllyDraft] = useState<(number | null)[]>(() => createSlots(RANK_CONFIG.mythic.picksPerTeam));
    const [enemyDraft, setEnemyDraft] = useState<(number | null)[]>(() => createSlots(RANK_CONFIG.mythic.picksPerTeam));
    const [selector, setSelector] = useState<SelectorState | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const rankConfig = RANK_CONFIG[rank];
    const totalPicks = rankConfig.picksPerTeam * 2;
    const banTurns = useMemo(() => buildBanSequence(rankConfig.banChunks), [rankConfig.banChunks]);
    const pickTurns = useMemo(() => buildPickSequence(pickOrder, totalPicks), [pickOrder, totalPicks]);

    const allyDraftIds = useMemo(() => allyDraft.filter((id): id is number => id !== null), [allyDraft]);
    const enemyDraftIds = useMemo(() => enemyDraft.filter((id): id is number => id !== null), [enemyDraft]);
    const allyBanIds = useMemo(() => allyBans.filter((id): id is number => id !== null), [allyBans]);
    const enemyBanIds = useMemo(() => enemyBans.filter((id): id is number => id !== null), [enemyBans]);

    const heroMap = useMemo(() => new Map(heroes.map((hero) => [hero.id, hero])), [heroes]);
    const pickedSet = useMemo(() => new Set([...allyDraftIds, ...enemyDraftIds]), [allyDraftIds, enemyDraftIds]);
    const bannedSet = useMemo(() => new Set([...allyBanIds, ...enemyBanIds]), [allyBanIds, enemyBanIds]);
    const allyBanSet = useMemo(() => new Set(allyBanIds), [allyBanIds]);
    const enemyBanSet = useMemo(() => new Set(enemyBanIds), [enemyBanIds]);

    const allyHeroes = useMemo(
        () => allyDraft.map((id) => (id === null ? undefined : heroMap.get(id))),
        [allyDraft, heroMap],
    );

    const enemyHeroes = useMemo(
        () => enemyDraft.map((id) => (id === null ? undefined : heroMap.get(id))),
        [enemyDraft, heroMap],
    );

    const allyBanHeroes = useMemo(
        () => allyBans.map((id) => (id === null ? undefined : heroMap.get(id))),
        [allyBans, heroMap],
    );

    const enemyBanHeroes = useMemo(
        () => enemyBans.map((id) => (id === null ? undefined : heroMap.get(id))),
        [enemyBans, heroMap],
    );

    const banCount = allyBanIds.length + enemyBanIds.length;
    const pickCount = allyDraftIds.length + enemyDraftIds.length;
    const isBanPhase = banCount < banTurns.length;
    const isPickPhase = !isBanPhase && pickCount < pickTurns.length;
    const banPhaseMeta = useMemo(
        () => getBanPhaseMeta(rankConfig.banChunks, banCount),
        [rankConfig.banChunks, banCount],
    );

    const phaseOneGlobalBanSet = useMemo(() => {
        const firstChunk = rankConfig.banChunks[0] ?? 0;
        return new Set(
            [...allyBans.slice(0, firstChunk), ...enemyBans.slice(0, firstChunk)].filter(
                (id): id is number => id !== null,
            ),
        );
    }, [allyBans, enemyBans, rankConfig.banChunks]);

    const activeSide = useMemo<TeamSide | null>(() => {
        if (isBanPhase) {
            return banTurns[banCount] ?? null;
        }
        if (isPickPhase) {
            return pickTurns[pickCount] ?? null;
        }
        return null;
    }, [isBanPhase, isPickPhase, banTurns, pickTurns, banCount, pickCount]);

    const recommendations = useMemo(() => {
        return recommendHeroes({
            heroes,
            allyHeroIds: allyDraftIds,
            enemyHeroIds: enemyDraftIds,
            limit: 24,
        }).filter((entry) => !bannedSet.has(entry.hero.id));
    }, [heroes, allyDraftIds, enemyDraftIds, bannedSet]);

    const enemyPickPredictions = useMemo(() => {
        return recommendHeroes({
            heroes,
            allyHeroIds: enemyDraftIds,
            enemyHeroIds: allyDraftIds,
            limit: 24,
        }).filter((entry) => !bannedSet.has(entry.hero.id));
    }, [heroes, enemyDraftIds, allyDraftIds, bannedSet]);

    const banSuggestionCandidates = useMemo(() => {
        const sorted = [...heroes].sort((a, b) => b.baseScore - a.baseScore);
        const isPhaseTwoOrMore = banPhaseMeta.phaseIndex > 0;

        const allyCandidates = sorted.filter((hero) => {
            if (allyBanSet.has(hero.id)) {
                return false;
            }
            if (isPhaseTwoOrMore && phaseOneGlobalBanSet.has(hero.id)) {
                return false;
            }
            return true;
        });

        const enemyCandidates = sorted.filter((hero) => {
            if (enemyBanSet.has(hero.id)) {
                return false;
            }
            if (isPhaseTwoOrMore && phaseOneGlobalBanSet.has(hero.id)) {
                return false;
            }
            return true;
        });

        return {
            ally: allyCandidates.slice(0, 5),
            enemy: enemyCandidates.slice(0, 5),
        };
    }, [heroes, banPhaseMeta.phaseIndex, allyBanSet, enemyBanSet, phaseOneGlobalBanSet]);

    const pickSuggestions = useMemo(() => recommendations.slice(0, 5), [recommendations]);
    const enemyPickSuggestionList = useMemo(() => enemyPickPredictions.slice(0, 5), [enemyPickPredictions]);

    const pickSuggestionHeroes = useMemo(
        () => (isBanPhase ? [] : pickSuggestions.map((entry) => entry.hero).slice(0, 5)),
        [isBanPhase, pickSuggestions],
    );

    const enemySlotSuggestions = useMemo(() => {
        if (isBanPhase) {
            return [] as MergedHero[];
        }

        return enemyPickSuggestionList.map((entry) => entry.hero).slice(0, 5);
    }, [isBanPhase, enemyPickSuggestionList]);

    const counterByEnemyHero = useMemo(() => {
        const mapping = new Map<number, MergedHero[]>();

        for (const enemyHero of enemyHeroes) {
            if (!enemyHero) {
                continue;
            }

            const counters = enemyHero.subHeroInsights
                .map((insight) => ({
                    hero: heroMap.get(insight.heroId),
                    boost: insight.increaseWinRate,
                }))
                .filter((entry): entry is { hero: MergedHero; boost: number } => {
                    if (!entry.hero) {
                        return false;
                    }

                    const heroId = entry.hero.id;
                    return (
                        !bannedSet.has(heroId) &&
                        !enemyDraftIds.includes(heroId) &&
                        !allyDraftIds.includes(heroId)
                    );
                })
                .sort((a, b) => b.boost - a.boost)
                .slice(0, 4)
                .map((entry) => entry.hero);

            mapping.set(enemyHero.id, counters);
        }

        return mapping;
    }, [enemyHeroes, heroMap, bannedSet, enemyDraftIds, allyDraftIds]);

    const selectorHeroes = useMemo(() => {
        if (!selector) {
            return [];
        }

        const term = searchQuery.trim().toLowerCase();
        const base = heroes.filter((hero) => {
            if (!term) {
                return true;
            }
            return hero.name.toLowerCase().includes(term);
        });

        if (selector.mode === "ban") {
            const teamBan = selector.side === "ally" ? allyBanSet : enemyBanSet;
            const isPhaseTwoOrMore = banPhaseMeta.phaseIndex > 0;

            return base
                .filter((hero) => {
                    if (teamBan.has(hero.id)) {
                        return false;
                    }

                    if (isPhaseTwoOrMore && phaseOneGlobalBanSet.has(hero.id)) {
                        return false;
                    }

                    return true;
                })
                .slice(0, 60);
        }

        return base
            .filter((hero) => !pickedSet.has(hero.id) && !bannedSet.has(hero.id))
            .slice(0, 60);
    }, [
        selector,
        searchQuery,
        heroes,
        allyBanSet,
        enemyBanSet,
        pickedSet,
        bannedSet,
        banPhaseMeta.phaseIndex,
        phaseOneGlobalBanSet,
    ]);

    const resetAll = (nextRank: DraftRank = rank, nextPickOrder: PickOrder = pickOrder) => {
        const nextConfig = RANK_CONFIG[nextRank];

        setRank(nextRank);
        setPickOrder(nextPickOrder);
        setAllyBans(createSlots(nextConfig.bansPerTeam));
        setEnemyBans(createSlots(nextConfig.bansPerTeam));
        setAllyDraft(createSlots(nextConfig.picksPerTeam));
        setEnemyDraft(createSlots(nextConfig.picksPerTeam));
        setSelector(null);
        setSearchQuery("");
    };

    const getCurrentBanWindow = (side: TeamSide): [number, number] | null => {
        if (!isBanPhase || activeSide !== side) {
            return null;
        }

        const phaseIndex = banPhaseMeta.phaseIndex;
        const start = rankConfig.banChunks.slice(0, phaseIndex).reduce((sum, size) => sum + size, 0);
        const chunkSize = rankConfig.banChunks[phaseIndex] ?? 0;

        return [start, start + chunkSize - 1];
    };

    const isActiveBanSlot = (side: TeamSide, index: number) => {
        const window = getCurrentBanWindow(side);
        if (!window) {
            return false;
        }

        const [start, end] = window;
        const teamSlots = side === "ally" ? allyBans : enemyBans;

        return index >= start && index <= end && teamSlots[index] === null;
    };

    const getCurrentPickWindow = (side: TeamSide): [number, number] | null => {
        if (!isPickPhase || activeSide !== side) {
            return null;
        }

        let globalStart = pickCount;
        while (globalStart > 0 && pickTurns[globalStart - 1] === side) {
            globalStart -= 1;
        }

        const teamSlotStart = pickTurns.slice(0, globalStart).filter((turn) => turn === side).length;
        let blockSize = 0;

        for (let i = globalStart; i < pickTurns.length; i += 1) {
            if (pickTurns[i] !== side) {
                break;
            }
            blockSize += 1;
        }

        if (blockSize === 0) {
            return null;
        }

        return [teamSlotStart, teamSlotStart + blockSize - 1];
    };

    const isActivePickSlot = (side: TeamSide, index: number) => {
        const window = getCurrentPickWindow(side);
        if (!window) {
            return false;
        }

        const [start, end] = window;
        const teamSlots = side === "ally" ? allyDraft : enemyDraft;

        return index >= start && index <= end && teamSlots[index] === null;
    };

    const openSelector = (mode: "ban" | "pick", side: TeamSide, slotIndex: number) => {
        if (mode === "ban" && !isActiveBanSlot(side, slotIndex)) {
            return;
        }

        if (mode === "pick" && !isActivePickSlot(side, slotIndex)) {
            return;
        }

        setSelector({ mode, side, slotIndex });
        setSearchQuery("");
    };

    const applySelectorHero = (heroId: number) => {
        if (!selector || !activeSide) {
            return;
        }

        if (selector.side !== activeSide) {
            return;
        }

        if (selector.mode === "ban") {
            if (!isBanPhase) {
                return;
            }

            if (selector.side === "ally") {
                if (allyBanSet.has(heroId)) {
                    return;
                }
                if (allyBans[selector.slotIndex] !== null) {
                    return;
                }
                if (banPhaseMeta.phaseIndex > 0 && phaseOneGlobalBanSet.has(heroId)) {
                    return;
                }
                setAllyBans((prev) => {
                    const next = [...prev];
                    next[selector.slotIndex] = heroId;
                    return next;
                });
            } else {
                if (enemyBanSet.has(heroId)) {
                    return;
                }
                if (enemyBans[selector.slotIndex] !== null) {
                    return;
                }
                if (banPhaseMeta.phaseIndex > 0 && phaseOneGlobalBanSet.has(heroId)) {
                    return;
                }
                setEnemyBans((prev) => {
                    const next = [...prev];
                    next[selector.slotIndex] = heroId;
                    return next;
                });
            }

            setSelector(null);
            setSearchQuery("");
            return;
        }

        if (!isPickPhase) {
            return;
        }

        if (pickedSet.has(heroId) || bannedSet.has(heroId)) {
            return;
        }

        if (selector.side === "ally") {
            if (allyDraft[selector.slotIndex] !== null) {
                return;
            }

            setAllyDraft((prev) => {
                const next = [...prev];
                next[selector.slotIndex] = heroId;
                return next;
            });
        } else {
            if (enemyDraft[selector.slotIndex] !== null) {
                return;
            }

            setEnemyDraft((prev) => {
                const next = [...prev];
                next[selector.slotIndex] = heroId;
                return next;
            });
        }

        setSelector(null);
        setSearchQuery("");
    };

    return (
        <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:auto-rows-[minmax(160px,auto)]">
                <SpotlightCard className="lg:col-span-12">
                    <div className="rounded-xl border border-white/[0.08] bg-bg-elevated/60 p-3 mb-5">
                        <div className="flex flex-wrap items-center gap-2">
                            <Sparkles className="h-4 w-4 text-accent" />
                            {(Object.keys(RANK_CONFIG) as DraftRank[]).map((rankKey) => (
                                <button
                                    key={rankKey}
                                    type="button"
                                    onClick={() => resetAll(rankKey, pickOrder)}
                                    className={cn(
                                        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                                        rank === rankKey
                                            ? "border-accent/60 bg-accent/20 text-white"
                                            : "border-white/[0.1] text-text-muted hover:bg-white/[0.05]",
                                    )}
                                >
                                    {RANK_CONFIG[rankKey].label}
                                </button>
                            ))}

                            <div className="ml-auto rounded-full border border-white/[0.1] bg-bg-elevated p-0.5 text-[11px]">
                                <button
                                    type="button"
                                    onClick={() => resetAll(rank, "FP")}
                                    className={cn(
                                        "rounded-full px-2.5 py-1 transition",
                                        pickOrder === "FP" ? "bg-accent/20 text-white" : "text-text-muted",
                                    )}
                                >
                                    First Pick
                                </button>
                                <button
                                    type="button"
                                    onClick={() => resetAll(rank, "SP")}
                                    className={cn(
                                        "rounded-full px-2.5 py-1 transition",
                                        pickOrder === "SP" ? "bg-accent/20 text-white" : "text-text-muted",
                                    )}
                                >
                                    Second Pick
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => resetAll(rank, pickOrder)}
                                className="rounded-full border border-white/[0.12] px-2.5 py-1 text-[11px] text-text-muted hover:bg-white/[0.05]"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    {!isBanPhase ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2 mb-5">
                            <div className="rounded-xl border border-white/[0.08] bg-bg-elevated/70 p-4">
                                <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Pick Suggestions</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {pickSuggestionHeroes.map((hero) => (
                                        <img
                                            key={`pick-suggest-inline-${hero.id}`}
                                            src={hero.imageUrl || "/next.svg"}
                                            alt={hero.name}
                                            className="h-10 w-10 rounded-full border border-white/[0.12] object-cover"
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="rounded-xl border border-white/[0.08] bg-bg-elevated/70 p-4">
                                <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Enemy Pick Predictions</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {enemySlotSuggestions.map((hero) => (
                                        <img
                                            key={`enemy-predict-inline-${hero.id}`}
                                            src={hero.imageUrl || "/next.svg"}
                                            alt={hero.name}
                                            className="h-10 w-10 rounded-full border border-white/[0.12] object-cover"
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : null}
                    <div className="grid gap-3 lg:grid-cols-3">
                        <div>
                            <div className="mb-2 flex items-center gap-2">
                                <ShieldBan className="h-4 w-4 text-accent" />
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Your Ban</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {Array.from({ length: rankConfig.bansPerTeam }).map((_, index) => (
                                    <BanIconSlot
                                        key={`ally-ban-${index}`}
                                        hero={allyBanHeroes[index]}
                                        active={isActiveBanSlot("ally", index)}
                                        tone="primary"
                                        onClick={() => openSelector("ban", "ally", index)}
                                    />
                                ))}
                            </div>
                            {isBanPhase ? (
                                <>
                                    <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-text-muted">Ban Suggestions</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {Array.from({ length: 5 }).map((_, index) => (
                                            <BanIconSlot
                                                key={`ally-ban-suggest-${index}`}
                                                hero={banSuggestionCandidates.ally[index]}
                                                tone="primary"
                                            />
                                        ))}
                                    </div>
                                </>
                            ) : null}
                        </div>

                        <div>
                            <div className="mb-2 flex items-center gap-2">
                                <Crown className="h-4 w-4 text-amber-300" />
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Status</p>
                            </div>
                            <div className="rounded-xl border border-white/[0.08] bg-bg-elevated/70 p-3 text-xs text-text-muted">
                                <p>Ban Progress: {banCount}/{banTurns.length}</p>
                                <p className="mt-1">Pick Progress: {pickCount}/{pickTurns.length}</p>
                                <p className="mt-1">Mode: {pickOrder === "FP" ? "First Pick" : "Second Pick"}</p>
                            </div>
                        </div>

                        <div>
                            <div className="mb-2 flex items-center gap-2">
                                <ShieldBan className="h-4 w-4 text-rose-300" />
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Enemy Ban</p>
                            </div>
                            <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                                {Array.from({ length: rankConfig.bansPerTeam }).map((_, index) => (
                                    <BanIconSlot
                                        key={`enemy-ban-${index}`}
                                        hero={enemyBanHeroes[index]}
                                        active={isActiveBanSlot("enemy", index)}
                                        tone="secondary"
                                        onClick={() => openSelector("ban", "enemy", index)}
                                    />
                                ))}
                            </div>
                            {isBanPhase ? (
                                <>
                                    <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-text-muted lg:text-right">Ban Predictions</p>
                                    <div className="mt-2 flex flex-wrap justify-start gap-2 lg:justify-end">
                                        {Array.from({ length: 5 }).map((_, index) => (
                                            <BanIconSlot
                                                key={`enemy-ban-predict-${index}`}
                                                hero={banSuggestionCandidates.enemy[index]}
                                                tone="secondary"
                                            />
                                        ))}
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>
                </SpotlightCard>

                <SpotlightCard className="lg:col-span-12">
                    <div className="mb-3 grid gap-3 lg:grid-cols-2">
                        <TeamHeader side="ally" title="Your Team" />
                        <TeamHeader side="enemy" title="Enemy Team" />
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-text-muted">
                                <Users className="h-3.5 w-3.5" />
                                Picks
                            </div>
                            {Array.from({ length: rankConfig.picksPerTeam }).map((_, index) => (
                                <TeamHeroSlot
                                    key={`ally-pick-${index}`}
                                    hero={allyHeroes[index]}
                                    active={isActivePickSlot("ally", index)}
                                    ariaLabel={`Open ally pick slot ${index + 1}`}
                                    tone="primary"
                                    suggestedHeroes={!isBanPhase ? pickSuggestionHeroes : []}
                                    onClick={() => openSelector("pick", "ally", index)}
                                />
                            ))}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-text-muted">
                                <Swords className="h-3.5 w-3.5" />
                                Picks
                            </div>
                            {Array.from({ length: rankConfig.picksPerTeam }).map((_, index) => (
                                <TeamHeroSlot
                                    key={`enemy-pick-${index}`}
                                    hero={enemyHeroes[index]}
                                    active={isActivePickSlot("enemy", index)}
                                    ariaLabel={`Open enemy pick slot ${index + 1}`}
                                    tone="secondary"
                                    suggestedHeroes={enemySlotSuggestions}
                                    rightHeroes={enemyHeroes[index] ? counterByEnemyHero.get(enemyHeroes[index].id) ?? [] : []}
                                    onClick={() => openSelector("pick", "enemy", index)}
                                />
                            ))}
                        </div>
                    </div>
                </SpotlightCard>
            </div>

            {selector ? (
                <div className="fixed bottom-4 right-4 z-50 w-[min(520px,calc(100vw-2rem))] rounded-2xl border border-white/[0.12] bg-bg-elevated/95 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-text-primary">
                            {selector.mode === "ban" ? "Select Hero Ban" : "Select Hero Pick"} • {selector.side === "ally" ? "Your Team" : "Enemy Team"} • Slot {selector.slotIndex + 1}
                        </p>
                        <button
                            type="button"
                            onClick={() => setSelector(null)}
                            className="rounded-md border border-white/[0.12] p-1 text-text-muted hover:bg-white/[0.06]"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/[0.1] bg-black/20 px-3 py-2">
                        <Search className="h-4 w-4 text-text-muted" />
                        <input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search heroes..."
                            className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                        />
                    </div>

                    <div className="mt-3 max-h-[48vh] space-y-2 overflow-y-auto pr-1">
                        {selectorHeroes.map((hero) => (
                            <button
                                key={`${selector.mode}-${selector.side}-${hero.id}`}
                                type="button"
                                onClick={() => applySelectorHero(hero.id)}
                                className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left transition hover:border-accent/50 hover:bg-accent/10"
                            >
                                <img
                                    src={hero.imageUrl || "/next.svg"}
                                    alt={hero.name}
                                    className="h-10 w-10 rounded-full border border-white/[0.12] object-cover"
                                />
                                <div>
                                    <p className="text-sm font-medium text-text-primary">{hero.name}</p>
                                    <p className="mt-1 text-xs text-text-muted">{hero.roleLabels.join(" • ") || "Flex Role"}</p>
                                </div>
                            </button>
                        ))}
                        {selectorHeroes.length === 0 ? (
                            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-4 text-sm text-text-muted">
                                No heroes found or available for this slot.
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </>
    );
}