import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import type { GatewayBrowserClient, GatewayHelloOk } from "./gateway";
import { resolveInjectedAssistantIdentity } from "./assistant-identity";
import { loadSettings, type UiSettings } from "./storage";
import { renderApp } from "./app-render";
import type { Tab } from "./navigation";
import type { ResolvedTheme, ThemeMode } from "./theme";
import type {
  AgentsListResult,
  ConfigSnapshot,
  ConfigUiHints,
  CronJob,
  CronRunLogEntry,
  CronStatus,
  HealthSnapshot,
  LogEntry,
  LogLevel,
  PresenceEntry,
  ChannelsStatusSnapshot,
  SessionsListResult,
  SkillStatusReport,
  StatusSummary,
  NostrProfile,
} from "./types";
import { type ChatAttachment, type ChatQueueItem, type CronFormState } from "./ui-types";
import { type SkillMessage } from "./controllers/skills";
import type { EventLogEntry } from "./app-events";
import { DEFAULT_CRON_FORM, DEFAULT_LOG_LEVEL_FILTERS } from "./app-defaults";
import type {
  ExecApprovalsFile,
  ExecApprovalsSnapshot,
} from "./controllers/exec-approvals";
import type { DevicePairingList } from "./controllers/devices";
import type { ExecApprovalRequest } from "./controllers/exec-approval";
import {
  resetToolStream as resetToolStreamInternal,
  type ToolStreamEntry,
} from "./app-tool-stream";
import {
  exportLogs as exportLogsInternal,
  handleChatScroll as handleChatScrollInternal,
  handleLogsScroll as handleLogsScrollInternal,
  resetChatScroll as resetChatScrollInternal,
} from "./app-scroll";
import { connectGateway as connectGatewayInternal } from "./app-gateway";
import {
  handleConnected,
  handleDisconnected,
  handleFirstUpdated,
  handleUpdated,
} from "./app-lifecycle";
import {
  applySettings as applySettingsInternal,
  loadCron as loadCronInternal,
  loadOverview as loadOverviewInternal,
  setTab as setTabInternal,
  setTheme as setThemeInternal,
  onPopState as onPopStateInternal,
} from "./app-settings";
import {
  handleAbortChat as handleAbortChatInternal,
  handleSendChat as handleSendChatInternal,
  removeQueuedMessage as removeQueuedMessageInternal,
} from "./app-chat";
import {
  handleChannelConfigReload as handleChannelConfigReloadInternal,
  handleChannelConfigSave as handleChannelConfigSaveInternal,
  handleNostrProfileCancel as handleNostrProfileCancelInternal,
  handleNostrProfileEdit as handleNostrProfileEditInternal,
  handleNostrProfileFieldChange as handleNostrProfileFieldChangeInternal,
  handleNostrProfileImport as handleNostrProfileImportInternal,
  handleNostrProfileSave as handleNostrProfileSaveInternal,
  handleNostrProfileToggleAdvanced as handleNostrProfileToggleAdvancedInternal,
  handleWhatsAppClear as handleWhatsAppClearInternal,
  handleWhatsAppLogout as handleWhatsAppLogoutInternal,
  handleWhatsAppStart as handleWhatsAppStartInternal,
} from "./app-channels";
import {
  handleWorkspaceFilesLoad as handleWorkspaceFilesLoadInternal,
  handleWorkspaceFileLoad as handleWorkspaceFileLoadInternal,
  handleWorkspaceSave as handleWorkspaceSaveInternal,
  handleWorkspaceFileDelete as handleWorkspaceFileDeleteInternal,
  handleWorkspaceShowDeleteModal as handleWorkspaceShowDeleteModalInternal,
  handleWorkspaceHideDeleteModal as handleWorkspaceHideDeleteModalInternal,
  handleWorkspaceShowCreateModal as handleWorkspaceShowCreateModalInternal,
  handleWorkspaceHideCreateModal as handleWorkspaceHideCreateModalInternal,
  handleWorkspaceSkillInit as handleWorkspaceSkillInitInternal,
  handleWorkspaceHideSaveModal as handleWorkspaceHideSaveModalInternal,
} from "./app-workspace.js";
import {
  handleCostsLimitSave as handleCostsLimitSaveInternal,
} from "./app-costs.js";
import type { NostrProfileFormState } from "./views/channels.nostr-profile-form";
import {
  handleConfigLoad as handleConfigLoadInternal,
  handleConfigSave as handleConfigSaveInternal,
  handleConfigApply as handleConfigApplyInternal,
  handleConfigFormUpdate as handleConfigFormUpdateInternal,
  handleConfigFormModeChange as handleConfigFormModeChangeInternal,
  handleConfigRawChange as handleConfigRawChangeInternal,
  updateConfigFormValue,
} from "./app-config.js";
import {
  handleInstallSkill as handleInstallSkillInternal,
  handleUpdateSkill as handleUpdateSkillInternal,
  handleToggleSkillEnabled as handleToggleSkillEnabledInternal,
  handleUpdateSkillEdit as handleUpdateSkillEditInternal,
  handleSaveSkillApiKey as handleSaveSkillApiKeyInternal,
  handleCronToggle as handleCronToggleInternal,
  handleCronRun as handleCronRunInternal,
  handleCronRemove as handleCronRemoveInternal,
  handleCronAdd as handleCronAddInternal,
  handleCronRunsLoad as handleCronRunsLoadInternal,
  handleCronFormUpdate as handleCronFormUpdateInternal,
  handleSessionsLoad as handleSessionsLoadInternal,
  handleSessionsPatch as handleSessionsPatchInternal,
  handleLoadNodes as handleLoadNodesInternal,
  handleLoadPresence as handleLoadPresenceInternal,
  handleLoadSkills as handleLoadSkillsInternal,
  handleLoadDebug as handleLoadDebugInternal,
  handleLoadLogs as handleLoadLogsInternal,
  handleDebugCall as handleDebugCallInternal,
  handleRunUpdate as handleRunUpdateInternal,
  setPassword as setPasswordInternal,
  setSessionKey as setSessionKeyInternal,
  setChatMessage as setChatMessageInternal,
  handleCallDebugMethod as handleCallDebugMethodInternal,
} from "./app-handlers.js";
import { loadAssistantIdentity as loadAssistantIdentityInternal } from "./controllers/assistant-identity";

