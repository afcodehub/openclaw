import { randomUUID } from "node:crypto";
import fsSync from "node:fs";
import * as whaileysNamespace from "whaileys";

// Detecção agressiva da função makeWASocket devido à natureza do fork whaileys
const getWASocket = (ns: any) => {
  if (typeof ns === 'function') return ns;
  if (typeof ns?.default === 'function') return ns.default;
  if (typeof ns?.default?.default === 'function') return ns.default.default;
  return ns; // fallback para o objeto em si (que vai falhar se não for função)
};

const makeWASocket = getWASocket(whaileysNamespace);

if (typeof makeWASocket !== "function") {
  console.error("FATAL ERROR: makeWASocket is not a function!", {
    type: typeof makeWASocket,
    keys: Object.keys(whaileysNamespace || {}),
  });
}

const {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
} = (whaileysNamespace as any).default ? (whaileysNamespace as any) : whaileysNamespace;
import qrcode from "qrcode-terminal";
import { danger, success } from "../globals.js";
import { getChildLogger, toPinoLikeLogger } from "../logging.js";
import { ensureDir, resolveUserPath } from "../utils.js";
import { VERSION } from "../version.js";
import { formatCliCommand } from "../cli/command-format.js";

import {
  maybeRestoreCredsFromBackup,
  resolveDefaultWebAuthDir,
  resolveWebCredsBackupPath,
  resolveWebCredsPath,
} from "./auth-store.js";

export {
  getWebAuthAgeMs,
  logoutWeb,
  logWebSelfId,
  pickWebChannel,
  readWebSelfId,
  WA_WEB_AUTH_DIR,
  webAuthExists,
} from "./auth-store.js";

let credsSaveQueue: Promise<void> = Promise.resolve();
function enqueueSaveCreds(
  authDir: string,
  saveCreds: () => Promise<void> | void,
  logger: ReturnType<typeof getChildLogger>,
): void {
  credsSaveQueue = credsSaveQueue
    .then(() => safeSaveCreds(authDir, saveCreds, logger))
    .catch((err) => {
      logger.warn({ error: String(err) }, "WhatsApp creds save queue error");
    });
}

