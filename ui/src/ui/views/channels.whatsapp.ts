import { html, nothing } from "lit";
import { formatAgo } from "../format";
import type { WhatsAppStatus } from "../types";
import type { ChannelsProps } from "./channels.types";
import { formatDuration } from "./channels.shared";

export function renderWhatsAppCard(params: {
  props: ChannelsProps;
  whatsapp?: WhatsAppStatus;
  accountCountLabel: unknown;
}) {
  const { props, whatsapp, accountCountLabel } = params;

  return html`
    <div class="card">
      <div class="card-title">WhatsApp</div>
      <div class="card-sub">Conecte o WhatsApp Web e monitore o status da conexão.</div>
      ${accountCountLabel}

      <!-- STATUS -->
      <div class="status-list" style="margin-top: 16px;">
        <div>
          <span class="label">Status</span>
          <span class=${whatsapp?.connected ? "text-success" : "text-danger"}>
            ${whatsapp?.connected ? "✅ Online" : "❌ Offline"}
          </span>
        </div>
        <div>
          <span class="label">Pareado</span>
          <span>${whatsapp?.linked ? "Sim" : "Não"}</span>
        </div>
        <div>
          <span class="label">Em execução</span>
          <span>${whatsapp?.running ? "Sim" : "Não"}</span>
        </div>
        <div>
          <span class="label">Última conexão</span>
          <span>
            ${whatsapp?.lastConnectedAt ? formatAgo(whatsapp.lastConnectedAt) : "n/a"}
          </span>
        </div>
        <div>
          <span class="label">Última mensagem</span>
          <span>
            ${whatsapp?.lastMessageAt ? formatAgo(whatsapp.lastMessageAt) : "n/a"}
          </span>
        </div>
        <div>
          <span class="label">Idade da sessão</span>
          <span>
            ${whatsapp?.authAgeMs != null ? formatDuration(whatsapp.authAgeMs) : "n/a"}
          </span>
        </div>
      </div>

      <!-- MENSAGEM DE STATUS -->
      ${props.whatsappMessage
      ? html`<div class="callout ${props.whatsappConnected ? 'success' : ''}" style="margin-top: 12px;">
            ${props.whatsappMessage}
          </div>`
      : nothing}

      <!-- QR CODE -->
      ${props.whatsappQrDataUrl
      ? html`<div class="qr-wrap" style="text-align: center; background: white; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="color: #333; margin-bottom: 12px; font-weight: 600; font-size: 16px;">
              📱 Escaneie o QR Code no WhatsApp
            </p>
            <img 
              src=${props.whatsappQrDataUrl} 
              alt="WhatsApp QR" 
              style="max-width: 280px; margin: 0 auto; display: block; border: 2px solid #25D366; border-radius: 8px; padding: 8px;"
            />
            <p style="color: #666; font-size: 14px; margin-top: 12px;">
              Abra o WhatsApp → Dispositivos Conectados → Conectar Dispositivo
            </p>
          </div>`
      : nothing}

      <!-- BOTÕES -->
      <div class="row" style="margin-top: 16px; flex-wrap: wrap; gap: 8px;">
        ${!whatsapp?.connected
      ? html`
              <button
                class="btn primary"
                ?disabled=${props.whatsappBusy}
                @click=${() => props.onWhatsAppStart(false)}
              >
                ${props.whatsappBusy ? "⏳ Processando..." : "🔗 Conectar WhatsApp"}
              </button>
              <button
                class="btn"
                ?disabled=${props.whatsappBusy}
                @click=${() => props.onWhatsAppStart(true)}
                title="Limpa a sessão atual e gera novo QR Code"
              >
                🔄 Reconectar
              </button>
            `
      : html`
              <button
                class="btn danger"
                ?disabled=${props.whatsappBusy}
                @click=${() => props.onWhatsAppLogout()}
              >
                ${props.whatsappBusy ? "⏳ Processando..." : "🚪 Desconectar"}
              </button>
            `}
        
        <button 
          class="btn" 
          @click=${() => props.onRefresh(false)}
          ?disabled=${props.whatsappBusy}
        >
          🔄 Atualizar
        </button>
      </div>
    </div>
  `;
}