declare global {
  interface Window {
    __OPENCLAW_CONTROL_UI_BASE_PATH__?: string;
  }
}

const injectedAssistantIdentity = resolveInjectedAssistantIdentity();

function resolveOnboardingMode(): boolean {
  if (!window.location.search) return false;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("onboarding");
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

@customElement("openclaw-app")
export class OpenClawApp extends LitElement {
  @state() settings: UiSettings = loadSettings();
  @state() password = "";
  @state() tab: Tab = "chat";
  @state() onboarding = resolveOnboardingMode();
  @state() connected = false;
  @state() theme: ThemeMode = this.settings.theme ?? "system";
  @state() themeResolved: ResolvedTheme = "dark";
  @state() hello: GatewayHelloOk | null = null;
  @state() lastError: string | null = null;
  @state() eventLog: EventLogEntry[] = [];
  private eventLogBuffer: EventLogEntry[] = [];
  private toolStreamSyncTimer: number | null = null;
  private sidebarCloseTimer: number | null = null;

  @state() assistantName = injectedAssistantIdentity.name;
  @state() assistantAvatar = injectedAssistantIdentity.avatar;
  @state() assistantAgentId = injectedAssistantIdentity.agentId ?? null;

  @state() sessionKey = this.settings.sessionKey;
  @state() chatLoading = false;
  @state() chatSending = false;
  @state() chatMessage = "";
  @state() chatMessages: unknown[] = [];
  @state() chatToolMessages: unknown[] = [];
  @state() chatStream: string | null = null;
  @state() chatStreamStartedAt: number | null = null;
  @state() chatRunId: string | null = null;
  @state() compactionStatus: import("./app-tool-stream").CompactionStatus | null = null;
  @state() chatAvatarUrl: string | null = null;
  @state() chatThinkingLevel: string | null = null;
  @state() chatQueue: ChatQueueItem[] = [];
  @state() chatAttachments: ChatAttachment[] = [];
  // Sidebar state for tool output viewing
  @state() sidebarOpen = false;
  @state() sidebarContent: string | null = null;
  @state() sidebarError: string | null = null;
  @state() splitRatio = this.settings.splitRatio;

  @state() nodesLoading = false;
  @state() nodes: Array<Record<string, unknown>> = [];
  @state() devicesLoading = false;
  @state() devicesError: string | null = null;
  @state() devicesList: DevicePairingList | null = null;
  @state() execApprovalsLoading = false;
  @state() execApprovalsSaving = false;
  @state() execApprovalsDirty = false;
  @state() execApprovalsSnapshot: ExecApprovalsSnapshot | null = null;
  @state() execApprovalsForm: ExecApprovalsFile | null = null;
  @state() execApprovalsSelectedAgent: string | null = null;
  @state() execApprovalsTarget: "gateway" | "node" = "gateway";
  @state() execApprovalsTargetNodeId: string | null = null;
  @state() execApprovalQueue: ExecApprovalRequest[] = [];
  @state() execApprovalBusy = false;
  @state() execApprovalError: string | null = null;
  @state() pendingGatewayUrl: string | null = null;

  @state() configLoading = false;
  @state() configRaw = "{\n}\n";
  @state() configRawOriginal = "";
  @state() configValid: boolean | null = null;
  @state() configIssues: unknown[] = [];
  @state() configSaving = false;
  @state() configApplying = false;
  @state() updateRunning = false;
  @state() applySessionKey = this.settings.lastActiveSessionKey;
  @state() configSnapshot: ConfigSnapshot | null = null;
  @state() configSchema: unknown | null = null;
  @state() configSchemaVersion: string | null = null;
  @state() configSchemaLoading = false;
  @state() configUiHints: ConfigUiHints = {};
  @state() configForm: Record<string, unknown> | null = null;
  @state() configFormOriginal: Record<string, unknown> | null = null;
  @state() configFormDirty = false;
  @state() configFormMode: "form" | "raw" = "form";
  @state() configSearchQuery = "";
  @state() configActiveSection: string | null = null;
  @state() configActiveSubsection: string | null = null;

  @state() channelsLoading = false;
  @state() channelsSnapshot: ChannelsStatusSnapshot | null = null;
  @state() channelsError: string | null = null;
  @state() channelsLastSuccess: number | null = null;
  @state() whatsappLoginMessage: string | null = null;
  @state() whatsappLoginQrDataUrl: string | null = null;
  @state() whatsappLoginConnected: boolean | null = null;
  @state() whatsappBusy = false;
  @state() whatsappConfigSaved = false;
  @state() nostrProfileFormState: NostrProfileFormState | null = null;
  @state() nostrProfileAccountId: string | null = null;

  @state() workspaceLoading = false;
  @state() workspaceSaving = false;
  @state() workspaceFiles: string[] = [];
  @state() workspaceSelectedFile: string | null = null;
  @state() workspaceContent = "";
  @state() workspaceError: string | null = null;
  @state() workspaceShowSaveModal = false;
  @state() workspaceShowDeleteModal = false;
  @state() workspaceShowCreateModal = false;
  @state() workspaceFileToDelete: string | null = null;
  @state() jsonEditorLoading = false;
  @state() jsonEditorSaving = false;
  @state() jsonEditorContent = "";
  @state() jsonEditorError: string | null = null;
  @state() jsonEditorShowSaveModal = false;
  @state() jsonEditorValidationError: string | null = null;

  @state() costsLoading = false;
  @state() costsSummary: import("./views/costs").CostUsageSummary | null = null;
  @state() costsError: string | null = null;
  @state() costsDays = 7;
  @state() costsAutoRefresh = true;
  @state() costsLastUpdated: number | null = null;
  @state() costsLimitStatus: import("./views/costs").DailyLimitStatus | null = null;
  @state() costsLimitLoading = false;
  @state() costsLimitSaving = false;
  @state() costsLimitSaveError: string | null = null;

  @state() presenceLoading = false;
  @state() presenceEntries: PresenceEntry[] = [];
  @state() presenceError: string | null = null;
  @state() presenceStatus: string | null = null;

  @state() agentsLoading = false;
  @state() agentsList: AgentsListResult | null = null;
  @state() agentsError: string | null = null;

  @state() sessionsLoading = false;
  @state() sessionsResult: SessionsListResult | null = null;
  @state() sessionsError: string | null = null;
  @state() sessionsFilterActive = "";
  @state() sessionsFilterLimit = "120";
  @state() sessionsIncludeGlobal = true;
  @state() sessionsIncludeUnknown = false;

  @state() cronLoading = false;
  @state() cronJobs: CronJob[] = [];
  @state() cronStatus: CronStatus | null = null;
  @state() cronError: string | null = null;
  @state() cronForm: CronFormState = { ...DEFAULT_CRON_FORM };
  @state() cronRunsJobId: string | null = null;
  @state() cronRuns: CronRunLogEntry[] = [];
  @state() cronBusy = false;

  @state() skillsLoading = false;
  @state() skillsReport: SkillStatusReport | null = null;
  @state() skillsError: string | null = null;
  @state() skillsFilter = "";
  @state() skillEdits: Record<string, string> = {};
  @state() skillsBusyKey: string | null = null;
  @state() skillMessages: Record<string, SkillMessage> = {};

  @state() debugLoading = false;
  @state() debugStatus: StatusSummary | null = null;
  @state() debugHealth: HealthSnapshot | null = null;
  @state() debugModels: unknown[] = [];
  @state() debugHeartbeat: unknown | null = null;
  @state() debugCallMethod = "";
  @state() debugCallParams = "{}";
  @state() debugCallResult: string | null = null;
  @state() debugCallError: string | null = null;

  @state() logsLoading = false;
  @state() logsError: string | null = null;
  @state() logsFile: string | null = null;
  @state() logsEntries: LogEntry[] = [];
  @state() logsFilterText = "";
  @state() logsLevelFilters: Record<LogLevel, boolean> = {
    ...DEFAULT_LOG_LEVEL_FILTERS,
  };
  @state() logsAutoFollow = true;
  @state() logsTruncated = false;
  @state() logsCursor: number | null = null;
  @state() logsLastFetchAt: number | null = null;
  @state() logsLimit = 500;
  @state() logsMaxBytes = 250_000;
  @state() logsAtBottom = true;

  client: GatewayBrowserClient | null = null;
  private chatScrollFrame: number | null = null;
  private chatScrollTimeout: number | null = null;
  private chatHasAutoScrolled = false;
  private chatUserNearBottom = true;
  private nodesPollInterval: number | null = null;
  private logsPollInterval: number | null = null;
  private debugPollInterval: number | null = null;
  private logsScrollFrame: number | null = null;
  private toolStreamById = new Map<string, ToolStreamEntry>();
  private toolStreamOrder: string[] = [];
  refreshSessionsAfterChat = new Set<string>();
  basePath = "";
  private popStateHandler = () =>
    onPopStateInternal(
      this as unknown as Parameters<typeof onPopStateInternal>[0],
    );
  private themeMedia: MediaQueryList | null = null;
  private themeMediaHandler: ((event: MediaQueryListEvent) => void) | null = null;
  private topbarObserver: ResizeObserver | null = null;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    handleConnected(this as unknown as Parameters<typeof handleConnected>[0]);
  }

  protected firstUpdated() {
    handleFirstUpdated(this as unknown as Parameters<typeof handleFirstUpdated>[0]);
  }

  disconnectedCallback() {
    handleDisconnected(this as unknown as Parameters<typeof handleDisconnected>[0]);
    super.disconnectedCallback();
  }

  protected updated(changed: Map<PropertyKey, unknown>) {
    handleUpdated(
      this as unknown as Parameters<typeof handleUpdated>[0],
      changed,
    );
  }

  connect() {
    connectGatewayInternal(
      this as unknown as Parameters<typeof connectGatewayInternal>[0],
    );
  }

  handleChatScroll(event: Event) {
    handleChatScrollInternal(
      this as unknown as Parameters<typeof handleChatScrollInternal>[0],
      event,
    );
  }

  handleLogsScroll(event: Event) {
    handleLogsScrollInternal(
      this as unknown as Parameters<typeof handleLogsScrollInternal>[0],
      event,
    );
  }

  exportLogs(lines: string[], label: string) {
    exportLogsInternal(lines, label);
  }

  resetToolStream() {
    resetToolStreamInternal(
      this as unknown as Parameters<typeof resetToolStreamInternal>[0],
    );
  }

  resetChatScroll() {
    resetChatScrollInternal(
      this as unknown as Parameters<typeof resetChatScrollInternal>[0],
    );
  }

  async loadAssistantIdentity() {
    await loadAssistantIdentityInternal(this);
  }

  applySettings(next: UiSettings) {
    applySettingsInternal(
      this as unknown as Parameters<typeof applySettingsInternal>[0],
      next,
    );
  }

  setTab(next: Tab) {
    setTabInternal(this as unknown as Parameters<typeof setTabInternal>[0], next);
  }

  setTheme(next: ThemeMode, context?: Parameters<typeof setThemeInternal>[2]) {
    setThemeInternal(
      this as unknown as Parameters<typeof setThemeInternal>[0],
      next,
      context,
    );
  }

  async loadOverview() {
    await loadOverviewInternal(
      this as unknown as Parameters<typeof loadOverviewInternal>[0],
    );
  }

  async loadCron() {
    await loadCronInternal(
      this as unknown as Parameters<typeof loadCronInternal>[0],
    );
  }

  async handleAbortChat() {
    await handleAbortChatInternal(
      this as unknown as Parameters<typeof handleAbortChatInternal>[0],
    );
  }

  removeQueuedMessage(id: string) {
    removeQueuedMessageInternal(
      this as unknown as Parameters<typeof removeQueuedMessageInternal>[0],
      id,
    );
  }

  async handleSendChat(
    messageOverride?: string,
    opts?: Parameters<typeof handleSendChatInternal>[2],
  ) {
    await handleSendChatInternal(
      this as unknown as Parameters<typeof handleSendChatInternal>[0],
      messageOverride,
      opts,
    );
  }

  async handleWhatsAppStart(force: boolean) {
    await handleWhatsAppStartInternal(this, force);
  }



  async handleWhatsAppLogout() {
    await handleWhatsAppLogoutInternal(this);
  }

  async handleWhatsAppClear() {
    await handleWhatsAppClearInternal(this);
  }

  async handleChannelConfigSave() {
    await handleChannelConfigSaveInternal(this);
  }

  async handleChannelConfigReload() {
    await handleChannelConfigReloadInternal(this);
  }

  async handleConfigLoad() {
    await handleConfigLoadInternal(this);
  }

  async handleConfigSave() {
    await handleConfigSaveInternal(this);
  }

  async handleConfigApply() {
    await handleConfigApplyInternal(this);
  }

  handleConfigFormUpdate(path: string, value: unknown) {
    handleConfigFormUpdateInternal(this, path, value);
  }

  handleConfigFormModeChange(mode: "form" | "raw") {
    handleConfigFormModeChangeInternal(this, mode);
  }

  handleConfigRawChange(raw: string) {
    handleConfigRawChangeInternal(this, raw);
  }

  handleNostrProfileEdit(accountId: string, profile: NostrProfile | null) {
    handleNostrProfileEditInternal(this, accountId, profile);
  }

  handleNostrProfileCancel() {
    handleNostrProfileCancelInternal(this);
  }

  handleNostrProfileFieldChange(field: keyof NostrProfile, value: string) {
    handleNostrProfileFieldChangeInternal(this, field, value);
  }

  async handleNostrProfileSave() {
    await handleNostrProfileSaveInternal(this);
  }

  async handleNostrProfileImport() {
    await handleNostrProfileImportInternal(this);
  }

  handleNostrProfileToggleAdvanced() {
    handleNostrProfileToggleAdvancedInternal(this);
  }

  async handleWorkspaceFilesLoad() {
    await handleWorkspaceFilesLoadInternal(this);
  }

  async handleWorkspaceFileLoad(file: string) {
    await handleWorkspaceFileLoadInternal(this, file);
  }

  async handleWorkspaceSave() {
    await handleWorkspaceSaveInternal(this);
  }

  async handleWorkspaceFileDelete(file: string) {
    await handleWorkspaceFileDeleteInternal(this, file);
  }

  handleWorkspaceShowDeleteModal(file: string) {
    handleWorkspaceShowDeleteModalInternal(this, file);
  }

  handleWorkspaceHideDeleteModal() {
    handleWorkspaceHideDeleteModalInternal(this);
  }

  handleWorkspaceShowCreateModal() {
    handleWorkspaceShowCreateModalInternal(this);
  }

  handleWorkspaceHideCreateModal() {
    handleWorkspaceHideCreateModalInternal(this);
  }

  async handleWorkspaceSkillInit(name: string) {
    await handleWorkspaceSkillInitInternal(
      this as unknown as Parameters<typeof handleWorkspaceSkillInitInternal>[0],
      name,
    );
  }

  handleWorkspaceHideSaveModal() {
    this.workspaceShowSaveModal = false;
  }

  async handleJsonEditorLoad() {
    this.jsonEditorLoading = true;
    this.jsonEditorError = null;
    this.jsonEditorValidationError = null;

    try {
      const snapshot: any = await this.client?.request("config.get", {});
      // Save the snapshot to get the hash for later save
      this.configSnapshot = snapshot;

      // Get the config content
      const config = snapshot.config || JSON.parse(snapshot.raw || '{}');
      this.jsonEditorContent = JSON.stringify(config, null, 2);
      this.validateJson();
    } catch (err) {
      this.jsonEditorError = String(err);
    } finally {
      this.jsonEditorLoading = false;
    }
  }

  handleJsonEditorContentChange(content: string) {
    this.jsonEditorContent = content;
    this.validateJson();
  }

  validateJson() {
    try {
      JSON.parse(this.jsonEditorContent);
      this.jsonEditorValidationError = null;
    } catch (err: any) {
      this.jsonEditorValidationError = err.message;
    }
  }

  handleJsonEditorFormat() {
    try {
      const parsed = JSON.parse(this.jsonEditorContent);
      this.jsonEditorContent = JSON.stringify(parsed, null, 2);
      this.jsonEditorValidationError = null;
    } catch (err: any) {
      this.jsonEditorValidationError = err.message;
    }
  }

  handleJsonEditorValidate() {
    this.validateJson();
  }

  async handleJsonEditorSave() {
    if (this.jsonEditorValidationError) return;

    if (!this.configSnapshot?.hash) {
      this.jsonEditorError = "Config hash missing; reload and retry.";
      return;
    }

    this.jsonEditorSaving = true;
    this.jsonEditorError = null;

    try {
      const parsed = JSON.parse(this.jsonEditorContent);
      await this.client?.request("config.apply", {
        raw: JSON.stringify(parsed, null, 2),
        baseHash: this.configSnapshot.hash
      });

      this.jsonEditorShowSaveModal = true;
      setTimeout(() => {
        this.jsonEditorShowSaveModal = false;
      }, 3000);

      // Reload config to get new hash
      await this.handleJsonEditorLoad();
    } catch (err) {
      this.jsonEditorError = String(err);
    } finally {
      this.jsonEditorSaving = false;
    }
  }

  handleJsonEditorHideSaveModal() {
    this.jsonEditorShowSaveModal = false;
  }

  async handleCostsLimitSave(enabled: boolean, maxDailyCostUsd: number | null, warningThreshold: number) {
    return await handleCostsLimitSaveInternal(this, enabled, maxDailyCostUsd, warningThreshold);
  }

  async handleExecApprovalDecision(decision: "allow-once" | "allow-always" | "deny") {
    const active = this.execApprovalQueue[0];
    if (!active || !this.client || this.execApprovalBusy) return;
    this.execApprovalBusy = true;
    this.execApprovalError = null;
    try {
      await this.client.request("exec.approval.resolve", {
        id: active.id,
        decision,
      });
      this.execApprovalQueue = this.execApprovalQueue.filter((entry) => entry.id !== active.id);
    } catch (err) {
      this.execApprovalError = `Exec approval failed: ${String(err)}`;
    } finally {
      this.execApprovalBusy = false;
    }
  }

  async handleInstallSkill(key: string) {
    await handleInstallSkillInternal(this, key);
  }

  async handleUpdateSkill(key: string) {
    await handleUpdateSkillInternal(this, key);
  }

  async handleToggleSkillEnabled(key: string, enabled: boolean) {
    await handleToggleSkillEnabledInternal(this, key, enabled);
  }

  handleUpdateSkillEdit(key: string, value: string) {
    handleUpdateSkillEditInternal(this, key, value);
  }

  async handleSaveSkillApiKey(key: string, apiKey: string) {
    await handleSaveSkillApiKeyInternal(this, key);
  }

  async handleCronToggle(jobId: string, enabled: boolean) {
    await handleCronToggleInternal(this, jobId, enabled);
  }

  async handleCronRun(jobId: string) {
    await handleCronRunInternal(this, jobId);
  }

  async handleCronRemove(jobId: string) {
    await handleCronRemoveInternal(this, jobId);
  }

  async handleCronAdd() {
    await handleCronAddInternal(this);
  }

  async handleCronRunsLoad(jobId: string) {
    await handleCronRunsLoadInternal(this, jobId);
  }

  handleCronFormUpdate(path: string, value: unknown) {
    handleCronFormUpdateInternal(this, path, value);
  }

  async handleSessionsLoad() {
    await handleSessionsLoadInternal(this);
  }

  async handleSessionsPatch(key: string, patch: unknown) {
    await handleSessionsPatchInternal(this, key, patch);
  }

  async handleLoadNodes() {
    await handleLoadNodesInternal(this);
  }

  async handleLoadPresence() {
    await handleLoadPresenceInternal(this);
  }

  async handleLoadSkills() {
    await handleLoadSkillsInternal(this);
  }

  async handleLoadDebug() {
    await handleLoadDebugInternal(this);
  }

  async handleLoadLogs() {
    await handleLoadLogsInternal(this);
  }

  async handleDebugCall() {
    await handleDebugCallInternal(this);
  }

  async handleRunUpdate() {
    await handleRunUpdateInternal(this);
  }

  setPassword(next: string) {
    setPasswordInternal(this, next);
  }

  setSessionKey(next: string) {
    setSessionKeyInternal(this, next);
  }

  setChatMessage(next: string) {
    setChatMessageInternal(this, next);
  }

  async handleChatSend() {
    await this.handleSendChat();
  }

  async handleChatAbort() {
    await this.handleAbortChat();
  }

  handleChatSelectQueueItem(id: string) {
    // Usually logic for selecting a queued item to edit or retry
  }

  handleChatDropQueueItem(id: string) {
    this.removeQueuedMessage(id);
  }

  handleChatClearQueue() {
    this.chatQueue = [];
  }

  handleLogsFilterChange(next: string) {
    this.logsFilterText = next;
  }

  handleLogsLevelFilterToggle(level: import("./types").LogLevel) {
    this.logsLevelFilters = {
      ...this.logsLevelFilters,
      [level]: !this.logsLevelFilters[level],
    };
  }

  handleLogsAutoFollowToggle(next: boolean) {
    this.logsAutoFollow = next;
  }

  async handleCallDebugMethod(method: string, params: string) {
    await handleCallDebugMethodInternal(this, method, params);
  }

  async handleCostsLoad() {
    const { loadCosts } = await import("./controllers/costs");
    await loadCosts(this as any);
  }

  handleGatewayUrlConfirm() {
    const nextGatewayUrl = this.pendingGatewayUrl;
    if (!nextGatewayUrl) return;
    this.pendingGatewayUrl = null;
    applySettingsInternal(
      this as unknown as Parameters<typeof applySettingsInternal>[0],
      { ...this.settings, gatewayUrl: nextGatewayUrl },
    );
    this.connect();
  }

  handleGatewayUrlCancel() {
    this.pendingGatewayUrl = null;
  }

  // Sidebar handlers for tool output viewing
  handleOpenSidebar(content: string) {
    if (this.sidebarCloseTimer != null) {
      window.clearTimeout(this.sidebarCloseTimer);
      this.sidebarCloseTimer = null;
    }
    this.sidebarContent = content;
    this.sidebarError = null;
    this.sidebarOpen = true;
  }

  handleCloseSidebar() {
    this.sidebarOpen = false;
    // Clear content after transition
    if (this.sidebarCloseTimer != null) {
      window.clearTimeout(this.sidebarCloseTimer);
    }
    this.sidebarCloseTimer = window.setTimeout(() => {
      if (this.sidebarOpen) return;
      this.sidebarContent = null;
      this.sidebarError = null;
      this.sidebarCloseTimer = null;
    }, 200);
  }

  handleSplitRatioChange(ratio: number) {
    const newRatio = Math.max(0.4, Math.min(0.7, ratio));
    this.splitRatio = newRatio;
    this.applySettings({ ...this.settings, splitRatio: newRatio });
  }

  render() {
    return renderApp(this);
  }
}
