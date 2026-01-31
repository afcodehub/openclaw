import type { GatewayBrowserClient } from "../gateway";
import type { CostUsageSummary, DailyLimitStatus } from "../views/costs";
import type { Tab } from "../navigation";

export type CostsState = {
    client: GatewayBrowserClient | null;
    connected: boolean;
    tab: Tab;
    costsLoading: boolean;
    costsSummary: CostUsageSummary | null;
    costsError: string | null;
    costsDays: number;
    costsAutoRefresh: boolean;
    costsLastUpdated: number | null;
    // Limite diário
    costsLimitStatus: DailyLimitStatus | null;
    costsLimitLoading: boolean;
};

let costsPollingInterval: number | null = null;

export async function loadCosts(state: CostsState): Promise<void> {
    if (!state.client) return;

    state.costsLoading = true;
    state.costsError = null;

    try {
        // Carregar custos e limite em paralelo
        const [costResult, limitResult] = await Promise.all([
            state.client.request("usage.cost", { days: state.costsDays }),
            state.client.request("usage.limit.check", {}),
        ]);

        state.costsSummary = costResult as CostUsageSummary;
        state.costsLimitStatus = limitResult as DailyLimitStatus;
        state.costsLastUpdated = Date.now();
    } catch (err) {
        state.costsError = `Erro ao carregar custos: ${String(err)}`;
        console.error("Failed to load costs:", err);
    } finally {
        state.costsLoading = false;
    }
}

export async function loadLimitStatus(state: CostsState): Promise<void> {
    if (!state.client) return;

    state.costsLimitLoading = true;

    try {
        const result = await state.client.request("usage.limit.check", {});
        state.costsLimitStatus = result as DailyLimitStatus;
    } catch (err) {
        console.error("Failed to load limit status:", err);
    } finally {
        state.costsLimitLoading = false;
    }
}

export function startCostsPolling(state: CostsState): void {
    stopCostsPolling();

    // Atualiza a cada 30 segundos quando auto-refresh está ativado
    costsPollingInterval = window.setInterval(() => {
        if (state.costsAutoRefresh && state.connected && state.tab === "costs") {
            void loadCosts(state);
        } else if (state.connected) {
            // Sempre verificar o limite mesmo quando não estamos na aba de custos
            void loadLimitStatus(state);
        }
    }, 30_000);
}

export function stopCostsPolling(): void {
    if (costsPollingInterval !== null) {
        window.clearInterval(costsPollingInterval);
        costsPollingInterval = null;
    }
}

export function toggleCostsAutoRefresh(state: CostsState): void {
    state.costsAutoRefresh = !state.costsAutoRefresh;

    if (state.costsAutoRefresh) {
        startCostsPolling(state);
    } else {
        stopCostsPolling();
    }
}

export function setCostsDays(state: CostsState, days: number): void {
    state.costsDays = days;
    void loadCosts(state);
}

export async function saveDailyLimit(
    state: CostsState,
    enabled: boolean,
    maxDailyCostUsd: number | null,
    warningThreshold: number
): Promise<{ success: boolean; error?: string }> {
    if (!state.client || !state.connected) {
        return { success: false, error: "Não conectado ao gateway" };
    }

    try {
        // Primeiro, carregar a configuração atual
        const configSnapshot = await state.client.request("config.get", {}) as {
            config?: Record<string, unknown>;
            hash?: string;
        };

        if (!configSnapshot.hash) {
            return { success: false, error: "Hash de configuração não encontrado" };
        }

        // Clonar a configuração
        const config = JSON.parse(JSON.stringify(configSnapshot.config ?? {})) as Record<string, unknown>;

        // Atualizar a seção de usage
        if (!config.usage) {
            config.usage = {};
        }

        const usage = config.usage as Record<string, unknown>;

        if (enabled && maxDailyCostUsd !== null && maxDailyCostUsd > 0) {
            usage.dailyLimit = {
                enabled: true,
                maxDailyCostUsd,
                warningThreshold,
            };
        } else {
            usage.dailyLimit = {
                enabled: false,
            };
        }

        // Serializar a configuração
        const raw = JSON.stringify(config, null, 2);

        // Salvar a configuração
        await state.client.request("config.set", {
            raw,
            baseHash: configSnapshot.hash,
        });

        // Recarregar o status do limite
        await loadLimitStatus(state);

        return { success: true };
    } catch (err) {
        console.error("Failed to save daily limit:", err);
        return { success: false, error: String(err) };
    }
}
