import type { AppViewState } from "../app-view-state.js";

export async function loadWorkspaceFiles(state: AppViewState) {
    if (state.workspaceLoading || !state.client) return;
    state.workspaceLoading = true;
    state.workspaceError = null;

    try {
        const res: any = await state.client.request("workspace.files.list", {});
        // O client resolve diretamente para o payload se ok for true
        state.workspaceFiles = res?.files || [];
    } catch (err) {
        state.workspaceError = String(err);
    } finally {
        state.workspaceLoading = false;
    }
}

export async function loadWorkspaceFileContent(state: AppViewState, file: string) {
    if (!state.client) return;
    state.workspaceLoading = true;
    state.workspaceError = null;
    state.workspaceSelectedFile = file;

    try {
        const res: any = await state.client.request("workspace.files.get", { file });
        state.workspaceContent = res?.content || "";
    } catch (err) {
        state.workspaceError = String(err);
    } finally {
        state.workspaceLoading = false;
    }
}

export async function saveWorkspaceFile(state: AppViewState) {
    if (!state.workspaceSelectedFile || state.workspaceSaving || !state.client) return;
    state.workspaceSaving = true;
    state.workspaceError = null;

    try {
        const res: any = await state.client.request("workspace.files.set", {
            file: state.workspaceSelectedFile,
            content: state.workspaceContent,
        });
        // Se o request resolveu, deu certo
        console.log("File saved:", res);

        // Show save modal
        state.workspaceShowSaveModal = true;
        setTimeout(() => {
            state.workspaceShowSaveModal = false;
        }, 3000);
    } catch (err) {
        state.workspaceError = String(err);
    } finally {
        state.workspaceSaving = false;
    }
}

export async function deleteWorkspaceFile(state: AppViewState, file: string) {
    if (!state.client) return;
    state.workspaceSaving = true;
    state.workspaceError = null;

    try {
        await state.client.request("workspace.files.delete", { file });
        if (file === state.workspaceSelectedFile) {
            state.workspaceSelectedFile = null;
            state.workspaceContent = "";
        }
        await loadWorkspaceFiles(state);
    } catch (err) {
        state.workspaceError = String(err);
    } finally {
        state.workspaceSaving = false;
    }
}

export async function initWorkspaceSkill(state: AppViewState, name: string) {
    if (!state.client) return;
    state.workspaceSaving = true;
    state.workspaceError = null;

    try {
        const res: any = await state.client.request("workspace.skills.init", { name });
        await loadWorkspaceFiles(state);
        if (res?.path) {
            await loadWorkspaceFileContent(state, res.path);
        }
    } catch (err) {
        state.workspaceError = String(err);
    } finally {
        state.workspaceSaving = false;
    }
}
