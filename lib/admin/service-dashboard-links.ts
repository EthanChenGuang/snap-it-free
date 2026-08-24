import type { FlyUsageCard, PlatformUsageSnapshot } from './platform-usage';

export type ServicePlanTier = 'free' | 'paid';

export type ServiceDashboardLink = {
  label: string;
  href: string;
};

export type BillingServiceMeta = {
  supabase: { planTier: ServicePlanTier; dashboard: ServiceDashboardLink | null };
  vercel: { planTier: ServicePlanTier; dashboard: ServiceDashboardLink };
  flyio: { planTier: ServicePlanTier; dashboard: ServiceDashboardLink };
  llm: {
    planTier: ServicePlanTier;
    openrouter: ServiceDashboardLink;
    gemini: ServiceDashboardLink;
  };
  proxy: {
    links: ServiceDashboardLink[];
  };
};

const FREE_VERCEL_PLAN_KEYWORDS = ['hobby', 'free'];

export function extractSupabaseProjectRef(): string | null {
  const fromEnv = process.env.SUPABASE_PROJECT_REF?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!url) {
    return null;
  }

  try {
    const hostname = new URL(url).hostname;
    const match = hostname.match(/^([^.]+)\.supabase\.co$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function resolveFlyAppName(): string {
  return process.env.FLY_APP_NAME?.trim() || 'shoumanwu-scraper';
}

export function inferVercelPlanTier(planLabel: string): ServicePlanTier {
  const normalized = planLabel.trim().toLowerCase();
  return FREE_VERCEL_PLAN_KEYWORDS.some((keyword) => normalized.includes(keyword)) ? 'free' : 'paid';
}

/** Optional override: FLY_PLAN_TIER=free|paid */
function resolveFlyPlanTierFromEnv(): ServicePlanTier | null {
  const raw = process.env.FLY_PLAN_TIER?.trim().toLowerCase();
  if (raw === 'free' || raw === 'paid') {
    return raw;
  }
  return null;
}

/**
 * Fly.io badge reflects whether this project currently shows billable usage.
 * Legacy Hobby plans include free shared-cpu VMs; cron workers often stay at $0/mo.
 * Our estimated cost is derived from scrape wall time (not 24/7 machine uptime).
 */
export function inferFlyPlanTier(flyio: Pick<FlyUsageCard, 'estimatedCostUsd'> | undefined): ServicePlanTier {
  const fromEnv = resolveFlyPlanTierFromEnv();
  if (fromEnv) {
    return fromEnv;
  }

  if (!flyio || flyio.estimatedCostUsd <= 0) {
    return 'free';
  }

  return 'paid';
}

function buildSupabaseDashboard(): ServiceDashboardLink | null {
  const ref = extractSupabaseProjectRef();
  if (!ref) {
    return null;
  }

  return {
    label: 'Supabase Dashboard',
    href: `https://supabase.com/dashboard/project/${ref}`,
  };
}

function buildVercelDashboard(): ServiceDashboardLink {
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  const teamSlug = process.env.VERCEL_TEAM_SLUG?.trim();

  if (teamSlug && projectId) {
    return {
      label: 'Vercel Dashboard',
      href: `https://vercel.com/${teamSlug}/${projectId}`,
    };
  }

  return {
    label: 'Vercel Dashboard',
    href: 'https://vercel.com/dashboard',
  };
}

function buildFlyDashboard(): ServiceDashboardLink {
  const appName = resolveFlyAppName();
  return {
    label: 'Fly.io Dashboard',
    href: `https://fly.io/apps/${appName}`,
  };
}

function inferProxyDashboardLinks(): ServiceDashboardLink[] {
  const links: ServiceDashboardLink[] = [
    { label: 'Telegram BotFather', href: 'https://t.me/BotFather' },
    { label: 'Resend Dashboard', href: 'https://resend.com/overview' },
  ];

  const proxyUrl = process.env.PROXY_URL?.trim();
  if (proxyUrl) {
    try {
      const hostname = new URL(proxyUrl).hostname.toLowerCase();
      if (hostname.includes('webshare')) {
        links.unshift({ label: 'Webshare Dashboard', href: 'https://dashboard.webshare.io/' });
      }
    } catch {
      /* ignore malformed PROXY_URL */
    }
  }

  return links;
}

export function buildBillingServiceMeta(snapshot: PlatformUsageSnapshot | null): BillingServiceMeta {
  const vercelPlanLabel = snapshot?.vercel.planLabel ?? 'Hobby';

  return {
    supabase: {
      planTier: 'free',
      dashboard: buildSupabaseDashboard(),
    },
    vercel: {
      planTier: inferVercelPlanTier(vercelPlanLabel),
      dashboard: buildVercelDashboard(),
    },
    flyio: {
      planTier: inferFlyPlanTier(snapshot?.flyio),
      dashboard: buildFlyDashboard(),
    },
    llm: {
      planTier: 'paid',
      openrouter: {
        label: 'OpenRouter Activity',
        href: 'https://openrouter.ai/activity',
      },
      gemini: {
        label: 'Google AI Studio',
        href: 'https://aistudio.google.com/',
      },
    },
    proxy: {
      links: inferProxyDashboardLinks(),
    },
  };
}

export function planTierLabel(tier: ServicePlanTier): string {
  return tier === 'free' ? '免费' : '付费';
}
