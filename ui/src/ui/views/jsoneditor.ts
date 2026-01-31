import { html, nothing } from "lit";

export type JsonEditorState = {
  loading: boolean;
  saving: boolean;
  content: string;
  error: string | null;
  showSaveModal: boolean;
  validationError: string | null;
  onLoad: () => void;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onFormat: () => void;
  onValidate: () => void;
  onHideSaveModal: () => void;
};

export function renderJsonEditor(state: JsonEditorState) {
  const stats = getJsonStats(state.content);

  return html`
    <div class="jsoneditor-container">
      <!-- Hero Section -->
      <div class="jsoneditor-hero">
        <div class="hero-content">
          <div class="hero-icon">⚙️</div>
          <div class="hero-text">
            <h1 class="hero-title">Editor JSON</h1>
            <p class="hero-subtitle">Edite o arquivo openclaw.json com validação em tempo real</p>
          </div>
        </div>
        <div class="hero-actions">
          <button class="hero-btn format" @click=${state.onFormat} ?disabled=${state.loading || state.saving} title="Formatar JSON">
            <span class="btn-icon">✨</span>
            <span class="btn-text">Formatar</span>
          </button>
          <button class="hero-btn validate" @click=${state.onValidate} ?disabled=${state.loading || state.saving} title="Validar JSON">
            <span class="btn-icon">✓</span>
            <span class="btn-text">Validar</span>
          </button>
          <button class="hero-btn refresh" @click=${state.onLoad} ?disabled=${state.loading || state.saving} title="Recarregar">
            <span class="btn-icon">🔄</span>
            <span class="btn-text">Recarregar</span>
          </button>
        </div>
      </div>

      <!-- Main Editor -->
      <div class="jsoneditor-main ${state.loading ? 'loading' : ''}">
        <!-- Toolbar -->
        <div class="editor-toolbar">
          <div class="toolbar-left">
            <span class="toolbar-icon">📄</span>
            <div class="toolbar-info">
              <span class="toolbar-label">Arquivo</span>
              <span class="toolbar-filename">moltbot.json</span>
            </div>
          </div>
          <div class="toolbar-right">
            ${state.validationError ? html`
              <div class="validation-badge error">
                <span class="badge-icon">❌</span>
                <span class="badge-text">JSON Inválido</span>
              </div>
            ` : html`
              <div class="validation-badge success">
                <span class="badge-icon">✅</span>
                <span class="badge-text">JSON Válido</span>
              </div>
            `}
            <button 
              class="toolbar-btn save ${state.saving ? 'saving' : ''}"
              ?disabled=${state.saving || state.loading || !!state.validationError}
              @click=${state.onSave}
            >
              <span class="btn-icon">${state.saving ? '⏳' : '💾'}</span>
              <span class="btn-text">${state.saving ? 'Salvando...' : 'Salvar'}</span>
            </button>
          </div>
        </div>

        <!-- Editor -->
        <div class="editor-wrapper">
          <div class="editor-gutter">
            ${generateLineNumbers(state.content)}
          </div>
          <textarea
            class="editor-textarea"
            .value=${state.content}
            @input=${(e: any) => state.onContentChange(e.target.value)}
            @scroll=${syncScroll}
            ?disabled=${state.saving || state.loading}
            placeholder='{\n  "agents": {\n    "list": []\n  }\n}'
            spellcheck="false"
          ></textarea>
        </div>

        <!-- Validation Error -->
        ${state.validationError ? html`
          <div class="validation-error">
            <div class="error-header">
              <span class="error-icon">⚠️</span>
              <span class="error-title">Erro de Validação JSON</span>
            </div>
            <div class="error-message">${state.validationError}</div>
          </div>
        ` : nothing}

        <!-- Editor Footer -->
        <div class="editor-footer">
          <div class="footer-stats">
            <span class="stat">
              <span class="stat-icon">📄</span>
              <span class="stat-value">${stats.lines} linhas</span>
            </span>
            <span class="stat">
              <span class="stat-icon">🔤</span>
              <span class="stat-value">${stats.chars} caracteres</span>
            </span>
            <span class="stat">
              <span class="stat-icon">📦</span>
              <span class="stat-value">${stats.size}</span>
            </span>
            ${stats.objects > 0 ? html`
              <span class="stat">
                <span class="stat-icon">🗂️</span>
                <span class="stat-value">${stats.objects} objetos</span>
              </span>
            ` : nothing}
            ${stats.arrays > 0 ? html`
              <span class="stat">
                <span class="stat-icon">📋</span>
                <span class="stat-value">${stats.arrays} arrays</span>
              </span>
            ` : nothing}
          </div>
        </div>
      </div>

      <!-- Modals -->
      ${renderSaveModal(state)}
      ${renderErrorToast(state)}
    </div>

    <style>
      .jsoneditor-container {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--bg);
      }

      /* Hero Section */
      .jsoneditor-hero {
        background: var(--card);
        padding: 24px 32px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--border);
      }

      .hero-content {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .hero-icon {
        font-size: 32px;
        opacity: 0.9;
      }

      .hero-text {
        color: var(--text);
      }

      .hero-title {
        font-size: 20px;
        font-weight: 600;
        margin: 0 0 4px 0;
        color: var(--text-strong);
        font-family: var(--font-display);
      }

      .hero-subtitle {
        font-size: 14px;
        margin: 0;
        color: var(--muted);
      }

      .hero-actions {
        display: flex;
        gap: 8px;
      }

      .hero-btn {
        padding: 8px 16px;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all var(--duration-fast) var(--ease-out);
        background: var(--bg-elevated);
        color: var(--text);
      }

      .hero-btn:hover:not(:disabled) {
        background: var(--bg-hover);
        border-color: var(--border-hover);
      }

      .hero-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-icon {
        font-size: 16px;
      }

      /* Main Editor */
      .jsoneditor-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: var(--card);
        margin: 16px;
        border-radius: var(--radius-lg);
        border: 1px solid var(--border);
        overflow: hidden;
      }

      .jsoneditor-main.loading {
        opacity: 0.6;
        pointer-events: none;
      }

      /* Toolbar */
      .editor-toolbar {
        padding: 12px 16px;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--bg-accent);
      }

      .toolbar-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .toolbar-icon {
        font-size: 20px;
      }

      .toolbar-info {
        display: flex;
        flex-direction: column;
      }

      .toolbar-label {
        font-size: 11px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
      }

      .toolbar-filename {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-strong);
        font-family: var(--mono);
      }

      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .validation-badge {
        padding: 6px 12px;
        border-radius: var(--radius-full);
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 600;
      }

      .validation-badge.success {
        background: var(--ok-subtle);
        color: var(--ok);
        border: 1px solid var(--ok-muted);
      }

      .validation-badge.error {
        background: var(--danger-subtle);
        color: var(--danger);
        border: 1px solid var(--danger-muted);
      }

      .badge-icon {
        font-size: 14px;
      }

      .toolbar-btn {
        padding: 8px 16px;
        border: none;
        border-radius: var(--radius-md);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all var(--duration-fast) var(--ease-out);
      }

      .toolbar-btn.save {
        background: var(--accent);
        color: var(--accent-foreground);
      }

      .toolbar-btn.save:hover:not(:disabled) {
        background: var(--accent-hover);
      }

      .toolbar-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .toolbar-btn.saving {
        animation: pulse 1.5s ease-in-out infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      /* Editor */
      .editor-wrapper {
        flex: 1;
        display: flex;
        overflow: hidden;
        position: relative;
      }

      .editor-gutter {
        width: 50px;
        background: var(--bg-accent);
        border-right: 1px solid var(--border);
        padding: 16px 8px;
        font-family: var(--mono);
        font-size: 13px;
        color: var(--muted);
        text-align: right;
        line-height: 1.6;
        overflow: hidden;
        user-select: none;
      }

      .editor-textarea {
        flex: 1;
        padding: 16px;
        border: none;
        background: var(--card);
        color: var(--text);
        font-family: var(--mono);
        font-size: 13px;
        line-height: 1.6;
        resize: none;
        outline: none;
      }

      .editor-textarea::placeholder {
        color: var(--muted);
      }

      /* Validation Error */
      .validation-error {
        padding: 16px;
        background: var(--danger-subtle);
        border-top: 1px solid var(--danger-muted);
      }

      .error-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .error-icon {
        font-size: 18px;
      }

      .error-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--danger);
      }

      .error-message {
        font-size: 13px;
        color: var(--text);
        font-family: var(--mono);
        padding: 12px;
        background: var(--bg-elevated);
        border-radius: var(--radius-md);
        border-left: 3px solid var(--danger);
      }

      /* Editor Footer */
      .editor-footer {
        padding: 12px 16px;
        border-top: 1px solid var(--border);
        background: var(--bg-accent);
      }

      .footer-stats {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
      }

      .stat {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--muted);
      }

      .stat-icon {
        font-size: 14px;
      }

      .stat-value {
        font-weight: 600;
        color: var(--text);
      }

      /* Modal Overlay */
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

      /* Modal Content */
      .modal-content {
        background: var(--card);
        border-radius: var(--radius-xl);
        padding: 32px;
        max-width: 400px;
        width: 90%;
        box-shadow: var(--shadow-xl);
        animation: slideUp 0.3s ease-out;
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
        text-align: center;
        margin-bottom: 16px;
        animation: scaleIn 0.4s ease-out;
      }

      @keyframes scaleIn {
        from { transform: scale(0); }
        to { transform: scale(1); }
      }

      .modal-title {
        font-size: 20px;
        font-weight: 600;
        text-align: center;
        margin-bottom: 8px;
        color: var(--text-strong);
      }

      .modal-message {
        font-size: 14px;
        color: var(--muted);
        text-align: center;
        margin-bottom: 20px;
        line-height: 1.5;
      }

      .modal-btn {
        width: 100%;
        padding: 12px 20px;
        border: none;
        border-radius: var(--radius-md);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all var(--duration-fast) var(--ease-out);
        background: var(--accent);
        color: var(--accent-foreground);
      }

      .modal-btn:hover {
        background: var(--accent-hover);
      }

      /* Error Toast */
      .error-toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: var(--danger);
        color: white;
        padding: 14px 20px;
        border-radius: var(--radius-lg);
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
      }

      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      .error-icon-toast {
        font-size: 20px;
      }

      .error-message-toast {
        flex: 1;
        font-size: 14px;
        font-weight: 500;
      }
    </style>
  `;
}

