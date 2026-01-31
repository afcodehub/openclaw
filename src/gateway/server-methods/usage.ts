import { loadConfig } from "../../config/config.js";
import type { CostUsageSummary } from "../../infra/session-cost-usage.js";
import { loadCostUsageSummary } from "../../infra/session-cost-usage.js";
import { loadProviderUsageSummary } from "../../infra/provider-usage.js";
import type { GatewayRequestHandlers } from "./types.js";

const COST_USAGE_CACHE_TTL_MS = 30_000;

type CostUsageCacheEntry = {
  summary?: CostUsageSummary;
  updatedAt?: number;
  inFlight?: Promise<CostUsageSummary>;
};

const costUsageCache = new Map<number, CostUsageCacheEntry>();

const parseDays = (raw: unknown): number => {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.floor(raw);
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return Math.floor(parsed);
  }
  return 30;
};

async function loadCostUsageSummaryCached(params: {
  days: number;
  config: ReturnType<typeof loadConfig>;
  agentId?: string;
}): Promise<CostUsageSummary> {
  const days = Math.max(1, params.days);
  const now = Date.now();
  const cached = costUsageCache.get(days);
  if (cached?.summary && cached.updatedAt && now - cached.updatedAt < COST_USAGE_CACHE_TTL_MS) {
    return cached.summary;
  }

  if (cached?.inFlight) {
    if (cached.summary) return cached.summary;
    return await cached.inFlight;
  }

  const entry: CostUsageCacheEntry = cached ?? {};
  const inFlight = loadCostUsageSummary({ days, config: params.config, agentId: params.agentId })
    .then((summary) => {
      costUsageCache.set(days, { summary, updatedAt: Date.now() });
      return summary;
    })
    .catch((err) => {
      if (entry.summary) return entry.summary;
      throw err;
    })
    .finally(() => {
      const current = costUsageCache.get(days);
      if (current?.inFlight === inFlight) {
        current.inFlight = undefined;
        costUsageCache.set(days, current);
      }
    });

  entry.inFlight = inFlight;
  costUsageCache.set(days, entry);

  if (entry.summary) return entry.summary;
  return await inFlight;
}

export const usageHandlers: GatewayRequestHandlers = {
  "usage.status": async ({ respond }) => {
    const summary = await loadProviderUsageSummary();
    respond(true, summary, undefined);
  },
  "usage.cost": async ({ respond, params }) => {
    const config = loadConfig();
    const days = parseDays(params?.days);
    const summary = await loadCostUsageSummaryCached({ days, config, agentId: "main" });
    respond(true, summary, undefined);
  },
  "usage.limit.check": async ({ respond }) => {
    const config = loadConfig();
    const limitConfig = config.usage?.dailyLimit;

    if (!limitConfig?.enabled || !limitConfig?.maxDailyCostUsd) {
      respond(true, {
        enabled: false,
        exceeded: false,
        todayCost: 0,
        limit: 0,
        remaining: 0,
        percentage: 0,
      });
      return;
    }

    const summary = await loadCostUsageSummaryCached({ days: 1, config, agentId: "main" });
    const todayCost = summary.totals?.totalCost ?? 0;
    const limit = limitConfig.maxDailyCostUsd;
    const exceeded = todayCost >= limit;
    const remaining = Math.max(0, limit - todayCost);
    const percentage = limit > 0 ? Math.min(100, (todayCost / limit) * 100) : 0;

    console.log("[UsageLimit] Check:", {
      todayCost,
      limit,
      exceeded,
      enabled: limitConfig.enabled,
      percentage: percentage.toFixed(1) + "%",
    });

    respond(true, {
      enabled: true,
      exceeded,
      todayCost,
      limit,
      remaining,
      percentage,
      warningThreshold: limitConfig.warningThreshold ?? 80,
    });
  },
  "usage.limit.status": async (ctx) => {
    return usageHandlers["usage.limit.check"](ctx);
  },
};

// Função exportada para verificar limite antes de processar mensagens
export async function checkDailyLimitExceeded(): Promise<{
  exceeded: boolean;
  message?: string;
  todayCost?: number;
  limit?: number;
}> {
  const config = loadConfig();
  const limitConfig = config.usage?.dailyLimit;

  if (!limitConfig?.enabled || !limitConfig?.maxDailyCostUsd) {
    return { exceeded: false };
  }

  const summary = await loadCostUsageSummaryCached({ days: 1, config, agentId: "main" });
  const todayCost = summary.totals?.totalCost ?? 0;
  const limit = limitConfig.maxDailyCostUsd;

  if (todayCost >= limit) {
    return {
      exceeded: true,
      message: `Limite diário de gastos atingido (${todayCost.toFixed(2)}/${limit.toFixed(2)} USD). Por favor, aguarde até amanhã ou aumente o limite.`,
      todayCost,
      limit,
    };
  }

  return { exceeded: false, todayCost, limit };
}
