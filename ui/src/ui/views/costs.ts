import { html, nothing } from "lit";

export type CostUsageTotals = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  totalCost: number;
  missingCostEntries: number;
};

export type CostUsageDailyEntry = CostUsageTotals & {
  date: string;
};

export type CostUsageSummary = {
  updatedAt: number;
  days: number;
  daily: CostUsageDailyEntry[];
  totals: CostUsageTotals;
};

export type DailyLimitStatus = {
  enabled: boolean;
  exceeded: boolean;
  todayCost: number;
  limit: number;
  remaining: number;
  percentage: number;
  warningThreshold?: number;
};

export type CostsProps = {
  connected: boolean;
  loading: boolean;
  summary: CostUsageSummary | null;
  error: string | null;
  days: number;
  autoRefresh: boolean;
  lastUpdated: number | null;
  // Limite diário
  limitStatus: DailyLimitStatus | null;
  limitLoading: boolean;
  limitSaving?: boolean;
  limitSaveError?: string | null;
  onRefresh: () => void;
  onDaysChange: (days: number) => void;
  onAutoRefreshToggle: () => void;
  onLimitSave?: (enabled: boolean, maxDailyCostUsd: number | null, warningThreshold: number) => void;
};

const OPENAI_PRICING: Record<string, { input: number; output: number; cacheRead?: number; cacheWrite?: number }> = {
  // GPT-4o (preços em $ por 1M tokens)
  "gpt-4o": { input: 2.50, output: 10.00, cacheRead: 1.25, cacheWrite: 2.50 },
  "gpt-4o-2024-11-20": { input: 2.50, output: 10.00, cacheRead: 1.25, cacheWrite: 2.50 },
  "gpt-4o-2024-08-06": { input: 2.50, output: 10.00, cacheRead: 1.25, cacheWrite: 2.50 },
  "gpt-4o-mini": { input: 0.15, output: 0.60, cacheRead: 0.075, cacheWrite: 0.15 },
  "gpt-4o-mini-2024-07-18": { input: 0.15, output: 0.60, cacheRead: 0.075, cacheWrite: 0.15 },

  // o1 Series
  "o1": { input: 15.00, output: 60.00, cacheRead: 7.50, cacheWrite: 15.00 },
  "o1-2024-12-17": { input: 15.00, output: 60.00, cacheRead: 7.50, cacheWrite: 15.00 },
  "o1-pro": { input: 150.00, output: 600.00 },
  "o1-pro-2025-03-19": { input: 150.00, output: 600.00 },
  "o1-mini": { input: 1.10, output: 4.40, cacheRead: 0.55, cacheWrite: 1.10 },
  "o1-mini-2024-09-12": { input: 1.10, output: 4.40, cacheRead: 0.55, cacheWrite: 1.10 },

  // o3 Series
  "o3": { input: 10.00, output: 40.00, cacheRead: 2.50, cacheWrite: 10.00 },
  "o3-2025-04-16": { input: 10.00, output: 40.00, cacheRead: 2.50, cacheWrite: 10.00 },
  "o3-mini": { input: 1.10, output: 4.40, cacheRead: 0.55, cacheWrite: 1.10 },
  "o3-mini-2025-01-31": { input: 1.10, output: 4.40, cacheRead: 0.55, cacheWrite: 1.10 },
  "o4-mini": { input: 1.10, output: 4.40, cacheRead: 0.55, cacheWrite: 1.10 },
  "o4-mini-2025-04-16": { input: 1.10, output: 4.40, cacheRead: 0.55, cacheWrite: 1.10 },

  // GPT-4.1 Series
  "gpt-4.1": { input: 2.00, output: 8.00, cacheRead: 0.50, cacheWrite: 2.00 },
  "gpt-4.1-2025-04-14": { input: 2.00, output: 8.00, cacheRead: 0.50, cacheWrite: 2.00 },
  "gpt-4.1-mini": { input: 0.40, output: 1.60, cacheRead: 0.10, cacheWrite: 0.40 },
  "gpt-4.1-mini-2025-04-14": { input: 0.40, output: 1.60, cacheRead: 0.10, cacheWrite: 0.40 },
  "gpt-4.1-nano": { input: 0.10, output: 0.40, cacheRead: 0.025, cacheWrite: 0.10 },
  "gpt-4.1-nano-2025-04-14": { input: 0.10, output: 0.40, cacheRead: 0.025, cacheWrite: 0.10 },

  // GPT-4.5
  "gpt-4.5-preview": { input: 75.00, output: 150.00, cacheRead: 37.50, cacheWrite: 75.00 },
  "gpt-4.5-preview-2025-02-27": { input: 75.00, output: 150.00, cacheRead: 37.50, cacheWrite: 75.00 },

  // GPT-4 Turbo
  "gpt-4-turbo": { input: 10.00, output: 30.00 },
  "gpt-4-turbo-2024-04-09": { input: 10.00, output: 30.00 },

  // GPT-4
  "gpt-4": { input: 30.00, output: 60.00 },
  "gpt-4-32k": { input: 60.00, output: 120.00 },

  // GPT-3.5 Turbo
  "gpt-3.5-turbo": { input: 0.50, output: 1.50 },
  "gpt-3.5-turbo-0125": { input: 0.50, output: 1.50 },
  "gpt-3.5-turbo-instruct": { input: 1.50, output: 2.00 },

  // Embeddings
  "text-embedding-3-small": { input: 0.02, output: 0 },
  "text-embedding-3-large": { input: 0.13, output: 0 },
  "text-embedding-ada-002": { input: 0.10, output: 0 },

  // Moderation / Omni
  "omni-moderation-latest": { input: 0.0, output: 0.0 },

  // Computer Use
  "computer-use-preview": { input: 3.00, output: 12.00 },
  "computer-use-preview-2025-03-11": { input: 3.00, output: 12.00 },
};

