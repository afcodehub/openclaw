import {
    installSkill,
    loadSkills,
    saveSkillApiKey,
    updateSkillEdit,
    updateSkillEnabled,
} from "./controllers/skills.js";
import {
    addCronJob,
    loadCronJobs,
    loadCronRuns,
    removeCronJob,
    runCronJob,
    toggleCronJob,
} from "./controllers/cron.js";
import { loadSessions, patchSession } from "./controllers/sessions.js";
import { loadNodes } from "./controllers/nodes.js";
import { loadPresence } from "./controllers/presence.js";
import { loadDebug, callDebugMethod } from "./controllers/debug.js";
import { loadLogs } from "./controllers/logs.js";
import type { AppViewState } from "./app-view-state.js";

export async function handleInstallSkill(state: AppViewState, key: string) {
    const skill = state.skillsReport?.skills.find((s) => s.skillKey === key);
    if (!skill || skill.install.length === 0) return;
    await installSkill(state as any, key, skill.name, skill.install[0].id);
}

export async function handleUpdateSkill(state: AppViewState, key: string) {
    const skill = state.skillsReport?.skills.find((s) => s.skillKey === key);
    if (!skill || skill.install.length === 0) return;
    await installSkill(state as any, key, skill.name, skill.install[0].id);
}

export async function handleToggleSkillEnabled(state: AppViewState, key: string, enabled: boolean) {
    await updateSkillEnabled(state as any, key, enabled);
}

export function handleUpdateSkillEdit(state: AppViewState, key: string, value: string) {
    updateSkillEdit(state as any, key, value);
}

export async function handleSaveSkillApiKey(state: AppViewState, key: string) {
    await saveSkillApiKey(state as any, key);
}

export async function handleCronToggle(state: AppViewState, jobId: string, enabled: boolean) {
    const job = state.cronJobs.find(j => j.id === jobId);
    if (!job) return;
    await toggleCronJob(state as any, job, enabled);
}

export async function handleCronRun(state: AppViewState, jobId: string) {
    const job = state.cronJobs.find(j => j.id === jobId);
    if (!job) return;
    await runCronJob(state as any, job);
}

export async function handleCronRemove(state: AppViewState, jobId: string) {
    const job = state.cronJobs.find(j => j.id === jobId);
    if (!job) return;
    await removeCronJob(state as any, job);
}

export async function handleCronAdd(state: AppViewState) {
    await addCronJob(state as any);
}

export async function handleCronRunsLoad(state: AppViewState, jobId: string) {
    await loadCronRuns(state as any, jobId);
}

export function handleCronFormUpdate(state: AppViewState, path: string, value: unknown) {
    const segments = path.split(".");
    let current: any = state.cronForm;
    for (let i = 0; i < segments.length - 1; i++) {
        if (!current[segments[i]]) current[segments[i]] = {};
        current = current[segments[i]];
    }
    current[segments[segments.length - 1]] = value;
}

export async function handleSessionsLoad(state: AppViewState) {
    await loadSessions(state as any);
}

export async function handleSessionsPatch(state: AppViewState, key: string, patch: any) {
    await patchSession(state as any, key, patch);
}

export async function handleLoadNodes(state: AppViewState) {
    await loadNodes(state as any);
}

export async function handleLoadPresence(state: AppViewState) {
    await loadPresence(state as any);
}

export async function handleLoadSkills(state: AppViewState) {
    await loadSkills(state as any);
}

export async function handleLoadDebug(state: AppViewState) {
    await loadDebug(state as any);
}

export async function handleLoadLogs(state: AppViewState) {
    await loadLogs(state as any);
}

export async function handleDebugCall(state: AppViewState) {
    await callDebugMethod(state as any);
}

export async function handleRunUpdate(state: AppViewState) {
    console.warn("Update controller not implemented");
}

export function setPassword(state: AppViewState, next: string) {
    state.password = next;
}

export function setSessionKey(state: AppViewState, next: string) {
    state.sessionKey = next;
    state.applySessionKey = next;
}

export function setChatMessage(state: AppViewState, next: string) {
    state.chatMessage = next;
}

export async function handleCallDebugMethod(state: AppViewState, method: string, params: string) {
    state.debugCallMethod = method;
    state.debugCallParams = params;
    await callDebugMethod(state as any);
}
