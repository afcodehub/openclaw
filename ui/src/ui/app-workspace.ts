import {
    loadWorkspaceFiles,
    loadWorkspaceFileContent,
    saveWorkspaceFile,
    deleteWorkspaceFile,
    initWorkspaceSkill,
} from "./controllers/workspace.js";
import type { AppViewState } from "./app-view-state.js";

export async function handleWorkspaceFilesLoad(state: AppViewState) {
    await loadWorkspaceFiles(state);
}

export async function handleWorkspaceFileLoad(state: AppViewState, file: string) {
    state.workspaceSelectedFile = file;
    await loadWorkspaceFileContent(state, file);
}

export async function handleWorkspaceSave(state: AppViewState) {
    await saveWorkspaceFile(state);
}

export async function handleWorkspaceFileDelete(state: AppViewState, file: string) {
    await deleteWorkspaceFile(state, file);
}

export function handleWorkspaceShowDeleteModal(state: AppViewState, file: string) {
    state.workspaceFileToDelete = file;
    state.workspaceShowDeleteModal = true;
}

export function handleWorkspaceHideDeleteModal(state: AppViewState) {
    state.workspaceShowDeleteModal = false;
    state.workspaceFileToDelete = null;
}

export function handleWorkspaceShowCreateModal(state: AppViewState) {
    state.workspaceShowCreateModal = true;
}

export function handleWorkspaceHideCreateModal(state: AppViewState) {
    state.workspaceShowCreateModal = false;
}

export async function handleWorkspaceSkillInit(state: AppViewState, name: string) {
    if (!name.trim()) return;
    await initWorkspaceSkill(state, name);
    state.workspaceShowCreateModal = false;
}

export function handleWorkspaceHideSaveModal(state: AppViewState) {
    state.workspaceShowSaveModal = false;
}
