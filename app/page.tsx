import { DraftDashboard } from "@/src/components/DraftDashboard";
import { getMergedHeroes } from "@/src/lib/api";

export default async function Home() {
  const heroes = await getMergedHeroes();

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 md:px-8 md:py-12">

      <section className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">MLBB Draft Intelligence</p>
          <h1 className="headline-gradient mt-3 text-3xl font-semibold md:text-5xl">
            Pro-Analyst Draft Predictor
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-text-muted md:text-base">
            This engine combines meta score, counter relations, synergy, and role fulfillment to
            deliver real-time pick recommendations.
          </p>
          {heroes.length === 0 ? (
            <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              API data could not be loaded. Please refresh in a moment.
            </p>
          ) : null}
        </div>

        <DraftDashboard heroes={heroes} />
      </section>
    </main>
  );
}