function readCredsJsonRaw(filePath: string): string | null {
  try {
    if (!fsSync.existsSync(filePath)) return null;
    const stats = fsSync.statSync(filePath);
    if (!stats.isFile() || stats.size <= 1) return null;
    return fsSync.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

async function safeSaveCreds(
  authDir: string,
  saveCreds: () => Promise<void> | void,
  logger: ReturnType<typeof getChildLogger>,
): Promise<void> {
  try {
    // Best-effort backup so we can recover after abrupt restarts.
    // Important: don't clobber a good backup with a corrupted/truncated creds.json.
    const credsPath = resolveWebCredsPath(authDir);
    const backupPath = resolveWebCredsBackupPath(authDir);
    const raw = readCredsJsonRaw(credsPath);
    if (raw) {
      try {
        JSON.parse(raw);
        fsSync.copyFileSync(credsPath, backupPath);
      } catch {
        // keep existing backup
      }
    }
  } catch {
    // ignore backup failures
  }
  try {
    await Promise.resolve(saveCreds());
  } catch (err) {
    logger.warn({ error: String(err) }, "failed saving WhatsApp creds");
  }
}

/**
 * Create a Baileys socket backed by the multi-file auth store we keep on disk.
 * Consumers can opt into QR printing for interactive login flows.
 */
export async function createWaSocket(
  printQr: boolean,
  verbose: boolean,
  opts: { authDir?: string; onQr?: (qr: string) => void } = {},
) {
  const baseLogger = getChildLogger(
    { module: "baileys" },
    {
      level: verbose ? "info" : "silent",
    },
  );
  const logger = toPinoLikeLogger(baseLogger, verbose ? "info" : "silent");
  const authDir = resolveUserPath(opts.authDir ?? resolveDefaultWebAuthDir());
  await ensureDir(authDir);
  const sessionLogger = getChildLogger({ module: "web-session" });
  maybeRestoreCredsFromBackup(authDir);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  // Always fetch latest WhatsApp Web version (hardcoded versions often break)
  const { version } = await fetchLatestBaileysVersion();

  // Browser configuration with stable defaults
  const browserConfig = process.env.CLAWDBOT_BROWSER_OS
    ? [
      process.env.CLAWDBOT_BROWSER_OS,
      process.env.CLAWDBOT_BROWSER_NAME || "Chrome",
      process.env.CLAWDBOT_BROWSER_VERSION || "121.0.6167.85",
    ]
    : Browsers.macOS("Desktop");

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger as any),
    },
    version,
    logger: logger as any,
    printQRInTerminal: false,
    browser: browserConfig,

    // Configurações de timeout alinhadas com Whaileys defaults
    connectTimeoutMs: parseInt(process.env.CLAWDBOT_WA_CONNECT_TIMEOUT || "20000"), // 20s (Whaileys default)
    defaultQueryTimeoutMs: parseInt(process.env.CLAWDBOT_WA_QUERY_TIMEOUT || "60000"), // 60s (Whaileys default)
    qrTimeout: parseInt(process.env.CLAWDBOT_WA_QR_TIMEOUT || "60000"), // 60s para QR

    // Keep-alive crítico - Whaileys usa 15s
    keepAliveIntervalMs: parseInt(process.env.CLAWDBOT_WA_KEEPALIVE || "15000"), // 15s (Whaileys default)

    // Retry configurações alinhadas com Whaileys
    retryRequestDelayMs: parseInt(process.env.CLAWDBOT_WA_RETRY_DELAY || "250"), // 250ms (Whaileys default)

    // Configurações de sincronização
    syncFullHistory: false,
    markOnlineOnConnect: true,
    shouldSyncHistoryMessage: () => false,
    shouldIgnoreJid: () => false,

    // Configurações de performance
    generateHighQualityLinkPreview: false,
    fireInitQueries: true,
    emitOwnEvents: false,

    // getMessage para retry de mensagens falhadas
    getMessage: async () => undefined,
  });

  sock.ev.on("creds.update", () => enqueueSaveCreds(authDir, saveCreds, sessionLogger));

  // Handler robusto de connection.update com tratamento de erros melhorado
  sock.ev.on(
    "connection.update",
    (update: Partial<import("whaileys").ConnectionState>) => {
      try {
        const { connection, lastDisconnect, qr, isNewLogin, isOnline } = update;

        // Log detalhado do estado da conexão
        if (connection) {
          sessionLogger.info({
            connection,
            isNewLogin,
            isOnline,
            hasQr: Boolean(qr),
            hasDisconnect: Boolean(lastDisconnect)
          }, "WhatsApp connection state changed");
        }

        if (qr) {
          opts.onQr?.(qr);
          if (printQr) {
            console.log("Scan this QR in WhatsApp (Linked Devices):");
            qrcode.generate(qr, { small: true });
          }
          sessionLogger.info("WhatsApp QR code generated successfully");
        }

        if (connection === "close") {
          const status = getStatusCode(lastDisconnect?.error);
          const errorMsg = formatError(lastDisconnect?.error);

          sessionLogger.warn({
            status,
            error: errorMsg,
            isLoggedOut: status === DisconnectReason.loggedOut
          }, "WhatsApp connection closed");

          if (status === DisconnectReason.loggedOut) {
            console.error(
              danger(
                `WhatsApp session logged out. Run: ${formatCliCommand("openclaw channels login")}`,
              ),
            );
          } else if (status === DisconnectReason.connectionClosed) {
            sessionLogger.info("Connection closed normally - will reconnect if needed");
          } else if (status === DisconnectReason.timedOut) {
            sessionLogger.warn("Connection timed out - will retry");
          } else if (status === DisconnectReason.badSession) {
            sessionLogger.error("Bad session detected - may need to relink");
          } else if (status === DisconnectReason.connectionLost) {
            sessionLogger.warn("Connection lost - will attempt to reconnect");
          }
        }

        if (connection === "connecting") {
          sessionLogger.info("Connecting to WhatsApp Web...");
        }

        if (connection === "open") {
          sessionLogger.info("WhatsApp Web connection established successfully");
          if (verbose) {
            console.log(success("WhatsApp Web connected."));
          }
        }
      } catch (err) {
        sessionLogger.error({ error: String(err) }, "connection.update handler error");
      }
    },
  );

  // Handler robusto de erros do WebSocket
  if (sock.ws && typeof (sock.ws as unknown as { on?: unknown }).on === "function") {
    sock.ws.on("error", (err: Error) => {
      sessionLogger.error({ error: String(err), stack: err.stack }, "WebSocket error");
    });

    sock.ws.on("close", (code: number, reason: Buffer) => {
      sessionLogger.info({
        code,
        reason: reason.toString()
      }, "WebSocket closed");
    });
  }

  return sock;
}

