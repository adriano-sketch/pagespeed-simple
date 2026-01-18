"use client";

import { useState } from "react";

type Metrics = {
  fcp: string;
  lcp: string;
  tbt: string;
  cls: string;
};

type Recommendations = Array<{
  title: string;
  description?: string;
  savings?: string;
  savingsMs?: number;
}>;

type StrategyResult = {
  score: number;
  metrics: Metrics;
  recommendations: Recommendations;
};

type PageSpeedResult = {
  mobile: StrategyResult;
  desktop: StrategyResult;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PageSpeedResult | null>(null);
  const combinedRecommendations = result
    ? mergeRecommendations(
        result.mobile.recommendations,
        result.desktop.recommendations
      )
    : [];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!EMAIL_REGEX.test(email)) {
      setError("Digite um email válido.");
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      setError("Digite uma URL válida com http ou https.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/pagespeed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível analisar.");
      }

      setResult(data as PageSpeedResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro inesperado no servidor."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
          PageSpeed Insights
        </p>
        <h1 className="text-3xl font-semibold text-white md:text-4xl">
          Análise simples de performance
        </h1>
        <p className="text-slate-300">
          Informe um email e a URL para ver o score, métricas principais e
          recomendações do PageSpeed.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
        <form className="grid gap-4 md:grid-cols-[1fr_2fr_auto]" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm text-slate-300">
            Email
            <input
              type="email"
              name="email"
              placeholder="voce@exemplo.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-0 focus:border-cyan-500"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-300">
            URL
            <input
              type="url"
              name="url"
              placeholder="https://seusite.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-0 focus:border-cyan-500"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-auto flex h-11 items-center justify-center rounded-lg bg-cyan-500 px-6 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            {loading ? "Analisando..." : "Analisar"}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}
      </section>

      {result ? (
        <>
          <section className="grid gap-6 md:grid-cols-2">
            <ResultCard title="Mobile" data={result.mobile} />
            <ResultCard title="Desktop" data={result.desktop} />
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-center text-lg font-semibold text-white">
              Top 5 Recomendações de Melhoria
            </h2>
            <ul className="mt-5 space-y-3 text-sm text-slate-200">
              {combinedRecommendations.length ? (
                combinedRecommendations.map((item) => (
                  <li
                    key={item.title}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-white">{item.title}</p>
                      {item.savings ? (
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-cyan-300">
                          {item.savings}
                        </span>
                      ) : null}
                    </div>
                    {item.description ? (
                      <p className="mt-1 text-slate-400">{item.description}</p>
                    ) : null}
                  </li>
                ))
              ) : (
                <li className="text-slate-400">Sem recomendações críticas.</li>
              )}
            </ul>
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-800 p-10 text-center text-slate-400">
          Faça uma análise para ver os resultados aqui.
        </section>
      )}
    </main>
  );
}

function ResultCard({ title, data }: { title: string; data: StrategyResult }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <span className="rounded-full bg-slate-800 px-4 py-1 text-sm font-semibold text-cyan-300">
          {data.score}
        </span>
      </div>

      <div className="mt-6 grid gap-3 text-sm text-slate-300">
        <MetricRow label="FCP" value={data.metrics.fcp} />
        <MetricRow label="LCP" value={data.metrics.lcp} />
        <MetricRow label="TBT" value={data.metrics.tbt} />
        <MetricRow label="CLS" value={data.metrics.cls} />
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
  );
}

function mergeRecommendations(
  mobile: Recommendations,
  desktop: Recommendations
) {
  const byTitle = new Map<string, Recommendations[number]>();

  [...mobile, ...desktop].forEach((item) => {
    const existing = byTitle.get(item.title);
    if (!existing) {
      byTitle.set(item.title, item);
      return;
    }

    if (getSavingsMs(item) > getSavingsMs(existing)) {
      byTitle.set(item.title, item);
    }
  });

  return Array.from(byTitle.values())
    .sort((a, b) => getSavingsMs(b) - getSavingsMs(a))
    .slice(0, 5);
}

function getSavingsMs(item: Recommendations[number]) {
  if (typeof item.savingsMs === "number") {
    return item.savingsMs;
  }

  if (!item.savings) return 0;

  const normalized = item.savings.replace(",", ".").toLowerCase();
  const match = normalized.match(/([\d.]+)/);
  if (!match) return 0;

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return 0;

  if (normalized.includes("ms")) {
    return value;
  }

  if (normalized.includes("s")) {
    return value * 1000;
  }

  return value;
}
