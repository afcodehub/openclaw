import fs from "node:fs/promises";
import path from "node:path";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../../agents/agent-scope.js";
import { loadConfig } from "../../config/config.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

export const workspaceHandlers: GatewayRequestHandlers = {
    "workspace.files.list": async ({ respond }) => {
        try {
            const cfg = loadConfig();
            const agentId = resolveDefaultAgentId(cfg);
            const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);

            async function getFiles(dir: string, baseDir: string): Promise<string[]> {
                try {
                    const entries = await fs.readdir(dir, { withFileTypes: true });
                    const files = await Promise.all(entries.map(async (entry) => {
                        const res = path.join(dir, entry.name);
                        const rel = path.relative(baseDir, res).replace(/\\/g, "/");
                        if (entry.isDirectory()) {
                            return getFiles(res, baseDir);
                        } else if (entry.name.endsWith(".md") || entry.name.endsWith(".json")) {
                            return [rel];
                        }
                        return [];
                    }));
                    return files.flat();
                } catch (err: any) {
                    if (err.code === "ENOENT") {
                        return [];
                    }
                    throw err;
                }
            }

            const files = await getFiles(workspaceDir, workspaceDir);

            respond(true, { files }, undefined);
        } catch (err) {
            respond(
                false,
                undefined,
                errorShape(ErrorCodes.INVALID_REQUEST, `Failed to list workspace files: ${String(err)}`),
            );
        }
    },

    "workspace.files.get": async ({ params, respond }) => {
        const fileName = params.file as string;
        if (!fileName || typeof fileName !== "string") {
            respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "file name required"));
            return;
        }

        // Basic security: no path traversal
        if (fileName.includes("..")) {
            respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "invalid file name"));
            return;
        }

        try {
            const cfg = loadConfig();
            const agentId = resolveDefaultAgentId(cfg);
            const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
            const filePath = path.join(workspaceDir, fileName);

            const content = await fs.readFile(filePath, "utf-8");
            respond(true, { file: fileName, content }, undefined);
        } catch (err) {
            respond(
                false,
                undefined,
                errorShape(ErrorCodes.INVALID_REQUEST, `Failed to read file: ${String(err)}`),
            );
        }
    },

    "workspace.files.set": async ({ params, respond }) => {
        const fileName = params.file as string;
        const content = params.content as string;

        if (!fileName || typeof fileName !== "string") {
            respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "file name required"));
            return;
        }
        if (typeof content !== "string") {
            respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "content (string) required"));
            return;
        }

        // Basic security: no path traversal
        if (fileName.includes("..")) {
            respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "invalid file name"));
            return;
        }

        try {
            const cfg = loadConfig();
            const agentId = resolveDefaultAgentId(cfg);
            const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
            const filePath = path.join(workspaceDir, fileName);

            await fs.writeFile(filePath, content, "utf-8");
            respond(true, { ok: true, file: fileName }, undefined);
        } catch (err) {
            respond(
                false,
                undefined,
                errorShape(ErrorCodes.INVALID_REQUEST, `Failed to save file: ${String(err)}`),
            );
        }
    },
    "workspace.files.delete": async ({ params, respond }) => {
        const fileName = params.file as string;
        if (!fileName || typeof fileName !== "string") {
            respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "file name required"));
            return;
        }
        if (fileName.includes("..")) {
            respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "invalid file name"));
            return;
        }

        try {
            const cfg = loadConfig();
            const agentId = resolveDefaultAgentId(cfg);
            const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
            const filePath = path.join(workspaceDir, fileName);

            await fs.unlink(filePath);
            respond(true, { ok: true, file: fileName }, undefined);
        } catch (err) {
            respond(
                false,
                undefined,
                errorShape(ErrorCodes.INVALID_REQUEST, `Failed to delete file: ${String(err)}`),
            );
        }
    },

    "workspace.skills.init": async ({ params, respond }) => {
        const skillName = params.name as string;
        if (!skillName || typeof skillName !== "string") {
            respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "skill name required"));
            return;
        }

        // Normalize skill name to kebab-case
        const id = skillName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        if (!id) {
            respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "invalid skill name"));
            return;
        }

        try {
            const cfg = loadConfig();
            const agentId = resolveDefaultAgentId(cfg);
            const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
            const skillsDir = path.join(workspaceDir, "skills", id);

            await fs.mkdir(skillsDir, { recursive: true });

            const skillMdPath = path.join(skillsDir, "SKILL.md");
            const initialContent = `---\nname: ${id}\ndescription: Descrição da sua nova skill aqui.\n---\n\n# ${skillName}\n\nEscreva as instruções para o agente aqui.`;

            await fs.writeFile(skillMdPath, initialContent, "utf-8");

            respond(true, { ok: true, id, path: `skills/${id}/SKILL.md` }, undefined);
        } catch (err) {
            respond(
                false,
                undefined,
                errorShape(ErrorCodes.INVALID_REQUEST, `Failed to init skill: ${String(err)}`),
            );
        }
    },
};
