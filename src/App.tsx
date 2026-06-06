import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Settings, 
  Activity, 
  MessageSquare, 
  AlertTriangle, 
  UserMinus, 
  Ban, 
  Clock,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Terminal,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Users,
  Search,
  ArrowLeft,
  Gavel,
  X,
  ShieldCheck,
  ShieldAlert,
  Database,
  Lock,
  Eye,
  Layers,
  ChevronUp,
  ChevronDown,
  MessageSquareOff,
  History,
  Zap,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Send,
  BookOpen,
  Info
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "motion/react";

const logo = new URL("./assets/images/regenerated_image_1778939583788.png", import.meta.url).href;

interface Stats {
  totalWarnings: number;
  recentWarnings: any[];
}

interface Status {
  online: boolean;
  uptime: number | null;
  guilds: number;
  guildList?: Array<{
    id: string;
    name: string;
    memberCount: number;
    commandCount: number;
    topCommand: string;
    icon: string | null;
  }>;
  botName: string;
  configMissing: boolean;
  clientId?: string;
  aiActive?: boolean;
  geminiStatus?: 'success' | 'none' | 'missing' | 'permission_denied' | 'other_error';
}

export default function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [modifyingMember, setModifyingMember] = useState<any | null>(null);
  const [modForm, setModForm] = useState({ reason: "", duration: 600, h: 0, m: 10, s: 0 });
  const [modResult, setModResult] = useState<{ success?: boolean, error?: string } | null>(null);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [autoModSettings, setAutoModSettings] = useState<any>(null);
  const [rulesSettings, setRulesSettings] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [savingRules, setSavingRules] = useState(false);
  const [sendingRulesMessage, setSendingRulesMessage] = useState(false);
  const [updatingRulesMessage, setUpdatingRulesMessage] = useState(false);
  const [deletingRulesMessage, setDeletingRulesMessage] = useState(false);
  const [simulatedUserRole, setSimulatedUserRole] = useState<'admin' | 'moderator'>('admin');
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);
  const [rulesSendSuccess, setRulesSendSuccess] = useState<string | null>(null);
  const [rulesSendError, setRulesSendError] = useState<string | null>(null);
  const [userDB, setUserDB] = useState<any[]>([]);
  const [loadingDB, setLoadingDB] = useState(false);
  const [savingAutoMod, setSavingAutoMod] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Server Info Tab State variables
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [loadingServerInfo, setLoadingServerInfo] = useState(false);
  const [serverInfoError, setServerInfoError] = useState<string | null>(null);
  const [isViewingRoles, setIsViewingRoles] = useState(false);
  const [isViewingChannels, setIsViewingChannels] = useState(false);
  const [selectedBroadcastChannelId, setSelectedBroadcastChannelId] = useState("");
  const [broadcastingServerInfo, setBroadcastingServerInfo] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);
  const [serverSearchQuery, setServerSearchQuery] = useState("");
  const [infoServerDropdownOpen, setInfoServerDropdownOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchServerInfo = async (explicitGuildId?: string, forceRefresh: boolean = false) => {
    const guildId = explicitGuildId || selectedGuildId;
    if (!guildId) return;
    setLoadingServerInfo(true);
    setServerInfoError(null);
    try {
      const url = `/api/guild/${guildId}/server-info${forceRefresh ? "?force=true" : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      setServerInfo(data);
    } catch (err: any) {
      console.error("Error fetching detailed server info:", err);
      setServerInfoError(err.message || "Failed to fetch server information");
    } finally {
      setLoadingServerInfo(false);
    }
  };

  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleRetestGemini = async () => {
    setIsTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await fetch("/api/retest-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.success) {
        setGeminiTestResult({
          success: true,
          message: "Connection test successful! Gemini API is now online."
        });
        if (status) {
          setStatus({
            ...status,
            aiActive: data.aiActive,
            geminiStatus: data.geminiStatus
          });
        }
      } else {
        let msg = "Connection failed. Please verify your API Key in Settings > Secrets.";
        if (data.geminiStatus === "permission_denied") {
          msg = "API Key Permission Denied. Double check that your key has valid scope/region access.";
        } else if (data.geminiStatus === "missing") {
          msg = "API Key is missing. Please add it to your AI Studio Secrets panel.";
        }
        setGeminiTestResult({
          success: false,
          message: msg
        });
        if (status) {
          setStatus({
            ...status,
            aiActive: data.aiActive,
            geminiStatus: data.geminiStatus
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      setGeminiTestResult({
        success: false,
        message: "An unexpected error occurred while contacting the server."
      });
    } finally {
      setIsTestingGemini(false);
    }
  };

  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [commandsList, setCommandsList] = useState<any[]>([]);
  const [staffLog, setStaffLog] = useState<any[]>([]);
  const [punishments, setPunishments] = useState<{ bans: any[], timeouts: any[] }>({ bans: [], timeouts: [] });
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [lastFetchedOrder, setLastFetchedOrder] = useState<string[]>([]);
  const [botHighestRole, setBotHighestRole] = useState<any>(null);
  const [botPerms, setBotPerms] = useState({ isAdmin: false, hasManageRoles: false, hasModerateMembers: false, hasKickMembers: false, hasBanMembers: false });
  const [serverSettings, setServerSettings] = useState<any>(null);
  const [savingServerSettings, setSavingServerSettings] = useState(false);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");

  const PERMISSIONS = [
    { name: "Administrator", bit: 8n, category: "Administrative" },
    { name: "Manage Server", bit: 32n, category: "Administrative" },
    { name: "Manage Roles", bit: 268435456n, category: "Administrative" },
    { name: "Manage Channels", bit: 16n, category: "Administrative" },
    { name: "View Audit Log", bit: 128n, category: "Administrative" },
    { name: "Manage Webhooks", bit: 536870912n, category: "Administrative" },
    { name: "Kick Members", bit: 2n, category: "Moderation" },
    { name: "Ban Members", bit: 4n, category: "Moderation" },
    { name: "Timeout Members", bit: 1099511627776n, category: "Moderation" },
    { name: "Manage Messages", bit: 8192n, category: "Moderation" },
    { name: "Manage Nicknames", bit: 134217728n, category: "Moderation" },
    { name: "View Channel", bit: 1024n, category: "General" },
    { name: "Send Messages", bit: 2048n, category: "General" },
    { name: "Embed Links", bit: 16384n, category: "General" },
    { name: "Attach Files", bit: 32768n, category: "General" },
    { name: "Add Reactions", bit: 64n, category: "General" },
    { name: "Use External Emojis", bit: 262144n, category: "General" },
    { name: "Mention Everyone", bit: 131072n, category: "General" },
    { name: "Manage Expressions", bit: 1073741824n, category: "General" },
    { name: "Mute Members", bit: 4194304n, category: "Staff" },
    { name: "Deafen Members", bit: 8388608n, category: "Staff" },
    { name: "Move Members", bit: 16777216n, category: "Staff" },
  ];

  const hasPermission = (bitfield: string, bit: bigint) => {
    return (BigInt(bitfield) & bit) === bit;
  };

  const togglePermission = async (role: any, bit: bigint) => {
    if (!role.canManagePermissions) return;
    const currentBits = BigInt(role.permissions);
    const newBits = hasPermission(role.permissions, bit) ? currentBits ^ bit : currentBits | bit;
    
    // Optimistic update
    setAvailableRoles(prev => prev.map(r => r.id === role.id ? { ...r, permissions: newBits.toString() } : r));

    try {
      await fetch(`/api/guild/${selectedGuildId}/role/${role.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: newBits.toString() })
      });
    } catch (e) {
      console.error("Failed to sync permission", e);
      fetchRoles(); // Rollback
    }
  };
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingBans, setLoadingBans] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [banReason, setBanReason] = useState("");

  useEffect(() => {
    if (selectedGuildId) {
      fetch(`/api/server-settings/${selectedGuildId}`)
        .then(res => {
          if (!res.ok) throw new Error(`Status ${res.status}`);
          return res.json();
        })
        .then(data => setServerSettings(data))
        .catch(err => console.error(`Failed to fetch settings for ${selectedGuildId}:`, err));
    }
  }, [selectedGuildId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const fetchJson = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) {
            console.warn(`Fetch failed for ${url}: ${res.status}`);
            return {};
          }
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            return await res.json();
          }
          console.warn(`Non-JSON response for ${url}: ${contentType}`);
          return {};
        } catch (e) {
          console.error(`Error fetching ${url}:`, e);
          return {};
        }
      };

      const [statusData, statsData, systemStatusData] = await Promise.all([
        fetchJson("/api/status"),
        fetchJson("/api/stats"),
        fetchJson("/api/system-status")
      ]);
      
      if (statusData && Object.keys(statusData).length > 0) {
        setStatus({ 
          ...statusData, 
          aiActive: systemStatusData.aiActive,
          geminiStatus: systemStatusData.geminiStatus
        });
      }
      if (statsData && Object.keys(statsData).length > 0) {
        setStats(statsData);
      }
      
      // Fetch server settings and automod per guild if selected
      if (selectedGuildId) {
        const [serverSettingsData, autoModData] = await Promise.all([
          fetchJson(`/api/server-settings/${selectedGuildId}`),
          fetchJson(`/api/automod/${selectedGuildId}`)
        ]);

        if (serverSettingsData && Object.keys(serverSettingsData).length > 0) {
          setServerSettings(serverSettingsData);
        }
        
        // Only update AutoMod if we haven't made local changes
        if (!isDirty && autoModData && Object.keys(autoModData).length > 0) {
          setAutoModSettings(autoModData);
        }
      }

      // Also refresh tab-specific data if applicable
      if (activeTab === "database") {
        setLoadingDB(true);
        const data = await fetchJson("/api/users");
        if (data) setUserDB(data);
        setLoadingDB(false);
      } else if (activeTab === "audit") {
        setLoadingLogs(true);
        const data = await fetchJson("/api/audit");
        if (Array.isArray(data)) setAuditLog(data);
        setLoadingLogs(false);
      } else if (activeTab === "commands") {
        setLoadingLogs(true);
        const data = await fetchJson("/api/commands");
        if (Array.isArray(data)) setCommandsList(data);
        setLoadingLogs(false);
      } else if (activeTab === "system") {
        setLoadingLogs(true);
        const data = await fetchJson("/api/system-logs");
        if (Array.isArray(data)) setSystemLogs(data);
        setLoadingLogs(false);
      } else if (activeTab === "staff") {
        setLoadingLogs(true);
        const data = await fetchJson("/api/staff");
        if (data) setStaffLog(data);
        setLoadingLogs(false);
      } else if (activeTab === "bans") {
        if (selectedGuildId) {
          setLoadingBans(true);
          const data = await fetchJson(`/api/guild/${selectedGuildId}/punishments`);
          if (data && !data.error) {
            setPunishments({ 
              bans: Array.isArray(data.bans) ? data.bans : [], 
              timeouts: Array.isArray(data.timeouts) ? data.timeouts : [] 
            });
          }
          setLoadingBans(false);
        }
      }
      
      if (selectedGuildId) {
        setLoadingMembers(true);
        const data = await fetchJson(`/api/guild/${selectedGuildId}/members`);
        if (Array.isArray(data)) setMembers(data);
        setLoadingMembers(false);
      }

    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedGuildId && status?.guildList && status.guildList.length > 0) {
      setSelectedGuildId(status.guildList[0].id);
    }
  }, [status, selectedGuildId]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!selectedGuildId) {
        setMembers([]);
        return;
      }
      setLoadingMembers(true);
      try {
        const res = await fetch(`/api/guild/${selectedGuildId}/members`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setMembers(data);
        } else {
          setMembers([]);
        }
      } catch (error) {
        console.error("Failed to fetch members:", error);
        setMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [selectedGuildId]);

  const fetchRoles = async () => {
    if (!selectedGuildId) {
      setAvailableRoles([]);
      return;
    }
    setLoadingRoles(true);
    try {
      const res = await fetch(`/api/guild/${selectedGuildId}/roles`);
      const data = await res.json();
      if (data.roles && Array.isArray(data.roles)) {
        setAvailableRoles(data.roles);
        setLastFetchedOrder(data.roles.map((r: any) => r.id));
        setBotHighestRole(data.botHighestRole);
        setBotPerms({ 
          isAdmin: data.isAdmin, 
          hasManageRoles: data.hasManageRoles, 
          hasModerateMembers: data.hasModerateMembers,
          hasKickMembers: data.hasKickMembers,
          hasBanMembers: data.hasBanMembers
        });
      } else if (Array.isArray(data)) {
        setAvailableRoles(data);
        setLastFetchedOrder(data.map((r: any) => r.id));
      } else {
        setAvailableRoles([]);
      }
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      setAvailableRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [selectedGuildId]);

  const handleModerate = async (action: string, roleIdOverride?: string, targetMemberOverride?: any) => {
    const target = targetMemberOverride || modifyingMember;
    if (!target || !selectedGuildId) return;
    
    setModResult(null);
    try {
      const totalSeconds = (modForm.h * 3600) + (modForm.m * 60) + (modForm.s);
      const res = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildId: selectedGuildId,
          userId: target.id,
          action,
          reason: modForm.reason,
          duration: totalSeconds,
          roleId: roleIdOverride || selectedRoleId
        })
      });

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        if (text.includes("<html>")) {
          throw new Error(`Server Error (${res.status}): Action could not be authorized.`);
        }
        throw new Error(text || `Server returned ${res.status}`);
      }

      if (res.ok && data.success) {
        setModResult({ success: true });
        fetchData(); // Refresh stats
        fetchRoles(); // Refresh roles
        
        // Refresh members list and current member state
        try {
          const membersRes = await fetch(`/api/guild/${selectedGuildId}/members`);
          const membersData = await membersRes.json();
          if (Array.isArray(membersData)) {
            setMembers(membersData);
            if (modifyingMember) {
              const updatedMember = membersData.find(m => m.id === modifyingMember.id);
              if (updatedMember) {
                setModifyingMember(updatedMember);
              }
            }
          }
        } catch (e) {
          console.error("Failed to refresh member sync", e);
        }

        setTimeout(() => {
          setModResult(null);
          setSelectedRoleId("");
          // Note: Modal remains open (modifyingMember is not cleared)
        }, 2000);
      } else {
        setModResult({ error: data.error || "Action failed" });
      }
    } catch (error: any) {
      console.error("Moderation error:", error);
      setModResult({ error: error.message || "Network error occurred" });
    }
  };

  const handleUnban = async (userId: string) => {
    if (!selectedGuildId) return;
    try {
      const res = await fetch("/api/moderate/unban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildId: selectedGuildId,
          userId,
          reason: banReason || "Revoked via Dashboard"
        })
      });

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        if (text.includes("<html>")) {
          throw new Error(`Server Error (${res.status}): Action could not be authorized.`);
        }
        throw new Error(text || `Server returned ${res.status}`);
      }

      if (res.ok && data.success) {
        setBanReason("");
        // Refresh punishments
        const punRes = await fetch(`/api/guild/${selectedGuildId}/punishments`);
        if (punRes.ok) {
          const punData = await punRes.json();
          if (punData && !punData.error) {
            setPunishments({ 
              bans: Array.isArray(punData.bans) ? punData.bans : [], 
              timeouts: Array.isArray(punData.timeouts) ? punData.timeouts : [] 
            });
          }
        }
      } else {
        alert(data.error || "Failed to unban user");
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to unban user.");
    }
  };

  const getManageableGuilds = () => {
    if (!status?.guildList) return [];
    return status.guildList.filter((g: any, index: number) => {
      // Admin has access to all bot-joined servers
      if (simulatedUserRole === 'admin') return true;
      // Regulator/Standard Moderator has access only to the first server, hiding any others
      return index === 0;
    });
  };

  useEffect(() => {
    if ((activeTab === "rules_setup" || activeTab === "server_info") && status?.guildList) {
      const manageable = getManageableGuilds();
      if (selectedGuildId && !manageable.some(g => g.id === selectedGuildId)) {
        if (manageable.length > 0) {
          setSelectedGuildId(manageable[0].id);
        } else {
          setSelectedGuildId(null);
        }
      }
    }
  }, [simulatedUserRole, status, activeTab]);

  useEffect(() => {
    if (activeTab === "database") {
      setLoadingDB(true);
      fetch("/api/users")
        .then(res => res.json())
        .then(data => {
          setUserDB(data);
          setLoadingDB(false);
        });
    }
    if (activeTab === "audit") {
      setLoadingLogs(true);
      fetch("/api/audit")
        .then(res => res.json())
        .then(data => {
          setAuditLog(data);
          setLoadingLogs(false);
        });
    }
    if (activeTab === "commands") {
      setLoadingLogs(true);
      fetch("/api/commands")
        .then(res => res.json())
        .then(data => {
          setCommandsList(data);
          setLoadingLogs(false);
        });
    }
    if (activeTab === "system") {
      setLoadingLogs(true);
      fetch("/api/system-logs")
        .then(res => res.json())
        .then(data => {
          setSystemLogs(data);
          setLoadingLogs(false);
        });
    }
    if (activeTab === "staff") {
      setLoadingLogs(true);
      fetch("/api/staff")
        .then(res => res.json())
        .then(data => {
          setStaffLog(data);
          setLoadingLogs(false);
        });
    }
    if (activeTab === "bans" && selectedGuildId) {
      setLoadingBans(true);
      fetch(`/api/guild/${selectedGuildId}/punishments`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setPunishments({ 
              bans: Array.isArray(data.bans) ? data.bans : [], 
              timeouts: Array.isArray(data.timeouts) ? data.timeouts : [] 
            });
          }
          setLoadingBans(false);
        });
    }
    if (activeTab === "server_config" && selectedGuildId) {
      fetch(`/api/server-settings/${selectedGuildId}`)
        .then(res => res.json())
        .then(data => setServerSettings(data));
    }
    if (activeTab === "automod" && selectedGuildId) {
      setLoading(true);
      fetch(`/api/automod/${selectedGuildId}`)
        .then(res => res.json())
        .then(data => {
          setAutoModSettings(data);
          setLoading(false);
        });
    }
    if (activeTab === "rules_setup" && selectedGuildId) {
      setLoading(true);
      fetch(`/api/rules/${selectedGuildId}`)
        .then(res => res.json())
        .then(data => {
          setRulesSettings(data);
          setLoading(false);
        })
        .catch(err => console.error(err));

      fetch(`/api/guild/${selectedGuildId}/channels`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setChannels(data);
          }
        })
        .catch(err => console.error(err));
    }
    
    if (activeTab === "server_info" && selectedGuildId) {
      fetchServerInfo(selectedGuildId);
    }
  }, [activeTab, selectedGuildId]);

  const saveAutoMod = async (newSettings: any) => {
    if (!newSettings || !selectedGuildId) return;
    setSavingAutoMod(true);
    try {
      const res = await fetch(`/api/automod/${selectedGuildId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      if (data.success) {
        setAutoModSettings(data.settings);
        setIsDirty(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingAutoMod(false);
    }
  };

  const updateAutoMod = (newSettings: any) => {
    setAutoModSettings(newSettings);
    setIsDirty(true);
  };

  const updateRulesSettings = (newSettings: any) => {
    setRulesSettings(newSettings);
    setIsDirty(true);
  };

  const saveRulesSettings = async (newSettings: any) => {
    if (!newSettings || !selectedGuildId) return;
    setSavingRules(true);
    try {
      const res = await fetch(`/api/rules/${selectedGuildId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      if (data.success) {
        setRulesSettings(data.settings);
        setIsDirty(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingRules(false);
    }
  };

  const sendRulesMessage = async () => {
    if (!selectedGuildId || !rulesSettings) return;
    setSendingRulesMessage(true);
    setRulesSendSuccess(null);
    setRulesSendError(null);
    try {
      // Autosave current dashboard draft first
      const saveRes = await fetch(`/api/rules/${selectedGuildId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rulesSettings)
      });
      if (saveRes.ok) {
        const saveResult = await saveRes.json();
        if (saveResult?.settings) {
          setRulesSettings(saveResult.settings);
        }
      }
      setIsDirty(false);

      const res = await fetch(`/api/rules/${selectedGuildId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = res.ok ? await res.json() : null;
      if (res.ok && data?.success) {
        setRulesSendSuccess("Transmitted successfully! The rules embed has been dispatched to the configured rules channel.");
        // Fetch rules once more to update local rulesSettings with newly-recorded message ID
        const loadRes = await fetch(`/api/rules/${selectedGuildId}`);
        if (loadRes.ok) {
          const loadedData = await loadRes.json();
          setRulesSettings(loadedData);
        }
      } else {
        setRulesSendError(data?.error || "Execution failed. Please confirm permissions and configuration.");
      }
    } catch (err: any) {
      setRulesSendError(err.message || "An unexpected network error occurred.");
    } finally {
      setSendingRulesMessage(false);
    }
  };

  const updateRulesMessage = async () => {
    if (!selectedGuildId || !rulesSettings) return;
    setUpdatingRulesMessage(true);
    setRulesSendSuccess(null);
    setRulesSendError(null);
    try {
      // Autosave current dashboard draft first
      const saveRes = await fetch(`/api/rules/${selectedGuildId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rulesSettings)
      });
      if (saveRes.ok) {
        const saveResult = await saveRes.json();
        if (saveResult?.settings) {
          setRulesSettings(saveResult.settings);
        }
      }
      setIsDirty(false);

      const res = await fetch(`/api/rules/${selectedGuildId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = res.ok ? await res.json() : null;
      if (res.ok && data?.success) {
        setRulesSendSuccess("Updated successfully! The existing rules embed has been programmatically updated inside Discord.");
      } else {
        setRulesSendError(data?.error || "Update failed. Make sure a rules message was already sent and is not deleted.");
      }
    } catch (err: any) {
      setRulesSendError(err.message || "An unexpected error occurred during update.");
    } finally {
      setUpdatingRulesMessage(false);
    }
  };

  const deleteRulesMessage = async () => {
    if (!selectedGuildId || !rulesSettings) return;
    if (!window.confirm("Are you sure you want to delete the posted rules message from Discord? This will physically remove the message directly from the target Discord channel.")) return;
    setDeletingRulesMessage(true);
    setRulesSendSuccess(null);
    setRulesSendError(null);
    try {
      const res = await fetch(`/api/rules/${selectedGuildId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = res.ok ? await res.json() : null;
      if (res.ok && data?.success) {
        setRulesSendSuccess("Deleted successfully! The rules message has been removed from Discord.");
        // Fetch rules once more to reset local rulesSettings message ID
        const loadRes = await fetch(`/api/rules/${selectedGuildId}`);
        if (loadRes.ok) {
          const loadedData = await loadRes.json();
          setRulesSettings(loadedData);
        }
      } else {
        setRulesSendError(data?.error || "Deletion failed. Make sure a rules message is current on Discord.");
      }
    } catch (err: any) {
      setRulesSendError(err.message || "An unexpected error occurred during deletion.");
    } finally {
      setDeletingRulesMessage(false);
    }
  };

  const saveServerSettings = async (newSettings: any) => {
    if (!newSettings) return;
    setSavingServerSettings(true);
    try {
      const res = await fetch(`/api/server-settings/${selectedGuildId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      if (data.success) {
        setServerSettings(data.settings);
        alert("Settings saved!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingServerSettings(false);
    }
  };

  const formatUptime = (ms: number | null) => {
    if (!ms) return "0s";
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    
    return parts.join(" ");
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-brand/30 overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-zinc-900 border-r border-zinc-700 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shadow-lg shadow-brand/20 border border-zinc-700">
            <img src={logo} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold tracking-tight text-sm text-white/90">Cracked Tier | Bot</span>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold px-2 mb-2">Control Center</div>
          
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${activeTab === "dashboard" ? "bg-zinc-700/50 text-white border border-zinc-600/50 shadow-lg shadow-black/20" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "dashboard" ? "bg-brand animate-pulse" : "bg-zinc-600"}`}></div>
            Dashboard
          </button>

          <button 
            onClick={() => setActiveTab("servers")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${activeTab === "servers" ? "bg-zinc-700/50 text-white border border-zinc-600/50 shadow-lg shadow-black/20" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "servers" ? "bg-brand animate-pulse" : "bg-zinc-600"}`}></div>
            Bot Servers
          </button>

          <button 
            onClick={() => setActiveTab("server_info")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${activeTab === "server_info" ? "bg-zinc-700/50 text-white border border-zinc-600/50 shadow-lg shadow-black/20" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "server_info" ? "bg-brand animate-pulse" : "bg-zinc-600"}`}></div>
            Server Info Card
          </button>
          
          <button 
            onClick={() => setActiveTab("server_config")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${activeTab === "server_config" ? "bg-zinc-700/50 text-white border border-zinc-600/50 shadow-lg shadow-black/20" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "server_config" ? "bg-brand animate-pulse" : "bg-zinc-600"}`}></div>
            Server Configuration
          </button>

          <button 
            onClick={() => setActiveTab("rules_setup")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${activeTab === "rules_setup" ? "bg-zinc-700/50 text-white border border-zinc-600/50 shadow-lg shadow-black/20" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "rules_setup" ? "bg-brand animate-pulse" : "bg-zinc-600"}`}></div>
            Rules Message Setup
          </button>

          <button 
            onClick={() => setActiveTab("automod")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${activeTab === "automod" ? "bg-zinc-700/50 text-white border border-zinc-600/50 shadow-lg shadow-black/20" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "automod" ? "bg-brand animate-pulse" : "bg-zinc-600"}`}></div>
            Auto-Mod Settings
          </button>

          <button 
            onClick={() => setActiveTab("roles")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${activeTab === "roles" ? "bg-zinc-700/50 text-white border border-zinc-600/50 shadow-lg shadow-black/20" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "roles" ? "bg-brand animate-pulse" : "bg-zinc-600"}`}></div>
            Role Intel
          </button>

          <button 
            onClick={() => setActiveTab("moderation")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${activeTab === "moderation" ? "bg-zinc-700/50 text-white border border-zinc-600/50 shadow-lg shadow-black/20" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "moderation" ? "bg-brand animate-pulse" : "bg-zinc-600"}`}></div>
            Moderation
          </button>

          <button 
            onClick={() => setActiveTab("bans")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${activeTab === "bans" ? "bg-zinc-700/50 text-white border border-zinc-600/50 shadow-lg shadow-black/20" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "bans" ? "bg-brand animate-pulse" : "bg-zinc-600"}`}></div>
            Punishment Management
          </button>

          <button 
            onClick={() => setActiveTab("database")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${activeTab === "database" ? "bg-zinc-700/50 text-white border border-zinc-600/50 shadow-lg shadow-black/20" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "database" ? "bg-brand animate-pulse" : "bg-zinc-600"}`}></div>
            User Database
          </button>

          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold px-2 mt-8 mb-2">Logs</div>
          
          <button 
            onClick={() => setActiveTab("audit")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${activeTab === "audit" ? "bg-zinc-700/50 text-white border border-zinc-600/50 shadow-lg shadow-black/20" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "audit" ? "bg-brand animate-pulse" : "bg-zinc-600"}`}></div>
            Audit Trail
          </button>

          <button 
            onClick={() => setActiveTab("system")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${activeTab === "system" ? "bg-zinc-700/50 text-white border border-zinc-600/50 shadow-lg shadow-black/20" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "system" ? "bg-brand animate-pulse" : "bg-zinc-600"}`}></div>
            System Output
          </button>

          <button 
            onClick={() => setActiveTab("commands")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${activeTab === "commands" ? "bg-zinc-700/50 text-white border border-zinc-600/50 shadow-lg shadow-black/20" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "commands" ? "bg-brand animate-bounce" : "bg-zinc-600"}`}></div>
            Command Library
          </button>

          <button 
            onClick={() => setActiveTab("staff")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${activeTab === "staff" ? "bg-zinc-700/50 text-white border border-zinc-600/50 shadow-lg shadow-black/20" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "staff" ? "bg-brand animate-pulse" : "bg-zinc-600"}`}></div>
            Staff Activity
          </button>

          {/* Persistent Bot Invite Promotion Section */}
          <div className="p-3 mx-2 mt-4 bg-gradient-to-br from-[#5865F2]/10 to-zinc-900 border border-[#5865F2]/20 rounded-xl relative overflow-hidden group shadow">
            <h5 className="text-[10px] font-black tracking-widest text-[#5865F2] uppercase mb-1">Add to Discord</h5>
            <p className="text-[9.5px] text-zinc-400 leading-tight mb-2.5">Deploy Cracked Tier's tools directly to your own server.</p>
            <a 
              href={`https://discord.com/api/oauth2/authorize?client_id=${status?.clientId || ''}&permissions=8&scope=bot%20applications.commands`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow"
            >
              <Plus className="w-3 h-3 text-white" />
              Invite Bot Code
            </a>
          </div>
        </nav>

        <div className="p-4 border-t border-zinc-700 bg-zinc-850">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-zinc-800 border-2 ${status?.online ? 'border-brand shadow-[0_0_15px_rgba(var(--brand),0.3)]' : 'border-rose-500'} overflow-hidden flex items-center justify-center transition-all duration-500`}>
              <img src={logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{status?.botName || "Offline"}</p>
              <p className={`text-[10px] ${status?.online ? 'text-emerald-500' : 'text-rose-500'} font-bold`}>
                {status?.online ? 'Status: Online' : 'Status: Offline'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-700 flex items-center justify-between px-8 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded bg-brand/10 border border-brand/20 flex items-center justify-center overflow-hidden">
              <img src={logo} alt="CT" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-sm">System /</span>
              <span className="font-medium text-sm capitalize">
                {activeTab === "rules_setup" ? "Rules Message Setup" : activeTab.replace("_", " ")} Overview
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href={`https://discord.com/api/oauth2/authorize?client_id=${status?.clientId || ''}&permissions=8&scope=bot%20applications.commands`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Invite Bot</span>
            </a>
            <div className="px-3 py-1 bg-zinc-800 rounded-full text-[10px] font-bold text-zinc-400 border border-zinc-700 uppercase tracking-tighter">
              v1.0.0-stable
            </div>
            <button 
              onClick={fetchData}
              className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Content View */}
        <main className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {status?.configMissing && (
                  <div className="p-6 bg-brand/10 border border-brand/20 rounded-2xl shadow-lg shadow-brand/5">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-brand/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Settings className="w-6 h-6 text-brand" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white leading-tight">Configuration Missing</h2>
                        <p className="mt-1 text-zinc-400 text-sm">Bot token and Client ID are required to start the Cracked Tier operational core. Provide them in the Secrets panel.</p>
                        <div className="mt-4 flex gap-3">
                          <a 
                            href="https://discord.com/developers/applications" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-all text-xs font-bold uppercase tracking-wider"
                          >
                            Discord Developer Portal <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Active Guilds" value={status?.guilds.toString() || "0"} sub="Monitoring Live" />
                  <StatCard label="Total Warns" value={stats?.totalWarnings.toString() || "0"} sub="Persistence DB" />
                  <StatCard label="System Uptime" value={formatUptime(status?.uptime || null)} sub="Service Lifecycle" />
                  <StatCard label="Avg Latency" value="14ms" sub="Optimal Performance" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Live Audit Log */}
                  <div className="xl:col-span-2 space-y-6">
                    <div className="bg-zinc-800 rounded-2xl border border-zinc-700 flex flex-col overflow-hidden shadow-xl shadow-black/20 group">
                      <div className="p-4 border-b border-zinc-700 flex justify-between items-center bg-zinc-850">
                        <h3 className="text-xs font-bold tracking-widest flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-zinc-500" />
                          RECENT SYSTEM ACTIVITY
                        </h3>
                      </div>
                      <div className="flex-1 font-mono text-xs overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                          <thead className="text-zinc-500 bg-zinc-900/50">
                            <tr>
                              <th className="px-6 py-3 font-medium uppercase tracking-widest text-[10px]">Time</th>
                              <th className="px-6 py-3 font-medium uppercase tracking-widest text-[10px]">Action</th>
                              <th className="px-6 py-3 font-medium uppercase tracking-widest text-[10px]">User</th>
                              <th className="px-6 py-3 font-medium uppercase tracking-widest text-[10px]">Reason</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-700">
                            {stats?.recentWarnings && stats.recentWarnings.length > 0 ? (
                              stats.recentWarnings.map((log: any, i: number) => (
                                <tr key={i} className="hover:bg-zinc-700/50 transition-colors group/row">
                                  <td className="px-6 py-4 text-zinc-500 whitespace-nowrap">
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">WARN</span>
                                  </td>
                                  <td className="px-6 py-4 font-bold text-zinc-200">
                                    {log.username}
                                    <span className="text-zinc-600 font-normal ml-1">#{log.userId.slice(-4)}</span>
                                  </td>
                                  <td className="px-6 py-4 text-zinc-400 line-clamp-1">{log.reason}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-zinc-600 italic">No activity recorded...</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-brand rounded-2xl p-6 shadow-xl shadow-brand/10 group">
                      <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-white">
                        <CheckCircle2 className="w-5 h-5" />
                        System Health
                      </h3>
                      <div className="space-y-4">
                        <HealthItem label="API Connectivity" status="stable" />
                        <HealthItem label="Bot WebSocket" status="connected" />
                        <HealthItem label="Database Latency" status="12ms" />
                      </div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
                      <h3 className="text-[10px] font-bold tracking-widest uppercase border-b border-zinc-800 pb-3 text-zinc-500 flex items-center gap-2 mb-4">
                        <ShieldAlert className="w-4 h-4" />
                        Active Policies
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-medium">Anti-Spam System</span>
                          <span className={autoModSettings?.antiSpam ? "text-emerald-500 font-black animate-pulse" : "text-zinc-600 font-bold opacity-50"}>
                            {autoModSettings?.antiSpam ? "ONLINE" : "OFFLINE"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-medium">Linguistic Filter</span>
                          <span className={autoModSettings?.wordFilter && autoModSettings.wordFilter.length > 0 ? "text-emerald-400 font-black" : "text-zinc-600 font-bold opacity-50"}>
                            {autoModSettings?.wordFilter && autoModSettings.wordFilter.length > 0 ? "FILTERING" : "STANDBY"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-medium">Invite Suppression</span>
                          <span className={autoModSettings?.inviteFilter ? "text-emerald-500 font-black" : "text-zinc-600 font-bold opacity-50"}>
                            {autoModSettings?.inviteFilter ? "ACTIVE" : "OFFLINE"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-medium">Mention Shield</span>
                          <span className={autoModSettings?.mentionFilter ? "text-emerald-500 font-black" : "text-zinc-600 font-bold opacity-50"}>
                            {autoModSettings?.mentionFilter ? "ACTIVE" : "OFFLINE"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-4">
                      <h3 className="text-[10px] font-bold tracking-widest uppercase border-b border-zinc-800 pb-3 text-zinc-500 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-brand" />
                        Bot Server Info
                      </h3>
                      <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                        Analyze detailed metadata, owner identities, and channel structure counts on active Discord Guild servers.
                      </p>
                      <button
                        onClick={() => setActiveTab("server_info")}
                        className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Eye className="w-3.5 h-3.5 text-brand" />
                        View Server Info Card
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "server_info" && (
              <motion.div 
                key="server_info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* 🖥️ SERVER SELECTION SECTION */}
                <div className="bg-zinc-800 rounded-3xl border border-zinc-700 p-6 shadow-2xl relative">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-black uppercase text-brand tracking-widest flex items-center gap-2">
                        <span>🖥️</span> Select Server
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase mt-0.5">
                        Interactive Administration & Metrics Gateway
                      </p>
                    </div>
                    {/* Access level signal */}
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-brand/10 text-brand text-[9px] font-black tracking-widest uppercase border border-brand/10 rounded-md">
                        {simulatedUserRole === 'admin' ? "👑 Admin Permission: ALL" : "🛡️ Mod Permission: Restricted"}
                      </span>
                    </div>
                  </div>

                  <div className="relative">
                    {/* Selector button trigger */}
                    <button
                      type="button"
                      onClick={() => setInfoServerDropdownOpen(!infoServerDropdownOpen)}
                      className="w-full bg-zinc-900 border border-zinc-700/80 hover:border-brand/50 rounded-2xl p-4 text-left text-sm text-zinc-100 flex items-center justify-between transition-all outline-none focus:border-brand cursor-pointer relative"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {serverInfo?.server_icon ? (
                          <img 
                            src={serverInfo.server_icon} 
                            alt="" 
                            className="w-7 h-7 rounded-full object-cover border border-zinc-700 shrink-0" 
                            referrerPolicy="no-referrer" 
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-brand/15 text-brand flex items-center justify-center font-black text-xs shrink-0 select-none border border-brand/20">
                            {serverInfo?.server_name?.[0] || "?"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-extrabold text-[#f2f3f5] truncate text-sm">
                            {serverInfo?.server_name || "Select a discord server..."}
                          </p>
                          {serverInfo && (
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight flex items-center gap-1.5 mt-0.5">
                              <span>👥 {typeof serverInfo.member_count === "number" ? serverInfo.member_count.toLocaleString() : serverInfo.member_count} Members</span>
                              <span className="text-zinc-600">•</span>
                              <span className="font-mono text-[9px]">{serverInfo.server_id}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-zinc-500 shrink-0">
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${infoServerDropdownOpen ? "rotate-180 text-brand" : ""}`} />
                      </div>
                    </button>

                    {/* Popover Dropdown Overlay */}
                    <AnimatePresence>
                      {infoServerDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          className="absolute left-0 right-0 mt-2 bg-[#1e1f22] border border-[#35363c] rounded-2xl shadow-2xl z-40 overflow-hidden"
                        >
                          {/* Search Input filter bar */}
                          <div className="p-3 border-b border-[#2b2d31] bg-zinc-950/40 flex items-center gap-2">
                            <Search className="w-4 h-4 text-zinc-500 ml-1.5" />
                            <input
                              type="text"
                              value={serverSearchQuery}
                              onChange={(e) => setServerSearchQuery(e.target.value)}
                              placeholder="Search bot-connected servers..."
                              className="w-full bg-transparent text-xs text-white border-none outline-none placeholder-zinc-500 py-1.5 focus:ring-0 font-medium font-sans"
                            />
                            {serverSearchQuery && (
                              <button
                                onClick={() => setServerSearchQuery("")}
                                className="text-zinc-500 hover:text-white text-xs font-bold font-sans"
                              >
                                Clear
                              </button>
                            )}
                          </div>

                          {/* List of active bot servers */}
                          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                            <div className="text-[10px] font-black uppercase text-zinc-500 tracking-wider px-2.5 py-1.5 border-b border-[#2b2d31]/40 flex justify-between items-center">
                              <span>🖥️ SELECT SERVER</span>
                              <span className="text-[8px] text-brand bg-brand/10 px-1.5 py-0.5 rounded border border-brand/10 font-bold uppercase tracking-wider">Alphabetical</span>
                            </div>

                            {(() => {
                              const filtered = (status?.guildList || [])
                                .filter((g, idx) => {
                                  // Show only servers where user has Administrator permission:
                                  // Admin role has access to all bot guilds.
                                  // Moderator role has access only to the first guild.
                                  if (simulatedUserRole === 'admin') return true;
                                  return idx === 0;
                                })
                                .filter(g => g.name.toLowerCase().includes(serverSearchQuery.toLowerCase()))
                                .sort((a, b) => a.name.localeCompare(b.name));

                              if (filtered.length === 0) {
                                return (
                                  <div className="py-8 text-center text-zinc-500 text-xs font-bold uppercase tracking-wider font-sans">
                                    No Authorized Servers Found
                                  </div>
                                );
                              }

                              return filtered.map((guild) => {
                                const isCurrent = selectedGuildId === guild.id;
                                return (
                                  <button
                                    key={guild.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedGuildId(guild.id);
                                      setInfoServerDropdownOpen(false);
                                      setServerSearchQuery("");
                                    }}
                                    className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all group ${
                                      isCurrent 
                                        ? "bg-brand/15 border border-brand/20" 
                                        : "hover:bg-[#2b2d31] border border-transparent"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {guild.icon ? (
                                        <img 
                                          src={guild.icon} 
                                          alt="" 
                                          className="w-7 h-7 rounded-full object-cover border border-[#2b2d31] shrink-0" 
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <div className="w-7 h-7 rounded-full bg-brand/10 text-brand font-black text-xs flex items-center justify-center shrink-0 border border-brand/15 select-none">
                                          {guild.name[0]}
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <p className="font-extrabold text-xs text-[#f2f3f5] truncate group-hover:text-white transition-colors">
                                          {guild.name}
                                        </p>
                                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight mt-0.5">
                                          ({guild.memberCount.toLocaleString()} Members)
                                        </p>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <p className="font-mono text-[9px] text-zinc-500 group-hover:text-zinc-400 font-medium select-all">
                                        ID: {guild.id}
                                      </p>
                                      <p className="text-[8px] font-black tracking-widest text-[#00A8FC] uppercase scale-90 origin-right mt-0.5">
                                        Bot Join Active
                                      </p>
                                    </div>
                                  </button>
                                );
                              });
                            })()}
                          </div>

                          <div className="p-3 border-t border-[#2b2d31] bg-[#1a1b1e] flex justify-center">
                            <a
                              href={`https://discord.com/api/oauth2/authorize?client_id=${status?.clientId || ''}&permissions=8&scope=bot%20applications.commands`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full text-center py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold uppercase tracking-wide rounded-xl transition-all shadow flex items-center justify-center gap-1.5"
                            >
                              <Plus className="w-4 h-4" />
                              Invite Bot to Another Server
                            </a>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="bg-zinc-800 rounded-3xl border border-zinc-700 overflow-hidden shadow-2xl">
                  {/* Card Header Banner */}
                  <div className="p-6 border-b border-zinc-700 bg-zinc-850 flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-sm font-bold tracking-widest flex items-center gap-2 uppercase text-white">
                        <ShieldCheck className="w-5 h-5 text-brand" />
                        PREMIUM DISCORD REAL-TIME INTEL
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">
                        High-Fidelity Sapphire Server Analyzer
                      </p>
                    </div>
                    {/* Control Buttons */}
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => fetchServerInfo()}
                        disabled={loadingServerInfo}
                        className="px-4 py-2 bg-zinc-750 hover:bg-zinc-750/80 text-zinc-200 border border-zinc-700 font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 disabled:opacity-45"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingServerInfo ? "animate-spin text-brand" : "text-zinc-400"}`} />
                        {loadingServerInfo ? "Syncing..." : "Refresh Info"}
                      </button>
                    </div>
                  </div>

                  <div className="p-6 bg-zinc-900/50 space-y-6">
                    {loadingServerInfo && !serverInfo ? (
                      <div className="py-16 text-center space-y-3">
                        <RefreshCw className="w-8 h-8 text-brand animate-spin mx-auto" />
                        <p className="text-xs text-zinc-500 uppercase tracking-widest font-black animate-pulse">
                          Fetching Secure Discord Audit Metrics...
                        </p>
                      </div>
                    ) : serverInfoError ? (
                      <div className="bg-rose-950/40 p-6 rounded-2xl border border-rose-900/60 text-center space-y-3">
                        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
                        <div>
                          <p className="text-sm font-bold text-white uppercase tracking-wider">Failed to Synchronize Telemetry</p>
                          <p className="text-xs text-rose-450 font-medium mt-1">{serverInfoError}</p>
                        </div>
                        <button
                          onClick={() => fetchServerInfo()}
                          className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-200 font-bold rounded-xl text-xs uppercase tracking-wide border border-rose-900 transition-all active:scale-95 mx-auto"
                        >
                          Retry Connection
                        </button>
                      </div>
                    ) : serverInfo ? (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Discord Embed Preview Container */}
                        <div className="lg:col-span-12 xl:col-span-7 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest font-sans flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5 text-brand" />
                              Discord Simulated Channel Broadcast
                            </span>
                            <span className="text-[9px] font-mono text-zinc-500 font-bold">1:1 MATCH PREVIEW</span>
                          </div>

                          {/* Discord message format */}
                          <div id="discord_preview_card" className="w-full bg-[#313338] text-[#dbdee1] p-4 rounded-xl shadow-2xl font-sans border border-[#2b2d31] relative overflow-hidden select-none">
                            {/* User details header (the bot sending the message) */}
                            <div className="flex items-start gap-4 mb-2.5">
                              <div className="w-10 h-10 rounded-full bg-[#1e1f22] border border-[#2b2d31] overflow-hidden shrink-0 flex items-center justify-center">
                                <img src={logo} alt="Bot Avatar" className="w-full h-full object-cover" />
                              </div>
                              <div className="space-y-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-extrabold text-[14.5px] text-white hover:underline cursor-pointer">
                                    {status?.botName?.split("#")[0] || "MineLife"}
                                  </span>
                                  <span className="bg-[#5865F2] text-[9.5px] text-white font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider scale-90">
                                    BOT
                                  </span>
                                  <span className="text-[11px] text-zinc-400 font-black">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-[12px] text-zinc-400 leading-tight">Dispatched live server info manifest.</p>
                              </div>
                            </div>

                            {/* Embed itself */}
                            <div className="md:ml-14 flex items-stretch">
                              {/* Left border line */}
                              <div className="w-1 bg-[#2B2D31] rounded-l-md shrink-0" />

                              {/* Embed content wrapper */}
                              <div className="bg-[#2B2D31] p-4 rounded-r-md flex-1 flex flex-col md:flex-row gap-4 justify-between items-start overflow-hidden border-y border-r border-[#1e1f22]/30">
                                {/* Details column */}
                                <div className="space-y-4 flex-1 min-w-0">
                                  {/* Author / Title */}
                                  <div>
                                    <h4 className="text-[14px] font-bold text-white hover:underline cursor-pointer truncate font-sans">
                                      Server Name: <span className="font-extrabold text-[#ffffff]">{serverInfo.server_name}</span>
                                    </h4>
                                  </div>

                                  {/* Divider separator line */}
                                  <div className="text-zinc-600/60 leading-none select-none text-[11px] font-mono">
                                    ────────────────────────────────────
                                  </div>

                                  {/* ID & Created At Section */}
                                  <div className="text-[12px] text-[#dbdee1] font-medium space-y-0.5 font-sans leading-relaxed">
                                    <div>
                                      ID: <span className="font-mono text-[#dbdee1] text-[11.5px] font-semibold select-all">{serverInfo.server_id}</span>
                                    </div>
                                    <div>
                                      Server Created: <span className="text-[#dbdee1] font-semibold">{serverInfo.created_at}</span>
                                    </div>
                                  </div>

                                  {/* Embed Layout Fields */}
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-2 pt-2 text-[#dbdee1] max-w-lg font-sans">
                                    <div className="min-w-0">
                                      <div className="text-[11px] font-bold text-[#b5bac1] uppercase tracking-wide">Owner</div>
                                      <div className="text-[13px] font-semibold text-[#f2f3f5] mt-0.5 truncate select-all">{serverInfo.owner_name}</div>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-[11px] font-bold text-[#b5bac1] uppercase tracking-wide">Members</div>
                                      <div className="text-[13px] font-semibold text-[#f2f3f5] mt-0.5">
                                        {typeof serverInfo.member_count === "number" ? serverInfo.member_count.toLocaleString() : serverInfo.member_count}
                                      </div>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-[11px] font-bold text-[#b5bac1] uppercase tracking-wide">Roles</div>
                                      <div className="text-[13px] font-semibold text-[#f2f3f5] mt-0.5">{serverInfo.role_count}</div>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-[11px] font-bold text-[#b5bac1] uppercase tracking-wide">Category Channels</div>
                                      <div className="text-[13px] font-semibold text-[#f2f3f5] mt-0.5">{serverInfo.category_count}</div>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-[11px] font-bold text-[#b5bac1] uppercase tracking-wide">Text Channels</div>
                                      <div className="text-[13px] font-semibold text-[#f2f3f5] mt-0.5">{serverInfo.text_channel_count}</div>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-[11px] font-bold text-[#b5bac1] uppercase tracking-wide">Voice Channels</div>
                                      <div className="text-[13px] font-semibold text-[#f2f3f5] mt-0.5">{serverInfo.voice_channel_count}</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Server Icon Square Thumbnail on the right */}
                                {serverInfo.server_icon ? (
                                  <div className="w-[64px] h-[64px] rounded bg-[#1e1f22] border border-[#2b2d31] overflow-hidden shrink-0 group relative self-start">
                                    <img 
                                      src={serverInfo.server_icon} 
                                      alt="Thumbnail" 
                                      className="w-full h-full object-cover" 
                                      referrerPolicy="no-referrer" 
                                    />
                                  </div>
                                ) : (
                                  <div className="w-[64px] h-[64px] rounded bg-[#1e1f22] border border-[#2b2d31] text-[#b5bac1] flex items-center justify-center font-extrabold text-sm shrink-0 select-none self-start">
                                    {serverInfo.server_name?.[0] || "?"}
                                  </div>
                                )}
                              </div>
                            </div>

                             {/* Simulated Buttons inside Discord block */}
                            <div className="md:ml-14 mt-4 flex flex-wrap gap-2 pt-2 border-t border-[#35363c]/50">
                              <a
                                href={`https://discord.com/api/oauth2/authorize?client_id=${status?.clientId || ''}&permissions=8&scope=bot%20applications.commands`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs rounded-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow"
                              >
                                <Plus className="w-3.5 h-3.5 text-white" />
                                Invite Bot
                              </a>
                              <button
                                type="button"
                                onClick={() => setIsViewingRoles(true)}
                                className="px-4 py-1.5 bg-[#4e5058] hover:bg-[#6d6f78] text-white font-bold text-xs rounded-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow"
                              >
                                <Layers className="w-3.5 h-3.5 text-zinc-300" />
                                View Roles
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsViewingChannels(true)}
                                className="px-4 py-1.5 bg-[#4e5058] hover:bg-[#6d6f78] text-white font-bold text-xs rounded-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-zinc-300" />
                                View Channels
                              </button>
                              <button
                                type="button"
                                onClick={() => fetchServerInfo(undefined, true)}
                                className="px-4 py-1.5 bg-[#4e5058] hover:bg-[#6d6f78] text-white font-bold text-xs rounded-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 text-zinc-300 ${loadingServerInfo ? "animate-spin text-brand" : ""}`} />
                                Refresh Info
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (serverInfo?.server_id) {
                                    navigator.clipboard.writeText(serverInfo.server_id);
                                    setCopiedId(serverInfo.server_id);
                                    setTimeout(() => setCopiedId(null), 1500);
                                  }
                                }}
                                className="px-4 py-1.5 bg-zinc-750 hover:bg-zinc-700 text-white font-bold text-xs rounded-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow relative border border-zinc-650"
                              >
                                {copiedId === serverInfo.server_id ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 font-bold" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Database className="w-3.5 h-3.5 text-zinc-350" />
                                    <span>Copy Server ID</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Remote Controller dispatch deck */}
                        <div className="lg:col-span-12 xl:col-span-5 space-y-6">
                          <div className="bg-zinc-950/60 p-5 rounded-2xl border border-zinc-850 space-y-4">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 bg-brand rounded-full animate-pulse" />
                              <span className="text-[10px] font-black uppercase text-brand tracking-widest">
                                Remote Transmitter Console
                              </span>
                            </div>

                            <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                              Send this exact premium server info card directly into any available text channel as a bot embed message! This bridges your dashboard directly to discord.
                            </p>

                            <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">
                                Target Channel Selector
                              </label>
                              <select
                                value={selectedBroadcastChannelId}
                                onChange={(e) => {
                                  setSelectedBroadcastChannelId(e.target.value);
                                  setBroadcastSuccess(null);
                                }}
                                className="w-full px-3.5 py-3 bg-zinc-900 border border-zinc-800 text-sm font-bold text-zinc-200 rounded-xl focus:outline-none focus:border-brand transition-colors cursor-pointer"
                              >
                                <option value="">-- Choose target channel --</option>
                                {channels.map((chan) => (
                                  <option key={chan.id} value={chan.id}>
                                    {chan.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={async () => {
                                if (!selectedBroadcastChannelId) return;
                                setBroadcastingServerInfo(true);
                                setBroadcastSuccess(null);
                                try {
                                  const res = await fetch(`/api/guild/${selectedGuildId}/server-info/send`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ channelId: selectedBroadcastChannelId })
                                  });
                                  const ans = await res.json();
                                  if (!res.ok) throw new Error(ans.error || "Unknown Error");
                                  setBroadcastSuccess(`Message transmitted successfully! ID: ${ans.messageId}`);
                                } catch (e: any) {
                                  alert(e.message || "Failed to broadcast embed.");
                                } finally {
                                  setBroadcastingServerInfo(false);
                                }
                              }}
                              disabled={broadcastingServerInfo || !selectedBroadcastChannelId}
                              className="w-full py-3.5 bg-gradient-to-r from-brand to-cyan-600 hover:from-brand/90 hover:to-cyan-500 text-white font-extrabold text-[11px] uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <Send className={`w-4 h-4 ${broadcastingServerInfo ? "animate-pulse" : ""}`} />
                              {broadcastingServerInfo ? "Transmitting..." : "Send Server Info"}
                            </button>

                            {broadcastSuccess && (
                              <div className="flex items-center gap-2 p-3 bg-emerald-950/40 rounded-xl border border-emerald-900/50 text-[11px] font-black uppercase text-emerald-400 tracking-wider">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                {broadcastSuccess}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-16 text-center text-zinc-500 uppercase tracking-widest text-[11px] font-bold">
                        Please select a Server to load Server Info Card
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-panel/Modal for viewing roles list */}
                {isViewingRoles && serverInfo && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-zinc-900 border border-zinc-800 max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl"
                    >
                      <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="w-5 h-5 text-brand" />
                          <h3 className="text-sm font-black uppercase tracking-wider text-white">
                            Role Intel ({serverInfo.role_count} total)
                          </h3>
                        </div>
                        <button onClick={() => setIsViewingRoles(false)} className="text-zinc-500 hover:text-white transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="p-5 max-h-[350px] overflow-y-auto space-y-2">
                        {serverInfo.rolesList && serverInfo.rolesList.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {serverInfo.rolesList.map((role: any) => (
                              <span 
                                key={role.id}
                                style={{ borderColor: role.color ? `${role.color}40` : '#3f3f46', color: role.color || '#f4f4f5' }}
                                className="px-2.5 py-1 text-xs border bg-zinc-950 font-bold rounded-lg flex items-center gap-1.5 select-all"
                              >
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color || '#fff' }} />
                                {role.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500 font-bold text-center py-4 uppercase tracking-widest">No roles fetched</p>
                        )}
                      </div>
                      <div className="p-4 bg-zinc-950/60 border-t border-zinc-800 text-right">
                        <button 
                          onClick={() => setIsViewingRoles(false)} 
                          className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                        >
                          Close Panel
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* Sub-panel/Modal for viewing channels list */}
                {isViewingChannels && serverInfo && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-zinc-900 border border-zinc-800 max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl"
                    >
                      <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-brand" />
                          <h3 className="text-sm font-black uppercase tracking-wider text-white">
                            Channel Structure Intel
                          </h3>
                        </div>
                        <button onClick={() => setIsViewingChannels(false)} className="text-zinc-500 hover:text-white transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="p-5 max-h-[350px] overflow-y-auto space-y-2">
                        {serverInfo.channelsList && serverInfo.channelsList.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {serverInfo.channelsList.map((ch: any) => (
                              <div 
                                key={ch.id}
                                className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-850/80 flex items-center gap-2"
                              >
                                <span className="text-base shrink-0">{ch.type}</span>
                                <span className="text-xs font-bold text-zinc-400 truncate select-all">{ch.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500 font-bold text-center py-4 uppercase tracking-widest">No channels fetched</p>
                        )}
                      </div>
                      <div className="p-4 bg-zinc-950/60 border-t border-zinc-800 text-right">
                        <button 
                          onClick={() => setIsViewingChannels(false)} 
                          className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-extrabold text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                        >
                          Close Panel
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "servers" && (
              <motion.div 
                key="servers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-zinc-800 rounded-3xl border border-zinc-700 overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-zinc-700 bg-zinc-850 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold tracking-widest flex items-center gap-2 uppercase text-white">
                        <Users className="w-5 h-5 text-zinc-500" />
                        ACTIVE SERVER CLUSTERS
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Operational presence across the network</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-zinc-900/50">
                    {status?.guildList && status.guildList.length > 0 ? (
                      status.guildList.map((guild) => (
                        <div 
                          key={guild.id} 
                          className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700 flex flex-col items-center text-center gap-4 hover:border-brand/50 transition-all group relative overflow-hidden"
                        >
                          {/* Background Glow */}
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          
                          <div className="w-24 h-24 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shadow-2xl group-hover:scale-105 transition-transform duration-500 relative">
                            {guild.icon ? (
                              <img src={guild.icon} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="text-4xl font-black text-zinc-800 bg-gradient-to-br from-zinc-700 to-zinc-900 w-full h-full flex items-center justify-center">
                                {guild.name.charAt(0)}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-brand/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-lg font-bold text-white group-hover:text-brand transition-colors truncate max-w-[200px]">{guild.name}</h4>
                            <p className="text-[10px] text-zinc-600 font-mono font-bold tracking-widest uppercase">ID: {guild.id}</p>
                          </div>

                          <div className="w-full grid grid-cols-2 gap-2 mt-2">
                            <div className="bg-zinc-900/50 p-2 rounded-xl border border-zinc-700/50">
                              <p className="text-[8px] text-zinc-500 font-black uppercase tracking-tighter mb-0.5">Members</p>
                              <p className="text-sm font-bold text-zinc-200">{(guild.memberCount - guild.botCount).toLocaleString()}</p>
                            </div>
                            <div className="bg-zinc-900/50 p-2 rounded-xl border border-zinc-700/50">
                              <p className="text-[8px] text-zinc-500 font-black uppercase tracking-tighter mb-0.5">Bots</p>
                              <p className="text-sm font-bold text-brand">{guild.botCount.toLocaleString()}</p>
                            </div>
                          </div>


                          <button 
                            onClick={() => { setSelectedGuildId(guild.id); setActiveTab("moderation"); }}
                            className="mt-2 w-full py-2 bg-zinc-700/50 hover:bg-brand hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-all flex items-center justify-center gap-2"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                            Access Nerve Center
                          </button>
                          
                          <button 
                            onClick={() => { setSelectedGuildId(guild.id); setActiveTab("server_info"); }}
                            className="mt-1 w-full py-2 bg-zinc-700/30 hover:bg-zinc-700 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest text-[#00A8FC] border border-[#00A8FC]/20 transition-all flex items-center justify-center gap-2"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#00A8FC]" />
                            View Server Info Card
                          </button>
                          
                          <div className="flex flex-col gap-1 w-full mb-2">
                             <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-700 rounded-full w-full justify-center">
                               <span className="text-[9px] text-zinc-500 font-black uppercase tracking-tighter">Auto Member Role:</span>
                               <span className="text-[10px] text-brand font-black uppercase tracking-tight">
                                 {availableRoles.find(r => r.id === serverSettings?.autoRoleId)?.name || "Not Set"}
                               </span>
                             </div>
                             <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-700 rounded-full w-full justify-center">
                               <span className="text-[9px] text-zinc-500 font-black uppercase tracking-tighter">Auto Bot Role:</span>
                               <span className="text-[10px] text-emerald-500 font-black uppercase tracking-tight">
                                 {availableRoles.find(r => r.id === serverSettings?.botRoleId)?.name || "Not Set"}
                               </span>
                             </div>
                           </div>

                          <button 
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/guild/${guild.id}/apply-auto-roles`, { method: "POST" });
                                const data = await res.json();
                                if (res.ok) {
                                  alert(`Successfully assigned roles to ${data.count} members.`);
                                } else {
                                  alert(`Failed: ${data.error}`);
                                }
                              } catch (err) {
                                console.error(err);
                                alert("Failed to apply auto-roles.");
                              }
                            }}
                            className="w-full py-2 bg-emerald-900/30 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-emerald-800 hover:border-emerald-500"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            Apply Roles Now
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-32 flex flex-col items-center justify-center gap-4 opacity-50">
                        <Database className="w-16 h-16 text-zinc-700" />
                        <p className="text-zinc-600 italic font-medium">No server clusters identified in the current sector...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invite Section */}
                <div className="p-8 bg-gradient-to-r from-brand/20 to-zinc-900/50 border border-brand/20 rounded-3xl relative overflow-hidden group shadow-2xl">
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                    <Zap className="w-48 h-48 fill-brand" />
                  </div>
                  <div className="relative z-10 max-w-2xl">
                    <h3 className="text-2xl font-black text-white italic tracking-tight mb-2">EXPAND THE NETWORK</h3>
                    <p className="text-zinc-400 text-sm mb-6 leading-relaxed">Connect Cracked Tier Bot to a new server cluster to initialize real-time algorithmic enforcement and security systems.</p>
                    <a 
                      href={`https://discord.com/api/oauth2/authorize?client_id=${status?.clientId || ''}&permissions=8&scope=bot%20applications.commands`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-8 py-4 bg-brand hover:bg-brand/90 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-brand/20 transition-all hover:scale-105 active:scale-95 group"
                    >
                      <Zap className="w-4 h-4 fill-current group-hover:rotate-12 transition-transform" />
                      Initialize Integration
                    </a>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "server_config" && (
              <motion.div 
                key="server_config"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-zinc-800 rounded-3xl border border-zinc-700 overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-zinc-700 bg-zinc-850 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold tracking-widest flex items-center gap-2 uppercase text-white">
                        <Settings className="w-5 h-5 text-zinc-500" />
                        SERVER CONFIGURATION
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Configure automated member and bot roles</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Guild Selector */}
                      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 focus-within:border-brand/40 transition-all">
                        <Database className="w-3.5 h-3.5 text-zinc-500" />
                        <select 
                          value={selectedGuildId || ""} 
                          onChange={(e) => setSelectedGuildId(e.target.value)}
                          className="bg-transparent text-[10px] font-black uppercase tracking-widest text-zinc-300 border-none outline-none cursor-pointer min-w-[120px]"
                        >
                          {status?.guildList?.map(g => <option key={g.id} value={g.id}>{g.name}</option>) || []}
                        </select>
                      </div>

                      <button 
                         onClick={() => saveServerSettings(serverSettings)}
                         disabled={savingServerSettings}
                         className="px-6 py-2 bg-brand rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-brand-hover shadow-lg shadow-brand/20 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                         {savingServerSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                         Save Changes
                      </button>
                    </div>
                  </div>

                  <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Auto Role */}
                      <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                              <Users className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-widest text-white">Auto Member Role</h4>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter mt-0.5">Assigned to new users on join</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setServerSettings({ ...serverSettings, autoRoleEnabled: !serverSettings?.autoRoleEnabled })}
                            className={`w-12 h-6 rounded-full transition-all relative ${serverSettings?.autoRoleEnabled ? 'bg-brand' : 'bg-zinc-800 border border-zinc-700'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${serverSettings?.autoRoleEnabled ? 'left-7' : 'left-1'}`} />
                          </button>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-zinc-800">
                           <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 px-1">Select Member Role</label>
                             <select 
                               value={serverSettings?.autoRoleId || ""}
                               onChange={(e) => setServerSettings({ ...serverSettings, autoRoleId: e.target.value })}
                               className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-brand transition-all appearance-none text-zinc-300"
                             >
                               <option value="">No Auto Role assigned</option>
                               {availableRoles.filter(r => !r.isEveryone).map(role => (
                                 <option key={role.id} value={role.id}>{role.name}</option>
                               ))}
                             </select>
                           </div>
                           <div className="flex items-start gap-3 p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                                This role will be automatically granted to any <span className="text-emerald-500 font-bold">non-bot</span> account that joins the server. Ensure the bot's role is ranked higher than the selected role.
                              </p>
                           </div>
                        </div>
                      </div>

                      {/* Bot Role */}
                      <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                              <Database className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-widest text-white">Auto Bot Role</h4>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter mt-0.5">Assigned to new bots on join</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setServerSettings({ ...serverSettings, botRoleEnabled: !serverSettings?.botRoleEnabled })}
                            className={`w-12 h-6 rounded-full transition-all relative ${serverSettings?.botRoleEnabled ? 'bg-emerald-500' : 'bg-zinc-800 border border-zinc-700'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${serverSettings?.botRoleEnabled ? 'left-7' : 'left-1'}`} />
                          </button>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-zinc-800">
                           <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 px-1">Select Bot Role</label>
                             <select 
                               value={serverSettings?.botRoleId || ""}
                               onChange={(e) => setServerSettings({ ...serverSettings, botRoleId: e.target.value })}
                               className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-brand transition-all appearance-none text-zinc-300"
                             >
                               <option value="">No Auto Role assigned</option>
                               {availableRoles.filter(r => !r.isEveryone).map(role => (
                                 <option key={role.id} value={role.id}>{role.name}</option>
                               ))}
                             </select>
                           </div>
                           <div className="flex items-start gap-3 p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                              <Zap className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                              <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                                This role will be automatically granted to any <span className="text-brand font-bold">bot</span> account that is invited to the server. Useful for organizing high-privilege service accounts.
                              </p>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 flex items-center gap-8">
                  <div className="w-20 h-20 rounded-2xl bg-brand/5 border border-brand/10 flex items-center justify-center text-brand shrink-0">
                    <Shield className="w-10 h-10 opacity-20" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-widest">Automation Integrity</h4>
                    <p className="text-sm text-zinc-500 leading-relaxed max-w-2xl">
                      Automated role assignment executes instantly upon a successful gateway connection for new members. If a role assignment fails, ensure the cracked tier bot has 'Manage Roles' permissions and is positioned correctly in the hierarchy.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "roles" && (
              <motion.div 
                key="roles"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-zinc-800 rounded-3xl border border-zinc-700 overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-zinc-700 bg-zinc-850 flex items-center justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div>
                        <h3 className="text-sm font-bold tracking-widest flex items-center gap-2 uppercase text-white">
                          <Layers className="w-5 h-5 text-brand" />
                          Role Matrix & Hierarchy
                        </h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Full spectrum visibility and ranking control</p>
                      </div>
                      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 focus-within:border-brand/40 transition-all">
                        <Database className="w-3.5 h-3.5 text-zinc-500" />
                        <select 
                          value={selectedGuildId || ""} 
                          onChange={(e) => setSelectedGuildId(e.target.value)}
                          className="bg-transparent text-[10px] font-black uppercase tracking-widest text-zinc-300 border-none outline-none cursor-pointer min-w-[120px]"
                        >
                          {status?.guildList?.map(g => (
                            <option key={g.id} value={g.id} className="bg-zinc-900 text-white">{g.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {botPerms.isAdmin && (
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                          <Shield className="w-3 h-3 text-emerald-500" />
                          <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Global Admin Override</span>
                        </div>
                      )}
                      <button 
                        onClick={async () => {
                          const name = prompt("Enter Role Name:", "New Neural Tier");
                          if (!name) return;
                          await fetch(`/api/guild/${selectedGuildId}/role`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name })
                          });
                          fetchRoles();
                        }}
                        className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:border-brand/40 hover:text-brand transition-all flex items-center gap-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Role
                      </button>

                      {availableRoles.some((r, i) => r.id !== lastFetchedOrder[i]) && (
                        <button 
                          onClick={async () => {
                            const positions = availableRoles.map((r, i) => ({
                              id: r.id,
                              position: availableRoles.length - i // Inverse position for Discord logic
                            }));
                            
                            try {
                              const res = await fetch(`/api/guild/${selectedGuildId}/roles/positions`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ positions })
                              });
                              if (res.ok) {
                                fetchRoles();
                              } else {
                                alert("Failed to save role order.");
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="px-4 py-2 bg-brand rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-brand-hover shadow-lg shadow-brand/20 animate-pulse transition-all flex items-center gap-2"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Save Order
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-6 bg-zinc-900/50 space-y-4">
                    {botPerms.isAdmin && availableRoles.some(r => !r.isBelowBot && !r.isEveryone) && (
                      <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Hierarchy Restriction Bypass Required</h4>
                          <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                            Even with <span className="text-white font-bold">Administrator</span> access, Discord prevents bots from managing roles that are <span className="text-white font-bold">ranked higher</span> than them.
                          </p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase mt-2 italic">Instruction: Go to Discord Server Settings &gt; Roles and drag the bot's role to the top for full access.</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {loadingRoles ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-4 animate-pulse">
                          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Scanning Roles...</p>
                        </div>
                      ) : availableRoles.length > 0 ? (
                        <Reorder.Group axis="y" values={availableRoles} onReorder={setAvailableRoles}>
                          {availableRoles.map((role, index) => (
                            <Reorder.Item 
                              key={role.id}
                              value={role}
                              dragListener={role.editable && !role.isEveryone}
                              className={`rounded-2xl border transition-all overflow-hidden mb-3 relative ${role.isBotRole ? 'bg-brand/10 border-brand/50 shadow-[0_0_20px_rgba(var(--brand),0.05)]' : role.canManagePermissions ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-900/30 border-zinc-800 border-dashed opacity-70'} ${role.isEveryone ? 'border-brand/40 bg-brand/5' : ''}`}
                            >
                              <div className="p-4 flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-2">
                                      {role.editable && !role.isEveryone && (
                                        <div className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-brand transition-colors">
                                          <GripVertical className="w-4 h-4" />
                                        </div>
                                      )}
                                      <span className="text-[9px] font-black text-zinc-600">RANK {role.position}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        disabled={!role.editable || index === 0 || role.isEveryone}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          const res = await fetch(`/api/guild/${selectedGuildId}/role/${role.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ position: role.position + 1 })
                                          });
                                          if (res.ok) fetchRoles();
                                        }}
                                        className="hover:text-brand disabled:opacity-0"
                                      >
                                        <ChevronUp className="w-4 h-4" />
                                      </button>
                                      <button
                                        disabled={!role.editable || index === availableRoles.length - 1 || role.isEveryone}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          const res = await fetch(`/api/guild/${selectedGuildId}/role/${role.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ position: role.position - 1 })
                                          });
                                          if (res.ok) fetchRoles();
                                        }}
                                        className="hover:text-brand disabled:opacity-0"
                                      >
                                        <ChevronDown className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>

                                  <div 
                                    className="w-1.5 h-8 rounded-full" 
                                    style={{ backgroundColor: role.color }}
                                  />
                                  
                                  <div onClick={() => setExpandedRoleId(expandedRoleId === role.id ? null : role.id)} className="cursor-pointer">
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="text"
                                        defaultValue={role.name}
                                        disabled={!role.editable || role.isEveryone}
                                        onClick={(e) => e.stopPropagation()}
                                        onBlur={async (e) => {
                                          if (e.target.value === role.name) return;
                                          await fetch(`/api/guild/${selectedGuildId}/role/${role.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ name: e.target.value })
                                          });
                                          fetchRoles();
                                        }}
                                        className={`bg-transparent text-sm font-bold border-none outline-none focus:ring-1 focus:ring-brand/50 rounded px-1 transition-all ${role.isBotRole ? 'text-brand' : 'text-white'}`}
                                      />
                                      {role.isBotRole && <span className="text-[8px] bg-brand text-white px-1.5 py-0.5 rounded font-black uppercase tracking-tighter shadow-lg shadow-brand/20">Active Integration</span>}
                                      {role.isEveryone && <span className="text-[8px] bg-brand/20 text-brand px-1.5 py-0.5 rounded border border-brand/40 font-black uppercase tracking-tighter">Base Entry Detail</span>}
                                      {role.hoist && <span className="text-[8px] bg-brand/10 text-brand px-1.5 py-0.5 rounded border border-brand/20 font-black uppercase tracking-tighter">Hoisted</span>}
                                      {role.mentionable && <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 font-black uppercase tracking-tighter">Mentionable</span>}
                                      <span className="text-[8px] bg-zinc-700/50 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700 font-bold">{role.memberCount} Members</span>
                                      {!role.isBelowBot && !role.isEveryone && role.botHasPermission && !role.isBotRole && <span className="text-[8px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded border border-orange-500/20 font-black uppercase tracking-tighter">Hierarchy Lock</span>}
                                    </div>
                                    <p className="text-[10px] text-zinc-600 font-mono">ID: {role.id}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4">
                                  {role.editable ? (
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="color" 
                                        defaultValue={role.color}
                                        disabled={role.isEveryone}
                                        onChange={async (e) => {
                                          await fetch(`/api/guild/${selectedGuildId}/role/${role.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ color: e.target.value })
                                          });
                                          fetchRoles();
                                        }}
                                        className="w-8 h-8 rounded-lg bg-transparent border-2 border-zinc-700 cursor-pointer overflow-hidden p-0"
                                      />
                                        <button 
                                          onClick={() => setExpandedRoleId(expandedRoleId === role.id ? null : role.id)}
                                          className={`p-2 rounded-lg border transition-all ${expandedRoleId === role.id ? 'bg-brand/20 border-brand/40 text-brand' : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-brand/40'}`}
                                        >
                                          <Zap className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={async () => {
                                            if (!confirm(`Are you sure you want to delete role ${role.name}?`)) return;
                                            await fetch(`/api/guild/${selectedGuildId}/role/${role.id}`, { method: 'DELETE' });
                                            fetchRoles();
                                          }}
                                          className="p-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all shadow-lg shadow-red-500/5"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      {role.isEveryone ? (
                                         <button 
                                         onClick={() => setExpandedRoleId(expandedRoleId === role.id ? null : role.id)}
                                         className={`p-2 rounded-lg border transition-all ${expandedRoleId === role.id ? 'bg-brand/20 border-brand/40 text-brand' : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-brand/40'}`}
                                       >
                                         <Zap className="w-4 h-4" />
                                       </button>
                                      ) : (
                                        <>
                                          {!role.isBelowBot && <div className="text-[8px] font-black text-orange-500 uppercase tracking-tighter px-2">Blocked by Rank</div>}
                                          <Lock className="w-4 h-4 text-zinc-700" />
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <AnimatePresence>
                                {expandedRoleId === role.id && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-zinc-850 border-t border-zinc-700"
                                  >
                                    {/* Advanced Toggles */}
                                    <div className="p-4 border-b border-zinc-800 bg-zinc-900/20 flex flex-wrap gap-4">
                                      <button 
                                        disabled={!role.canManagePermissions || role.isEveryone}
                                        onClick={async () => {
                                          await fetch(`/api/guild/${selectedGuildId}/role/${role.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ hoist: !role.hoist })
                                          });
                                          fetchRoles();
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${(role.hoist || (role.isEveryone && !role.canManagePermissions)) ? 'bg-brand/10 border-brand/40 text-brand shadow-[0_0_10px_rgba(var(--brand),0.1)]' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}
                                      >
                                        {role.hoist ? 'Role Hoisting: ENABLED' : 'Role Hoisting: DISABLED'}
                                      </button>
                                      <button 
                                        disabled={!role.canManagePermissions || role.isEveryone}
                                        onClick={async () => {
                                          await fetch(`/api/guild/${selectedGuildId}/role/${role.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ mentionable: !role.mentionable })
                                          });
                                          fetchRoles();
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${role.mentionable ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}
                                      >
                                        {role.mentionable ? 'Role Mentionable: YES' : 'Role Mentionable: NO'}
                                      </button>
                                    </div>

                                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {PERMISSIONS.map(perm => {
                                        const active = hasPermission(role.permissions, perm.bit);
                                        return (
                                          <button 
                                            key={perm.name}
                                            disabled={!role.canManagePermissions}
                                            onClick={() => togglePermission(role, perm.bit)}
                                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${active ? 'bg-brand/10 border-brand/40 text-brand shadow-[0_0_15px_rgba(var(--brand),0.05)]' : 'bg-zinc-900 border-zinc-700 text-zinc-500 opacity-60 hover:opacity-100'}`}
                                          >
                                            {perm.name}
                                            <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-brand animate-pulse' : 'bg-zinc-800'}`} />
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </Reorder.Item>
                          ))}
                        </Reorder.Group>
                      ) : (
                        <div className="py-24 flex flex-col items-center justify-center opacity-30 grayscale">
                          <Layers className="w-12 h-12 mb-4" />
                          <p className="text-xs font-bold uppercase tracking-[0.2em]">No server roles found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Hierarchy Constraints</h5>
                    <p className="text-xs text-zinc-500 leading-relaxed font-medium">The bot cannot modify roles that are positioned above its highest designated rank or marked as Managed. Ensure the bot is granted 'Manage Roles' permissions in Discord.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "moderation" && (
              <motion.div 
                key="moderation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-zinc-800 rounded-2xl border border-zinc-700 overflow-hidden shadow-xl shadow-black/20">
                  <div className="p-4 border-b border-zinc-700 bg-zinc-850 flex items-center justify-between">
                    <h3 className="text-xs font-bold tracking-widest flex items-center gap-2 uppercase">
                      {selectedGuildId ? (
                        <button onClick={() => setSelectedGuildId(null)} className="flex items-center gap-2 hover:text-white transition-colors">
                          <ArrowLeft className="w-4 h-4" />
                          Return to Server Clusters
                        </button>
                      ) : (
                        <>
                          <Activity className="w-4 h-4 text-brand" />
                          SERVER SELECTION INTERFACE
                        </>
                      )}
                    </h3>
                    {selectedGuildId && (
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input 
                          type="text" 
                          placeholder="Search Members..."
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          className="bg-zinc-900 border border-zinc-700 rounded-md pl-8 pr-3 py-1.5 text-xs outline-none focus:border-brand transition-colors w-40 md:w-60"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="min-h-[400px]">
                    {selectedGuildId ? (
                      <div className="divide-y divide-zinc-700 max-h-[600px] overflow-y-auto custom-scrollbar">
                        {loadingMembers ? (
                          <div className="p-20 text-center flex flex-col items-center gap-3">
                            <RefreshCw className="w-6 h-6 text-brand animate-spin" />
                            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">Syncing Neural Net...</span>
                          </div>
                        ) : (
                          members.filter(m => 
                            m.username.toLowerCase().includes(memberSearch.toLowerCase()) || 
                            m.displayName.toLowerCase().includes(memberSearch.toLowerCase())
                          ).map((member) => (
                            <div key={member.id} className="p-4 flex items-center gap-4 hover:bg-zinc-750/50 transition-all group relative">
                              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 overflow-hidden flex-shrink-0 relative">
                                <img src={member.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-zinc-100">{member.displayName}</h4>
                                  <span className="text-[10px] text-zinc-500 font-mono">@{member.username}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {member.roles.slice(0, 3).map((role: any) => (
                                    <span key={role.id} className="text-[8px] px-1.5 py-0.5 rounded border font-black uppercase tracking-tighter" style={{ borderColor: `${role.color}40`, color: role.color, backgroundColor: `${role.color}10` }}>
                                      {role.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <button 
                                onClick={() => setModifyingMember(member)}
                                className="px-4 py-2 bg-zinc-700/50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-300 hover:bg-brand hover:text-white transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
                              >
                                <Gavel className="w-3 h-3" />
                                Action
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-700">
                        {status?.guildList && status.guildList.length > 0 ? (
                          status.guildList.map((guild) => (
                            <button 
                              key={guild.id} 
                              onClick={() => setSelectedGuildId(guild.id)}
                              className="bg-zinc-800 p-6 flex flex-col items-center text-center gap-4 hover:bg-zinc-750 transition-all group border-none"
                            >
                              <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center overflow-hidden shadow-lg group-hover:border-brand/50 group-hover:scale-105 transition-all">
                                {guild.icon ? <img src={guild.icon} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="text-3xl font-black text-zinc-700">{guild.name.charAt(0)}</div>}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-white group-hover:text-brand transition-colors">{guild.name}</h4>
                                <div className="flex flex-col items-center gap-1 mt-1">
                                  <div className="flex items-center gap-2 justify-center">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{guild.memberCount.toLocaleString()} Members</p>
                                    <span className="text-zinc-600">•</span>
                                    <span className="text-[10px] text-brand/80 font-bold uppercase tracking-widest">{guild.commandCount.toLocaleString()} Commands</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-900 border border-zinc-700/50 rounded-full group-hover:border-brand/30 transition-colors">
                                    <span className="text-[8px] text-zinc-500 font-black uppercase tracking-tighter">Top:</span>
                                    <span className="text-[9px] text-brand font-bold uppercase tracking-tight">{guild.topCommand}</span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="col-span-full p-20 text-center text-zinc-600 italic">No connection detected...</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "automod" && (
              <motion.div 
                key="automod"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                <div className="bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="p-8 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <ShieldAlert className="w-6 h-6 text-brand" />
                        Cracked Tier Advanced Auto-Mod
                      </h2>
                      <p className="text-zinc-500 text-sm mt-1">Configure real-time algorithmic enforcement policies.</p>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Guild Selector */}
                      <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 focus-within:border-brand/40 transition-all">
                        <Database className="w-4 h-4 text-zinc-500" />
                        <select 
                          value={selectedGuildId || ""} 
                          onChange={(e) => setSelectedGuildId(e.target.value)}
                          className="bg-transparent text-sm font-bold tracking-widest text-zinc-300 border-none outline-none cursor-pointer min-w-[150px]"
                        >
                          {status?.guildList?.map(g => <option key={g.id} value={g.id}>{g.name}</option>) || []}
                        </select>
                      </div>

                      <button 
                        onClick={() => saveAutoMod(autoModSettings)}
                        disabled={savingAutoMod || (!isDirty && autoModSettings)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg ${isDirty ? 'bg-emerald-600 text-white shadow-emerald-500/20 animate-pulse' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}
                      >
                        {savingAutoMod ? <RefreshCw className="w-4 h-4 animate-spin" /> : (isDirty ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />)}
                        {savingAutoMod ? "Syncing..." : (isDirty ? "Save Changes" : "Config Synced")}
                      </button>
                    </div>
                  </div>

                  {autoModSettings ? (
                    <div className="p-8 space-y-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <AutoModGroup 
                            icon={<Lock className="w-4 h-4" />}
                            title="Anti-Spam System"
                            desc="Detects and mitigates rapid message clusters."
                            active={autoModSettings.antiSpam}
                            onToggle={(v) => updateAutoMod({...autoModSettings, antiSpam: v})}
                            actions={autoModSettings.antiSpamActions}
                            onActionsChange={(v) => updateAutoMod({...autoModSettings, antiSpamActions: v})}
                            bypassRoles={autoModSettings.antiSpamBypassRoles}
                            onBypassRolesChange={(v) => updateAutoMod({...autoModSettings, antiSpamBypassRoles: v})}
                            bypassPermissions={autoModSettings.antiSpamBypassPermissions}
                            onBypassPermissionsChange={(v) => updateAutoMod({...autoModSettings, antiSpamBypassPermissions: v})}
                            availableRoles={availableRoles}
                            botPerms={botPerms}
                          />
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Spam Threshold</label>
                            <input 
                              type="number" 
                              value={autoModSettings.spamLimit || 5}
                              onChange={(e) => updateAutoMod({...autoModSettings, spamLimit: parseInt(e.target.value) || 1})}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-brand outline-none transition-all"
                            />
                            <p className="text-[10px] text-zinc-600 px-1 italic">Maximum messages allowed within a 5-second window.</p>
                          </div>
                          <AutoModGroup 
                            icon={<ExternalLink className="w-4 h-4" />}
                            title="Invite link Intercept"
                            desc="Automatically clears unauthorized discord invites."
                            active={autoModSettings.inviteFilter}
                            onToggle={(v) => updateAutoMod({...autoModSettings, inviteFilter: v})}
                            actions={autoModSettings.inviteFilterActions}
                            onActionsChange={(v) => updateAutoMod({...autoModSettings, inviteFilterActions: v})}
                            bypassRoles={autoModSettings.inviteFilterBypassRoles}
                            onBypassRolesChange={(v) => updateAutoMod({...autoModSettings, inviteFilterBypassRoles: v})}
                            bypassPermissions={autoModSettings.inviteFilterBypassPermissions}
                            onBypassPermissionsChange={(v) => updateAutoMod({...autoModSettings, inviteFilterBypassPermissions: v})}
                            availableRoles={availableRoles}
                            botPerms={botPerms}
                            forwardLink={autoModSettings.inviteForwardLink}
                            onForwardLinkChange={(v) => updateAutoMod({...autoModSettings, inviteForwardLink: v})}
                            forwardDelete={autoModSettings.inviteForwardDelete}
                            onForwardDeleteChange={(v) => updateAutoMod({...autoModSettings, inviteForwardDelete: v})}
                            forwardDeleteDelay={autoModSettings.inviteForwardDeleteDelay}
                            onForwardDeleteDelayChange={(v) => updateAutoMod({...autoModSettings, inviteForwardDeleteDelay: v})}
                          />
                        </div>

                        <div className="space-y-6">
                           <AutoModGroup 
                            icon={<ShieldAlert className="w-4 h-4" />}
                            title="Advanced Offense Detection"
                            desc="Filters abusive, toxic, and hateful content using algorithmic heuristics and Gemini AI."
                             active={autoModSettings.badWordFilter}
                             onToggle={(v) => updateAutoMod({...autoModSettings, badWordFilter: v})}
                             actions={autoModSettings.badWordFilterActions}
                             onActionsChange={(v) => updateAutoMod({...autoModSettings, badWordFilterActions: v})}
                             bypassRoles={autoModSettings.badWordFilterBypassRoles}
                             onBypassRolesChange={(v) => updateAutoMod({...autoModSettings, badWordFilterBypassRoles: v})}
                             bypassPermissions={autoModSettings.badWordFilterBypassPermissions}
                             onBypassPermissionsChange={(v) => updateAutoMod({...autoModSettings, badWordFilterBypassPermissions: v})}
                             availableRoles={availableRoles}
                             botPerms={botPerms}
                             extra={
                               (status?.geminiStatus === "permission_denied") ? (
                                 <span className="text-[8px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-md font-black uppercase tracking-widest flex items-center gap-1" title="Permission Error: Lack of scopes or invalid key. Local heuristics fallback is active.">
                                   <Activity className="w-2 h-2" />
                                   API Permission Error (Heuristics Fallback)
                                 </span>
                               ) : (status?.geminiStatus === "missing") ? (
                                 <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md font-black uppercase tracking-widest flex items-center gap-1" title="Gemini API Key is missing. Using local rule heuristics. Add it in Secrets.">
                                   <Activity className="w-2 h-2" />
                                   API Key Missing (Heuristics Fallback)
                                 </span>
                               ) : (status?.geminiStatus === "other_error") ? (
                                 <span className="text-[8px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-md font-black uppercase tracking-widest flex items-center gap-1" title="An error occurred while calling the Gemini API. Backing up with local heuristics.">
                                   <Activity className="w-2 h-2" />
                                   API Error (Heuristics Fallback)
                                 </span>
                               ) : status?.aiActive || (status?.geminiStatus === "success") ? (
                                 <span className="text-[8px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-md font-black uppercase tracking-widest flex items-center gap-1">
                                   <Activity className="w-2 h-2" />
                                   AI Engine Online
                                 </span>
                               ) : (
                                 <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md font-black uppercase tracking-widest flex items-center gap-1">
                                   <Activity className="w-2 h-2" />
                                   Initializing AI...
                                 </span>
                               )
                             }
                           />

                           {autoModSettings.badWordFilter && (
                             <div className="space-y-4 p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl ml-4">
                               <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-3 mb-4">
                                 <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-2">
                                     <div className={`w-2 h-2 rounded-full ${status?.geminiStatus === "success" || status?.aiActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                                     <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">AI Diagnostics Panel</span>
                                   </div>
                                   <button
                                     onClick={handleRetestGemini}
                                     disabled={isTestingGemini}
                                     type="button"
                                     className="text-[9px] font-extrabold uppercase tracking-widest bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-50 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                   >
                                     {isTestingGemini ? (
                                       <>
                                         <Activity className="w-2.5 h-2.5 animate-spin text-brand" />
                                         Testing...
                                       </>
                                     ) : (
                                       "Re-test Status"
                                     )}
                                   </button>
                                 </div>

                                 {status?.geminiStatus === "permission_denied" && (
                                   <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg space-y-1">
                                     <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                                       <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                                       Gemini API Permission Error
                                     </div>
                                     <p className="text-[10px] text-rose-400/95 leading-relaxed">
                                       Your Gemini API Key lacks the required model scopes or is invalid. Please check <strong>Settings &gt; Secrets</strong> in AI Studio.
                                     </p>
                                     <p className="text-[9.5px] text-zinc-500 italic">
                                       Local heuristics fallback is active to maintain safe moderation.
                                     </p>
                                   </div>
                                 )}

                                 {status?.geminiStatus === "missing" && (
                                   <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-1">
                                     <div className="flex items-center gap-1.5 text-amber-500 text-[10px] font-bold uppercase tracking-wider">
                                       <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                                       API Key Missing
                                     </div>
                                     <p className="text-[10px] text-amber-400/90 leading-relaxed">
                                        No Gemini API secret was found. Add <code>GEMINI_API_KEY</code> under <strong>Settings &gt; Secrets</strong> in AI Studio.
                                     </p>
                                     <p className="text-[9px] text-zinc-500 italic">
                                       Local rules are currently serving as a temporary fallback filter.
                                     </p>
                                   </div>
                                 )}

                                 {(status?.geminiStatus === "success" || status?.aiActive) && (
                                   <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-lg">
                                     <div className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1.5">
                                       <Activity className="w-3.5 h-3.5 text-emerald-400" />
                                       All Gemini systems operational. Advanced sentiment and contextual toxicity filters are active.
                                     </div>
                                   </div>
                                 )}

                                 {geminiTestResult && (
                                   <div className={`p-3 rounded-lg border text-[10px] font-medium ${geminiTestResult.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 animate-pulse" : "bg-rose-500/10 border-rose-500/20 text-rose-400"}`}>
                                     {geminiTestResult.message}
                                   </div>
                                 )}
                               </div>
                               <div className="space-y-4 pt-2 border-t border-zinc-900">
                                 <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1 flex justify-between">
                                   <span>Banned Keywords & Phrases</span>
                                   <span className="text-brand">Advanced Detection Active</span>
                                 </label>
                                 <p className="text-[8px] text-zinc-600 px-1 mb-1 italic">Smart matching handles leet-speak and variations (Eng/Hi).</p>
                                 <textarea 
                                   value={autoModSettings.badWordList?.join("\n")}
                                   onChange={(e) => updateAutoMod({...autoModSettings, badWordList: e.target.value.split("\n").filter(s => s !== "")})}
                                   placeholder={"word1\nphrase 2\nslang..."}
                                   className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs font-mono focus:border-brand outline-none transition-all h-24"
                                 />
                               </div>

                               <div className="space-y-4 pt-2 border-t border-zinc-900">
                                 <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Regex Banned Patterns</label>
                                 <p className="text-[8px] text-zinc-600 px-1 mb-1 italic">Advanced raw regex patterns (one per line). Use with caution.</p>
                                 <textarea 
                                   value={autoModSettings.bannedPatterns?.join("\n") || ""}
                                   onChange={(e) => updateAutoMod({...autoModSettings, bannedPatterns: e.target.value.split("\n").filter(s => s !== "")})}
                                   placeholder={"\\d{3}-\\d{3}-\\d{4}\n(badword|anotherword)"}
                                   className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs font-mono focus:border-brand outline-none transition-all h-20 opacity-90"
                                 />
                               </div>

                               <div className="space-y-2 pt-2 border-t border-zinc-900">
                                 <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Whitelisted Exceptions (Safe Context)</label>
                                 <p className="text-[8px] text-zinc-600 px-1 mb-1 italic">Words here will bypass the filter (e.g. medical, technical usage).</p>
                                 <textarea 
                                   value={autoModSettings.badWordIgnoreList?.join("\n")}
                                   onChange={(e) => updateAutoMod({...autoModSettings, badWordIgnoreList: e.target.value.split("\n").filter(s => s !== "")})}
                                   placeholder={"exception1\nsafe phrase..."}
                                   className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs font-mono focus:border-brand outline-none transition-all h-16 opacity-70"
                                 />
                               </div>
                             </div>
                           )}
                           <AutoModGroup 
                            icon={<UserMinus className="w-4 h-4" />}
                            title="Mention Saturation"
                            desc="Caps mass pings in a single transmission."
                            active={autoModSettings.mentionFilter}
                            onToggle={(v) => updateAutoMod({...autoModSettings, mentionFilter: v})}
                            actions={autoModSettings.mentionFilterActions}
                            onActionsChange={(v) => updateAutoMod({...autoModSettings, mentionFilterActions: v})}
                            bypassRoles={autoModSettings.mentionFilterBypassRoles}
                            onBypassRolesChange={(v) => updateAutoMod({...autoModSettings, mentionFilterBypassRoles: v})}
                            bypassPermissions={autoModSettings.mentionFilterBypassPermissions}
                            onBypassPermissionsChange={(v) => updateAutoMod({...autoModSettings, mentionFilterBypassPermissions: v})}
                            availableRoles={availableRoles}
                            botPerms={botPerms}
                          />
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Mention Saturation Threshold</label>
                              <input 
                                type="number" 
                                value={autoModSettings.maxMentions}
                                onChange={(e) => updateAutoMod({...autoModSettings, maxMentions: parseInt(e.target.value) || 0})}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-brand outline-none transition-all"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Global Mute Duration Policy</label>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                  <p className="text-[8px] text-zinc-600 font-bold uppercase px-1">Hours</p>
                                  <input 
                                    type="number" 
                                    min="0"
                                    value={Math.floor((autoModSettings.muteDurationMs || 600000) / 3600000)}
                                    onChange={(e) => {
                                      const h = Math.max(0, parseInt(e.target.value) || 0);
                                      const m = Math.floor(((autoModSettings.muteDurationMs || 600000) % 3600000) / 60000);
                                      const s = Math.floor(((autoModSettings.muteDurationMs || 600000) % 60000) / 1000);
                                      updateAutoMod({...autoModSettings, muteDurationMs: (h * 3600000) + (m * 60000) + (s * 1000)});
                                    }}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-xs focus:border-brand outline-none transition-all"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[8px] text-zinc-600 font-bold uppercase px-1">Mins</p>
                                  <input 
                                    type="number" 
                                    min="0"
                                    max="59"
                                    value={Math.floor(((autoModSettings.muteDurationMs || 600000) % 3600000) / 60000)}
                                    onChange={(e) => {
                                      const h = Math.floor((autoModSettings.muteDurationMs || 600000) / 3600000);
                                      const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                                      const s = Math.floor(((autoModSettings.muteDurationMs || 600000) % 60000) / 1000);
                                      updateAutoMod({...autoModSettings, muteDurationMs: (h * 3600000) + (m * 60000) + (s * 1000)});
                                    }}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-xs focus:border-brand outline-none transition-all"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[8px] text-zinc-600 font-bold uppercase px-1">Secs</p>
                                  <input 
                                    type="number" 
                                    min="0"
                                    max="59"
                                    value={Math.floor(((autoModSettings.muteDurationMs || 600000) % 60000) / 1000)}
                                    onChange={(e) => {
                                      const h = Math.floor((autoModSettings.muteDurationMs || 600000) / 3600000);
                                      const m = Math.floor(((autoModSettings.muteDurationMs || 600000) % 3600000) / 60000);
                                      const s = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                                      updateAutoMod({...autoModSettings, muteDurationMs: (h * 3600000) + (m * 60000) + (s * 1000)});
                                    }}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-xs focus:border-brand outline-none transition-all"
                                  />
                                </div>
                              </div>
                              <p className="text-[10px] text-zinc-600 px-1 italic">Shared duration for all triggered punishments.</p>
                            </div>

                            {/* Custom Infraction Warnings Config */}
                            <div className="space-y-4 pt-4 border-t border-zinc-900">
                              <div className="space-y-1">
                                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                  <AlertTriangle className="w-4 h-4 text-brand animate-pulse" />
                                  Custom Infraction Warnings
                                </h4>
                                <p className="text-[9px] text-zinc-500 leading-relaxed">
                                  Configure the messages sent dynamically when a user triggers AutoMod. Placeholders: <code className="text-brand font-mono">{`{user}`}</code> (user mention), <code className="text-brand font-mono">{`{reason}`}</code> (violation details), <code className="text-brand font-mono">{`{guild}`}</code> (server tag).
                                </p>
                              </div>

                              <div className="space-y-4 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                                {/* DM Warning Module */}
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                                    <div className="space-y-0.5">
                                      <label className="text-xs font-bold text-zinc-300">Send Direct Message (DM) Warning</label>
                                      <p className="text-[9px] text-zinc-500">Sends infraction details straight to the violator's inbox.</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => updateAutoMod({...autoModSettings, warnEnableDM: autoModSettings.warnEnableDM !== false ? false : true})}
                                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        autoModSettings.warnEnableDM !== false ? "bg-brand" : "bg-zinc-800"
                                      }`}
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                          autoModSettings.warnEnableDM !== false ? "translate-x-4" : "translate-x-0"
                                        }`}
                                      />
                                    </button>
                                  </div>

                                  {autoModSettings.warnEnableDM !== false && (
                                    <div className="space-y-1.5 pl-1">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">
                                        Warning DM Message Pattern
                                      </label>
                                      <textarea
                                        value={autoModSettings.warnDMTemplate ?? "⚠️ **You have been warned in {guild}!**\nReason: {reason}"}
                                        onChange={(e) => updateAutoMod({...autoModSettings, warnDMTemplate: e.target.value})}
                                        placeholder="e.g. ⚠️ You have been warned in {guild}! Reason: {reason}"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs focus:border-brand outline-none transition-all text-white placeholder-zinc-600 font-mono h-16 resize-none"
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Channel Warning Module */}
                                <div className="space-y-3 pt-3 border-t border-zinc-900">
                                  <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                                    <div className="space-y-0.5">
                                      <label className="text-xs font-bold text-zinc-300">Send In-Channel Warning Message</label>
                                      <p className="text-[9px] text-zinc-500">Sends a public warning notice in the channel of the infraction.</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => updateAutoMod({...autoModSettings, warnEnableChannel: autoModSettings.warnEnableChannel !== false ? false : true})}
                                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        autoModSettings.warnEnableChannel !== false ? "bg-brand" : "bg-zinc-800"
                                      }`}
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                          autoModSettings.warnEnableChannel !== false ? "translate-x-4" : "translate-x-0"
                                        }`}
                                      />
                                    </button>
                                  </div>

                                  {autoModSettings.warnEnableChannel !== false && (
                                    <div className="space-y-4 pt-1">
                                      <div className="space-y-1.5 pl-1">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">
                                          In-Channel Warning Message Pattern
                                        </label>
                                        <textarea
                                          value={autoModSettings.warnChannelTemplate ?? "⚠️ **{user}, you have been warned for {reason}!** Keep our community clean."}
                                          onChange={(e) => updateAutoMod({...autoModSettings, warnChannelTemplate: e.target.value})}
                                          placeholder="e.g. ⚠️ {user} was warned for {reason}."
                                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs focus:border-brand outline-none transition-all text-white placeholder-zinc-600 font-mono h-16 resize-none"
                                        />
                                      </div>

                                      <div className="space-y-3 pt-2.5 border-t border-zinc-900/50 pl-1">
                                        <div className="flex items-center justify-between">
                                          <div className="space-y-0.5">
                                            <label className="text-[10px] font-bold text-zinc-300">Auto-Delete In-Channel Warning</label>
                                            <p className="text-[9px] text-zinc-500">Enable to automatically delete the warning announcement.</p>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => updateAutoMod({...autoModSettings, warnChannelDelete: !autoModSettings.warnChannelDelete})}
                                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                              autoModSettings.warnChannelDelete ? "bg-brand" : "bg-zinc-800"
                                            }`}
                                          >
                                            <span
                                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                                autoModSettings.warnChannelDelete ? "translate-x-4" : "translate-x-0"
                                              }`}
                                            />
                                          </button>
                                        </div>

                                        {autoModSettings.warnChannelDelete && (
                                          <div className="space-y-1.5 pl-1">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex justify-between">
                                              <span>Notice Delete Delay (Seconds)</span>
                                              <span className="text-brand font-mono">{autoModSettings.warnChannelDeleteDelay ?? 10}s</span>
                                            </label>
                                            <input
                                              type="number"
                                              min="2"
                                              max="300"
                                              value={autoModSettings.warnChannelDeleteDelay ?? 10}
                                              onChange={(e) => updateAutoMod({...autoModSettings, warnChannelDeleteDelay: Math.max(2, parseInt(e.target.value) || 2)})}
                                              className="w-24 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs focus:border-brand outline-none text-white font-mono"
                                            />
                                          </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2.5 border-t border-zinc-900/50">
                                          <div className="space-y-0.5">
                                            <label className="text-[10px] font-bold text-zinc-300">Mention/Ping Warned User</label>
                                            <p className="text-[9px] text-zinc-500">Pings the user directly instead of writing their plain text username.</p>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => updateAutoMod({...autoModSettings, warnMentionUser: autoModSettings.warnMentionUser !== false ? false : true})}
                                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                              autoModSettings.warnMentionUser !== false ? "bg-brand" : "bg-zinc-800"
                                            }`}
                                          >
                                            <span
                                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                                autoModSettings.warnMentionUser !== false ? "translate-x-4" : "translate-x-0"
                                              }`}
                                            />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <MessageSquareOff className="w-4 h-4 text-brand" />
                                Restricted Token Matrix
                            </h4>
                            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-3xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 ml-1">Enforcement Logic</p>
                                <div className="flex flex-wrap gap-2">
                                    {(['delete', 'warn', 'kick', 'mute', 'ban'] as const).map(action => {
                                        const isActionActive = autoModSettings.badWordFilterActions && autoModSettings.badWordFilterActions[action];
                                        const hasPermission = action === 'mute' 
                                          ? (botPerms.isAdmin || botPerms.hasModerateMembers)
                                          : true;

                                        return (
                                          <button
                                              key={action}
                                              disabled={!hasPermission}
                                              onClick={() => {
                                                  const currentActions = autoModSettings.badWordFilterActions || { delete: true, warn: true, mute: false, ban: false, kick: false };
                                                  updateAutoMod({
                                                      ...autoModSettings,
                                                      badWordFilterActions: {
                                                          ...currentActions,
                                                          [action]: !currentActions[action]
                                                      }
                                                  });
                                              }}
                                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${isActionActive ? 'bg-brand/10 border-brand/40 text-brand shadow-lg shadow-brand/5' : 'bg-zinc-900 border-zinc-800 text-zinc-600 opacity-60'} ${!hasPermission ? 'opacity-30 cursor-not-allowed' : ''}`}
                                          >
                                              {action}
                                              {!hasPermission && <Lock className="w-3 h-3" />}
                                          </button>
                                        );
                                    })}
                                </div>

                                {autoModSettings.badWordFilterActions?.mute && (
                                  <div className="mt-4 pt-4 border-t border-zinc-900 space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex justify-between px-1">
                                      <span>Token-Specific Mute Duration</span>
                                      <Clock className="w-3 h-3 text-brand/60" />
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                      {[
                                        { label: "Hrs", unit: 3600000 },
                                        { label: "Mins", unit: 60000 },
                                        { label: "Secs", unit: 1000 }
                                      ].map(({ label, unit }) => (
                                        <div key={label} className="space-y-1">
                                          <p className="text-[8px] text-zinc-600 font-bold uppercase px-1">{label}</p>
                                          <input 
                                            type="number" 
                                            min="0"
                                            value={Math.floor((autoModSettings.badWordFilterActions.muteDurationMs || autoModSettings.muteDurationMs || 600000) / unit) % (unit === 3600000 ? 999 : 60)}
                                            onChange={(e) => {
                                              const currentDur = autoModSettings.badWordFilterActions.muteDurationMs || autoModSettings.muteDurationMs || 600000;
                                              const h = Math.floor(currentDur / 3600000);
                                              const m = Math.floor((currentDur % 3600000) / 60000);
                                              const s = Math.floor((currentDur % 60000) / 1000);
                                              
                                              let newVal = parseInt(e.target.value) || 0;
                                              let newTotal = currentDur;
                                              
                                              if (unit === 3600000) newTotal = (newVal * 3600000) + (m * 60000) + (s * 1000);
                                              else if (unit === 60000) newTotal = (h * 3600000) + (newVal * 60000) + (s * 1000);
                                              else newTotal = (h * 3600000) + (m * 60000) + (newVal * 1000);
                                              
                                              updateAutoMod({
                                                ...autoModSettings,
                                                badWordFilterActions: {
                                                  ...autoModSettings.badWordFilterActions,
                                                  muteDurationMs: Math.max(1000, newTotal)
                                                }
                                              });
                                            }}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] font-mono focus:border-brand outline-none transition-all"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 p-6 bg-zinc-950 border border-zinc-800 rounded-3xl min-h-[120px] shadow-inner shadow-black/40">
                          {autoModSettings.wordFilter.map((word: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-brand/10 border border-brand/20 rounded-full text-xs text-brand font-bold flex items-center gap-2 group">
                               {word}
                              <button onClick={() => updateAutoMod({...autoModSettings, wordFilter: autoModSettings.wordFilter.filter((_: any, idx: number) => idx !== i)})} className="hover:text-white">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          <input 
                            type="text"
                            placeholder="Add token and press Enter..."
                            className="bg-transparent text-xs outline-none flex-1 min-w-[200px]"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = (e.target as HTMLInputElement).value.trim();
                                if (val && !autoModSettings.wordFilter.includes(val)) {
                                  updateAutoMod({...autoModSettings, wordFilter: [...autoModSettings.wordFilter, val]});
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                     <div className="p-20 text-center flex flex-col items-center gap-4">
                      {selectedGuildId ? (
                        <>
                          <RefreshCw className="w-8 h-8 text-brand animate-spin" />
                          <p className="text-brand text-sm font-medium animate-pulse">Initializing Advanced Security Modules...</p>
                        </>
                      ) : (
                        <p className="text-zinc-500 text-sm">Please select a server to configure Auto-Mod.</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "rules_setup" && (
              <motion.div 
                key="rules_setup"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* SELECT SERVER DROP-DOWN AND CARD (ALWAYS SHOWN CHOSEN SERVER DETAILED INFORMATION) */}
                {(() => {
                  const activeGuild = status?.guildList?.find((g: any) => g.id === selectedGuildId);
                  const manageableGuilds = getManageableGuilds();
                  return (
                    <div className="bg-gradient-to-r from-zinc-900 via-[#1c1d21] to-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden backdrop-blur-md">
                      <div className="absolute -top-12 -left-12 w-32 h-32 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-brand" />
                          <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                              Select Server for Guidelines
                            </h2>
                            <p className="text-[10px] text-zinc-500 font-medium">Configure and deploy direct channel community rules messages.</p>
                          </div>
                        </div>

                        {/* DASHBOARD ACCESS CONTROL (MOCK SESSION CONTROLLER) */}
                        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-850 self-start sm:self-auto">
                          <span className="text-[9px] font-bold text-zinc-500 px-2 uppercase tracking-widest hidden sm:inline">Permission Simulation:</span>
                          <button
                            type="button"
                            onClick={() => setSimulatedUserRole('admin')}
                            className={`px-2.5 py-1 text-[9px] font-extrabold rounded-lg transition-all flex items-center gap-1 ${
                              simulatedUserRole === 'admin' 
                                ? 'bg-brand/15 text-brand border border-brand/20 shadow-sm' 
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            👑 Admin Role
                          </button>
                          <button
                            type="button"
                            onClick={() => setSimulatedUserRole('moderator')}
                            className={`px-2.5 py-1 text-[9px] font-extrabold rounded-lg transition-all flex items-center gap-1 ${
                              simulatedUserRole === 'moderator' 
                                ? 'bg-rose-500/15 text-rose-500 border border-rose-500/20 shadow-sm' 
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            🛡️ Mod Role (No Admin)
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Dropdown element */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-[#00A8FC] block font-sans">Choose Target Server</label>
                          <div className="relative">
                            <select
                              value={selectedGuildId || ""}
                              onChange={(e) => setSelectedGuildId(e.target.value || null)}
                              className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl px-4 py-3.5 text-xs text-white focus:border-brand-hover focus:border border outline-none transition-all cursor-pointer font-sans appearance-none pl-11 shadow-inner relative"
                            >
                              <option value="">-- Click to select a server --</option>
                              {manageableGuilds.map((g: any) => (
                                <option key={g.id} value={g.id} className="bg-zinc-950">
                                  {g.name}
                                </option>
                              ))}
                            </select>
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                              {activeGuild?.icon ? (
                                <img src={activeGuild.icon} alt="" className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <Shield className="w-5 h-5 text-brand/80" />
                              )}
                            </div>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </div>
                          {simulatedUserRole === 'moderator' && (
                            <p className="text-[9px] text-rose-500 font-bold flex items-center gap-1 bg-rose-500/5 p-2 rounded-xl border border-rose-500/10 font-sans">
                              <Info className="w-3 h-3 text-rose-400" />
                              Showing 1 of {status?.guildList?.length || 0} servers. Servers where you don't have Administrator permissions are hidden.
                            </p>
                          )}
                        </div>

                        {/* Visual details block */}
                        <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-2xl flex items-center gap-4 min-h-[82px] relative overflow-hidden">
                          {activeGuild ? (
                            <>
                              <div className="relative shrink-0 select-none">
                                {activeGuild.icon ? (
                                  <img src={activeGuild.icon} alt={activeGuild.name} className="w-12 h-12 rounded-2xl object-cover border border-zinc-850 shadow-lg" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-12 h-12 bg-zinc-800 border border-zinc-700 rounded-2xl flex items-center justify-center text-sm font-bold text-white shadow-lg font-mono">
                                    {activeGuild.name.split(" ").map((w: string) => w[0]).join("").slice(0, 3).toUpperCase()}
                                  </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-zinc-900 rounded-full animate-pulse" title="Connected" />
                              </div>
                              <div className="flex-1 space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs font-bold text-white tracking-wide truncate">{activeGuild.name}</h4>
                                  <span className="text-[8px] bg-brand/10 border border-brand/20 text-brand px-1.5 py-0.5 rounded-md font-mono uppercase tracking-tighter shrink-0 font-bold">
                                    AVAILABLE
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono flex-wrap">
                                  <span className="flex items-center gap-1 text-[9.5px]">
                                    <Users className="w-3 h-3 text-zinc-600" />
                                    {activeGuild.memberCount} Members
                                  </span>
                                  <span>•</span>
                                  <span className="truncate text-[9.5px]">ID: {activeGuild.id}</span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-3 text-zinc-500 py-2">
                              <Info className="w-4 h-4 text-zinc-600 self-start mt-0.5" />
                              <p className="text-[11px] leading-normal font-sans text-zinc-400">No server selected. Select a Discord Guild with administrator authority above to authorize content broadcasts.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {!selectedGuildId ? (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-2xl space-y-4">
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-500">
                      <BookOpen className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-white">No Server Selected</h3>
                    <p className="text-sm text-zinc-500">
                      Please select a server from the sidebar or server list to configure and broadcast community rules.
                    </p>
                  </div>
                ) : !rulesSettings ? (
                  <div className="p-20 text-center flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 text-brand animate-spin" />
                    <p className="text-brand text-sm font-medium animate-pulse">Initializing Rules Configuration Panel...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* Left Panel: Formulation Controls */}
                    <div className="xl:col-span-7 space-y-6">
                      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                          <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                              <BookOpen className="w-5 h-5 text-brand" />
                              Rule Message Formulation
                            </h2>
                            <p className="text-xs text-zinc-500">
                              Formulate, structure, and customize your community guidelines embed.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isDirty && (
                              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-1 rounded font-bold uppercase animate-pulse">
                                Draft Unsaved
                              </span>
                            )}
                            <button
                              onClick={() => saveRulesSettings(rulesSettings)}
                              disabled={savingRules}
                              className="px-4 py-1.5 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-brand/20 active:scale-95"
                            >
                              <Save className="w-3.5 h-3.5" />
                              {savingRules ? "Saving..." : "Save Draft"}
                            </button>
                          </div>
                        </div>

                        {/* Top Config Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Rules Broadcast Channel</label>
                            <select
                              value={rulesSettings.rulesChannelId || ""}
                              onChange={(e) => updateRulesSettings({ ...rulesSettings, rulesChannelId: e.target.value })}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-brand outline-none transition-all"
                            >
                              <option value="">-- Select Discord Channel --</option>
                              {channels.map((ch: any) => (
                                <option key={ch.id} value={ch.id}>{ch.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Embed Accent Color</label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={rulesSettings.embedColor || "#344ede"}
                                onChange={(e) => updateRulesSettings({ ...rulesSettings, embedColor: e.target.value })}
                                className="w-10 h-8 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer overflow-hidden"
                              />
                              <input
                                type="text"
                                value={rulesSettings.embedColor || "#344ede"}
                                onChange={(e) => updateRulesSettings({ ...rulesSettings, embedColor: e.target.value })}
                                placeholder="#344ede"
                                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase focus:border-brand outline-none transition-all font-sans"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Embed Content Form */}
                        <div className="space-y-4 pt-2">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Embed Title</label>
                            <input
                              type="text"
                              value={rulesSettings.embedTitle || ""}
                              onChange={(e) => updateRulesSettings({ ...rulesSettings, embedTitle: e.target.value })}
                              placeholder="e.g. 📜 Server Rules"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-brand outline-none transition-all placeholder-zinc-700 font-medium"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Embed Main Description</label>
                            <textarea
                              value={rulesSettings.embedDescription || ""}
                              onChange={(e) => updateRulesSettings({ ...rulesSettings, embedDescription: e.target.value })}
                              placeholder="e.g. Welcome to the server! Please view our guidelines below..."
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-700 focus:border-brand outline-none transition-all h-20 resize-none font-sans"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                            <div className="space-y-1.5 col-span-1 md:col-span-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-[#00A8FC]">Server Thumbnail URL (Custom Illustration)</label>
                              <input
                                type="text"
                                value={rulesSettings.thumbnailUrl || ""}
                                onChange={(e) => updateRulesSettings({ ...rulesSettings, thumbnailUrl: e.target.value })}
                                placeholder="e.g. https://domain.com/illustration.png (Fallback to Discord Server Icon below)"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-brand outline-none transition-all placeholder-zinc-700 font-mono"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Embed Footer Message</label>
                              <input
                                type="text"
                                value={rulesSettings.footerText || ""}
                                onChange={(e) => updateRulesSettings({ ...rulesSettings, footerText: e.target.value })}
                                placeholder="e.g. Failure to comply may result in punishments."
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-brand outline-none transition-all placeholder-zinc-700"
                              />
                            </div>
                            <div className="flex items-center justify-between border border-zinc-800 bg-zinc-950/40 p-3 rounded-2xl">
                              <div className="space-y-0.5">
                                <label className="text-xs font-bold text-zinc-300">Server Logo Thumbnail</label>
                                <p className="text-[9px] text-zinc-500">Show server icon top-right.</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => updateRulesSettings({ ...rulesSettings, showThumbnail: !rulesSettings.showThumbnail })}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  rulesSettings.showThumbnail ? "bg-brand" : "bg-zinc-800"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                    rulesSettings.showThumbnail ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Server Info Section Configuration */}
                        <div className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/20 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                                <Info className="w-3.5 h-3.5 text-brand" />
                                Include Server Info Section
                              </h4>
                              <p className="text-[10px] text-zinc-500">Append a dedicated "Server Highlights" section to the Rules message.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateRulesSettings({ ...rulesSettings, includeServerSection: !rulesSettings.includeServerSection })}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                rulesSettings.includeServerSection ? "bg-brand" : "bg-zinc-800"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                  rulesSettings.includeServerSection ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>

                          {rulesSettings.includeServerSection && (
                            <div className="space-y-4 pt-2 border-t border-zinc-900/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5 col-span-1 md:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Server Section Title</label>
                                <input
                                  type="text"
                                  value={rulesSettings.serverSectionTitle || ""}
                                  onChange={(e) => updateRulesSettings({ ...rulesSettings, serverSectionTitle: e.target.value })}
                                  placeholder="e.g. 🏰 Server Information"
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-brand outline-none transition-all placeholder-zinc-700 font-sans"
                                />
                              </div>

                              <div className="space-y-1.5 col-span-1 md:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Section Text / Summary (Supports {"{server_name}"})</label>
                                <textarea
                                  value={rulesSettings.serverSectionText || ""}
                                  onChange={(e) => updateRulesSettings({ ...rulesSettings, serverSectionText: e.target.value })}
                                  placeholder="Welcome to independent server {server_name}! Please enjoy your stay."
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-700 focus:border-brand outline-none transition-all h-20 resize-none font-sans"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Custom Permanent Link (Optional)</label>
                                <input
                                  type="text"
                                  value={rulesSettings.serverWebsite || ""}
                                  onChange={(e) => updateRulesSettings({ ...rulesSettings, serverWebsite: e.target.value })}
                                  placeholder="e.g. https://discord.gg/yourcustominvite"
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-brand outline-none transition-all placeholder-zinc-700 font-sans"
                                />
                              </div>

                              <div className="flex items-center justify-between border border-zinc-900 bg-zinc-950/45 p-3 rounded-xl col-span-1">
                                <div className="space-y-0.5">
                                  <label className="text-xs font-bold text-zinc-300">Show Realtime Statistics</label>
                                  <p className="text-[9px] text-zinc-500">Show member counts & dates.</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => updateRulesSettings({ ...rulesSettings, showServerMetrics: !rulesSettings.showServerMetrics })}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    rulesSettings.showServerMetrics ? "bg-brand" : "bg-zinc-800"
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                      rulesSettings.showServerMetrics ? "translate-x-4" : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Rules Fields Section */}
                        <div className="space-y-4 pt-4 border-t border-zinc-800">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-white uppercase tracking-wider">Embed Sections (Rule Categories)</label>
                            <button
                              type="button"
                              onClick={() => {
                                const list = [...(rulesSettings.rulesList || []), { title: "New Rule Category 📜", items: ["New rule description item"] }];
                                updateRulesSettings({ ...rulesSettings, rulesList: list });
                              }}
                              className="px-2.5 py-1 bg-zinc-850 border border-zinc-700 text-[10px] text-zinc-300 font-bold rounded-lg hover:bg-zinc-700 hover:text-white transition-all flex items-center gap-1 active:scale-95"
                            >
                              <Plus className="w-3 h-3 text-brand" />
                              Add Category
                            </button>
                          </div>

                          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                            {(!rulesSettings.rulesList || rulesSettings.rulesList.length === 0) ? (
                              <p className="text-xs text-zinc-600 italic text-center py-4 bg-zinc-950/20 border border-dashed border-zinc-800 rounded-xl">No categories configured. Click 'Add Category' above.</p>
                            ) : (
                              rulesSettings.rulesList.map((cat: any, catIdx: number) => (
                                <div key={catIdx} className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 space-y-3 relative group/cat">
                                  <div className="flex items-center justify-between gap-2 border-b border-zinc-900 pb-2">
                                    <input
                                      type="text"
                                      value={cat.title || ""}
                                      onChange={(e) => {
                                        const list = [...rulesSettings.rulesList];
                                        list[catIdx] = { ...list[catIdx], title: e.target.value };
                                        updateRulesSettings({ ...rulesSettings, rulesList: list });
                                      }}
                                      placeholder="Category Title (e.g. 📜 Discord Rules)"
                                      className="bg-transparent text-xs font-bold text-white focus:border-brand border-b border-transparent pb-0.5 outline-none font-sans w-2/3"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const list = rulesSettings.rulesList.filter((_: any, idx: number) => idx !== catIdx);
                                        updateRulesSettings({ ...rulesSettings, rulesList: list });
                                      }}
                                      className="p-1 px-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-rose-500 rounded-lg text-[10px] font-bold transition-all flex gap-1 items-center"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Remove Category
                                    </button>
                                  </div>

                                  {/* List items inside category */}
                                  <div className="space-y-2">
                                    {cat.items?.map((item: string, itemIdx: number) => (
                                      <div key={itemIdx} className="flex items-center gap-2 group/item">
                                        <div className="text-zinc-600 font-mono text-xs">•</div>
                                        <input
                                          type="text"
                                          value={item || ""}
                                          onChange={(e) => {
                                            const list = [...rulesSettings.rulesList];
                                            const items = [...list[catIdx].items];
                                            items[itemIdx] = e.target.value;
                                            list[catIdx] = { ...list[catIdx], items };
                                            updateRulesSettings({ ...rulesSettings, rulesList: list });
                                          }}
                                          placeholder="Rule detail message..."
                                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 focus:border-brand outline-none transition-all placeholder-zinc-800 font-sans"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const list = [...rulesSettings.rulesList];
                                            const items = list[catIdx].items.filter((_: any, idx: number) => idx !== itemIdx);
                                            list[catIdx] = { ...list[catIdx], items };
                                            updateRulesSettings({ ...rulesSettings, rulesList: list });
                                          }}
                                          className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-rose-500/10 hover:text-rose-500 text-zinc-600 rounded transition-all"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const list = [...rulesSettings.rulesList];
                                        const items = [...(list[catIdx].items || []), "New specific community rule"];
                                        list[catIdx] = { ...list[catIdx], items };
                                        updateRulesSettings({ ...rulesSettings, rulesList: list });
                                      }}
                                      className="mt-1 text-[10px] text-zinc-500 hover:text-brand flex items-center gap-1 font-bold pl-5 transition-all outline-none"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Add Rule Element
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Right Panel: Discord Theme Live Preview */}
                    <div className="xl:col-span-12 xl:order-last border-t border-zinc-800/50 pt-3 xl:pt-0 xl:col-span-5 space-y-6">
                      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
                        <div className="border-b border-zinc-800 pb-3 flex justify-between items-center flex-wrap gap-2">
                          <div>
                            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                              <Eye className="w-4 h-4 text-brand" />
                              Discord Rules Simulation
                            </h3>
                            <p className="text-[10px] text-zinc-500">Real-time local content and channel sync control.</p>
                          </div>
                        </div>

                        {/* Guidelines Dispatch Console */}
                        <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-850 space-y-3 font-sans">
                          <span className="text-[9px] font-black uppercase tracking-widest text-[#00A8FC] block">Discord Guidelines Remote Controller</span>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={sendRulesMessage}
                              disabled={sendingRulesMessage || !rulesSettings.rulesChannelId}
                              className="px-3 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed col-span-2 sm:col-span-1"
                              title="Post a fresh Discord embedded rules broadcast in the selected channel."
                            >
                              <Send className="w-3.5 h-3.5 animate-pulse" />
                              {sendingRulesMessage ? "Sending..." : "Send Rules"}
                            </button>

                            <button
                              type="button"
                              onClick={updateRulesMessage}
                              disabled={updatingRulesMessage || !rulesSettings.rulesChannelId || !rulesSettings.lastMessageId}
                              className="px-3 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed col-span-2 sm:col-span-1"
                              title="Edit and overwrite the previously sent live rules message in place."
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${updatingRulesMessage ? 'animate-spin' : ''}`} />
                              {updatingRulesMessage ? "Updating..." : "Update Post"}
                            </button>

                            <button
                              type="button"
                              onClick={deleteRulesMessage}
                              disabled={deletingRulesMessage || !rulesSettings.rulesChannelId || !rulesSettings.lastMessageId}
                              className="px-3 py-2.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed col-span-2 sm:col-span-1"
                              title="Delete the previously sent rules message directly from the server target channel."
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {deletingRulesMessage ? "Deleting..." : "Delete Post"}
                            </button>

                            <button
                              type="button"
                              onClick={() => saveRulesSettings(rulesSettings)}
                              disabled={savingRules}
                              className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed col-span-2 sm:col-span-1"
                              title="Persist configuration changes without broadcasting update."
                            >
                              <Save className="w-3.5 h-3.5 text-zinc-400" />
                              {savingRules ? "Saving..." : "Save Draft"}
                            </button>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-zinc-900/60 flex-wrap gap-1">
                            <span className="text-[8.5px] font-mono text-zinc-500 uppercase font-black">Target Channel Id:</span>
                            <span className="text-[9.5px] font-mono text-[#00A8FC] font-black">{rulesSettings.rulesChannelId || '[NONE CONFIGURED]'}</span>
                          </div>

                          {rulesSettings.lastMessageId && (
                            <div className="flex items-center justify-between border-t border-zinc-900/40 pt-1.5">
                              <span className="text-[8.5px] font-mono text-zinc-500 uppercase font-black">Remote Message Id:</span>
                              <div className="flex items-center gap-1">
                                <span className="text-[9.5px] font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 font-bold border border-zinc-800 select-all">{rulesSettings.lastMessageId}</span>
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" title="Message is synchronized" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Status Message Alerts */}
                        {rulesSendSuccess && (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl flex items-start gap-2 text-emerald-400 text-xs shadow-inner">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 animate-bounce" />
                            <span>{rulesSendSuccess}</span>
                          </div>
                        )}
                        {rulesSendError && (
                          <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl flex items-start gap-2 text-rose-400 text-xs shadow-inner">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0-bounce" />
                            <span>{rulesSendError}</span>
                          </div>
                        )}

                        {/* Discord Chat Container */}
                        <div className="bg-[#313338] rounded-2xl p-4 text-sm font-sans shadow-inner border border-zinc-950 select-none overflow-hidden">
                          {/* Channel Header Mock */}
                          <div className="flex items-center gap-1 text-[#949BA4] text-xs border-b border-[#2B2D31] pb-2 mb-3">
                            <span className="font-semibold text-white/90">
                              {(() => {
                                const matched = channels.find(c => c.id === rulesSettings.rulesChannelId);
                                if (matched) return matched.name;
                                return "# rules";
                              })()}
                            </span>
                            <span className="text-[#80848E] mx-1">|</span>
                            <span className="truncate text-[10px]">Follow server regulations.</span>
                          </div>

                          {/* Message Mock */}
                          <div className="flex items-start gap-3">
                            {/* Bot Avatar Icon */}
                            <div className="w-10 h-10 rounded-full bg-brand/20 border border-brand/20 overflow-hidden flex items-center justify-center shrink-0">
                              <img src={logo} alt="Bot Avatar" className="w-full h-full object-cover" />
                            </div>

                            {/* Message Header and Embed */}
                            <div className="flex-1 space-y-1.5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-white text-xs hover:underline cursor-pointer">
                                  {status?.botName?.split("#")[0] || "Sentinel AI"}
                                </span>
                                <span className="bg-[#5865F2] text-white text-[9px] px-1 font-bold rounded uppercase tracking-wider shrink-0 scale-90">
                                  Bot
                                </span>
                                <span className="text-[10px] text-[#949BA4]">Today at 12:45 PM</span>
                              </div>

                              {/* Discord Rich Embed Simulator */}
                              <div className="bg-[#2B2D31] rounded-r border-l-4 rounded-l-sm max-w-lg shadow overflow-hidden flex" style={{ borderLeftColor: rulesSettings.embedColor || "#344ede" }}>
                                <div className="p-3.5 flex-1 space-y-3 min-w-0">
                                  {/* Embed Body (Author, Title, Desc) */}
                                  <div className="space-y-1">
                                    {rulesSettings.embedTitle && (
                                      <h4 className="font-bold text-white text-sm tracking-tight leading-tight">
                                        {rulesSettings.embedTitle}
                                      </h4>
                                    )}
                                    {rulesSettings.embedDescription && (
                                      <p className="text-[#DCE0E3] text-xs whitespace-pre-wrap leading-normal font-sans pt-0.5">
                                        {rulesSettings.embedDescription}
                                      </p>
                                    )}
                                  </div>

                                  {/* Server Info Section (Optional) */}
                                  {rulesSettings.includeServerSection && (
                                    <div className="space-y-1.5 pb-2 border-b border-[#2F3136]/50">
                                      <div className="font-bold text-xs text-white tracking-tight">
                                        {rulesSettings.serverSectionTitle || "🏰 Server Info"}
                                      </div>
                                      <div className="text-xs text-[#DCE0E3] whitespace-pre-wrap leading-normal space-y-1 font-sans">
                                        <p>{(rulesSettings.serverSectionText || "Welcome to the server!").replace(/{server_name}/gi, status?.guildList?.find(g => g.id === selectedGuildId)?.name || "This Server")}</p>
                                        {(rulesSettings.showServerMetrics || rulesSettings.serverWebsite) && (
                                          <div className="mt-1.5 space-y-0.5 text-[#B5BAC1] text-[11px] font-mono bg-black/10 p-2 rounded-lg border border-white/[0.02]">
                                            {rulesSettings.showServerMetrics && (
                                              <>
                                                <div>👥 Members: <strong className="text-zinc-300">{status?.guildList?.find(g => g.id === selectedGuildId)?.memberCount || 42}</strong></div>
                                                <div>📅 Created: <strong className="text-zinc-300">6/6/2026</strong></div>
                                              </>
                                            )}
                                            {rulesSettings.serverWebsite && (
                                              <div>🔗 Link: <span className="text-[#00A8FC] hover:underline cursor-pointer">{rulesSettings.serverWebsite}</span></div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Fields/Sections loop */}
                                  {rulesSettings.rulesList && rulesSettings.rulesList.length > 0 && (
                                    <div className="space-y-3 pt-1">
                                      {rulesSettings.rulesList.map((sc: any, idx: number) => {
                                        if (!sc.title && (!sc.items || sc.items.length === 0)) return null;
                                        return (
                                          <div key={idx} className="space-y-1">
                                            <div className="font-bold text-xs text-white tracking-tight">{sc.title}</div>
                                            <div className="text-xs text-[#DCE0E3] space-y-0.5">
                                              {sc.items?.map((it: string, itIdx: number) => (
                                                <div key={itIdx} className="pl-1">
                                                  • {it}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Embed Footer */}
                                  {rulesSettings.footerText && (
                                    <div className="text-[10.5px] text-[#949BA4] border-t border-[#313338]/40 pt-1 leading-tight font-sans">
                                      {rulesSettings.footerText}
                                    </div>
                                  )}
                                </div>

                                {/* Thumbnail Logo column */}
                                {(rulesSettings.thumbnailUrl || rulesSettings.showThumbnail) && (
                                  <div className="p-3 pt-3.5 shrink-0 select-none hidden sm:block">
                                    <div className="w-16 h-16 rounded-md bg-[#1F2023] border border-[#2B2D31] flex items-center justify-center overflow-hidden font-sans">
                                      <img src={rulesSettings.thumbnailUrl || logo} alt="Thumbnail Mock" className="w-full h-full object-cover scale-110 opacity-80" referrerPolicy="no-referrer" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Informative Guidance Card */}
                        <div className="bg-zinc-950/40 border border-zinc-800 p-4 rounded-2xl flex items-start gap-2.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-zinc-300">Live Administration Guidelines</span>
                            <p className="text-[10px] text-zinc-500 leading-normal">
                              The rules embeds are handled server-side directly. When you dispatch the broadcast embed, the Discord system automatically routes it without needing user commands or third-party client intervention. Ensure your bot has permission in the target channels to edit or post properly!
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "database" && (
              <motion.div 
                key="database"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-zinc-800 rounded-3xl border border-zinc-700 overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-zinc-700 bg-zinc-850 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold tracking-widest flex items-center gap-2 uppercase text-white">
                        <Database className="w-5 h-5 text-zinc-500" />
                        GLOBAL USER PERSISTENCE DATABASE
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Cross-Server Violation Indexing</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input 
                          type="text" 
                          placeholder="Search User ID or Tag..."
                          className="bg-zinc-900 border border-zinc-700 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-brand w-64"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="font-mono text-xs overflow-x-auto min-h-[500px]">
                    {loadingDB ? (
                        <div className="p-32 text-center flex flex-col items-center gap-4">
                           <RefreshCw className="w-8 h-8 text-brand animate-spin" />
                           <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">Mapping Global Entities...</p>
                        </div>
                    ) : (
                      <table className="w-full text-left">
                        <thead className="bg-zinc-900 text-zinc-500 uppercase text-[10px] tracking-widest">
                          <tr>
                            <th className="px-8 py-4 font-black">Entity Profile</th>
                            <th className="px-8 py-4 font-black">Security ID</th>
                            <th className="px-8 py-4 font-black text-center">Violation Count</th>
                            <th className="px-8 py-4 font-black">Latest Incident</th>
                            <th className="px-8 py-4 font-black text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800 bg-zinc-800/50">
                          {userDB.length > 0 ? (
                            userDB.map((user) => (
                              <tr key={user.id} className="hover:bg-zinc-700/50 transition-all group">
                                <td className="px-8 py-5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center font-bold text-zinc-500 border border-zinc-700 text-lg">
                                      {user.username.charAt(0)}
                                    </div>
                                    <span className="font-bold text-zinc-200">{user.username}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-5 text-zinc-500">{user.id}</td>
                                <td className="px-8 py-5 text-center">
                                  <span className={`px-3 py-1 rounded-full font-black text-[10px] ${user.warningCount > 3 ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-brand/10 text-brand border border-brand/20'}`}>
                                    {user.warningCount} EVENTS
                                  </span>
                                </td>
                                <td className="px-8 py-5 text-zinc-400">
                                  {user.history.length > 0 ? user.history[user.history.length - 1].reason : "N/A"}
                                </td>
                                <td className="px-8 py-5 text-right">
                                  <button onClick={() => { setActiveTab("moderation"); setSelectedGuildId(user.history[0]?.guildId); }} className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-500 hover:text-white transition-all">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-20 text-center text-zinc-600 italic">Persistence database currently null...</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "audit" && (
              <motion.div 
                key="audit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-zinc-800 rounded-3xl border border-zinc-700 overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-zinc-700 bg-zinc-850 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold tracking-widest flex items-center gap-2 uppercase text-white">
                        <Terminal className="w-5 h-5 text-zinc-500" />
                        SYSTEM AUDIT TRAIL
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Immutable Log of All Security Events</p>
                    </div>
                  </div>

                  <div className="font-mono text-xs overflow-x-auto min-h-[500px]">
                    {loadingLogs ? (
                        <div className="p-32 text-center flex flex-col items-center gap-4">
                           <RefreshCw className="w-8 h-8 text-brand animate-spin" />
                           <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">Deciphering Audit Stream...</p>
                        </div>
                    ) : (
                      <table className="w-full text-left">
                        <thead className="bg-zinc-900 text-zinc-500 uppercase text-[10px] tracking-widest">
                          <tr>
                            <th className="px-8 py-4 font-black">Timestamp</th>
                            <th className="px-8 py-4 font-black">Event</th>
                            <th className="px-8 py-4 font-black">Entity Target</th>
                            <th className="px-8 py-4 font-black">Authorized By</th>
                            <th className="px-8 py-4 font-black">Context</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800 bg-zinc-800/50">
                          {auditLog.length > 0 ? (
                            auditLog.map((log, i) => (
                              <tr key={i} className="hover:bg-zinc-700/50 transition-all border-l-2 border-transparent hover:border-brand">
                                <td className="px-8 py-4 text-zinc-500 whitespace-nowrap">
                                  {new Date(log.timestamp).toLocaleString([], { hour12: false })}
                                </td>
                                <td className="px-8 py-4">
                                  <span className={`px-2 py-0.5 rounded font-black text-[9px] border ${
                                    log.action === 'BAN' ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' :
                                    log.action === 'KICK' ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' :
                                    log.action === 'MUTE' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' :
                                    log.action === 'WARN' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' :
                                    'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
                                  }`}>
                                    {log.action}
                                  </span>
                                </td>
                                <td className="px-8 py-4">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-zinc-200">{log.targetTag}</span>
                                    <span className="text-[10px] text-zinc-600">ID: {log.targetId}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-4">
                                  <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
                                    <span className="text-zinc-300">{log.moderatorTag}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-4 text-zinc-400 max-w-xs truncate">{log.reason}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-20 text-center text-zinc-600 italic">Audit log stream is currently empty...</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "commands" && (
              <motion.div 
                key="commands"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {commandsList.map((cmd, i) => (
                    <div key={i} className="p-6 bg-zinc-950 border border-zinc-800 rounded-3xl hover:border-brand/30 transition-all group shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <code className="text-brand font-black text-sm tracking-tight px-3 py-1 bg-brand/5 rounded-lg border border-brand/20">{cmd.name}</code>
                        <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{cmd.perm}</span>
                      </div>
                      <p className="text-zinc-400 text-xs font-medium leading-relaxed">{cmd.desc}</p>
                    </div>
                  ))}
                  {commandsList.length === 0 && (
                     <div className="md:col-span-2 py-20 flex flex-col items-center opacity-40">
                        <Terminal className="w-12 h-12 mb-4" />
                        <span className="uppercase font-black text-xs tracking-widest">Interface Manifest Offline</span>
                     </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "system" && (
              <motion.div 
                key="system"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-5xl mx-auto space-y-6"
              >
                <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[700px]">
                  <div className="p-6 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                        <Terminal className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold tracking-widest uppercase text-white">Kernel Lifecycle Log</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Real-time internal system telemetry</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg border border-zinc-700">
                          <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-black uppercase text-zinc-300">Live Intake</span>
                       </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-3 font-mono text-[11px] custom-scrollbar bg-black/40">
                    {loadingLogs && systemLogs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-40">
                         <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                         <span className="uppercase tracking-[0.3em] font-black text-xs">Accessing System Partition...</span>
                      </div>
                    ) : systemLogs.length > 0 ? (
                      systemLogs.map((log) => (
                        <div key={log.id} className="group border-l-2 border-transparent hover:border-zinc-700 pl-4 transition-all">
                          <div className="flex items-start gap-4">
                            <span className="text-zinc-600 flex-shrink-0 w-24">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                            <span className={`font-bold w-16 flex-shrink-0 ${
                              log.type === 'SUCCESS' ? 'text-emerald-500' :
                              log.type === 'ERROR' ? 'text-rose-500' :
                              log.type === 'WARN' ? 'text-yellow-500 font-black' :
                              'text-blue-400'
                            }`}>
                              {log.type}
                            </span>
                            <div className="flex-1 min-w-0">
                               <p className="text-zinc-300 leading-relaxed break-words">{log.message}</p>
                               {log.meta && (
                                 <pre className="mt-2 p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-[10px] text-zinc-500 overflow-x-auto">
                                   {JSON.stringify(log.meta, null, 2)}
                                 </pre>
                               )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center text-zinc-700 italic">
                        Initialize sequence completed. Waiting for server payload...
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                     <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Cached Lines: {systemLogs.length} / 200</span>
                     <button 
                        onClick={() => setSystemLogs([])}
                        className="text-[9px] text-zinc-600 hover:text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Clear Buffer
                     </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "staff" && (
              <motion.div 
                key="staff"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-6xl mx-auto space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {loadingLogs ? (
                    <div className="col-span-full p-20 text-center flex flex-col items-center gap-4">
                      <RefreshCw className="w-8 h-8 text-brand animate-spin" />
                      <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">Aggregating Staff Metrics...</p>
                    </div>
                  ) : (
                    staffLog.length > 0 ? staffLog.map((staff) => (
                      <div key={staff.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                          <Users className="w-20 h-20" />
                        </div>
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-black">
                            {staff.tag.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-white font-bold">{staff.tag}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-[9px] px-1.5 py-0.5 bg-brand/10 text-brand rounded-md border border-brand/20 font-black uppercase tracking-widest">{staff.role || 'Personnel'}</span>
                              <span className="text-[10px] text-zinc-500 font-bold uppercase">ID: {staff.id}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                           <div className="bg-zinc-800/50 p-3 rounded-2xl border border-zinc-800">
                             <p className="text-[9px] text-zinc-500 font-black uppercase tracking-tighter mb-1">Total Actions</p>
                             <p className="text-xl font-bold text-white italic">{staff.actions}</p>
                           </div>
                           <div className="bg-zinc-800/50 p-3 rounded-2xl border border-zinc-800">
                             <p className="text-[9px] text-zinc-500 font-black uppercase tracking-tighter mb-1">Efficiency Rate</p>
                             <p className="text-xl font-bold text-emerald-500 italic">99.8%</p>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest px-1">Enforcement Breakdown</p>
                           <div className="flex flex-wrap gap-2">
                              {Object.entries(staff.breakdown).map(([key, val]) => (
                                 val as number > 0 && (
                                   <div key={key} className="px-2 py-1 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center gap-2">
                                      <span className="text-[9px] text-zinc-500 font-bold">{key}</span>
                                      <span className="text-[9px] text-white font-bold">{val as number}</span>
                                   </div>
                                 )
                              ))}
                           </div>
                        </div>
                      </div>
                    )) : (
                      <div className="col-span-full py-20 text-center text-zinc-600 italic">No staff activity recorded...</div>
                    )
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "bans" && (
              <motion.div 
                key="bans"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {!selectedGuildId ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-700 rounded-3xl overflow-hidden border border-zinc-700">
                    {status?.guildList && status.guildList.length > 0 ? (
                      status.guildList.map((guild) => (
                        <button 
                          key={guild.id} 
                          onClick={() => setSelectedGuildId(guild.id)}
                          className="bg-zinc-800 p-8 flex flex-col items-center text-center gap-4 hover:bg-zinc-750 transition-all group"
                        >
                          <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center overflow-hidden shadow-lg group-hover:border-brand/50 group-hover:scale-105 transition-all">
                            {guild.icon ? <img src={guild.icon} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="text-3xl font-black text-zinc-700">{guild.name.charAt(0)}</div>}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-brand transition-colors">{guild.name}</h4>
                            <div className="flex flex-col items-center gap-1 mt-1">
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{guild.id}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] px-2 py-0.5 bg-brand/10 text-brand border border-brand/20 rounded-full font-black uppercase tracking-tighter">
                                  {guild.commandCount.toLocaleString()} Commands
                                </span>
                                <span className="text-[9px] px-2 py-0.5 bg-zinc-900 text-zinc-400 border border-zinc-700 rounded-full font-bold uppercase tracking-tight">
                                  Top: {guild.topCommand}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="col-span-full p-20 text-center text-zinc-600 italic">No clusters connected...</div>
                    )}
                  </div>
                ) : (
                  <div className="bg-zinc-800 rounded-3xl border border-zinc-700 overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-zinc-700 bg-zinc-850 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedGuildId(null)} className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-all">
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                          <h3 className="text-sm font-bold tracking-widest flex items-center gap-2 uppercase text-white">
                            <Gavel className="w-5 h-5 text-rose-500" />
                            Punishment Management
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                         {/* Guild Selector */}
                        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 transition-all">
                          <Database className="w-4 h-4 text-zinc-500" />
                          <select 
                            value={selectedGuildId || ""} 
                            onChange={(e) => setSelectedGuildId(e.target.value)}
                            className="bg-transparent text-xs font-bold tracking-widest text-zinc-300 border-none outline-none cursor-pointer"
                          >
                            {status?.guildList?.map(g => <option key={g.id} value={g.id}>{g.name}</option>) || []}
                          </select>
                        </div>
                         <div className="relative">
                            <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input 
                              type="text" 
                              placeholder="Reason for removal..."
                              value={banReason}
                              onChange={(e) => setBanReason(e.target.value)}
                              className="bg-zinc-900 border border-zinc-700 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-emerald-500 w-64"
                            />
                         </div>
                      </div>
                    </div>

                    <div className="divide-y divide-zinc-700 max-h-[600px] overflow-y-auto custom-scrollbar min-h-[400px]">
                      {loadingBans ? (
                         <div className="p-32 text-center flex flex-col items-center gap-4">
                           <RefreshCw className="w-8 h-8 text-brand animate-spin" />
                           <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">Retrieving Punishment Data...</p>
                         </div>
                      ) : (punishments.bans.length > 0 || punishments.timeouts.length > 0) ? (
                        <>
                          {punishments.bans.map((ban) => (
                            <div key={ban.user.id} className="p-6 flex items-center gap-6 hover:bg-zinc-750/50 transition-all group border-l-4 border-rose-500">
                              <div className="w-12 h-12 rounded-full border border-zinc-700 overflow-hidden bg-zinc-900 flex-shrink-0">
                                 <img src={ban.user.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div className="flex-1">
                                 <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-zinc-200">{ban.user.tag}</h4>
                                    <span className="text-[10px] text-zinc-600 font-mono">ID: {ban.user.id}</span>
                                    <span className="text-[8px] bg-rose-500/10 text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Active Ban</span>
                                 </div>
                                 <p className="text-xs text-zinc-500 mt-1 italic">Reason: {ban.reason || "No context provided."}</p>
                              </div>
                              <button 
                                onClick={() => handleUnban(ban.user.id)}
                                className="px-6 py-2.5 bg-emerald-600/10 text-emerald-500 border border-emerald-600/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-lg active:scale-95 flex items-center gap-2"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Terminate Ban
                              </button>
                            </div>
                          ))}
                          {punishments.timeouts.map((timeout) => (
                            <div key={timeout.user.id} className="p-6 flex items-center gap-6 hover:bg-zinc-750/50 transition-all group border-l-4 border-amber-500">
                              <div className="w-12 h-12 rounded-full border border-zinc-700 overflow-hidden bg-zinc-900 flex-shrink-0">
                                 <img src={timeout.user.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div className="flex-1">
                                 <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-zinc-200">{timeout.user.tag}</h4>
                                    <span className="text-[10px] text-zinc-600 font-mono">ID: {timeout.user.id}</span>
                                    <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Active Timeout</span>
                                 </div>
                                 <div className="flex items-center gap-2 mt-1">
                                   <Clock className="w-3 h-3 text-zinc-500" />
                                   <p className="text-xs text-zinc-500 italic">Expires: {new Date(timeout.expiry).toLocaleString()}</p>
                                 </div>
                              </div>
                              <button 
                                onClick={async () => {
                                  await handleModerate("unmute", undefined, timeout.user);
                                  // Refresh after action
                                  fetchData();
                                }}
                                className="px-6 py-2.5 bg-emerald-600/10 text-emerald-500 border border-emerald-600/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-lg active:scale-95 flex items-center gap-2"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Revoke Timeout
                              </button>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="py-32 text-center text-zinc-600 italic">No active punishments identified in this sector...</div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Bar */}
          <div className="flex justify-between items-center text-zinc-500 text-[10px] px-2 pt-4 border-t border-zinc-800">
            <div className="flex gap-6 uppercase tracking-widest font-bold">
              <span>Latency: 14ms</span>
              <span>Memory: 124MB</span>
              <span>DB: JSON Connected</span>
            </div>
            <div className="flex items-center gap-2 font-bold tracking-wider uppercase">
              <div className={`w-1.5 h-1.5 rounded-full ${status?.online ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'}`}></div>
              Bot {status?.online ? 'Active & Monitoring' : 'Offline / Standby'}
            </div>
          </div>
        </main>
      </div>

      {/* Moderation Modal */}
      <AnimatePresence>
        {modifyingMember && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onKeyDown={(e) => {
              if (e.altKey && e.key === 'k') {
                e.preventDefault();
                handleModerate("kick");
              }
              if (e.altKey && e.key === 'b') {
                e.preventDefault();
                handleModerate("ban");
              }
              if (e.altKey && e.key === 'w') {
                e.preventDefault();
                handleModerate("warn");
              }
              if (e.altKey && e.key === 'm') {
                e.preventDefault();
                handleModerate("mute");
              }
              if (e.altKey && e.key === 'u') {
                e.preventDefault();
                handleModerate("unmute");
              }
            }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-700 bg-zinc-850 flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-widest flex items-center gap-2 uppercase">
                  <Gavel className="w-4 h-4 text-brand" />
                  Moderate Entity
                </h3>
                <button 
                  onClick={() => {
                    setModifyingMember(null);
                    setSelectedRoleId("");
                  }}
                  className="p-1 hover:bg-zinc-800 rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <img src={modifyingMember.avatar} alt="" className="w-12 h-12 rounded-full border border-zinc-700" referrerPolicy="no-referrer" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white">{modifyingMember.displayName}</h4>
                    <span className="text-xs text-zinc-500 font-mono">@{modifyingMember.username}</span>
                  </div>
                </div>

                {modResult?.success ? (
                  <div className="p-8 text-center flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/50">
                      <ShieldCheck className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-white font-bold uppercase tracking-widest italic">Action Executed</h4>
                      <p className="text-zinc-500 text-[10px] font-bold uppercase">System synchronization complete</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {/* Active Roles Section */}
                      <div className="space-y-2">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-1">Active Roles</label>
                        <div className="flex flex-wrap gap-2 p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl min-h-[44px]">
                          {modifyingMember.roles && modifyingMember.roles.length > 0 ? (
                            modifyingMember.roles.map((role: any) => (
                              <button
                                key={role.id}
                                onClick={() => handleModerate("removeRole", role.id)}
                                title={`Remove ${role.name}`}
                                className="group/role px-2 py-1 rounded border text-[9px] font-black uppercase tracking-tighter flex items-center gap-1.5 transition-all hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-400"
                                style={{ 
                                  borderColor: `${role.color}40`, 
                                  color: role.color, 
                                  backgroundColor: `${role.color}10` 
                                }}
                              >
                                {role.name}
                                <X className="w-2.5 h-2.5 opacity-0 group-hover/role:opacity-100 transition-opacity" />
                              </button>
                            ))
                          ) : (
                            <span className="text-[9px] text-zinc-700 font-bold uppercase italic px-1 py-1">No active roles detected...</span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-1">Enforcement Logic (Reason)</label>
                        <textarea 
                          placeholder="Specify the violation context..."
                          value={modForm.reason}
                          onChange={(e) => setModForm(prev => ({ ...prev, reason: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleModerate("warn");
                            }
                          }}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-xs outline-none focus:border-brand h-20 resize-none transition-all placeholder:text-zinc-700"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-1">Temporal Duration (Mute Only)</label>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <p className="text-[9px] text-zinc-600 font-black px-1 uppercase">Hours</p>
                            <input 
                              type="number" 
                              min="0"
                              value={modForm.h}
                              onChange={(e) => setModForm(prev => ({ ...prev, h: parseInt(e.target.value) || 0 }))}
                              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand transition-all"
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] text-zinc-600 font-black px-1 uppercase">Mins</p>
                            <input 
                              type="number" 
                              min="0"
                              max="59"
                              value={modForm.m}
                              onChange={(e) => setModForm(prev => ({ ...prev, m: parseInt(e.target.value) || 0 }))}
                              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand transition-all"
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] text-zinc-600 font-black px-1 uppercase">Secs</p>
                            <input 
                              type="number" 
                              min="0"
                              max="59"
                              value={modForm.s}
                              onChange={(e) => setModForm(prev => ({ ...prev, s: parseInt(e.target.value) || 0 }))}
                              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-1">Neural Rank Override (Assign Role)</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <select 
                            value={selectedRoleId}
                            onChange={(e) => setSelectedRoleId(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand transition-all appearance-none cursor-pointer"
                          >
                            <option value="">Select a role to assign...</option>
                            {availableRoles.filter(r => !modifyingMember.roles?.find((mr: any) => mr.id === r.id)).map(role => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                            <ChevronRight className="w-3 h-3 rotate-90" />
                          </div>
                        </div>
                        <button 
                          disabled={!selectedRoleId}
                          onClick={() => handleModerate("addRole")}
                          className="px-6 py-2 bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px]"
                        >
                          ASSIGN
                        </button>
                      </div>
                    </div>

                    {modResult?.error && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2 text-rose-500 text-[10px] font-bold tracking-widest uppercase">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {modResult.error}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <ModButton 
                        onClick={() => handleModerate("warn")} 
                        icon={<AlertTriangle className="w-3.5 h-3.5" />} 
                        label="Issue Warn" 
                        variant="warn"
                        hotkey="Enter / Alt+W"
                      />
                      <ModButton 
                        onClick={() => handleModerate("mute")} 
                        icon={<Clock className="w-3.5 h-3.5" />} 
                        label="Apply Mute" 
                        variant="mute"
                        hotkey="Enter / Alt+M"
                      />
                      <ModButton 
                        onClick={() => handleModerate("kick")} 
                        icon={<UserMinus className="w-3.5 h-3.5" />} 
                        label="Evict User" 
                        variant="kick"
                        hotkey="Alt+K"
                      />
                      <ModButton 
                        onClick={() => handleModerate("ban")} 
                        icon={<Ban className="w-3.5 h-3.5" />} 
                        label="Banish Entity" 
                        variant="ban"
                        hotkey="Alt+B"
                      />
                      <ModButton 
                        onClick={() => handleModerate("unmute")} 
                        icon={<RotateCcw className="w-3.5 h-3.5" />} 
                        label="Lift Timeout" 
                        variant="unmute"
                        hotkey="Alt+U"
                      />
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModButton({ icon, label, onClick, variant, hotkey }: { icon: React.ReactNode; label: string; onClick: () => void; variant: string; hotkey?: string }) {
  const getStyle = () => {
    switch (variant) {
      case 'warn': return 'bg-yellow-500 text-black hover:bg-yellow-400 border-yellow-600 shadow-yellow-500/20';
      case 'mute': return 'bg-blue-500 text-white hover:bg-blue-400 border-blue-600 shadow-blue-500/20';
      case 'unmute': return 'bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-700 shadow-emerald-600/20';
      case 'kick': return 'bg-orange-500 text-white hover:bg-orange-400 border-orange-600 shadow-orange-500/20';
      case 'ban': return 'bg-rose-600 text-white hover:bg-rose-500 border-rose-700 shadow-rose-600/20';
      default: return 'bg-zinc-700 text-white hover:bg-zinc-600 border-zinc-600';
    }
  };

  return (
    <button 
      onClick={onClick}
      className={`relative flex items-center justify-center gap-2 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95 ${getStyle()}`}
    >
      {icon}
      {label}
      {hotkey && (
        <span className="absolute top-1 right-2 text-[7px] opacity-40 font-black border border-current rounded px-0.5">{hotkey}</span>
      )}
    </button>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-zinc-800 p-5 rounded-xl border border-zinc-700 shadow-sm hover:border-zinc-600 transition-colors group">
      <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1 group-hover:text-zinc-400 transition-colors">{label}</p>
      <p className="text-2xl font-light text-white italic tracking-tight">{value}</p>
      <p className="text-[9px] text-zinc-600 font-bold uppercase mt-2">{sub}</p>
    </div>
  );
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-700/50 hover:bg-zinc-700 transition-all cursor-default">
      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="text-xs font-bold font-mono text-zinc-200">{title}</h4>
        <p className="text-[10px] text-zinc-500">{desc}</p>
      </div>
    </div>
  );
}

function HealthItem({ label, status }: { label: string; status: string }) {
  const isHealthy = status === 'stable' || status === 'connected' || !status.includes('ms') || parseInt(status) < 50;
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">{label}</span>
      <span className={`text-[10px] font-black uppercase ${isHealthy ? 'text-white' : 'text-rose-300'}`}>{status}</span>
    </div>
  );
}

function AutoModGroup({ 
  icon, title, desc, active, onToggle, actions, onActionsChange, 
  bypassRoles, onBypassRolesChange, 
  bypassPermissions, onBypassPermissionsChange,
  availableRoles, botPerms, extra,
  forwardLink, onForwardLinkChange,
  forwardDelete, onForwardDeleteChange,
  forwardDeleteDelay, onForwardDeleteDelayChange
}: { 
  icon: React.ReactNode; title: string; desc: string; active: boolean; onToggle: (v: boolean) => void; 
  actions?: any; onActionsChange?: (v: any) => void; 
  bypassRoles?: string[]; onBypassRolesChange?: (v: string[]) => void;
  bypassPermissions?: string[]; onBypassPermissionsChange?: (v: string[]) => void;
  availableRoles: any[];
  botPerms: any; extra?: React.ReactNode;
  forwardLink?: string;
  onForwardLinkChange?: (v: string) => void;
  forwardDelete?: boolean;
  onForwardDeleteChange?: (v: boolean) => void;
  forwardDeleteDelay?: number;
  onForwardDeleteDelayChange?: (v: number) => void;
}) {
  const [showBypass, setShowBypass] = useState(false);
  const COMMON_BYPASS_PERMS = ["ManageMessages", "ModerateMembers", "ManageGuild", "ManageChannels"];

  return (
    <div className={`p-4 rounded-2xl border transition-all ${active ? 'bg-zinc-900 border-brand/30 shadow-lg shadow-brand/5' : 'bg-zinc-950 border-zinc-800 opacity-40'}`}>
      <div className="flex items-center gap-4 mb-4">
        <button 
          onClick={() => onToggle(!active)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${active ? 'bg-brand text-white' : 'bg-zinc-800 text-zinc-500'}`}
        >
          {icon}
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className={`text-sm font-bold ${active ? 'text-white' : 'text-zinc-300'}`}>{title}</h4>
            {extra}
          </div>
          <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{desc}</p>
        </div>
        <button 
          onClick={() => onToggle(!active)}
          className={`w-10 h-5 rounded-full relative transition-colors ${active ? 'bg-brand' : 'bg-zinc-800'} border border-zinc-700 flex-shrink-0 `}
        >
          <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-md transition-all ${active ? 'left-5.5' : 'left-0.5'}`} />
        </button>
      </div>
      
      {active && (
        <div className="pt-4 border-t border-zinc-800 space-y-4">
          {onActionsChange && actions && (
            <div className="space-y-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-1">Simultaneous Actions</p>
              <div className="flex flex-wrap gap-2">
                {(['delete', 'warn', 'kick', 'mute', 'ban'] as const).map(type => {
                  const hasPermission = botPerms.isAdmin || (
                    type === 'mute' ? botPerms.hasModerateMembers :
                    type === 'kick' ? botPerms.hasKickMembers :
                    type === 'ban' ? botPerms.hasBanMembers :
                    true
                  );

                  return (
                    <button 
                      key={type}
                      disabled={!hasPermission}
                      onClick={() => onActionsChange({ ...actions, [type]: !actions[type] })}
                      className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${actions[type] ? 'bg-brand/10 border-brand/40 text-brand shadow-sm' : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:text-zinc-400'} ${!hasPermission ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      {type}
                      {!hasPermission && <Lock className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {actions?.mute && (
            <div className="space-y-2 p-3 bg-zinc-950 border border-zinc-800 rounded-2xl">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex justify-between px-1">
                <span>Rule-Specific Mute Duration</span>
                <Clock className="w-3 h-3" />
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Hrs", unit: 3600000 },
                  { label: "Mins", unit: 60000 },
                  { label: "Secs", unit: 1000 }
                ].map(({ label, unit }) => (
                  <div key={label} className="space-y-1">
                    <p className="text-[8px] text-zinc-600 font-bold uppercase px-1">{label}</p>
                    <input 
                      type="number" 
                      min="0"
                      value={Math.floor((actions.muteDurationMs || 600000) / unit) % (unit === 3600000 ? 999 : 60)}
                      onChange={(e) => {
                        const currentDur = actions.muteDurationMs || 600000;
                        const h = Math.floor(currentDur / 3600000);
                        const m = Math.floor((currentDur % 3600000) / 60000);
                        const s = Math.floor((currentDur % 60000) / 1000);
                        
                        let newVal = parseInt(e.target.value) || 0;
                        let newTotal = currentDur;
                        
                        if (unit === 3600000) newTotal = (newVal * 3600000) + (m * 60000) + (s * 1000);
                        else if (unit === 60000) newTotal = (h * 3600000) + (newVal * 60000) + (s * 1000);
                        else newTotal = (h * 3600000) + (m * 60000) + (newVal * 1000);
                        
                        onActionsChange({ ...actions, muteDurationMs: Math.max(1000, newTotal) });
                      }}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] font-mono focus:border-brand outline-none transition-all"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {onForwardLinkChange && (
            <div className="space-y-4 p-3 bg-zinc-950 border border-zinc-800 rounded-2xl">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex justify-between px-1">
                  <span>Forward / Redirect Link</span>
                  <ExternalLink className="w-3 h-3 text-brand" />
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://discord.gg/your-partner-or-allowed-invite"
                  value={forwardLink || ''}
                  onChange={(e) => onForwardLinkChange(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs focus:border-brand outline-none transition-all text-white placeholder-zinc-600 font-mono"
                />
                <p className="text-[9px] text-zinc-500 px-1 leading-relaxed">
                  When an unauthorized invite link is deleted by the interceptor, this official forward link is posted immediately in the chat to redirect users.
                </p>
              </div>

              {onForwardDeleteChange && onForwardDeleteDelayChange && (
                <div className="space-y-3 pt-2.5 border-t border-zinc-900">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-zinc-300">Auto-Delete Forward Message</label>
                      <p className="text-[9px] text-zinc-500">Automatically remove the message after sending to clear chat clutter.</p>
                    </div>
                    <button
                      onClick={() => onForwardDeleteChange(!forwardDelete)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        forwardDelete ? "bg-brand" : "bg-zinc-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          forwardDelete ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {forwardDelete && (
                    <div className="space-y-1.5 pl-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex justify-between">
                        <span>Delete Delay (Seconds)</span>
                        <span className="text-brand font-mono">{forwardDeleteDelay || 10}s</span>
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="300"
                        value={forwardDeleteDelay || 10}
                        onChange={(e) => onForwardDeleteDelayChange(Math.max(2, parseInt(e.target.value) || 2))}
                        className="w-24 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs focus:border-brand outline-none text-white font-mono"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bypass Configuration */}
          <div className="space-y-2">
            <button 
              onClick={() => setShowBypass(!showBypass)}
              className="w-full flex items-center justify-between px-1 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Users className="w-3 h-3" />
                Bypass Permissions & Roles
              </span>
              {showBypass ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            
            {showBypass && onBypassRolesChange && onBypassPermissionsChange && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="space-y-4 pt-2 overflow-hidden"
              >
                <div className="space-y-2">
                  <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter px-1">Bypass Roles</p>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-950 border border-zinc-800 rounded-xl max-h-32 overflow-y-auto custom-scrollbar">
                    {availableRoles.filter(r => !r.isEveryone).map(role => (
                      <button 
                        key={role.id}
                        onClick={() => {
                          const current = bypassRoles || [];
                          if (current.includes(role.id)) {
                            onBypassRolesChange(current.filter(id => id !== role.id));
                          } else {
                            onBypassRolesChange([...current, role.id]);
                          }
                        }}
                        className={`px-2 py-1 rounded-md text-[8px] font-bold transition-all border ${bypassRoles?.includes(role.id) ? 'bg-brand/20 border-brand/40 text-brand' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                      >
                        {role.name}
                      </button>
                    ))}
                    {availableRoles.length === 0 && <p className="text-[8px] text-zinc-700 italic p-1">No roles identified...</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter px-1">Bypass Permissions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_BYPASS_PERMS.map(perm => (
                      <button 
                        key={perm}
                        onClick={() => {
                          const current = bypassPermissions || [];
                          if (current.includes(perm)) {
                            onBypassPermissionsChange(current.filter(p => p !== perm));
                          } else {
                            onBypassPermissionsChange([...current, perm]);
                          }
                        }}
                        className={`px-2 py-1 rounded-md text-[8px] font-bold transition-all border ${bypassPermissions?.includes(perm) ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-500' : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}
                      >
                        {perm}
                      </button>
                    ))}
                  </div>
                  <p className="text-[7px] text-zinc-600 px-1 italic">Users with Administrator automatically bypass all filters.</p>
                </div>
              </motion.div>
            )}
          </div>

          {!botPerms.isAdmin && (!botPerms.hasModerateMembers || !botPerms.hasKickMembers || !botPerms.hasBanMembers) && (
             <p className="mt-2 text-[8px] text-amber-500 font-bold uppercase flex items-center gap-1">
               <ShieldAlert className="w-3 h-3" />
               Bot lacks key moderator permissions. Some high-level actions may be locked.
             </p>
          )}
        </div>
      )}
    </div>
  );
}