// Preços da Anthropic (em $ por 1M tokens)
// Fonte: https://docs.anthropic.com/en/docs/about-claude/pricing
// Cache: Write = 1.25x base input (5min TTL), Read = 0.1x base input
const ANTHROPIC_PRICING: Record<string, { input: number; output: number; cacheRead?: number; cacheWrite?: number }> = {
  // Claude 4.5 Series
  "claude-sonnet-4-5": { input: 3.00, output: 15.00, cacheRead: 0.30, cacheWrite: 3.75 },
  "claude-sonnet-4-5-20250929": { input: 3.00, output: 15.00, cacheRead: 0.30, cacheWrite: 3.75 },
  "claude-haiku-4-5": { input: 0.80, output: 4.00, cacheRead: 0.08, cacheWrite: 1.00 },
  "claude-haiku-4-5-20250929": { input: 0.80, output: 4.00, cacheRead: 0.08, cacheWrite: 1.00 },

  // Claude 4 Series
  "claude-opus-4-5": { input: 15.00, output: 75.00, cacheRead: 1.50, cacheWrite: 18.75 },
  "claude-opus-4-5-20250514": { input: 15.00, output: 75.00, cacheRead: 1.50, cacheWrite: 18.75 },
  "claude-sonnet-4": { input: 3.00, output: 15.00, cacheRead: 0.30, cacheWrite: 3.75 },
  "claude-sonnet-4-20250514": { input: 3.00, output: 15.00, cacheRead: 0.30, cacheWrite: 3.75 },

  // Claude 3.5 Series
  "claude-3-5-sonnet": { input: 3.00, output: 15.00, cacheRead: 0.30, cacheWrite: 3.75 },
  "claude-3-5-sonnet-20241022": { input: 3.00, output: 15.00, cacheRead: 0.30, cacheWrite: 3.75 },
  "claude-3-5-sonnet-20240620": { input: 3.00, output: 15.00, cacheRead: 0.30, cacheWrite: 3.75 },
  "claude-3-5-haiku": { input: 0.80, output: 4.00, cacheRead: 0.08, cacheWrite: 1.00 },
  "claude-3-5-haiku-20241022": { input: 0.80, output: 4.00, cacheRead: 0.08, cacheWrite: 1.00 },

  // Claude 3 Series
  "claude-3-opus": { input: 15.00, output: 75.00, cacheRead: 1.50, cacheWrite: 18.75 },
  "claude-3-opus-20240229": { input: 15.00, output: 75.00, cacheRead: 1.50, cacheWrite: 18.75 },
  "claude-3-sonnet": { input: 3.00, output: 15.00, cacheRead: 0.30, cacheWrite: 3.75 },
  "claude-3-sonnet-20240229": { input: 3.00, output: 15.00, cacheRead: 0.30, cacheWrite: 3.75 },
  "claude-3-haiku": { input: 0.25, output: 1.25, cacheRead: 0.025, cacheWrite: 0.3125 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25, cacheRead: 0.025, cacheWrite: 0.3125 },

  // Claude 2 Series (Legacy)
  "claude-2.1": { input: 8.00, output: 24.00 },
  "claude-2.0": { input: 8.00, output: 24.00 },
  "claude-instant-1.2": { input: 0.80, output: 2.40 },
};