export async function waitForWaConnection(sock: ReturnType<typeof makeWASocket>) {
  return new Promise<void>((resolve, reject) => {
    type OffCapable = {
      off?: (event: string, listener: (...args: unknown[]) => void) => void;
    };
    const evWithOff = sock.ev as unknown as OffCapable;

    const handler = (...args: unknown[]) => {
      const update = (args[0] ?? {}) as Partial<import("whaileys").ConnectionState>;
      if (update.connection === "open") {
        evWithOff.off?.("connection.update", handler);
        resolve();
      }
      if (update.connection === "close") {
        evWithOff.off?.("connection.update", handler);
        reject(update.lastDisconnect ?? new Error("Connection closed"));
      }
    };

    sock.ev.on("connection.update", handler);
  });
}

export function getStatusCode(err: unknown) {
  return (
    (err as { output?: { statusCode?: number } })?.output?.statusCode ??
    (err as { status?: number })?.status
  );
}

function safeStringify(value: unknown, limit = 800): string {
  try {
    const seen = new WeakSet<object>();
    const raw = JSON.stringify(
      value,
      (_key, v) => {
        if (typeof v === "bigint") return v.toString();
        if (typeof v === "function") {
          const maybeName = (v as { name?: unknown }).name;
          const name =
            typeof maybeName === "string" && maybeName.length > 0 ? maybeName : "anonymous";
          return `[Function ${name}]`;
        }
        if (typeof v === "object" && v) {
          if (seen.has(v)) return "[Circular]";
          seen.add(v);
        }
        return v;
      },
      2,
    );
    if (!raw) return String(value);
    return raw.length > limit ? `${raw.slice(0, limit)}…` : raw;
  } catch {
    return String(value);
  }
}

function extractBoomDetails(err: unknown): {
  statusCode?: number;
  error?: string;
  message?: string;
} | null {
  if (!err || typeof err !== "object") return null;
  const output = (err as { output?: unknown })?.output as
    | { statusCode?: unknown; payload?: unknown }
    | undefined;
  if (!output || typeof output !== "object") return null;
  const payload = (output as { payload?: unknown }).payload as
    | { error?: unknown; message?: unknown; statusCode?: unknown }
    | undefined;
  const statusCode =
    typeof (output as { statusCode?: unknown }).statusCode === "number"
      ? ((output as { statusCode?: unknown }).statusCode as number)
      : typeof payload?.statusCode === "number"
        ? (payload.statusCode as number)
        : undefined;
  const error = typeof payload?.error === "string" ? payload.error : undefined;
  const message = typeof payload?.message === "string" ? payload.message : undefined;
  if (!statusCode && !error && !message) return null;
  return { statusCode, error, message };
}

export function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (!err || typeof err !== "object") return String(err);

  // Baileys frequently wraps errors under `error` with a Boom-like shape.
  const boom =
    extractBoomDetails(err) ??
    extractBoomDetails((err as { error?: unknown })?.error) ??
    extractBoomDetails((err as { lastDisconnect?: { error?: unknown } })?.lastDisconnect?.error);

  const status = boom?.statusCode ?? getStatusCode(err);
  const code = (err as { code?: unknown })?.code;
  const codeText = typeof code === "string" || typeof code === "number" ? String(code) : undefined;

  const messageCandidates = [
    boom?.message,
    typeof (err as { message?: unknown })?.message === "string"
      ? ((err as { message?: unknown }).message as string)
      : undefined,
    typeof (err as { error?: { message?: unknown } })?.error?.message === "string"
      ? ((err as { error?: { message?: unknown } }).error?.message as string)
      : undefined,
  ].filter((v): v is string => Boolean(v && v.trim().length > 0));
  const message = messageCandidates[0];

  const pieces: string[] = [];
  if (typeof status === "number") pieces.push(`status=${status}`);
  if (boom?.error) pieces.push(boom.error);
  if (message) pieces.push(message);
  if (codeText) pieces.push(`code=${codeText}`);

  if (pieces.length > 0) return pieces.join(" ");
  return safeStringify(err);
}

export function newConnectionId() {
  return randomUUID();
}
