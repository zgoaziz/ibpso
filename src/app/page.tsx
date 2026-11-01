"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Item = { weight: number; value: number };

type Particle = {
  position: number[];
  velocity: number[];
  pbestPosition: number[];
  pbestFitness: number;
  fitness: number;
  weight: number;
  value: number;
};

type GlobalBest = {
  position: number[];
  fitness: number;
  weight: number;
  value: number;
};

type HistoryPoint = {
  iteration: number;
  avg: number;
  best: number;
  gbest: number;
};

const DEFAULT_ITEMS: Item[] = [
  { weight: 10, value: 60 },
  { weight: 20, value: 100 },
  { weight: 30, value: 120 },
  { weight: 12, value: 80 },
  { weight: 17, value: 90 },
  { weight: 5, value: 30 },
  { weight: 9, value: 45 },
  { weight: 7, value: 40 },
  { weight: 4, value: 25 },
  { weight: 6, value: 35 },
];

const NUM_PARTICLES = 12;
const PENALTY_FACTOR = 12;
const STAGNATION_LIMIT = 6;
const DISTURB_RATE = 0.2;

function randomPosition(length: number) {
  return Array.from({ length }, () => (Math.random() > 0.5 ? 1 : 0));
}

function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x));
}

function evaluatePosition(
  position: number[],
  items: Item[],
  capacity: number,
) {
  let weight = 0;
  let value = 0;
  position.forEach((bit, idx) => {
    if (bit === 1) {
      weight += items[idx].weight;
      value += items[idx].value;
    }
  });
  const overweight = Math.max(0, weight - capacity);
  const penalty = overweight > 0 ? overweight * PENALTY_FACTOR : 0;
  const fitness = value - penalty;
  return { weight, value, fitness, isOverweight: overweight > 0, penalty };
}

function clonePosition(pos: number[]) {
  return [...pos];
}