// Preços do Google Gemini (em $ por 1M tokens)
// Fonte: https://cloud.google.com/vertex-ai/generative-ai/pricing
// Cache: Read = 10% do input base, Write = 25% do input base (para <= 200K tokens)
const GEMINI_PRICING: Record<string, { input: number; output: number; cacheRead?: number; cacheWrite?: number }> = {
  // Gemini 3 Series
  "gemini-3-pro-preview": { input: 2.00, output: 12.00, cacheRead: 0.20, cacheWrite: 0.40 },
  "gemini-3-flash-preview": { input: 0.50, output: 3.00, cacheRead: 0.05, cacheWrite: 0.05 },

  // Gemini 2.5 Series
  "gemini-2.5-pro": { input: 1.25, output: 10.00, cacheRead: 0.125, cacheWrite: 0.250 },
  "gemini-2.5-flash": { input: 0.30, output: 2.50, cacheRead: 0.030, cacheWrite: 0.030 },
  "gemini-2.5-flash-lite": { input: 0.10, output: 0.40, cacheRead: 0.010, cacheWrite: 0.010 },

  // Gemini 2.0 Series
  "gemini-2.0-flash": { input: 0.15, output: 0.60, cacheRead: 0.015, cacheWrite: 0.015 },
  "gemini-2.0-flash-lite": { input: 0.075, output: 0.30, cacheRead: 0.0075, cacheWrite: 0.0075 },

  // Gemini 1.5 Series (Legacy)
  "gemini-1.5-pro": { input: 1.25, output: 5.00 },
  "gemini-1.5-flash": { input: 0.075, output: 0.30 },

  // Gemini 1.0 Series (Legacy)
  "gemini-1.0-pro": { input: 0.50, output: 1.50 },
  "gemini-pro": { input: 0.50, output: 1.50 },
  "gemini-flash": { input: 0.075, output: 0.30 },
};

