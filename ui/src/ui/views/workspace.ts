import { html, nothing } from "lit";
import { icons } from "../icons.js";

export type WorkspaceFile = {
  name: string;
  selected: boolean;
};

export type WorkspaceState = {
  loading: boolean;
  saving: boolean;
  files: string[];
  selectedFile: string | null;
  content: string;
  error: string | null;
  showSaveModal: boolean;
  showDeleteModal: boolean;
  showCreateModal: boolean;
  fileToDelete: string | null;
  onRefresh: () => void;
  onSelectFile: (file: string) => void;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onDeleteFile: (file: string) => void;
  onCreateSkill: (name: string) => void;
  onShowDeleteModal: (file: string) => void;
  onHideDeleteModal: () => void;
  onShowCreateModal: () => void;
  onHideCreateModal: () => void;
  onHideSaveModal: () => void;
};

export function renderWorkspace(state: WorkspaceState) {
  return html`
    <div class="workspace-container">
      <!-- Hero Section -->
      <div class="workspace-hero">
        <div class="hero-content">
          <div class="hero-icon">📝</div>
          <div class="hero-text">
            <h1 class="hero-title">Workspace do Agente</h1>
            <p class="hero-subtitle">Edite arquivos de comportamento e configuração do seu agente</p>
          </div>
        </div>
        <div class="hero-actions">
          <button class="hero-btn create" @click=${state.onShowCreateModal} title="Criar novo arquivo">
            <span class="btn-icon">➕</span>
            <span class="btn-text">Novo Arquivo</span>
          </button>
          <button class="hero-btn refresh" @click=${state.onRefresh} title="Atualizar lista">
            <span class="btn-icon">🔄</span>
            <span class="btn-text">Atualizar</span>
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="workspace-editor ${state.loading ? "workspace-editor--loading" : ""}">
        <!-- Sidebar -->
        <div class="workspace-sidebar">
          <div class="sidebar-header">
            <div class="sidebar-title">
              <span class="title-icon">📁</span>
              <span>Arquivos</span>
            </div>
            <div class="file-count">${state.files.length} arquivo${state.files.length !== 1 ? 's' : ''}</div>
          </div>
          
          <div class="workspace-file-list">
            ${state.files.map((file) => html`
              <div class="file-card ${state.selectedFile === file ? "file-card--selected" : ""}">
                <button class="file-button" @click=${() => state.onSelectFile(file)}>
                  <span class="file-icon">${getFileIcon(file)}</span>
                  <div class="file-details">
                    <span class="file-name">${file}</span>
                    <span class="file-type">${getFileType(file)}</span>
                  </div>
                </button>
                <button 
                  class="file-delete" 
                  @click=${() => state.onShowDeleteModal(file)} 
                  title="Excluir arquivo"
                >
                  🗑️
                </button>
              </div>
            `)}
            
            ${state.files.length === 0 && !state.loading ? html`
              <div class="empty-state">
                <div class="empty-icon">📂</div>
                <div class="empty-text">Nenhum arquivo encontrado</div>
                <button class="empty-action" @click=${state.onShowCreateModal}>
                  Criar primeiro arquivo
                </button>
              </div>
            ` : nothing}
          </div>
        </div>

        <!-- Editor Area -->
        <div class="workspace-main">
          ${state.selectedFile ? html`
            <!-- Toolbar -->
            <div class="editor-toolbar">
              <div class="toolbar-left">
                <span class="toolbar-icon">✏️</span>
                <div class="toolbar-info">
                  <span class="toolbar-label">Editando</span>
                  <span class="toolbar-filename">${state.selectedFile}</span>
                </div>
              </div>
              <div class="toolbar-right">
                <button 
                  class="toolbar-btn save ${state.saving ? 'saving' : ''}"
                  ?disabled=${state.saving || state.loading}
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
                ?disabled=${state.saving}
                placeholder="Digite o conteúdo do arquivo aqui..."
                spellcheck="false"
              ></textarea>
            </div>

            <!-- Editor Footer -->
            <div class="editor-footer">
              <div class="footer-stats">
                <span class="stat">
                  <span class="stat-icon">📄</span>
                  <span class="stat-value">${countLines(state.content)} linhas</span>
                </span>
                <span class="stat">
                  <span class="stat-icon">✍️</span>
                  <span class="stat-value">${countWords(state.content)} palavras</span>
                </span>
                <span class="stat">
                  <span class="stat-icon">🔤</span>
                  <span class="stat-value">${state.content.length} caracteres</span>
                </span>
              </div>
            </div>
          ` : html`
            <div class="editor-empty">
              <div class="empty-editor-icon">📝</div>
              <div class="empty-editor-title">Nenhum arquivo selecionado</div>
              <div class="empty-editor-text">Selecione um arquivo na barra lateral para começar a editar</div>
            </div>
          `}
        </div>
      </div>

      <!-- Modals -->
      ${renderSaveModal(state)}
      ${renderDeleteModal(state)}
      ${renderCreateModal(state)}
      ${renderErrorToast(state)}
    </div>

    <style>
      .workspace-container {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--bg);
      }

      /* Hero Section */
      .workspace-hero {
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
        gap: 20px;
      }

      .hero-icon {
        font-size: 56px;
        animation: float 3s ease-in-out infinite;
      }

      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
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
        gap: 12px;
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

      .hero-btn.create {
        background: var(--accent);
        color: var(--accent-foreground);
        border-color: var(--accent);
      }

      .hero-btn.refresh {
        background: var(--bg-elevated);
        color: var(--text);
      }

      .hero-btn:hover {
        background: var(--bg-hover);
        border-color: var(--border-hover);
      }

      .hero-btn.create:hover {
        background: var(--accent-hover);
        border-color: var(--accent-hover);
      }

      .btn-icon {
        font-size: 18px;
      }

      /* Main Editor */
      .workspace-editor {
        flex: 1;
        display: flex;
        margin: 16px;
        background: var(--card);
        border-radius: var(--radius-lg);
        overflow: hidden;
        border: 1px solid var(--border);
      }

      /* Sidebar */
      .workspace-sidebar {
        width: 320px;
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        background: var(--bg-accent);
      }

      .sidebar-header {
        padding: 16px;
        border-bottom: 1px solid var(--border);
        background: var(--card);
      }

      .sidebar-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-strong);
        margin-bottom: 6px;
      }

      .title-icon {
        font-size: 20px;
      }

      .file-count {
        font-size: 12px;
        color: var(--muted);
        font-weight: 500;
      }

      .workspace-file-list {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      /* File Cards */
      .file-card {
        background: var(--card);
        border-radius: var(--radius-md);
        margin-bottom: 8px;
        border: 1px solid var(--border);
        display: flex;
        align-items: center;
        transition: all var(--duration-fast) var(--ease-out);
        overflow: hidden;
      }

      .file-card:hover {
        border-color: var(--border-hover);
        background: var(--bg-hover);
      }

      .file-card--selected {
        border-color: var(--accent);
        background: var(--accent-subtle);
      }

      .file-button {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: transparent;
        border: none;
        cursor: pointer;
        text-align: left;
      }

      .file-icon {
        font-size: 28px;
        flex-shrink: 0;
      }

      .file-details {
        flex: 1;
        min-width: 0;
      }

      .file-name {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: var(--text);
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .file-card--selected .file-name {
        color: var(--accent);
      }

      .file-type {
        display: block;
        font-size: 11px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .file-delete {
        padding: 12px;
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 18px;
        opacity: 0;
        transition: all var(--duration-fast) var(--ease-out);
        color: var(--danger);
      }

      .file-card:hover .file-delete {
        opacity: 1;
      }

      .file-delete:hover {
        background: var(--danger-subtle);
      }

      /* Empty State */
      .empty-state {
        text-align: center;
        padding: 48px 24px;
      }

      .empty-icon {
        font-size: 64px;
        margin-bottom: 16px;
        opacity: 0.3;
      }

      .empty-text {
        font-size: 14px;
        color: var(--muted);
        margin-bottom: 16px;
      }

      .empty-action {
        padding: 10px 20px;
        background: var(--accent);
        color: var(--accent-foreground);
        border: none;
        border-radius: var(--radius-md);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all var(--duration-fast) var(--ease-out);
      }

      .empty-action:hover {
        background: var(--accent-hover);
      }

      /* Main Editor Area */
      .workspace-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: var(--card);
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
        font-size: 24px;
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
        opacity: 0.6;
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

      /* Empty Editor */
      .editor-empty {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        color: #94a3b8;
      }

      .empty-editor-icon {
        font-size: 80px;
        opacity: 0.3;
      }

      .empty-editor-title {
        font-size: 20px;
        font-weight: 600;
        color: var(--muted);
      }

      .empty-editor-text {
        font-size: 14px;
        color: var(--muted);
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
        max-width: 500px;
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
        font-size: 64px;
        text-align: center;
        margin-bottom: 20px;
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

      .modal-input {
        width: 100%;
        padding: 12px 14px;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        font-size: 14px;
        margin-bottom: 20px;
        transition: border-color var(--duration-fast) var(--ease-out);
        background: var(--bg-elevated);
        color: var(--text);
      }

      .modal-input:focus {
        outline: none;
        border-color: var(--accent);
      }

      .modal-actions {
        display: flex;
        gap: 12px;
      }

      .modal-btn {
        flex: 1;
        padding: 12px 20px;
        border: none;
        border-radius: var(--radius-md);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all var(--duration-fast) var(--ease-out);
      }

      .modal-btn.primary {
        background: var(--accent);
        color: var(--accent-foreground);
      }

      .modal-btn.primary:hover {
        background: var(--accent-hover);
      }

      .modal-btn.success {
        background: var(--ok);
        color: white;
      }

      .modal-btn.success:hover {
        background: var(--ok-muted);
      }

      .modal-btn.danger {
        background: var(--danger);
        color: white;
      }

      .modal-btn.danger:hover {
        background: var(--danger-muted);
      }

      .modal-btn.secondary {
        background: var(--bg-elevated);
        color: var(--text);
        border: 1px solid var(--border);
      }

      .modal-btn.secondary:hover {
        background: var(--bg-hover);
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

      .error-icon {
        font-size: 24px;
      }

      .error-message {
        flex: 1;
        font-size: 14px;
        font-weight: 500;
      }
    </style>
  `;
}