function arraysEqual(a: number[], b: number[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function makeParticles(items: Item[], capacity: number): {
  particles: Particle[];
  gbest: GlobalBest;
} {
  const particles: Particle[] = [];
  let gbest: GlobalBest = {
    position: [],
    fitness: Number.NEGATIVE_INFINITY,
    weight: 0,
    value: 0,
  };

  for (let i = 0; i < NUM_PARTICLES; i += 1) {
    const position = randomPosition(items.length);
    const velocity = Array.from({ length: items.length }, () => Math.random());
    const { weight, value, fitness } = evaluatePosition(
      position,
      items,
      capacity,
    );
    const pbestPosition = clonePosition(position);
    const pbestFitness = fitness;
    const particle: Particle = {
      position,
      velocity,
      pbestPosition,
      pbestFitness,
      fitness,
      weight,
      value,
    };
    particles.push(particle);
    if (fitness > gbest.fitness) {
      gbest = { position: clonePosition(position), fitness, weight, value };
    }
  }

  return { particles, gbest };
}

function formatBits(bits: number[]) {
  return bits.join("");
}

function generateRandomKnapsack(): { items: Item[]; capacity: number } {
  const count = 8 + Math.floor(Math.random() * 5);
  const items = Array.from({ length: count }, () => ({
    weight: 4 + Math.floor(Math.random() * 20),
    value: 15 + Math.floor(Math.random() * 120),
  }));
  const capacity =
    Math.max(
      30,
      Math.round(
        items.reduce((sum, it) => sum + it.weight, 0) * (0.45 + Math.random() * 0.15),
      ),
    );
  return { items, capacity };
}

function FitnessChart({
  data,
  showOnlyGbest,
}: {
  data: HistoryPoint[];
  showOnlyGbest: boolean;
}) {
  const width = 560;
  const height = 220;
  const padding = 32;

  if (data.length === 0) {
    return (
      <div className="h-[220px] rounded-lg border border-dashed border-zinc-200 bg-white/60 p-4 text-sm text-zinc-500">
        Graph will appear as soon as iterations start.
      </div>
    );
  }

  const xs = data.map((d) => d.iteration);
  const ys = data.flatMap((d) => [d.avg, d.best, d.gbest]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const scaleX = (x: number) =>
    padding +
    ((x - minX) / Math.max(1, maxX - minX)) * (width - padding * 2);
  const scaleY = (y: number) =>
    height - padding - ((y - minY) / Math.max(1, maxY - minY)) * (height - padding * 2);

  const buildPath = (getter: (d: HistoryPoint) => number) =>
    data
      .map((d, i) => {
        const cmd = i === 0 ? "M" : "L";
        return `${cmd}${scaleX(d.iteration)},${scaleY(getter(d))}`;
      })
      .join(" ");

  const gridY = Array.from({ length: 5 }, (_, i) => minY + ((maxY - minY) / 4) * i);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full rounded-lg border border-zinc-200 bg-white shadow-sm"
    >
      <g>
        {gridY.map((yVal, idx) => {
          const y = scaleY(yVal);
          return (
            <g key={idx}>
              <line
                x1={padding}
                x2={width - padding}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text
                x={8}
                y={y + 4}
                fontSize={10}
                fill="#6b7280"
              >
                {yVal.toFixed(0)}
              </text>
            </g>
          );
        })}
      </g>
      {!showOnlyGbest && (
        <path
          d={buildPath((d) => d.avg)}
          fill="none"
          stroke="#22c55e"
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
      {!showOnlyGbest && (
        <path
          d={buildPath((d) => d.best)}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
      <path
        d={buildPath((d) => d.gbest)}
        fill="none"
        stroke="#f59e0b"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <g>
        {data.map((d, idx) => (
          <circle
            key={idx}
            cx={scaleX(d.iteration)}
            cy={scaleY(d.gbest)}
            r={3}
            fill="#f59e0b"
            opacity={0.8}
          />
        ))}
      </g>
    </svg>
  );
}

export default function Home() {
  const [items, setItems] = useState<Item[]>(DEFAULT_ITEMS);
  const [capacity, setCapacity] = useState<number>(65);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [gbest, setGbest] = useState<GlobalBest>({
    position: [],
    fitness: Number.NEGATIVE_INFINITY,
    weight: 0,
    value: 0,
  });
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [iteration, setIteration] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(450);
  const [improved, setImproved] = useState(true);
  const [showOnlyGbest, setShowOnlyGbest] = useState(false);
  const [explanation, setExplanation] = useState<string[]>([]);
  const [stagnation, setStagnation] = useState(0);
  const lastGbest = useRef<number>(Number.NEGATIVE_INFINITY);

  // initialize
  useEffect(() => {
    const { particles: initParticles, gbest: initGbest } = makeParticles(
      items,
      capacity,
    );
    setParticles(initParticles);
    setGbest(initGbest);
    setHistory([]);
    setIteration(0);
    setStagnation(0);
    lastGbest.current = initGbest.fitness;
    setExplanation([
      "Ready. Use Start to run iterations or Step for a single iteration.",
    ]);
  }, [items, capacity]);

  const disturb = useCallback(
    (currentGbest: GlobalBest): GlobalBest => {
      const mutated = currentGbest.position.map((bit) => {
        if (Math.random() < DISTURB_RATE) {
          return bit === 1 ? 0 : 1;
        }
        return bit;
      });
      const { fitness, weight, value } = evaluatePosition(
        mutated,
        items,
        capacity,
      );
      if (fitness > currentGbest.fitness) {
        return { position: mutated, fitness, weight, value };
      }
      return currentGbest;
    },
    [capacity, items],
  );

  const runIteration = useCallback(() => {
    const messages: string[] = [];
    let summaryLine = "";

    setParticles((prev) => {
      let workingGbest = { ...gbest };
      let bestFitness = Number.NEGATIVE_INFINITY;
      let totalFitness = 0;
      const nextParticles = prev.map((p) => {
        const w = 0.72;
        const c1 = 1.4;
        const c2 = 1.6;
        const position: number[] = [];
        const velocity: number[] = [];
        let flips = 0;

        for (let i = 0; i < p.position.length; i += 1) {
          const r1 = Math.random();
          const r2 = Math.random();
          const v =
            w * p.velocity[i] +
            c1 * r1 * (p.pbestPosition[i] - p.position[i]) +
            c2 * r2 * (workingGbest.position[i] ?? 0 - p.position[i]);
          const prob = sigmoid(v);
          const bit = Math.random() < prob ? 1 : 0;
          if (bit !== p.position[i]) flips += 1;
          position.push(bit);
          velocity.push(v);
        }

        const evalResult = evaluatePosition(position, items, capacity);
        let pbestPosition = p.pbestPosition;
        let pbestFitness = p.pbestFitness;
        let pbestUpdated = false;

        if (evalResult.fitness > p.pbestFitness) {
          pbestPosition = clonePosition(position);
          pbestFitness = evalResult.fitness;
          pbestUpdated = true;
        }

        if (evalResult.fitness > workingGbest.fitness) {
          workingGbest = {
            position: clonePosition(position),
            fitness: evalResult.fitness,
            weight: evalResult.weight,
            value: evalResult.value,
          };
        }

        if (evalResult.fitness > bestFitness) {
          bestFitness = evalResult.fitness;
        }

        totalFitness += evalResult.fitness;

        const label = `Particle ${formatBits(position)} | flips: ${flips}${
          evalResult.isOverweight ? " (overweight → penalty)" : ""
        }${pbestUpdated ? " | pbest updated" : ""}`;

        messages.push(label);

        return {
          position,
          velocity,
          pbestPosition,
          pbestFitness,
          fitness: evalResult.fitness,
          weight: evalResult.weight,
          value: evalResult.value,
        };
      });

      // disturbance if stagnating
      if (
        improved &&
        stagnation >= STAGNATION_LIMIT &&
        workingGbest.position.length > 0
      ) {
        const disturbed = disturb(workingGbest);
        const disturbedApplied = disturbed.fitness !== workingGbest.fitness;
        workingGbest = disturbed;
        setStagnation(0);
        messages.push(
          disturbedApplied
            ? "Disturb triggered: gbest shaken and improved."
            : "Disturb triggered: gbest shaken but kept previous best.",
        );
      }

      const avgFitness = totalFitness / nextParticles.length;
      setHistory((prevHistory) => [
        ...prevHistory,
        {
          iteration: iteration + 1,
          avg: Number.isFinite(avgFitness) ? avgFitness : 0,
          best: bestFitness,
          gbest: workingGbest.fitness,
        },
      ]);

      const improvedNow = workingGbest.fitness > lastGbest.current;
      setStagnation((s) => (improvedNow ? 0 : s + 1));
      lastGbest.current = workingGbest.fitness;
      setGbest(workingGbest);
      setIteration((i) => i + 1);

      summaryLine = `Iter ${iteration + 1}: best=${bestFitness.toFixed(
        1,
      )}, avg=${avgFitness.toFixed(1)}, gbest=${workingGbest.fitness.toFixed(
        1,
      )}${
        improvedNow ? " (gbest improved)" : ""
      }${workingGbest.weight > capacity ? " | penalty on gbest" : ""}`;

      return nextParticles;
    });

    if (messages.length > 0 || summaryLine) {
      setExplanation((prevExp) => {
        const nextExp = [...prevExp, ...messages, summaryLine].filter(Boolean);
        return nextExp.slice(-10);
      });
    }
  }, [capacity, disturb, gbest, improved, iteration, items, stagnation]);

  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => {
      runIteration();
    }, speed);
    return () => clearTimeout(id);
  }, [runIteration, running, speed]);

  const reset = useCallback(() => {
    const { particles: initParticles, gbest: initGbest } = makeParticles(
      items,
      capacity,
    );
    setParticles(initParticles);
    setGbest(initGbest);
    setHistory([]);
    setIteration(0);
    setStagnation(0);
    lastGbest.current = initGbest.fitness;
    setExplanation(["Reset done."]);
    setRunning(false);
  }, [capacity, items]);

  const handleRandomKnapsack = () => {
    const { items: generatedItems, capacity: generatedCapacity } =
      generateRandomKnapsack();
    setItems(generatedItems);
    setCapacity(generatedCapacity);
    setRunning(false);
  };

  const toggleRunning = () => setRunning((r) => !r);

  const step = () => {
    setRunning(false);
    runIteration();
  };

  const iterationInfo = useMemo(
    () => ({
      avgFitness:
        history.length === 0
          ? 0
          : history[history.length - 1]?.avg ?? 0,
      lastBest:
        history.length === 0
          ? gbest.fitness
          : history[history.length - 1]?.best ?? gbest.fitness,
    }),
    [gbest.fitness, history],
  );

  const bestPbest = useMemo(() => {
    if (particles.length === 0) return null;
    return particles.reduce<
      | {
          index: number;
          bits: number[];
          fitness: number;
          weight: number;
          value: number;
        }
      | null
    >((best, p, idx) => {
      if (!best || p.pbestFitness > best.fitness) {
        return {
          index: idx,
          bits: p.pbestPosition,
          fitness: p.pbestFitness,
          weight: p.weight,
          value: p.value,
        };
      }
      return best;
    }, null);
  }, [particles]);

  const recap = useMemo(() => {
    if (history.length === 0) return null;
    const last = history[history.length - 1];
    const overweight = gbest.weight > capacity;
    const reason = overweight
      ? `Gbest dépasse la capacité (${gbest.weight}/${capacity}) mais reste la meilleure fitness après pénalité.`
      : `Gbest reste sous la capacité (${gbest.weight}/${capacity}) et maximise la valeur pour cette itération.`;
    const pbestLine = bestPbest
      ? `Meilleure pbest: particle #${bestPbest.index + 1} (fitness ${bestPbest.fitness.toFixed(
          1,
        )}, valeur ${bestPbest.value}, poids ${bestPbest.weight}/${capacity}).`
      : "Aucune pbest significative pour l'instant.";
    return {
      iteration: last.iteration,
      avg: last.avg,
      best: last.best,
      gbest: last.gbest,
      bits: formatBits(gbest.position),
      reason,
      pbestLine,
    };
  }, [bestPbest, capacity, gbest, history]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-slate-100 text-zinc-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-12 pt-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Improved Binary Particle Swarm Optimization — 0/1 Knapsack
          </h1>
          <p className="text-sm text-zinc-600">
            Démarrez avec Start, ajustez la vitesse, suivez les flips de bits,
            pénalités de poids, mises à jour pbest/gbest et le disturb en cas de
            stagnation. Bouton “Show only gbest” simplifie le graphe.
          </p>
        </header>

        <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={toggleRunning}
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
            >
              {running ? "Pause" : "Start"}
            </button>
            <button
              onClick={() => setRunning(false)}
              className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-amber-600"
            >
              Pause
            </button>
            <button
              onClick={reset}
              className="rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-slate-900"
            >
              Reset
            </button>
            <button
              onClick={step}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
              Step (1 iteration)
            </button>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-zinc-600">
                Speed {speed} ms
              </label>
              <input
                type="range"
                min={50}
                max={1500}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="h-2 w-40 cursor-pointer accent-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2">
              <input
                id="improved"
                type="checkbox"
                checked={improved}
                onChange={(e) => setImproved(e.target.checked)}
              />
              <label htmlFor="improved" className="text-sm font-medium">
                ⚡ Improved BPSO (disturb on stagnation)
              </label>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2">
              <input
                id="only-gbest"
                type="checkbox"
                checked={showOnlyGbest}
                onChange={(e) => setShowOnlyGbest(e.target.checked)}
              />
              <label htmlFor="only-gbest" className="text-sm font-medium">
                🌟 Show only gbest
              </label>
            </div>
            <button
              onClick={handleRandomKnapsack}
              className="rounded-md border border-dashed border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              🎲 Generate random knapsack
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Particles</h2>
                <div className="text-xs text-zinc-500">
                  Red line = overweight; gold border = gbest; ⭐ = pbest.
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {particles.map((p, idx) => {
                  const isGbest = arraysEqual(p.position, gbest.position);
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border p-3 transition ${
                        p.weight > capacity
                          ? "border-red-300 bg-red-50"
                          : "border-zinc-200 bg-white"
                      } ${isGbest ? "ring-2 ring-amber-400" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-zinc-700">
                          #{idx + 1}
                        </div>
                        {isGbest && (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                            gbest
                          </span>
                        )}
                        {p.fitness === p.pbestFitness && (
                          <span className="text-[13px]">⭐</span>
                        )}
                        <div className="ml-auto text-xs text-zinc-500">
                          weight {p.weight} / cap {capacity} • value {p.value} •
                          fitness {p.fitness.toFixed(1)}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        {p.position.map((bit, bitIdx) => (
                          <div
                            key={bitIdx}
                            className={`h-7 w-7 rounded border text-center text-xs font-semibold leading-7 ${
                              bit === 1
                                ? "border-amber-200 bg-amber-300 text-amber-950"
                                : "border-zinc-200 bg-zinc-100 text-zinc-500"
                            }`}
                            title={`Item ${bitIdx + 1} (w:${items[bitIdx]?.weight ?? "-"}, v:${items[bitIdx]?.value ?? "-"})`}
                          >
                            {bit}
                          </div>
                        ))}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        pbest {formatBits(p.pbestPosition)} | position{" "}
                        {formatBits(p.position)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Evolution graph</h2>
                <div className="text-xs text-zinc-600">
                  Fitness avg (green), best (blue), gbest (gold).
                </div>
              </div>
              <FitnessChart data={history} showOnlyGbest={showOnlyGbest} />
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Explanation</h2>
                <div className="text-xs text-zinc-500">
                  Flips, penalties, pbest/gbest updates, disturb triggers.
                </div>
              </div>
              <div className="flex flex-col gap-1 text-sm text-zinc-700">
                {explanation.map((line, idx) => (
                  <div key={idx} className="rounded-md bg-zinc-50 px-2 py-1">
                    {line}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recap (dernière itération)</h2>
                <div className="text-xs text-zinc-500">
                  Synthèse courte pour expliquer gbest/pbest.
                </div>
              </div>
              {recap ? (
                <div className="space-y-2 text-sm text-zinc-700">
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-600">
                    <span className="rounded bg-zinc-100 px-2 py-1 font-semibold">
                      Iter {recap.iteration}
                    </span>
                    <span className="rounded bg-amber-100 px-2 py-1 text-amber-800">
                      gbest {recap.gbest.toFixed(1)}
                    </span>
                    <span className="rounded bg-blue-100 px-2 py-1 text-blue-800">
                      best {recap.best.toFixed(1)}
                    </span>
                    <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-800">
                      avg {recap.avg.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-sm">
                    gbest bits: <span className="font-mono">{recap.bits}</span>
                  </div>
                  <div className="text-sm text-zinc-700">{recap.reason}</div>
                  <div className="text-sm text-zinc-700">{recap.pbestLine}</div>
                </div>
              ) : (
                <div className="text-sm text-zinc-500">
                  Lance une itération (Start ou Step) pour afficher un récap.
                </div>
              )}
            </div>
          </div>

          <aside className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-base font-semibold text-zinc-800">
                Sidebar
              </h3>
              <div className="mt-2 space-y-1 text-sm text-zinc-600">
                <div>Capacity: {capacity}</div>
                <div>Items: {items.length}</div>
                <div>Iteration: {iteration}</div>
                <div>Stagnation: {stagnation}</div>
                <div>
                  Gbest fitness:{" "}
                  <span className="font-semibold text-amber-700">
                    {gbest.fitness.toFixed(1)}
                  </span>
                </div>
                <div>
                  Gbest weight/value: {gbest.weight} / {gbest.value}
                </div>
                <div>
                  Avg fitness: {iterationInfo.avgFitness.toFixed(1)} • Best:{" "}
                  {iterationInfo.lastBest.toFixed(1)}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-zinc-200 p-3 space-y-2">
              <div className="text-sm font-semibold text-zinc-800">Global best (gbest)</div>
              <div className="text-xs text-zinc-600">
                Fitness {gbest.fitness.toFixed(1)} • Value {gbest.value} • Weight {gbest.weight}/{capacity}
              </div>
              <div className="flex flex-wrap gap-1">
                {gbest.position.map((bit, idx) => (
                  <div
                    key={idx}
                    className={`h-7 w-7 rounded border text-center text-xs font-semibold leading-7 ${
                      bit === 1
                        ? "border-amber-200 bg-amber-300 text-amber-950"
                        : "border-zinc-200 bg-zinc-100 text-zinc-500"
                    }`}
                    title={`gbest bit ${idx + 1}`}
                  >
                    {bit}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-zinc-200 p-3 space-y-2">
              <div className="text-sm font-semibold text-zinc-800">
                Best personal best (pbest)
              </div>
              {bestPbest ? (
                <>
                  <div className="text-xs text-zinc-600">
                    Particle #{bestPbest.index + 1} • Fitness {bestPbest.fitness.toFixed(1)} • Value {bestPbest.value} • Weight {bestPbest.weight}/{capacity}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {bestPbest.bits.map((bit, idx) => (
                      <div
                        key={idx}
                        className={`h-7 w-7 rounded border text-center text-xs font-semibold leading-7 ${
                          bit === 1
                            ? "border-emerald-200 bg-emerald-300 text-emerald-950"
                            : "border-zinc-200 bg-zinc-100 text-zinc-500"
                        }`}
                        title={`pbest bit ${idx + 1}`}
                      >
                        {bit}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-xs text-zinc-500">No pbest yet.</div>
              )}
            </div>

            <div className="rounded-lg border border-dashed border-zinc-200 p-3">
              <div className="text-sm font-semibold text-zinc-800">Items</div>
              <div className="mt-2 space-y-1 text-sm text-zinc-600">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-md bg-zinc-50 px-2 py-1"
                  >
                    <span className="font-semibold text-zinc-800">
                      #{idx + 1}
                    </span>
                    <span className="text-xs text-zinc-500">
                      w {item.weight} • v {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-zinc-200 p-3 text-sm text-zinc-700">
              <div className="font-semibold text-zinc-800">Tips</div>
              <ul className="mt-2 space-y-1 text-xs text-zinc-600">
                <li>Start to run; Pause/Reset anytime. Step = 1 iteration.</li>
                <li>Slider controls iteration delay (50–1500 ms).</li>
                <li>
                  Red particle line = overweight; penalty reduces fitness.
                </li>
                <li>⭐ marks a particle sitting at its personal best.</li>
                <li>Gold border marks current gbest particle.</li>
                <li>
                  Disturb shakes gbest after stagnation (Improved BPSO).
                </li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
