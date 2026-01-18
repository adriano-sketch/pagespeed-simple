import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, url } = await request.json();

    // Validações
    if (!email || !url) {
      return NextResponse.json(
        { error: 'Email e URL são obrigatórios' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key não configurada' },
        { status: 500 }
      );
    }

    // Analisar mobile e desktop
    const [mobileData, desktopData] = await Promise.all([
      analyzePageSpeed(url, 'mobile', apiKey),
      analyzePageSpeed(url, 'desktop', apiKey),
    ]);

    return NextResponse.json({
      mobile: mobileData,
      desktop: desktopData,
      url,
      email,
    });

  } catch (error: any) {
    console.error('Erro na análise:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao analisar site' },
      { status: 500 }
    );
  }
}

async function analyzePageSpeed(url: string, strategy: string, apiKey: string) {
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=${strategy}`;
  
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error(`PageSpeed API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Extrair dados relevantes
  const lighthouse = data.lighthouseResult;
  const categories = lighthouse.categories;
  const audits = lighthouse.audits;

  return {
    score: Math.round(categories.performance.score * 100),
    metrics: {
      fcp: audits['first-contentful-paint'].displayValue,
      lcp: audits['largest-contentful-paint'].displayValue,
      tbt: audits['total-blocking-time'].displayValue,
      cls: audits['cumulative-layout-shift'].displayValue,
      speedIndex: audits['speed-index'].displayValue,
    },
    recommendations: Object.values(audits)
      .filter((audit: any) => audit.score !== null && audit.score < 1 && audit.details?.overallSavingsMs > 100)
      .sort((a: any, b: any) => b.details.overallSavingsMs - a.details.overallSavingsMs)
      .slice(0, 3)
      .map((audit: any) => ({
        title: audit.title,
        description: audit.description,
        savings: audit.displayValue || `${Math.round(audit.details.overallSavingsMs / 1000)}s`,
        savingsMs: audit.details?.overallSavingsMs ?? 0,
      })),
  };
}
