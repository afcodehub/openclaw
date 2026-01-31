import { html, nothing } from "lit";
import { formatAgo } from "../format";
import type { WhatsAppStatus } from "../types";
import { formatDuration } from "./channels.shared";

export type WhatsAppViewProps = {
  connected: boolean;
  loading: boolean;
  whatsapp?: WhatsAppStatus;
  lastError: string | null;
  lastSuccessAt: number | null;
  whatsappMessage: string | null;
  whatsappQrDataUrl: string | null;
  whatsappLoginConnected: boolean | null;
  whatsappBusy: boolean;
  configForm: Record<string, unknown> | null;
  configSaving: boolean;
  configSaved?: boolean;
  onRefresh: (probe: boolean) => Promise<void>;
  onWhatsAppStart: (force: boolean) => Promise<void>;
  onWhatsAppLogout: () => Promise<void>;
  onWhatsAppClear: () => Promise<void>;
  onConfigPatch: (path: string[], value: unknown) => void;
  onConfigSave: () => Promise<void>;
};

export function renderWhatsApp(props: WhatsAppViewProps) {
  const { whatsapp } = props;
  const isConnected = whatsapp?.connected ?? false;
  const isLinked = whatsapp?.linked ?? false;

  return html`
    <style>
      .whatsapp-hero {
        background: var(--card);
        border-radius: var(--radius-lg);
        padding: 24px 32px;
        color: var(--text);
        text-align: center;
        margin-bottom: 24px;
        border: 1px solid var(--border);
      }
      
      .whatsapp-hero-icon {
        font-size: 48px;
        margin-bottom: 12px;
        opacity: 0.9;
      }
      
      .whatsapp-hero-title {
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 6px;
        color: var(--text-strong);
        font-family: var(--font-display);
      }
      
      .whatsapp-hero-subtitle {
        font-size: 14px;
        color: var(--muted);
      }
      
      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: var(--radius-full);
        font-weight: 600;
        font-size: 14px;
        margin-top: 12px;
        border: 1px solid var(--border);
      }
      
      .status-badge.online {
        background: var(--ok-subtle);
        color: var(--ok);
        border-color: var(--ok-muted);
      }
      
      .status-badge.offline {
        background: var(--danger-subtle);
        color: var(--danger);
        border-color: var(--danger-muted);
      }
      
      .status-indicator {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      
      .status-indicator.online {
        background: var(--ok);
      }
      
      .status-indicator.offline {
        background: var(--danger);
      }
      
      /* Modal Styles */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.2s ease-out;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .modal-content {
        background: var(--card);
        border-radius: var(--radius-xl);
        padding: 32px;
        max-width: 400px;
        width: 90%;
        box-shadow: var(--shadow-xl);
        animation: slideUp 0.3s ease-out;
        text-align: center;
        border: 1px solid var(--border);
      }
      
      @keyframes slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      .modal-icon {
        font-size: 48px;
        margin-bottom: 16px;
        animation: scaleIn 0.4s ease-out;
      }
      
      @keyframes scaleIn {
        from {
          transform: scale(0);
        }
        to {
          transform: scale(1);
        }
      }
      
      .modal-title {
        font-size: 20px;
        font-weight: 600;
        color: var(--text-strong);
        margin-bottom: 8px;
      }
      
      .modal-message {
        font-size: 14px;
        color: var(--muted);
        margin-bottom: 20px;
        line-height: 1.5;
      }
      
      .modal-button {
        padding: 12px 24px;
        background: var(--accent);
        color: var(--accent-foreground);
        border: none;
        border-radius: var(--radius-md);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all var(--duration-fast) var(--ease-out);
      }
      
      .modal-button:hover {
        background: var(--accent-hover);
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        margin-top: 16px;
      }
      
      .stat-card {
        background: var(--card);
        border-radius: var(--radius-md);
        padding: 16px;
        text-align: center;
        border: 1px solid var(--border);
        transition: all var(--duration-fast) var(--ease-out);
      }
      
      .stat-card:hover {
        border-color: var(--border-hover);
        background: var(--bg-hover);
      }
      
      .stat-icon {
        font-size: 28px;
        margin-bottom: 8px;
      }
      
      .stat-label {
        font-size: 11px;
        text-transform: uppercase;
        color: var(--muted);
        font-weight: 600;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }
      
      .stat-value {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-strong);
      }
      
      .qr-container {
        background: var(--card);
        border-radius: var(--radius-lg);
        padding: 24px;
        text-align: center;
        margin: 16px 0;
        border: 1px solid var(--border);
      }
      
      .qr-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--text-strong);
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }
      
      .qr-code-wrapper {
        background: var(--bg-elevated);
        padding: 16px;
        border-radius: var(--radius-md);
        display: inline-block;
        border: 1px solid var(--border);
        margin: 12px 0;
      }
      
      .qr-code-wrapper img {
        display: block;
        max-width: 300px;
        border-radius: var(--radius-sm);
      }
      
      .qr-instructions {
        background: var(--bg-accent);
        border-radius: var(--radius-md);
        padding: 16px;
        margin-top: 16px;
      }
      
      .qr-step {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 0;
        color: var(--text);
        font-weight: 500;
      }
      
      .qr-step-number {
        background: var(--accent);
        color: var(--accent-foreground);
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 13px;
      }
      
      .action-buttons {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 16px;
      }
      
      .action-btn {
        flex: 1;
        min-width: 160px;
        padding: 10px 20px;
        border-radius: var(--radius-md);
        font-size: 14px;
        font-weight: 500;
        border: none;
        cursor: pointer;
        transition: all var(--duration-fast) var(--ease-out);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      
      .action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .action-btn.primary {
        background: var(--accent);
        color: var(--accent-foreground);
      }
      
      .action-btn.primary:hover:not(:disabled) {
        background: var(--accent-hover);
      }
      
      .action-btn.secondary {
        background: var(--bg-elevated);
        color: var(--text);
        border: 1px solid var(--border);
      }
      
      .action-btn.secondary:hover:not(:disabled) {
        background: var(--bg-hover);
        border-color: var(--border-hover);
      }
      
      .action-btn.danger {
        background: var(--danger);
        color: white;
      }
      
      .action-btn.danger:hover:not(:disabled) {
        background: var(--danger-muted);
      }
      
      .info-panel {
        background: var(--card);
        border-radius: var(--radius-md);
        padding: 16px;
        margin-top: 16px;
        border-left: 3px solid var(--accent);
        border: 1px solid var(--border);
        border-left: 3px solid var(--accent);
      }
      
      .info-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-strong);
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .alert-box {
        background: var(--warn-subtle);
        border: 1px solid var(--warn-muted);
        border-radius: var(--radius-md);
        padding: 16px;
        margin: 16px 0;
        display: flex;
        align-items: start;
        gap: 12px;
      }
      
      .alert-icon {
        font-size: 24px;
      }
      
      .alert-content {
        flex: 1;
      }
      
      .alert-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-strong);
        margin-bottom: 6px;
      }
      
      .alert-message {
        color: var(--text);
        line-height: 1.5;
        font-weight: 500;
      }
    </style>

    <!-- Hero Section -->
    <div class="whatsapp-hero">
      <div class="whatsapp-hero-icon">💬</div>
      <div class="whatsapp-hero-title">WhatsApp (Whaileys API)</div>
      <div class="whatsapp-hero-subtitle">
        Conecte sua conta do WhatsApp e automatize suas conversas
      </div>
      <div class="status-badge ${isConnected ? 'online' : 'offline'}">
        <span class="status-indicator ${isConnected ? 'online' : 'offline'}"></span>
        ${isConnected ? 'Conectado e Ativo' : 'Desconectado'}
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">${isLinked ? '✅' : '❌'}</div>
        <div class="stat-label">Pareamento</div>
        <div class="stat-value">${isLinked ? 'Pareado' : 'Não Pareado'}</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">${whatsapp?.running ? '🟢' : '🔴'}</div>
        <div class="stat-label">Serviço</div>
        <div class="stat-value">${whatsapp?.running ? 'Em Execução' : 'Parado'}</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">⏱️</div>
        <div class="stat-label">Última Conexão</div>
        <div class="stat-value">
          ${whatsapp?.lastConnectedAt ? formatAgo(whatsapp.lastConnectedAt) : 'Nunca'}
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">💬</div>
        <div class="stat-label">Última Mensagem</div>
        <div class="stat-value">
          ${whatsapp?.lastMessageAt ? formatAgo(whatsapp.lastMessageAt) : 'Nenhuma'}
        </div>
      </div>
      
      ${whatsapp?.authAgeMs != null ? html`
        <div class="stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-label">Idade da Sessão</div>
          <div class="stat-value">${formatDuration(whatsapp.authAgeMs)}</div>
        </div>
      ` : nothing}
      
      ${whatsapp?.self?.e164 ? html`
        <div class="stat-card">
          <div class="stat-icon">📱</div>
          <div class="stat-label">Número</div>
          <div class="stat-value">${whatsapp.self.e164}</div>
        </div>
      ` : nothing}
    </div>

    <!-- QR Code Section -->
    ${props.whatsappQrDataUrl ? html`
      <div class="qr-container">
        <div class="qr-title">
          <span>📱</span>
          <span>Escaneie para Conectar</span>
        </div>
        <div class="qr-code-wrapper">
          <img src=${props.whatsappQrDataUrl} alt="WhatsApp QR Code" />
        </div>
        <div class="qr-instructions">
          <div class="qr-step">
            <span class="qr-step-number">1</span>
            <span>Abra o WhatsApp no seu celular</span>
          </div>
          <div class="qr-step">
            <span class="qr-step-number">2</span>
            <span>Toque em Menu ou Configurações</span>
          </div>
          <div class="qr-step">
            <span class="qr-step-number">3</span>
            <span>Toque em Dispositivos Conectados</span>
          </div>
          <div class="qr-step">
            <span class="qr-step-number">4</span>
            <span>Toque em Conectar Dispositivo e escaneie o código</span>
          </div>
        </div>
      </div>
    ` : nothing}

    <!-- Status Message -->
    ${props.whatsappMessage ? html`
      <div class="alert-box">
        <div class="alert-icon">${props.whatsappLoginConnected ? '✅' : '⚠️'}</div>
        <div class="alert-content">
          <div class="alert-title">
            ${props.whatsappLoginConnected ? 'Sucesso!' : 'Atenção'}
          </div>
          <div class="alert-message">${props.whatsappMessage}</div>
        </div>
      </div>
    ` : nothing}

    <!-- Action Buttons -->
    <div class="action-buttons">
      ${!isConnected ? html`
        <button
          class="action-btn primary"
          ?disabled=${props.whatsappBusy}
          @click=${() => props.onWhatsAppStart(false)}
        >
          <span>${props.whatsappBusy ? '⏳' : '🔗'}</span>
          <span>${props.whatsappBusy ? 'Conectando...' : 'Conectar WhatsApp'}</span>
        </button>
        <button
          class="action-btn secondary"
          ?disabled=${props.whatsappBusy}
          @click=${() => props.onWhatsAppStart(true)}
        >
          <span>🔄</span>
          <span>Nova Conexão</span>
        </button>
      ` : html`
        <button
          class="action-btn danger"
          ?disabled=${props.whatsappBusy}
          @click=${() => props.onWhatsAppLogout()}
        >
          <span>${props.whatsappBusy ? '⏳' : '🚪'}</span>
          <span>${props.whatsappBusy ? 'Desconectando...' : 'Desconectar'}</span>
        </button>
      `}
      
      <button
        class="action-btn danger"
        ?disabled=${props.whatsappBusy}
        @click=${() => props.onWhatsAppClear()}
      >
        <span>🗑️</span>
        <span>Limpar Sessão</span>
      </button>
      
      <button
        class="action-btn secondary"
        ?disabled=${props.whatsappBusy}
        @click=${() => props.onRefresh(false)}
      >
        <span>🔄</span>
        <span>Atualizar Status</span>
      </button>
    </div>

    <!-- Error Display -->
    ${props.lastError ? html`
      <div class="info-panel" style="border-left-color: var(--danger); background: var(--danger-subtle);">
        <div class="info-title">
          <span>❌</span>
          <span>Erro Detectado</span>
        </div>
        <div style="color: var(--text); font-weight: 500;">${props.lastError}</div>
      </div>
    ` : nothing}

    <!-- Technical Info (Collapsible) -->
    ${whatsapp ? html`
      <details class="info-panel" style="margin-top: 24px;">
        <summary class="info-title" style="cursor: pointer; user-select: none;">
          <span>🔧</span>
          <span>Informações Técnicas</span>
        </summary>
        <pre style="margin-top: 12px; padding: 16px; background: var(--bg-elevated); color: var(--text); border-radius: var(--radius-md); overflow-x: auto; font-size: 13px; line-height: 1.6; font-family: var(--mono);">${JSON.stringify(whatsapp, null, 2)}</pre>
      </details>
    ` : nothing}

    <!-- Configuration Panel -->
    ${renderConfigPanel(props)}

    <!-- Success Modal -->
    ${props.configSaved ? html`
      <div class="modal-overlay" @click=${() => {
        // Fechar modal clicando fora
        const event = new CustomEvent('close-modal');
        document.dispatchEvent(event);
      }}>
        <div class="modal-content" @click=${(e: Event) => e.stopPropagation()}>
          <div class="modal-icon">✅</div>
          <div class="modal-title">Configurações Salvas!</div>
          <div class="modal-message">
            As configurações do WhatsApp foram salvas com sucesso no arquivo openclaw.json.
          </div>
          <button class="modal-button" @click=${() => {
        const event = new CustomEvent('close-modal');
        document.dispatchEvent(event);
      }}>
            OK
          </button>
        </div>
      </div>
    ` : nothing}
  `;
}

