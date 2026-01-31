import type { IconName } from "./icons.js";

export const TAB_GROUPS = [
  { label: "Conversa", tabs: ["chat"] },
  {
    label: "Controle",
    tabs: ["overview", "whatsapp", "channels", "instances", "sessions", "cron"],
  },
  {
    label: "Agente",
    tabs: ["skills", "nodes", "workspace"],
  },
  { label: "Configurações", tabs: ["config", "costs", "jsoneditor", "debug", "logs"] },
] as const;

export type Tab =
  | "overview"
  | "whatsapp"
  | "channels"
  | "instances"
  | "sessions"
  | "cron"
  | "skills"
  | "nodes"
  | "chat"
  | "config"
  | "costs"
  | "jsoneditor"
  | "debug"
  | "logs"
  | "workspace";

const TAB_PATHS: Record<Tab, string> = {
  overview: "/overview",
  whatsapp: "/whatsapp",
  channels: "/channels",
  instances: "/instances",
  sessions: "/sessions",
  cron: "/cron",
  skills: "/skills",
  nodes: "/nodes",
  chat: "/chat",
  config: "/config",
  costs: "/costs",
  jsoneditor: "/jsoneditor",
  debug: "/debug",
  logs: "/logs",
  workspace: "/workspace",
};

const PATH_TO_TAB = new Map(
  Object.entries(TAB_PATHS).map(([tab, path]) => [path, tab as Tab]),
);

export function normalizeBasePath(basePath: string): string {
  if (!basePath) return "";
  let base = basePath.trim();
  if (!base.startsWith("/")) base = `/${base}`;
  if (base === "/") return "";
  if (base.endsWith("/")) base = base.slice(0, -1);
  return base;
}

export function normalizePath(path: string): string {
  if (!path) return "/";
  let normalized = path.trim();
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export function pathForTab(tab: Tab, basePath = ""): string {
  const base = normalizeBasePath(basePath);
  const path = TAB_PATHS[tab];
  return base ? `${base}${path}` : path;
}

export function tabFromPath(pathname: string, basePath = ""): Tab | null {
  const base = normalizeBasePath(basePath);
  let path = pathname || "/";
  if (base) {
    if (path === base) {
      path = "/";
    } else if (path.startsWith(`${base}/`)) {
      path = path.slice(base.length);
    }
  }
  let normalized = normalizePath(path).toLowerCase();
  if (normalized.endsWith("/index.html")) normalized = "/";
  if (normalized === "/") return "chat";
  return PATH_TO_TAB.get(normalized) ?? null;
}

export function inferBasePathFromPathname(pathname: string): string {
  let normalized = normalizePath(pathname);
  if (normalized.endsWith("/index.html")) {
    normalized = normalizePath(normalized.slice(0, -"/index.html".length));
  }
  if (normalized === "/") return "";
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) return "";
  for (let i = 0; i < segments.length; i++) {
    const candidate = `/${segments.slice(i).join("/")}`.toLowerCase();
    if (PATH_TO_TAB.has(candidate)) {
      const prefix = segments.slice(0, i);
      return prefix.length ? `/${prefix.join("/")}` : "";
    }
  }
  return `/${segments.join("/")}`;
}

export function iconForTab(tab: Tab): IconName {
  switch (tab) {
    case "chat":
      return "messageSquare";
    case "overview":
      return "barChart";
    case "whatsapp":
      return "smartphone";
    case "channels":
      return "link";
    case "instances":
      return "radio";
    case "sessions":
      return "fileText";
    case "cron":
      return "loader";
    case "costs":
      return "dollarSign";
    case "skills":
      return "zap";
    case "nodes":
      return "monitor";
    case "config":
      return "settings";
    case "jsoneditor":
      return "fileText";
    case "debug":
      return "bug";
    case "logs":
      return "scrollText";
    case "workspace":
      return "folder";
    default:
      return "folder";
  }
}

export function titleForTab(tab: Tab) {
  switch (tab) {
    case "costs":
      return "Relatório de Custos";
    case "overview":
      return "Visão Geral";
    case "whatsapp":
      return "WhatsApp";
    case "channels":
      return "Canais";
    case "instances":
      return "Instâncias";
    case "sessions":
      return "Sessões";
    case "cron":
      return "Agendamentos (Cron)";
    case "skills":
      return "Habilidades";
    case "nodes":
      return "Nós (Nodes)";
    case "chat":
      return "Chat Interno";
    case "config":
      return "Configuração";
    case "jsoneditor":
      return "Editor JSON";
    case "debug":
      return "Depuração (Debug)";
    case "logs":
      return "Registros (Logs)";
    case "workspace":
      return "Workspace do Agente";
    default:
      return "Controle";
  }
}

export function subtitleForTab(tab: Tab) {
  switch (tab) {
    case "costs":
      return "Monitore consumo de tokens e custos estimados da API em tempo real.";
    case "overview":
      return "Status do gateway, pontos de entrada e saúde do sistema.";
    case "whatsapp":
      return "Conecte e gerencie sua conta do WhatsApp Web.";
    case "channels":
      return "Gerencie os canais de mensagens e suas configurações.";
    case "instances":
      return "Sinais de presença de clientes e nós conectados.";
    case "sessions":
      return "Inspecione sessões ativas e ajuste padrões por sessão.";
    case "cron":
      return "Agende despertadores e execuções recorrentes de agentes.";
    case "skills":
      return "Gerencie pacotes de habilidades e injeção de chaves de API.";
    case "nodes":
      return "Dispositivos pareados, capacidades e comandos expostos.";
    case "chat":
      return "Sessão de chat direta com o gateway para intervenções rápidas.";
    case "config":
      return "Edite o arquivo moltbot.json de forma segura.";
    case "jsoneditor":
      return "Editor visual avançado para o arquivo moltbot.json com validação e formatação.";
    case "debug":
      return "Snapshots do gateway, eventos e chamadas RPC manuais.";
    case "logs":
      return "Acompanhamento em tempo real dos logs do sistema.";
    case "workspace":
      return "Edite os arquivos de comportamento do agente (SOUL.md, AGENTS.md, etc).";
    default:
      return "";
  }
}
