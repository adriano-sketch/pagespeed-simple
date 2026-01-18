import { NextResponse } from "next/server";

const METRIC_MAP = {
  fcp: "first-contentful-paint",
  lcp: "largest-contentful-paint",
  tbt: "total-blocking-time",
  cls: "cumulative-layout-shift"
} as const;

type PageSpeedAudit = {
  id: string;
  title: string;
  description?: string;
  score?: number | null;
  displayValue?: string;
  numericValue?: number;
};

type PageSpeedResponse = {
  lighthouseResult?: {
    categories?: {
      performance?: {
        score?: number;
        auditRefs?: Array<{ id: string; weight: number }>;
      };
    };
    audits?: Record<string, PageSpeedAudit>;
  };
};

type ApiResult = {
  score: number;
  metrics: {
    fcp: string;
    lcp: string;
    tbt: string;
    cls: string;
  };
  recommendations: Array<{ title: string; description?: string }>;
};

async function fetchPageSpeed(url: string, strategy: "mobile" | "desktop") {
  const key = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_PAGESPEED_API_KEY não configurada.");
  }

  const apiUrl =
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed" +
    `?url=${encodeURIComponent(url)}` +
    `&key=${encodeURIComponent(key)}` +
    `&strategy=${strategy}` +
    "&category=performance";

  const response = await fetch(apiUrl, { next: { revalidate: 0 } });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Falha ao consultar PageSpeed (${strategy}). ${message || ""}`.trim()
    );
  }

  return (await response.json()) as PageSpeedResponse;
}

function extractResult(payload: PageSpeedResponse): ApiResult {
  const performance = payload.lighthouseResult?.categories?.performance;
  const audits = payload.lighthouseResult?.audits ?? {};
  const score = Math.round((performance?.score ?? 0) * 100);

  const metrics = {
    fcp: audits[METRIC_MAP.fcp]?.displayValue ?? "--",
    lcp: audits[METRIC_MAP.lcp]?.displayValue ?? "--",
    tbt: audits[METRIC_MAP.tbt]?.displayValue ?? "--",
    cls: audits[METRIC_MAP.cls]?.displayValue ?? "--"
  };

  const recommendations =
    performance?.auditRefs
      ?.map((ref) => audits[ref.id])
      .filter((audit): audit is PageSpeedAudit => Boolean(audit?.title))
      .filter((audit) => (audit.score ?? 1) < 1)
      .sort((a, b) => (b.numericValue ?? 0) - (a.numericValue ?? 0))
      .slice(0, 3)
      .map((audit) => ({
        title: audit.title,
        description: audit.description
      })) ?? [];

  return { score, metrics, recommendations };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    if (!body.url || !/^https?:\/\//i.test(body.url)) {
      return NextResponse.json(
        { error: "Informe uma URL válida com http ou https." },
        { status: 400 }
      );
    }

    const [mobile, desktop] = await Promise.all([
      fetchPageSpeed(body.url, "mobile"),
      fetchPageSpeed(body.url, "desktop")
    ]);

    return NextResponse.json({
      mobile: extractResult(mobile),
      desktop: extractResult(desktop)
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro inesperado ao consultar o PageSpeed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
