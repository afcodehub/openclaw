import { loadConfig, applyConfig, loadConfigSchema } from "./controllers/config.js";
import type { AppViewState } from "./app-view-state.js";

export async function handleConfigLoad(state: AppViewState) {
    await loadConfig(state as any);
}

export async function handleConfigSchemaLoad(state: AppViewState) {
    await loadConfigSchema(state as any);
}

export async function handleConfigSave(state: AppViewState) {
    await handleConfigApply(state);
}

export async function handleConfigApply(state: AppViewState) {
    await applyConfig(state as any);
}

export function handleConfigFormUpdate(state: AppViewState, path: string, value: unknown) {
    const segments = path.split(".");
    let current: any = state.configForm;
    for (let i = 0; i < segments.length - 1; i++) {
        if (!current[segments[i]]) current[segments[i]] = {};
        current = current[segments[i]];
    }
    current[segments[segments.length - 1]] = value;
    state.configFormDirty = true;
}

export function handleConfigFormModeChange(state: AppViewState, mode: "form" | "raw") {
    state.configFormMode = mode;
}

export function handleConfigRawChange(state: AppViewState, raw: string) {
    state.configRaw = raw;
    state.configFormDirty = true;
}

export function updateConfigFormValue(state: AppViewState, path: string[], value: unknown) {
    let current: any = state.configForm;
    for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    state.configFormDirty = true;
}