// Helper Functions
function getFileIcon(filename: string): string {
  if (filename.includes('SOUL')) return '🧠';
  if (filename.includes('AGENTS')) return '🤖';
  if (filename.includes('README')) return '📖';
  if (filename.includes('GUIDE')) return '📚';
  if (filename.includes('CONFIG')) return '⚙️';
  if (filename.endsWith('.md')) return '📝';
  return '📄';
}

function getFileType(filename: string): string {
  if (filename.includes('SOUL')) return 'Comportamento';
  if (filename.includes('AGENTS')) return 'Configuração';
  if (filename.includes('README')) return 'Documentação';
  if (filename.includes('GUIDE')) return 'Guia';
  return 'Markdown';
}

function countLines(content: string): number {
  return content ? content.split('\n').length : 0;
}

function countWords(content: string): number {
  return content ? content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
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

// Modal Components
function renderSaveModal(state: WorkspaceState) {
  if (!state.showSaveModal) return nothing;

  return html`
    <div class="modal-overlay" @click=${state.onHideSaveModal}>
      <div class="modal-content" @click=${(e: Event) => e.stopPropagation()}>
        <div class="modal-icon">✅</div>
        <div class="modal-title">Arquivo Salvo!</div>
        <div class="modal-message">
          O arquivo <strong>${state.selectedFile}</strong> foi salvo com sucesso.
        </div>
        <div class="modal-actions">
          <button class="modal-btn success" @click=${state.onHideSaveModal}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderDeleteModal(state: WorkspaceState) {
  if (!state.showDeleteModal || !state.fileToDelete) return nothing;

  return html`
    <div class="modal-overlay" @click=${state.onHideDeleteModal}>
      <div class="modal-content" @click=${(e: Event) => e.stopPropagation()}>
        <div class="modal-icon">⚠️</div>
        <div class="modal-title">Confirmar Exclusão</div>
        <div class="modal-message">
          Tem certeza que deseja excluir o arquivo <strong>${state.fileToDelete}</strong>?
          <br><br>
          Esta ação não pode ser desfeita.
        </div>
        <div class="modal-actions">
          <button class="modal-btn secondary" @click=${state.onHideDeleteModal}>
            Cancelar
          </button>
          <button class="modal-btn danger" @click=${() => {
      if (state.fileToDelete) {
        state.onDeleteFile(state.fileToDelete);
        state.onHideDeleteModal();
      }
    }}>
            Excluir
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderCreateModal(state: WorkspaceState) {
  if (!state.showCreateModal) return nothing;

  let inputValue = '';

  return html`
    <div class="modal-overlay" @click=${state.onHideCreateModal}>
      <div class="modal-content" @click=${(e: Event) => e.stopPropagation()}>
        <div class="modal-icon">📝</div>
        <div class="modal-title">Criar Novo Arquivo</div>
        <div class="modal-message">
          Digite o nome do novo arquivo (será criado na pasta .agent/skills/)
        </div>
        <input
          type="text"
          class="modal-input"
          placeholder="exemplo: meu-guia.md"
          @input=${(e: Event) => {
      inputValue = (e.target as HTMLInputElement).value;
    }}
          @keydown=${(e: KeyboardEvent) => {
      if (e.key === 'Enter' && inputValue.trim()) {
        state.onCreateSkill(inputValue.trim());
        state.onHideCreateModal();
      }
    }}
        />
        <div class="modal-actions">
          <button class="modal-btn secondary" @click=${state.onHideCreateModal}>
            Cancelar
          </button>
          <button class="modal-btn primary" @click=${() => {
      if (inputValue.trim()) {
        state.onCreateSkill(inputValue.trim());
        state.onHideCreateModal();
      }
    }}>
            Criar Arquivo
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderErrorToast(state: WorkspaceState) {
  if (!state.error) return nothing;

  return html`
    <div class="error-toast">
      <span class="error-icon">❌</span>
      <span class="error-message">${state.error}</span>
    </div>
  `;
}
