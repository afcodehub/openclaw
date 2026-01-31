import type { ChannelsStatusSnapshot } from "../types";
import type { ChannelsState } from "./channels.types";

export type { ChannelsState };

// ============================================
// CARREGA STATUS DOS CANAIS
// ============================================
export async function loadChannels(state: ChannelsState, probe: boolean) {
  if (!state.client || !state.connected) return;
  if (state.channelsLoading) return;

  state.channelsLoading = true;
  state.channelsError = null;

  try {
    const res = (await state.client.request("channels.status", {
      probe,
      timeoutMs: 8000,
    })) as ChannelsStatusSnapshot;
    state.channelsSnapshot = res;
    state.channelsLastSuccess = Date.now();
  } catch (err) {
    const msg = String(err);
    if (!msg.includes("(1012)")) {
      state.channelsError = msg;
    }
  } finally {
    state.channelsLoading = false;
  }
}

// ============================================
// WHATSAPP: GERAR QR CODE E AGUARDAR SCAN
// ============================================
export async function startWhatsAppLogin(state: ChannelsState, force: boolean) {
  if (!state.client || !state.connected || state.whatsappBusy) return;

  state.whatsappBusy = true;
  state.whatsappLoginMessage = "Gerando QR Code...";
  state.whatsappLoginQrDataUrl = null;
  state.whatsappLoginConnected = null;

  try {
    // 1. GERA O QR CODE
    const startRes = (await state.client.request("web.login.start", {
      force,
      timeoutMs: 60000,
    })) as { message?: string; qrDataUrl?: string };

    if (!startRes.qrDataUrl) {
      state.whatsappLoginMessage = startRes.message ?? "Erro ao gerar QR Code";
      state.whatsappBusy = false;
      return;
    }

    state.whatsappLoginQrDataUrl = startRes.qrDataUrl;
    state.whatsappLoginMessage = "QR Code gerado! Escaneie no WhatsApp → Dispositivos Conectados.";

    // 2. AGUARDA O SCAN (em background)
    waitForWhatsAppScan(state);

  } catch (err) {
    state.whatsappLoginMessage = `Erro: ${String(err)}`;
    state.whatsappLoginQrDataUrl = null;
    state.whatsappLoginConnected = null;
    state.whatsappBusy = false;
  }
}

// ============================================
// WHATSAPP: AGUARDA SCAN DO QR CODE
// ============================================
async function waitForWhatsAppScan(state: ChannelsState) {
  if (!state.client || !state.connected) return;

  try {
    state.whatsappLoginMessage = "Aguardando scan do QR Code...";

    const waitRes = (await state.client.request("web.login.wait", {
      timeoutMs: 180000, // 3 minutos
    })) as { connected?: boolean; message?: string };

    if (waitRes.connected) {
      state.whatsappLoginMessage = "✅ Conectado! WhatsApp está pronto.";
      state.whatsappLoginConnected = true;
      state.whatsappLoginQrDataUrl = null;

      // Recarrega status após 2 segundos
      setTimeout(() => {
        loadChannels(state, false);
      }, 2000);
    } else {
      state.whatsappLoginMessage = waitRes.message ?? "Falha ao conectar";
      state.whatsappLoginConnected = false;
    }
  } catch (err) {
    state.whatsappLoginMessage = `Erro ao aguardar scan: ${String(err)}`;
    state.whatsappLoginConnected = false;
  } finally {
    state.whatsappBusy = false;
  }
}

// ============================================
// WHATSAPP: LOGOUT
// ============================================
export async function logoutWhatsApp(state: ChannelsState) {
  if (!state.client || !state.connected || state.whatsappBusy) return;

  state.whatsappBusy = true;

  try {
    await state.client.request("channels.logout", { channel: "whatsapp" });
    state.whatsappLoginMessage = "✅ Desconectado com sucesso.";
    state.whatsappLoginQrDataUrl = null;
    state.whatsappLoginConnected = null;

    // Recarrega status
    setTimeout(() => {
      loadChannels(state, false);
    }, 1000);
  } catch (err) {
    state.whatsappLoginMessage = `Erro ao desconectar: ${String(err)}`;
  } finally {
    state.whatsappBusy = false;
  }
}

// ============================================
// WHATSAPP: LIMPAR DADOS
// ============================================
export async function clearWhatsApp(state: ChannelsState) {
  if (!state.client || !state.connected || state.whatsappBusy) return;

  state.whatsappBusy = true;

  try {
    await state.client.request("channels.clear", { channel: "whatsapp" });
    state.whatsappLoginMessage = "✅ Dados limpos com sucesso.";
    state.whatsappLoginQrDataUrl = null;
    state.whatsappLoginConnected = null;

    // Recarrega status
    setTimeout(() => {
      loadChannels(state, false);
    }, 1000);
  } catch (err) {
    state.whatsappLoginMessage = `Erro ao limpar dados: ${String(err)}`;
  } finally {
    state.whatsappBusy = false;
  }
}
