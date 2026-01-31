import { randomUUID } from "node:crypto";
import { DisconnectReason } from "whaileys";
import { loadConfig } from "../config/config.js";
import { danger, info, success } from "../globals.js";
import { defaultRuntime, type RuntimeEnv } from "../runtime.js";
import { resolveWhatsAppAccount } from "./accounts.js";
import { renderQrPngBase64 } from "./qr-image.js";
import {
  createWaSocket,
  formatError,
  getStatusCode,
  logoutWeb,
  readWebSelfId,
  waitForWaConnection,
  webAuthExists,
} from "./session.js";

type WaSocket = Awaited<ReturnType<typeof createWaSocket>>;

type ActiveLogin = {
  accountId: string;
  authDir: string;
  isLegacyAuthDir: boolean;
  id: string;
  sock: WaSocket;
  startedAt: number;
  qr?: string;
  qrDataUrl?: string;
  connected: boolean;
  error?: string;
  errorStatus?: number;
  waitPromise: Promise<void>;
  verbose: boolean;
};

const ACTIVE_LOGIN_TTL_MS = 60_000; // 60 segundos
const activeLogins = new Map<string, ActiveLogin>();

function closeSocket(sock: WaSocket) {
  try {
    sock.ws?.close();
  } catch {
    // ignore
  }
}

async function resetActiveLogin(accountId: string, reason?: string) {
  const login = activeLogins.get(accountId);
  if (login) {
    closeSocket(login.sock);
    activeLogins.delete(accountId);
  }
  if (reason) {
    console.log(info(reason));
  }
}

