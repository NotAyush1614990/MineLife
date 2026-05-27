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
  Save
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
  const [userDB, setUserDB] = useState<any[]>([]);
  const [loadingDB, setLoadingDB] = useState(false);
  const [savingAutoMod, setSavingAutoMod] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

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
  }, [activeTab]);

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
            onClick={() => setActiveTab("server_config")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${activeTab === "server_config" ? "bg-zinc-700/50 text-white border border-zinc-600/50 shadow-lg shadow-black/20" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "server_config" ? "bg-brand animate-pulse" : "bg-zinc-600"}`}></div>
            Server Configuration
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
              <span className="font-medium text-sm capitalize">{activeTab} Overview</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
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
                  </div>
                </div>
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
                               {status?.geminiStatus === "permission_denied" && (
                                 <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1">
                                   <div className="flex items-center gap-2 text-rose-500 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                     <ShieldAlert className="w-4 h-4" />
                                     Gemini API Permission Error
                                   </div>
                                   <p className="text-[10px] text-rose-400">
                                     Your Gemini API Key lacks the required scopes or is invalid. Please check <strong>Settings &gt; Secrets</strong> in AI Studio.
                                   </p>
                                   <p className="text-[9px] text-zinc-500 italic">
                                     The system has automatically activated local rule heuristics to keep your moderation active.
                                   </p>
                                 </div>
                               )}
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
  availableRoles, botPerms, extra 
}: { 
  icon: React.ReactNode; title: string; desc: string; active: boolean; onToggle: (v: boolean) => void; 
  actions?: any; onActionsChange?: (v: any) => void; 
  bypassRoles?: string[]; onBypassRolesChange?: (v: string[]) => void;
  bypassPermissions?: string[]; onBypassPermissionsChange?: (v: string[]) => void;
  availableRoles: any[];
  botPerms: any, extra?: React.ReactNode 
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