function formatTokenCount(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return "0";
  const safe = Math.max(0, value);
  if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(2)}M`;
  if (safe >= 1_000) return `${(safe / 1_000).toFixed(1)}k`;
  return String(Math.round(safe));
}

function formatUsd(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return "$0.00";
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(2)}`;
  if (value >= 0.0001) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(6)}`;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return `${seconds}s atrás`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function calculatePercentChange(current: number, previous: number): { value: number; up: boolean } | null {
  if (previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  return { value: Math.abs(change), up: change > 0 };
}

export function renderCosts(props: CostsProps) {
  const summary = props.summary;
  const totals = summary?.totals;
  const daily = summary?.daily ?? [];

  // Pegar os últimos 7 dias para o gráfico
  const last7Days = daily.slice(-7);
  const maxCost = Math.max(...last7Days.map(d => d.totalCost), 0.01);
  const maxTokens = Math.max(...last7Days.map(d => d.totalTokens), 1000);

  // Calcular mudança vs ontem
  const today = daily[daily.length - 1];
  const yesterday = daily[daily.length - 2];
  const costChange = today && yesterday ? calculatePercentChange(today.totalCost, yesterday.totalCost) : null;
  const tokenChange = today && yesterday ? calculatePercentChange(today.totalTokens, yesterday.totalTokens) : null;

  // Calcular média diária
  const avgDailyCost = daily.length > 0 ? (totals?.totalCost ?? 0) / daily.length : 0;
  const avgDailyTokens = daily.length > 0 ? (totals?.totalTokens ?? 0) / daily.length : 0;

  // Estado do formulário de limite
  let limitFormEnabled = props.limitStatus?.enabled ?? false;
  let limitFormValue = props.limitStatus?.limit ?? 1.0;
  let limitFormThreshold = props.limitStatus?.warningThreshold ?? 80;

  return html`
    <div class="costs-container">
      <!-- Header Actions -->
      <div class="costs-header">
        <div class="costs-header__left">
          <div class="costs-period-selector">
            <label>Período:</label>
            <select
              .value=${String(props.days)}
              @change=${(e: Event) => props.onDaysChange(Number((e.target as HTMLSelectElement).value))}
            >
              <option value="7">Últimos 7 dias</option>
              <option value="14">Últimos 14 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="60">Últimos 60 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
          </div>
          <label class="costs-auto-refresh">
            <input
              type="checkbox"
              .checked=${props.autoRefresh}
              @change=${props.onAutoRefreshToggle}
            />
            <span>Atualizar automaticamente</span>
          </label>
        </div>
        <div class="costs-header__right">
          ${props.lastUpdated ? html`
            <span class="costs-last-updated">
              Atualizado ${formatRelativeTime(props.lastUpdated)}
            </span>
          ` : nothing}
          <button
            class="btn btn--sm"
            ?disabled=${props.loading || !props.connected}
            @click=${props.onRefresh}
          >
            ${props.loading ? "Carregando..." : "Atualizar"}
          </button>
        </div>
      </div>

      ${!props.connected ? html`
        <div class="callout danger" style="margin-bottom: 16px;">
          Desconectado do gateway. Conecte-se para visualizar os custos.
        </div>
      ` : nothing}

      ${props.error ? html`
        <div class="callout danger" style="margin-bottom: 16px;">
          ${props.error}
        </div>
      ` : nothing}

      <!-- Configuração do Limite Diário -->
      ${props.onLimitSave ? html`
        <section class="card" style="margin-bottom: 24px;">
          <div class="card-title">⚙️ Configuração do Limite Diário</div>
          <div class="card-sub">Configure o limite máximo de gastos por dia</div>
          <div class="costs-limit-config" style="margin-top: 16px;">
            <div class="costs-limit-config__row">
              <label class="costs-limit-config__checkbox">
                <input
                  type="checkbox"
                  .checked=${limitFormEnabled}
                  @change=${(e: Event) => {
        limitFormEnabled = (e.target as HTMLInputElement).checked;
      }}
                />
                <span>Habilitar limite diário de gastos</span>
              </label>
            </div>
            
            ${limitFormEnabled ? html`
              <div class="costs-limit-config__row">
                <label class="field">
                  <span>Limite máximo diário (USD)</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    .value=${String(limitFormValue)}
                    @input=${(e: Event) => {
          limitFormValue = parseFloat((e.target as HTMLInputElement).value) || 0;
        }}
                    placeholder="1.00"
                  />
                </label>
              </div>
              
              <div class="costs-limit-config__row">
                <label class="field">
                  <span>Alerta de aviso (%)</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    .value=${String(limitFormThreshold)}
                    @input=${(e: Event) => {
          limitFormThreshold = parseInt((e.target as HTMLInputElement).value) || 80;
        }}
                    placeholder="80"
                  />
                  <small class="muted">Exibir alerta quando atingir esta porcentagem do limite</small>
                </label>
              </div>
            ` : nothing}
            
            ${props.limitSaveError ? html`
              <div class="callout ${props.limitSaveError.startsWith('✅') ? 'success' : 'danger'}" style="margin-top: 12px;">
                ${props.limitSaveError}
              </div>
            ` : nothing}
            
            <div class="costs-limit-config__actions">
              <button
                class="btn primary"
                ?disabled=${props.limitSaving || !props.connected}
                @click=${() => {
        if (props.onLimitSave) {
          props.onLimitSave(
            limitFormEnabled,
            limitFormEnabled ? limitFormValue : null,
            limitFormThreshold
          );
        }
      }}
              >
                ${props.limitSaving ? "Salvando..." : "Salvar Configuração"}
              </button>
            </div>
          </div>
        </section>
      ` : nothing}

      ${props.limitStatus?.enabled && props.limitStatus?.exceeded ? html`
        <div class="callout danger costs-limit-alert" style="margin-bottom: 16px;">
          <div class="costs-limit-alert__icon">⚠️</div>
          <div class="costs-limit-alert__content">
            <strong>Limite Diário Atingido!</strong>
            <p>Você atingiu o limite de gastos configurado de <strong>${formatUsd(props.limitStatus.limit)}</strong> por dia.</p>
            <p>Gasto atual: <strong>${formatUsd(props.limitStatus.todayCost)}</strong></p>
            <p class="muted">O agente está bloqueado até amanhã ou até que o limite seja aumentado.</p>
          </div>
        </div>
      ` : nothing}

      ${props.limitStatus?.enabled && !props.limitStatus?.exceeded && props.limitStatus?.percentage >= (props.limitStatus?.warningThreshold ?? 80) ? html`
        <div class="callout warning costs-limit-warning" style="margin-bottom: 16px;">
          <strong>⚡ Atenção:</strong> Você já utilizou ${props.limitStatus.percentage.toFixed(0)}% do limite diário de gastos.
          Restam <strong>${formatUsd(props.limitStatus.remaining)}</strong> de um total de <strong>${formatUsd(props.limitStatus.limit)}</strong>.
        </div>
      ` : nothing}

      ${props.loading && !summary ? html`
        <div class="costs-loading">
          <div class="costs-loading__spinner"></div>
          <span>Carregando dados de custos...</span>
        </div>
      ` : nothing}

      ${summary ? html`
        <!-- Stats Cards -->
        <section class="grid grid-cols-4" style="gap: 16px; margin-bottom: 24px;">
          <div class="card stat-card costs-stat-card">
            <div class="stat-label">Custo Total</div>
            <div class="stat-value costs-stat-value--primary">${formatUsd(totals?.totalCost)}</div>
            <div class="muted">Últimos ${props.days} dias</div>
          </div>
          <div class="card stat-card costs-stat-card">
            <div class="stat-label">Total de Tokens</div>
            <div class="stat-value">${formatTokenCount(totals?.totalTokens)}</div>
            <div class="muted">
              ${tokenChange ? html`
                <span class="costs-change ${tokenChange.up ? 'costs-change--up' : 'costs-change--down'}">
                  ${tokenChange.up ? '↑' : '↓'} ${tokenChange.value.toFixed(1)}% vs ontem
                </span>
              ` : "Input + Output + Cache"}
            </div>
          </div>
          <div class="card stat-card costs-stat-card">
            <div class="stat-label">Média Diária</div>
            <div class="stat-value">${formatUsd(avgDailyCost)}</div>
            <div class="muted">${formatTokenCount(avgDailyTokens)} tokens/dia</div>
          </div>
          <div class="card stat-card costs-stat-card">
            <div class="stat-label">Custo Hoje</div>
            <div class="stat-value">${formatUsd(today?.totalCost ?? 0)}</div>
            <div class="muted">
              ${costChange ? html`
                <span class="costs-change ${costChange.up ? 'costs-change--up' : 'costs-change--down'}">
                  ${costChange.up ? '↑' : '↓'} ${costChange.value.toFixed(1)}% vs ontem
                </span>
              ` : `${formatTokenCount(today?.totalTokens ?? 0)} tokens`}
            </div>
          </div>
        </section>

        <!-- Token Breakdown -->
        <section class="grid grid-cols-2" style="gap: 16px; margin-bottom: 24px;">
          <div class="card">
            <div class="card-title">Detalhamento de Tokens</div>
            <div class="card-sub">Distribuição por tipo de uso</div>
            <div class="costs-breakdown" style="margin-top: 16px;">
              <div class="costs-breakdown__row">
                <span class="costs-breakdown__label">
                  <span class="costs-breakdown__dot costs-breakdown__dot--input"></span>
                  Input Tokens
                </span>
                <span class="costs-breakdown__value">${formatTokenCount(totals?.input)}</span>
              </div>
              <div class="costs-breakdown__row">
                <span class="costs-breakdown__label">
                  <span class="costs-breakdown__dot costs-breakdown__dot--output"></span>
                  Output Tokens
                </span>
                <span class="costs-breakdown__value">${formatTokenCount(totals?.output)}</span>
              </div>
              <div class="costs-breakdown__row">
                <span class="costs-breakdown__label">
                  <span class="costs-breakdown__dot costs-breakdown__dot--cache-read"></span>
                  Cache Read
                </span>
                <span class="costs-breakdown__value">${formatTokenCount(totals?.cacheRead)}</span>
              </div>
              <div class="costs-breakdown__row">
                <span class="costs-breakdown__label">
                  <span class="costs-breakdown__dot costs-breakdown__dot--cache-write"></span>
                  Cache Write
                </span>
                <span class="costs-breakdown__value">${formatTokenCount(totals?.cacheWrite)}</span>
              </div>
              ${(totals?.missingCostEntries ?? 0) > 0 ? html`
                <div class="costs-breakdown__row costs-breakdown__row--warning">
                  <span class="costs-breakdown__label">
                    ⚠️ Entradas sem custo
                  </span>
                  <span class="costs-breakdown__value">${totals?.missingCostEntries}</span>
                </div>
              ` : nothing}
            </div>
          </div>
          <!-- Summary & Chart -->
          <div class="card">
            <div class="card-title">Custos e Uso (Atualizado)</div>
            <div class="card-content">
              <div class="costs-summary-grid">Custo e tokens por dia</div>
              <div class="costs-chart" style="margin-top: 16px;">
                ${last7Days.map((day) => {
        const heightPercent = (day.totalCost / maxCost) * 100;
        return html`
                    <div class="costs-chart__bar-wrapper" title="${formatDate(day.date)}: ${formatUsd(day.totalCost)} (${formatTokenCount(day.totalTokens)} tokens)">
                      <div class="costs-chart__bar" style="height: ${Math.max(heightPercent, 2)}%">
                        <span class="costs-chart__bar-value">${formatUsd(day.totalCost)}</span>
                      </div>
                      <div class="costs-chart__label">${formatDate(day.date)}</div>
                    </div>
                  `;
      })}
                ${last7Days.length === 0 ? html`
                  <div class="costs-chart__empty">Sem dados suficientes para o gráfico</div>
                ` : nothing}
              </div>
            </div>
          </div>
        </section>

        <!-- Pricing Reference -->
        <section class="grid grid-cols-3" style="gap: 16px; margin-bottom: 16px;">
          <div class="card">
            <div class="card-title">Referência de Preços OpenAI</div>
            <div class="card-sub">Preços por 1 milhão de tokens</div>
            <div class="costs-pricing-table" style="margin-top: 16px; max-height: 350px; overflow-y: auto;">
              <table>
                <thead>
                  <tr>
                    <th>Modelo</th>
                    <th>Input ($/1M)</th>
                    <th>Output ($/1M)</th>
                    <th>Cache Read</th>
                    <th>Cache Write</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(OPENAI_PRICING)
        .filter(([model]) => !model.includes("-2024") && !model.includes("-2025"))
        .slice(0, 15)
        .map(([model, pricing]) => html`
                      <tr>
                        <td class="mono">${model}</td>
                        <td>$${pricing.input.toFixed(2)}</td>
                        <td>$${pricing.output.toFixed(2)}</td>
                        <td>${pricing.cacheRead ? `$${pricing.cacheRead.toFixed(2)}` : '-'}</td>
                        <td>${pricing.cacheWrite ? `$${pricing.cacheWrite.toFixed(2)}` : '-'}</td>
                      </tr>
                    `)}
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card-title">Referência de Preços Anthropic</div>
            <div class="card-sub">Preços por 1 milhão de tokens (Claude)</div>
            <div class="costs-pricing-table" style="margin-top: 16px; max-height: 350px; overflow-y: auto;">
              <table>
                <thead>
                  <tr>
                    <th>Modelo</th>
                    <th>Input ($/1M)</th>
                    <th>Output ($/1M)</th>
                    <th>Cache Read</th>
                    <th>Cache Write</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(ANTHROPIC_PRICING)
        .filter(([model]) => !model.includes("-2024") && !model.includes("-2025"))
        .map(([model, pricing]) => html`
                      <tr>
                        <td class="mono">${model}</td>
                        <td>$${pricing.input.toFixed(2)}</td>
                        <td>$${pricing.output.toFixed(2)}</td>
                        <td>${pricing.cacheRead ? `$${pricing.cacheRead.toFixed(2)}` : '-'}</td>
                        <td>${pricing.cacheWrite ? `$${pricing.cacheWrite.toFixed(2)}` : '-'}</td>
                      </tr>
                    `)}
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card-title">Referência de Preços Google Gemini</div>
            <div class="card-sub">Preços por 1 milhão de tokens (Vertex AI)</div>
            <div class="costs-pricing-table" style="margin-top: 16px; max-height: 350px; overflow-y: auto;">
              <table>
                <thead>
                  <tr>
                    <th>Modelo</th>
                    <th>Input ($/1M)</th>
                    <th>Output ($/1M)</th>
                    <th>Cache Read</th>
                    <th>Cache Write</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(GEMINI_PRICING)
        .map(([model, pricing]) => html`
                      <tr>
                        <td class="mono">${model}</td>
                        <td>${pricing.input.toFixed(3)}</td>
                        <td>${pricing.output.toFixed(2)}</td>
                        <td>${pricing.cacheRead ? `${pricing.cacheRead.toFixed(3)}` : '-'}</td>
                        <td>${pricing.cacheWrite ? `${pricing.cacheWrite.toFixed(3)}` : '-'}</td>
                      </tr>
                    `)}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- Daily History -->
        <section class="card" style="margin-top: 16px;">
          <div class="card-title">Histórico Diário</div>
          <div class="card-sub">Detalhamento completo por dia</div>
          <div class="costs-history" style="margin-top: 16px; max-height: 400px; overflow-y: auto;">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Custo</th>
                  <th>Tokens</th>
                  <th>Input</th>
                  <th>Output</th>
                  <th>Cache R</th>
                  <th>Cache W</th>
                </tr>
              </thead>
              <tbody>
                ${[...daily].reverse().map((day) => html`
                  <tr>
                    <td>${formatDate(day.date)}</td>
                    <td class="costs-history__cost">${formatUsd(day.totalCost)}</td>
                    <td>${formatTokenCount(day.totalTokens)}</td>
                    <td>${formatTokenCount(day.input)}</td>
                    <td>${formatTokenCount(day.output)}</td>
                    <td>${formatTokenCount(day.cacheRead)}</td>
                    <td>${formatTokenCount(day.cacheWrite)}</td>
                  </tr>
                `)}
                ${daily.length === 0 ? html`
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 24px;">
                      Nenhum dado de custo encontrado para o período selecionado.
                    </td>
                  </tr>
                ` : nothing}
              </tbody>
            </table>
          </div>
        </section>
      ` : nothing}
    </div>

    <style>
      .costs-container {
        padding: 0;
      }

      .costs-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        flex-wrap: wrap;
        gap: 12px;
      }

      .costs-header__left,
      .costs-header__right {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .costs-period-selector {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .costs-period-selector label {
        font-size: 14px;
        color: var(--text-secondary);
      }

      .costs-period-selector select {
        padding: 6px 12px;
        border-radius: 6px;
        border: 1px solid var(--border);
        background: var(--bg-secondary);
        color: var(--text);
        font-size: 14px;
        cursor: pointer;
      }

      .costs-auto-refresh {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        color: var(--text-secondary);
        cursor: pointer;
      }

      .costs-auto-refresh input {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }

      .costs-last-updated {
        font-size: 12px;
        color: var(--text-muted);
      }

      .costs-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px;
        gap: 12px;
        color: var(--text-secondary);
      }

      .costs-loading__spinner {
        width: 32px;
        height: 32px;
        border: 3px solid var(--border);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .costs-limit-alert {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        padding: 16px 20px;
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05));
        border: 1px solid rgba(239, 68, 68, 0.4);
        border-radius: 12px;
        animation: pulse-danger 2s ease-in-out infinite;
      }

      @keyframes pulse-danger {
        0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.2); }
        50% { box-shadow: 0 0 20px 4px rgba(239, 68, 68, 0.3); }
      }

      .costs-limit-alert__icon {
        font-size: 32px;
        line-height: 1;
      }

      .costs-limit-alert__content {
        flex: 1;
      }

      .costs-limit-alert__content p {
        margin: 8px 0 0;
        line-height: 1.5;
      }

      .costs-limit-warning {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05));
        border: 1px solid rgba(245, 158, 11, 0.4);
        border-radius: 8px;
        padding: 12px 16px;
      }

      .costs-stat-card {
        position: relative;
        overflow: hidden;
      }

      .costs-stat-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, var(--primary-light, #6366f1), var(--primary, #4f46e5));
      }

      .costs-stat-value--primary {
        color: var(--primary);
        font-size: 1.75rem;
      }

      .costs-change {
        font-size: 12px;
        font-weight: 500;
      }

      .costs-change--up {
        color: var(--danger, #ef4444);
      }

      .costs-change--down {
        color: var(--success, #22c55e);
      }

      .costs-breakdown {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .costs-breakdown__row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid var(--border-light, rgba(255,255,255,0.05));
      }

      .costs-breakdown__row:last-child {
        border-bottom: none;
      }

      .costs-breakdown__row--warning {
        color: var(--warning, #f59e0b);
      }

      .costs-breakdown__label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
      }

      .costs-breakdown__dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }

      .costs-breakdown__dot--input {
        background: #6366f1;
      }

      .costs-breakdown__dot--output {
        background: #22c55e;
      }

      .costs-breakdown__dot--cache-read {
        background: #f59e0b;
      }

      .costs-breakdown__dot--cache-write {
        background: #ec4899;
      }

      .costs-breakdown__value {
        font-weight: 600;
        font-family: var(--font-mono);
      }

      .costs-chart {
        display: flex;
        align-items: flex-end;
        justify-content: space-around;
        height: 180px;
        gap: 8px;
        padding-top: 20px;
      }

      .costs-chart__bar-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100%;
        max-width: 60px;
      }

      .costs-chart__bar {
        width: 100%;
        background: linear-gradient(180deg, var(--primary), var(--primary-dark, #3730a3));
        border-radius: 4px 4px 0 0;
        min-height: 4px;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        position: relative;
        transition: height 0.3s ease;
      }

      .costs-chart__bar:hover {
        opacity: 0.85;
      }

      .costs-chart__bar-value {
        position: absolute;
        top: -18px;
        font-size: 10px;
        color: var(--text-secondary);
        white-space: nowrap;
      }

      .costs-chart__label {
        font-size: 10px;
        color: var(--text-muted);
        margin-top: 6px;
        text-align: center;
      }

      .costs-chart__empty {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
        font-size: 14px;
      }

      .costs-pricing-table,
      .costs-history {
        overflow-x: auto;
      }

      .costs-pricing-table table,
      .costs-history table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }

      .costs-pricing-table th,
      .costs-pricing-table td,
      .costs-history th,
      .costs-history td {
        padding: 10px 12px;
        text-align: left;
        border-bottom: 1px solid var(--border-light, rgba(255,255,255,0.05));
      }

      .costs-pricing-table th,
      .costs-history th {
        font-weight: 600;
        color: var(--text-secondary);
        background: var(--bg-tertiary, rgba(255,255,255,0.02));
        position: sticky;
        top: 0;
      }

      .costs-pricing-table tbody tr:hover,
      .costs-history tbody tr:hover {
        background: var(--bg-hover, rgba(255,255,255,0.03));
      }

      .costs-history__cost {
        color: var(--primary);
        font-weight: 600;
      }

      .costs-limit-config {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .costs-limit-config__row {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .costs-limit-config__checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        cursor: pointer;
      }

      .costs-limit-config__checkbox input {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }

      .costs-limit-config__actions {
        display: flex;
        gap: 12px;
        margin-top: 8px;
      }

      .grid-cols-4 {
        grid-template-columns: repeat(4, 1fr);
      }

      .grid-cols-3 {
        grid-template-columns: repeat(3, 1fr);
      }

      @media (max-width: 1200px) {
        .grid-cols-4 {
          grid-template-columns: repeat(2, 1fr);
        }

        .grid-cols-3 {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (max-width: 768px) {
        .grid-cols-4 {
          grid-template-columns: 1fr;
        }

        .grid-cols-3 {
          grid-template-columns: 1fr;
        }

        .costs-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .costs-chart {
          height: 140px;
        }
      }
    </style>
  `;
}