// NOVA IMPLEMENTAÇÃO: USA A MESMA LÓGICA DO CLI (loginWeb)
export async function startWebLoginWithQr(
  opts: {
    verbose?: boolean;
    timeoutMs?: number;
    force?: boolean;
    accountId?: string;
    runtime?: RuntimeEnv;
  } = {},
): Promise<{ qrDataUrl?: string; message: string; expiresAt?: number; duration?: number }> {
  const runtime = opts.runtime ?? defaultRuntime;
  const cfg = loadConfig();
  const account = resolveWhatsAppAccount({ cfg, accountId: opts.accountId });
  const hasWeb = await webAuthExists(account.authDir);
  const selfId = readWebSelfId(account.authDir);

  if (hasWeb && !opts.force) {
    const who = selfId.e164 ?? selfId.jid ?? "unknown";
    return {
      message: `WhatsApp já está conectado (${who}). Use "Relogar" para forçar nova conexão.`,
    };
  }

  await resetActiveLogin(account.accountId);

  // Se force=true, limpa sessão antiga
  if (opts.force) {
    try {
      await logoutWeb({ authDir: account.authDir, runtime });
    } catch {
      // Ignora erros
    }
  }

  let resolveQr: ((qr: string) => void) | null = null;
  let rejectQr: ((err: Error) => void) | null = null;
  const qrPromise = new Promise<string>((resolve, reject) => {
    resolveQr = resolve;
    rejectQr = reject;
  });

  const qrTimer = setTimeout(() => {
    rejectQr?.(new Error("Timeout aguardando QR Code"));
  }, 60_000);

  let sock: WaSocket;
  let pendingQr: string | null = null;

  try {
    // Cria socket COM QR (true no primeiro parâmetro)
    sock = await createWaSocket(true, Boolean(opts.verbose), {
      authDir: account.authDir,
      onQr: (qr: string) => {
        if (pendingQr) return;
        pendingQr = qr;
        clearTimeout(qrTimer);
        runtime.log(info("✅ QR Code gerado! Escaneie no WhatsApp → Dispositivos Conectados."));
        resolveQr?.(qr);
      },
    });
  } catch (err) {
    clearTimeout(qrTimer);
    await resetActiveLogin(account.accountId);
    return {
      message: `Erro ao iniciar login: ${String(err)}`,
    };
  }

  const login: ActiveLogin = {
    accountId: account.accountId,
    authDir: account.authDir,
    isLegacyAuthDir: account.isLegacyAuthDir,
    id: randomUUID(),
    sock,
    startedAt: Date.now(),
    connected: false,
    waitPromise: Promise.resolve(),
    verbose: Boolean(opts.verbose),
  };
  activeLogins.set(account.accountId, login);

  // LÓGICA IGUAL AO CLI: aguarda conexão e lida com erro 515
  login.waitPromise = (async () => {
    try {
      await waitForWaConnection(sock);
      login.connected = true;
      runtime.log(success("✅ Conectado! WhatsApp está pronto."));
    } catch (err) {
      const code =
        (err as { error?: { output?: { statusCode?: number } } })?.error?.output?.statusCode ??
        (err as { output?: { statusCode?: number } })?.output?.statusCode;

      // ERRO 515: WhatsApp pediu restart (IGUAL AO CLI)
      if (code === 515) {
        runtime.log(info("WhatsApp pediu restart após pairing (código 515). Reiniciando..."));

        try {
          sock.ws?.close();
        } catch {
          // ignore
        }

        // Aguarda um pouco
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Cria NOVO socket SEM QR (false no primeiro parâmetro)
        try {
          const retry = await createWaSocket(false, Boolean(opts.verbose), {
            authDir: account.authDir,
          });
          login.sock = retry;

          // Aguarda conexão no novo socket
          await waitForWaConnection(retry);
          login.connected = true;
          runtime.log(success("✅ Conectado após restart! WhatsApp está pronto."));

          // Fecha socket após um tempo
          setTimeout(() => {
            try {
              retry.ws?.close();
            } catch {
              // ignore
            }
          }, 500);
        } catch (retryErr) {
          login.error = formatError(retryErr);
          login.errorStatus = getStatusCode(retryErr);
          runtime.log(danger(`❌ Erro após restart: ${login.error}`));
        }
      } else if (code === DisconnectReason.loggedOut) {
        await logoutWeb({
          authDir: account.authDir,
          isLegacyAuthDir: account.isLegacyAuthDir,
          runtime,
        });
        login.error = "Session logged out";
        login.errorStatus = code;
        runtime.log(danger("❌ Sessão deslogada. Tente novamente."));
      } else {
        login.error = formatError(err);
        login.errorStatus = getStatusCode(err);
        runtime.log(danger(`❌ Erro na conexão: ${login.error}`));
      }
    }
  })();

  // Aguarda o QR ser gerado
  let qr: string;
  try {
    qr = await qrPromise;
  } catch (err) {
    clearTimeout(qrTimer);
    await resetActiveLogin(account.accountId);
    return {
      message: `Erro ao gerar QR: ${String(err)}`,
    };
  }

  const base64 = await renderQrPngBase64(qr);
  login.qrDataUrl = `data:image/png;base64,${base64}`;
  const expiresAt = login.startedAt + ACTIVE_LOGIN_TTL_MS;

  return {
    qrDataUrl: login.qrDataUrl,
    message: "QR Code gerado! Escaneie no WhatsApp → Dispositivos Conectados.",
    expiresAt,
    duration: ACTIVE_LOGIN_TTL_MS,
  };
}

export async function waitForWebLogin(
  opts: { timeoutMs?: number; runtime?: RuntimeEnv; accountId?: string } = {},
): Promise<{ connected: boolean; message: string }> {
  const runtime = opts.runtime ?? defaultRuntime;
  const cfg = loadConfig();
  const account = resolveWhatsAppAccount({ cfg, accountId: opts.accountId });
  const activeLogin = activeLogins.get(account.accountId);

  if (!activeLogin) {
    return {
      connected: false,
      message: "Nenhum login ativo. Gere um QR Code primeiro.",
    };
  }

  const login = activeLogin;
  const timeoutMs = Math.max(opts.timeoutMs ?? 180_000, 1000);
  const deadline = Date.now() + timeoutMs;

  // Aguarda o waitPromise completar ou timeout
  while (Date.now() < deadline) {
    // Verifica se já conectou
    if (login.connected) {
      const message = "✅ Conectado! WhatsApp está pronto.";
      runtime.log(success(message));
      await resetActiveLogin(account.accountId);
      return { connected: true, message };
    }

    // Verifica se teve erro
    if (login.error) {
      const message = `Erro no login: ${login.error}`;
      runtime.log(danger(message));
      await resetActiveLogin(account.accountId);
      return { connected: false, message };
    }

    // Aguarda um pouco antes de verificar novamente
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return {
    connected: false,
    message: "Timeout aguardando scan do QR Code. Tente novamente.",
  };
}