function renderConfigPanel(props: WhatsAppViewProps) {
  const channels = props.configForm?.channels as Record<string, unknown> | undefined;
  const whatsappConfig = channels?.whatsapp as Record<string, unknown> | undefined;

  if (!props.configForm) {
    return html`
      <div class="info-panel" style="margin-top: 16px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
        <div class="info-title" style="justify-content: center;">
          Carregando configurações...
        </div>
      </div>
    `;
  }

  if (!whatsappConfig) {
    return html`
      <div class="info-panel" style="margin-top: 16px; background: var(--danger-subtle); border-left-color: var(--danger);">
        <div class="info-title">
          <span>❌</span>
          <span>Configuração do WhatsApp não encontrada</span>
        </div>
        <div style="color: var(--text); font-weight: 500; margin-top: 8px;">
          O arquivo openclaw.json não contém configurações do WhatsApp. Verifique o arquivo de configuração.
        </div>
      </div>
    `;
  }

  // Pegar configurações da conta default
  const accounts = whatsappConfig.accounts as Record<string, unknown> | undefined;
  const defaultAccount = accounts?.default as Record<string, unknown> | undefined;
  const config = defaultAccount || whatsappConfig;

  const allowFrom = (config.allowFrom as string[] | undefined)?.[0] ?? '';
  const dmPolicy = (config.dmPolicy as string) ?? 'allowlist';
  const groupPolicy = (config.groupPolicy as string) ?? 'disabled';
  const selfChatMode = (config.selfChatMode as boolean) ?? false;
  const sendReadReceipts = (config.sendReadReceipts as boolean) ?? true;
  const historyLimit = (whatsappConfig.historyLimit as number) ?? 50;
  const dmHistoryLimit = (whatsappConfig.dmHistoryLimit as number) ?? 10;
  const mediaMaxMb = (whatsappConfig.mediaMaxMb as number) ?? 50;
  const textChunkLimit = (whatsappConfig.textChunkLimit as number) ?? 4000;
  const ackReaction = config.ackReaction as Record<string, unknown> | undefined;
  const ackEmoji = (ackReaction?.emoji as string) ?? '👀';
  const actions = whatsappConfig.actions as Record<string, unknown> | undefined;
  const allowReactions = (actions?.reactions as boolean) ?? true;

  // Configurações avançadas (web)
  const web = props.configForm?.web as Record<string, unknown> | undefined;
  const heartbeatSeconds = (web?.heartbeatSeconds as number) ?? 60;

  return html`
    <style>
      .config-panel {
        background: var(--card);
        border-radius: var(--radius-lg);
        padding: 20px;
        margin-top: 16px;
        border: 1px solid var(--border);
      }
      
      .config-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
      }
      
      .config-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--text-strong);
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .config-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
      }
      
      .config-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      
      .config-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--text);
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .config-input,
      .config-select {
        padding: 10px 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        font-size: 14px;
        font-weight: 500;
        color: var(--text);
        background: var(--bg-elevated);
        transition: border-color var(--duration-fast) var(--ease-out);
      }
      
      .config-input:focus,
      .config-select:focus {
        outline: none;
        border-color: var(--accent);
      }
      
      .config-checkbox-wrapper {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all var(--duration-fast) var(--ease-out);
      }
      
      .config-checkbox-wrapper:hover {
        border-color: var(--border-hover);
        background: var(--bg-hover);
      }
      
      .config-checkbox {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }
      
      .config-help {
        font-size: 11px;
        color: var(--muted);
        margin-top: 2px;
      }
      
      .save-btn {
        padding: 12px 24px;
        background: var(--accent);
        color: var(--accent-foreground);
        border: none;
        border-radius: var(--radius-md);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all var(--duration-fast) var(--ease-out);
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 20px;
      }
      
      .save-btn:hover:not(:disabled) {
        background: var(--accent-hover);
      }
      
      .save-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    </style>

    <details class="config-panel" open>
      <summary class="config-title" style="cursor: pointer; user-select: none;">
        <span>⚙️</span>
        <span>Configurações do WhatsApp</span>
      </summary>

      <div class="config-grid" style="margin-top: 24px;">
        <!-- Número Permitido -->
        <div class="config-field">
          <label class="config-label">
            <span>📱</span>
            <span>Número Permitido</span>
          </label>
          <input
            type="text"
            class="config-input"
            .value=${allowFrom}
            @input=${(e: Event) => {
      const value = (e.target as HTMLInputElement).value;
      props.onConfigPatch(['channels', 'whatsapp', 'accounts', 'default', 'allowFrom'], [value]);
    }}
            placeholder="556291252643"
          />
          <div class="config-help">Use * para permitir todos ou informe o número com DDI</div>
        </div>

        <!-- Política de DMs -->
        <div class="config-field">
          <label class="config-label">
            <span>💬</span>
            <span>Política de DMs</span>
          </label>
          <select
            class="config-select"
            .value=${dmPolicy}
            @change=${(e: Event) => {
      const value = (e.target as HTMLSelectElement).value;
      props.onConfigPatch(['channels', 'whatsapp', 'accounts', 'default', 'dmPolicy'], value);
    }}
          >
            <option value="allowlist">Apenas números permitidos</option>
            <option value="disabled">Desabilitado</option>
          </select>
          <div class="config-help">Controla quem pode enviar mensagens diretas</div>
        </div>

        <!-- Política de Grupos -->
        <div class="config-field">
          <label class="config-label">
            <span>👥</span>
            <span>Política de Grupos</span>
          </label>
          <select
            class="config-select"
            .value=${groupPolicy}
            @change=${(e: Event) => {
      const value = (e.target as HTMLSelectElement).value;
      props.onConfigPatch(['channels', 'whatsapp', 'accounts', 'default', 'groupPolicy'], value);
    }}
          >
            <option value="disabled">Desabilitado</option>
            <option value="allowlist">Apenas grupos permitidos</option>
          </select>
          <div class="config-help">Controla se o bot responde em grupos</div>
        </div>

        <!-- Emoji de Confirmação -->
        <div class="config-field">
          <label class="config-label">
            <span>👀</span>
            <span>Emoji de Confirmação</span>
          </label>
          <input
            type="text"
            class="config-input"
            .value=${ackEmoji}
            @input=${(e: Event) => {
      const value = (e.target as HTMLInputElement).value;
      props.onConfigPatch(['channels', 'whatsapp', 'accounts', 'default', 'ackReaction', 'emoji'], value);
    }}
            placeholder="👀"
            maxlength="2"
          />
          <div class="config-help">Emoji usado para confirmar leitura</div>
        </div>

        <!-- Limite de Histórico -->
        <div class="config-field">
          <label class="config-label">
            <span>📚</span>
            <span>Limite de Histórico (Grupos)</span>
          </label>
          <input
            type="number"
            class="config-input"
            .value=${historyLimit.toString()}
            @input=${(e: Event) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      props.onConfigPatch(['channels', 'whatsapp', 'historyLimit'], value);
    }}
            min="1"
            max="200"
          />
          <div class="config-help">Mensagens de contexto em grupos</div>
        </div>

        <!-- Limite de Histórico DM -->
        <div class="config-field">
          <label class="config-label">
            <span>💬</span>
            <span>Limite de Histórico (DMs)</span>
          </label>
          <input
            type="number"
            class="config-input"
            .value=${dmHistoryLimit.toString()}
            @input=${(e: Event) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      props.onConfigPatch(['channels', 'whatsapp', 'dmHistoryLimit'], value);
    }}
            min="1"
            max="100"
          />
          <div class="config-help">Mensagens de contexto em conversas diretas</div>
        </div>

        <!-- Tamanho Máximo de Mídia -->
        <div class="config-field">
          <label class="config-label">
            <span>📎</span>
            <span>Tamanho Máximo de Mídia (MB)</span>
          </label>
          <input
            type="number"
            class="config-input"
            .value=${mediaMaxMb.toString()}
            @input=${(e: Event) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      props.onConfigPatch(['channels', 'whatsapp', 'mediaMaxMb'], value);
    }}
            min="1"
            max="100"
          />
          <div class="config-help">Limite para download de mídias</div>
        </div>

        <!-- Limite de Caracteres -->
        <div class="config-field">
          <label class="config-label">
            <span>✏️</span>
            <span>Limite de Caracteres</span>
          </label>
          <input
            type="number"
            class="config-input"
            .value=${textChunkLimit.toString()}
            @input=${(e: Event) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      props.onConfigPatch(['channels', 'whatsapp', 'textChunkLimit'], value);
    }}
            min="100"
            max="10000"
          />
          <div class="config-help">Caracteres por mensagem enviada</div>
        </div>
      </div>

      <!-- Checkboxes -->
      <div class="config-grid" style="margin-top: 20px;">
        <div class="config-field">
          <label class="config-checkbox-wrapper">
            <input
              type="checkbox"
              class="config-checkbox"
              .checked=${selfChatMode}
              @change=${(e: Event) => {
      const checked = (e.target as HTMLInputElement).checked;
      props.onConfigPatch(['channels', 'whatsapp', 'accounts', 'default', 'selfChatMode'], checked);
    }}
            />
            <div>
              <div class="config-label" style="margin-bottom: 4px;">
                <span>🔄</span>
                <span>Modo Self Chat</span>
              </div>
              <div class="config-help">Responder a si mesmo (útil para testes)</div>
            </div>
          </label>
        </div>

        <div class="config-field">
          <label class="config-checkbox-wrapper">
            <input
              type="checkbox"
              class="config-checkbox"
              .checked=${sendReadReceipts}
              @change=${(e: Event) => {
      const checked = (e.target as HTMLInputElement).checked;
      props.onConfigPatch(['channels', 'whatsapp', 'accounts', 'default', 'sendReadReceipts'], checked);
    }}
            />
            <div>
              <div class="config-label" style="margin-bottom: 4px;">
                <span>✓✓</span>
                <span>Confirmação de Leitura</span>
              </div>
              <div class="config-help">Enviar confirmação de leitura</div>
            </div>
          </label>
        </div>

        <div class="config-field">
          <label class="config-checkbox-wrapper">
            <input
              type="checkbox"
              class="config-checkbox"
              .checked=${allowReactions}
              @change=${(e: Event) => {
      const checked = (e.target as HTMLInputElement).checked;
      props.onConfigPatch(['channels', 'whatsapp', 'actions', 'reactions'], checked);
    }}
            />
            <div>
              <div class="config-label" style="margin-bottom: 4px;">
                <span>❤️</span>
                <span>Permitir Reações</span>
              </div>
              <div class="config-help">Bot pode usar reações nas mensagens</div>
            </div>
          </label>
        </div>
      </div>

      <!-- Advanced Settings -->
      <details style="margin-top: 24px; padding: 16px; background: var(--warn-subtle); border-radius: var(--radius-md); border: 1px dashed var(--warn-muted);">
        <summary style="cursor: pointer; font-size: 16px; font-weight: 600; color: var(--text-strong); display: flex; align-items: center; gap: 8px; user-select: none;">
          <span>⚙️</span>
          <span>Configurações Avançadas</span>
          <span style="font-size: 11px; font-weight: 500; color: var(--muted); margin-left: 8px;">(Apenas para usuários experientes)</span>
        </summary>

        <div style="margin-top: 16px; padding: 14px; background: var(--card); border-radius: var(--radius-md);">
          <div style="color: var(--warn); font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span>⚠️</span>
            <span>Atenção: Alterar essas configurações pode afetar a estabilidade da conexão!</span>
          </div>

          <div class="config-grid">
            <!-- Heartbeat -->
            <div class="config-field">
              <label class="config-label">
                <span>💓</span>
                <span>Heartbeat (segundos)</span>
              </label>
              <input
                type="number"
                class="config-input"
                .value=${heartbeatSeconds.toString()}
                @input=${(e: Event) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      props.onConfigPatch(['web', 'heartbeatSeconds'], value);
    }}
                min="10"
                max="300"
              />
              <div class="config-help">Frequência de verificação da conexão (padrão: 60s)</div>
            </div>
          </div>

          <div style="margin-top: 16px; padding: 14px; background: var(--accent-subtle); border-radius: var(--radius-md); border-left: 3px solid var(--accent);">
            <div style="font-weight: 600; color: var(--text-strong); margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
              <span>🔧</span>
              <span>Configurações de Conexão WhatsApp (Otimizadas)</span>
            </div>
            <div style="color: var(--muted); font-size: 12px; margin-bottom: 12px;">
              ⚠️ Valores alinhados com Whaileys defaults para máxima estabilidade. Não altere a menos que saiba o que está fazendo!
            </div>

            <div style="color: var(--danger); font-weight: 600; margin-bottom: 12px; padding: 10px; background: var(--danger-subtle); border-radius: var(--radius-md);">
              ⚠️ IMPORTANTE: Essas configurações são definidas via variáveis de ambiente no Docker e não podem ser alteradas pelo painel.
              <br><br>
              Para alterar, edite o arquivo <code style="background: var(--bg-elevated); padding: 2px 6px; border-radius: 4px;">docker-compose.yaml</code>:
            </div>

            <div style="background: var(--bg-elevated); color: var(--text); padding: 14px; border-radius: var(--radius-md); font-family: var(--mono); font-size: 12px; line-height: 1.6; overflow-x: auto; border: 1px solid var(--border);">
              <div style="color: var(--muted);"># Timeout de conexão WebSocket (20s - Whaileys default)</div>
              <div>- CLAWDBOT_WA_CONNECT_TIMEOUT=20000</div>
              <br>
              <div style="color: var(--muted);"># Timeout de queries ao WhatsApp (60s - Whaileys default)</div>
              <div>- CLAWDBOT_WA_QUERY_TIMEOUT=60000</div>
              <br>
              <div style="color: var(--muted);"># Timeout do QR Code (60s)</div>
              <div>- CLAWDBOT_WA_QR_TIMEOUT=60000</div>
              <br>
              <div style="color: var(--muted);"># Keep-alive crítico (15s - Whaileys default) ⚠️ NÃO AUMENTAR</div>
              <div>- CLAWDBOT_WA_KEEPALIVE=15000</div>
              <br>
              <div style="color: var(--muted);"># Delay entre retries (250ms - Whaileys default)</div>
              <div>- CLAWDBOT_WA_RETRY_DELAY=250</div>
              <br>
              <div style="color: var(--muted);"># --- Navegador Simulado (Anti-Ban) ---</div>
              <div>- CLAWDBOT_BROWSER_OS=Mac OS</div>
              <div>- CLAWDBOT_BROWSER_NAME=Chrome</div>
              <div>- CLAWDBOT_BROWSER_VERSION=121.0.6167.85</div>
            </div>

            <div style="margin-top: 12px; padding: 10px; background: var(--warn-subtle); border-radius: var(--radius-md); color: var(--warn); font-size: 12px;">
              <strong>💡 Dica:</strong> Após alterar essas variáveis no docker-compose, você precisa recriar o container:
            </div>
          </div>
        </div>
      </details>

      <!-- Save Button -->
      <button
        class="save-btn"
        ?disabled=${props.configSaving}
        @click=${() => props.onConfigSave()}
      >
        <span>${props.configSaving ? '⏳' : '💾'}</span>
        <span>${props.configSaving ? 'Salvando...' : 'Salvar Configurações'}</span>
      </button>
    </details>
  `;
}