// Helper Functions
function countLines(content: string): number {
  return content ? content.split('\n').length : 0;
}

function generateLineNumbers(content: string) {
  const lines = countLines(content);
  return html`${Array.from({ length: lines }, (_, i) => html`<div>${i + 1}</div>`)}`;
}

function syncScroll(e: Event) {
  const textarea = e.target as HTMLTextAreaElement;
  const gutter = textarea.previousElementSibling as HTMLElement;
  if (gutter) {
    gutter.scrollTop = textarea.scrollTop;
  }
}

function getJsonStats(content: string) {
  const lines = countLines(content);
  const chars = content.length;
  const size = formatBytes(chars);

  let objects = 0;
  let arrays = 0;

  try {
    const json = JSON.parse(content);
    objects = countObjects(json);
    arrays = countArrays(json);
  } catch (e) {
    // Ignore parse errors for stats
  }

  return { lines, chars, size, objects, arrays };
}

function countObjects(obj: any): number {
  if (typeof obj !== 'object' || obj === null) return 0;
  if (Array.isArray(obj)) return obj.reduce((sum: number, item: any) => sum + countObjects(item), 0);
  return 1 + Object.values(obj).reduce((sum: number, val: any) => sum + countObjects(val), 0);
}

function countArrays(obj: any): number {
  if (typeof obj !== 'object' || obj === null) return 0;
  if (Array.isArray(obj)) {
    return 1 + obj.reduce((sum: number, item: any) => sum + countArrays(item), 0);
  }
  return Object.values(obj).reduce((sum: number, val: any) => sum + countArrays(val), 0);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Modal Components
function renderSaveModal(state: JsonEditorState) {
  if (!state.showSaveModal) return nothing;

  return html`
    <div class="modal-overlay" @click=${state.onHideSaveModal}>
      <div class="modal-content" @click=${(e: Event) => e.stopPropagation()}>
        <div class="modal-icon">✅</div>
        <div class="modal-title">Arquivo Salvo!</div>
        <div class="modal-message">
          O arquivo <strong>moltbot.json</strong> foi salvo com sucesso.
        </div>
        <button class="modal-btn" @click=${state.onHideSaveModal}>
          Fechar
        </button>
      </div>
    </div>
  `;
}

function renderErrorToast(state: JsonEditorState) {
  if (!state.error) return nothing;

  return html`
    <div class="error-toast">
      <span class="error-icon-toast">❌</span>
      <span class="error-message-toast">${state.error}</span>
    </div>
  `;
}
