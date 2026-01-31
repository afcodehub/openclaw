import { saveDailyLimit } from "./controllers/costs.js";
import type { AppViewState } from "./app-view-state.js";

export async function handleCostsLimitSave(
    state: AppViewState,
    enabled: boolean,
    maxDailyCostUsd: number | null,
    warningThreshold: number
) {
    state.costsLimitSaving = true;
    state.costsLimitSaveError = null;

    try {
        const result = await saveDailyLimit(state, enabled, maxDailyCostUsd, warningThreshold);
        if (result.success) {
            state.costsLimitSaveError = "✅ Configuração salva com sucesso!";
            setTimeout(() => {
                if (state.costsLimitSaveError?.includes("✅")) {
                    state.costsLimitSaveError = null;
                }
            }, 5000);
        } else {
            state.costsLimitSaveError = result.error ?? "Erro desconhecido ao salvar limite";
        }
    } catch (err) {
        state.costsLimitSaveError = `Erro fatal: ${String(err)}`;
    } finally {
        state.costsLimitSaving = false;
    }
}
