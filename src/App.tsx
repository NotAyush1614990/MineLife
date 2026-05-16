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
  MessageSquareOff,
  History,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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
  const [bans, setBans] = useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingBans, setLoadingBans] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [banReason, setBanReason] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, statsRes, autoModRes] = await Promise.all([
        fetch("/api/status"),
        fetch("/api/stats"),
        fetch("/api/automod")
      ]);
      const statusData = await statusRes.json();
      const statsData = await statsRes.json();
      const autoModData = await autoModRes.json();
      
      setStatus(statusData);
      setStats(statsData);
      
      // Only update AutoMod if we haven't made local changes
      if (!isDirty) {
        setAutoModSettings(autoModData);
      }

      // Also refresh tab-specific data if applicable
      if (activeTab === "database") {
        setLoadingDB(true);
        const res = await fetch("/api/users");
        const data = await res.json();
        setUserDB(data);
        setLoadingDB(false);
      } else if (activeTab === "audit") {
        setLoadingLogs(true);
        const res = await fetch("/api/audit");
        const data = await res.json();
        setAuditLog(data);
        setLoadingLogs(false);
      } else if (activeTab === "commands") {
        setLoadingLogs(true);
        const res = await fetch("/api/commands");
        const data = await res.json();
        setCommandsList(data);
        setLoadingLogs(false);
      } else if (activeTab === "system") {
        setLoadingLogs(true);
        const res = await fetch("/api/system-logs");
        const data = await res.json();
        setSystemLogs(data);
        setLoadingLogs(false);
      } else if (activeTab === "staff") {
        setLoadingLogs(true);
        const res = await fetch("/api/staff");
        const data = await res.json();
        setStaffLog(data);
        setLoadingLogs(false);
      } else if (activeTab === "bans") {
        if (selectedGuildId) {
          setLoadingBans(true);
          const res = await fetch(`/api/guild/${selectedGuildId}/bans`);
          const data = await res.json();
          if (Array.isArray(data)) setBans(data);
          setLoadingBans(false);
        }
      }
      
      if (selectedGuildId) {
        setLoadingMembers(true);
        const res = await fetch(`/api/guild/${selectedGuildId}/members`);
        const data = await res.json();
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

  useEffect(() => {
    const fetchRoles = async () => {
      if (!selectedGuildId) {
        setAvailableRoles([]);
        return;
      }
      setLoadingRoles(true);
      try {
        const res = await fetch(`/api/guild/${selectedGuildId}/roles`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setAvailableRoles(data);
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

    fetchRoles();
  }, [selectedGuildId]);

  const handleModerate = async (action: string, roleIdOverride?: string) => {
    if (!modifyingMember || !selectedGuildId) return;
    
    setModResult(null);
    try {
      const totalSeconds = (modForm.h * 3600) + (modForm.m * 60) + (modForm.s);
      const res = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildId: selectedGuildId,
          userId: modifyingMember.id,
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
        setTimeout(() => {
          setModifyingMember(null);
          setModResult(null);
          setModForm({ reason: "", duration: 600, h: 0, m: 10, s: 0 });
          setSelectedRoleId("");
        }, 1500);
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
        // Refresh bans
        const bansRes = await fetch(`/api/guild/${selectedGuildId}/bans`);
        if (bansRes.ok) {
          const bansData = await bansRes.json();
          if (Array.isArray(bansData)) setBans(bansData);
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
    if (activeTab === "automod") {
      fetch("/api/automod")
        .then(res => res.json())
        .then(data => {
           setAutoModSettings(data);
           setIsDirty(false);
        });
    }
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
      fetch(`/api/guild/${selectedGuildId}/bans`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setBans(data);
          setLoadingBans(false);
        });
    }
  }, [activeTab]);

  const saveAutoMod = async (newSettings: any) => {
    if (!newSettings) return;
    setSavingAutoMod(true);
    try {
      const res = await fetch("/api/automod", {
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
            Bans Management
          </button>

          <button 
            onClick={() => setActiveTab("automod")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${activeTab === "automod" ? "bg-zinc-700/50 text-white border border-zinc-600/50 shadow-lg shadow-black/20" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === "automod" ? "bg-brand animate-pulse" : "bg-zinc-600"}`}></div>
            Auto-Mod Settings
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
                          <span className="text-zinc-400 font-medium">Anti-Spam Protocol</span>
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
                              <p className="text-[8px] text-zinc-500 font-black uppercase tracking-tighter mb-0.5">Population</p>
                              <p className="text-sm font-bold text-zinc-200">{guild.memberCount.toLocaleString()}</p>
                            </div>
                            <div className="bg-zinc-900/50 p-2 rounded-xl border border-zinc-700/50">
                              <p className="text-[8px] text-zinc-500 font-black uppercase tracking-tighter mb-0.5">Executions</p>
                              <p className="text-sm font-bold text-brand">{guild.commandCount.toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-full group-hover:border-brand/30 transition-colors w-full justify-center">
                            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-tighter">Primary Protocol:</span>
                            <span className="text-[10px] text-brand font-black uppercase tracking-tight">{guild.topCommand}</span>
                          </div>

                          <button 
                            onClick={() => { setSelectedGuildId(guild.id); setActiveTab("moderation"); }}
                            className="mt-2 w-full py-2 bg-zinc-700/50 hover:bg-brand hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-all flex items-center justify-center gap-2"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                            Access Nerve Center
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
                    <p className="text-zinc-400 text-sm mb-6 leading-relaxed">Connect Cracked Tier Bot to a new server cluster to initialize real-time algorithmic enforcement and security protocols.</p>
                    <a 
                      href={`https://discord.com/api/oauth2/authorize?client_id=${status?.clientId || ''}&permissions=8&scope=bot%20applications.commands`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-8 py-4 bg-brand hover:bg-brand/90 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-brand/20 transition-all hover:scale-105 active:scale-95 group"
                    >
                      <Zap className="w-4 h-4 fill-current group-hover:rotate-12 transition-transform" />
                      Initialize Integration Protocol
                    </a>
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
                        Cracked Tier Auto-Mod Configuration
                      </h2>
                      <p className="text-zinc-500 text-sm mt-1">Configure real-time algorithmic enforcement policies.</p>
                    </div>
                    <button 
                      onClick={() => saveAutoMod(autoModSettings)}
                      disabled={savingAutoMod || (!isDirty && autoModSettings)}
                      className={`px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg ${isDirty ? 'bg-emerald-600 text-white shadow-emerald-500/20 animate-pulse' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}
                    >
                      {savingAutoMod ? <RefreshCw className="w-4 h-4 animate-spin" /> : (isDirty ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />)}
                      {savingAutoMod ? "Syncing..." : (isDirty ? "Save Changes" : "Protocol Synced")}
                    </button>
                  </div>

                  {autoModSettings ? (
                    <div className="p-8 space-y-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <AutoModGroup 
                            icon={<Lock className="w-4 h-4" />}
                            title="Anti-Spam Protocol"
                            desc="Detects and mitigates rapid message clusters."
                            active={autoModSettings.antiSpam}
                            onToggle={(v) => updateAutoMod({...autoModSettings, antiSpam: v})}
                            actions={autoModSettings.antiSpamActions}
                            onActionsChange={(v) => updateAutoMod({...autoModSettings, antiSpamActions: v})}
                          />
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Spam Threshold</label>
                            <input 
                              type="number" 
                              value={autoModSettings.spamLimit || 5}
                              onChange={(e) => updateAutoMod({...autoModSettings, spamLimit: parseInt(e.target.value) || 1})}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-brand outline-none transition-all"
                            />
                            <p className="text-[10px] text-zinc-600 px-1 italic">Maximum messages allowed within a 3-second window.</p>
                          </div>
                          <AutoModGroup 
                            icon={<ExternalLink className="w-4 h-4" />}
                            title="Invite link Intercept"
                            desc="Automatically clears unauthorized discord invites."
                            active={autoModSettings.inviteFilter}
                            onToggle={(v) => updateAutoMod({...autoModSettings, inviteFilter: v})}
                            actions={autoModSettings.inviteFilterActions}
                            onActionsChange={(v) => updateAutoMod({...autoModSettings, inviteFilterActions: v})}
                          />
                        </div>

                        <div className="space-y-6">
                           <AutoModGroup 
                            icon={<UserMinus className="w-4 h-4" />}
                            title="Mention Saturation"
                            desc="Caps mass pings in a single transmission."
                            active={autoModSettings.mentionFilter}
                            onToggle={(v) => updateAutoMod({...autoModSettings, mentionFilter: v})}
                            actions={autoModSettings.mentionFilterActions}
                            onActionsChange={(v) => updateAutoMod({...autoModSettings, mentionFilterActions: v})}
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
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Protocol Mute Duration</label>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                  <p className="text-[8px] text-zinc-600 font-bold uppercase px-1">Hours</p>
                                  <input 
                                    type="number" 
                                    value={Math.floor((autoModSettings.muteDurationMs || 600000) / 3600000)}
                                    onChange={(e) => {
                                      const h = parseInt(e.target.value) || 0;
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
                                    value={Math.floor(((autoModSettings.muteDurationMs || 600000) % 3600000) / 60000)}
                                    onChange={(e) => {
                                      const h = Math.floor((autoModSettings.muteDurationMs || 600000) / 3600000);
                                      const m = parseInt(e.target.value) || 0;
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
                                    value={Math.floor(((autoModSettings.muteDurationMs || 600000) % 60000) / 1000)}
                                    onChange={(e) => {
                                      const h = Math.floor((autoModSettings.muteDurationMs || 600000) / 3600000);
                                      const m = Math.floor(((autoModSettings.muteDurationMs || 600000) % 3600000) / 60000);
                                      const s = parseInt(e.target.value) || 0;
                                      updateAutoMod({...autoModSettings, muteDurationMs: (h * 3600000) + (m * 60000) + (s * 1000)});
                                    }}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-xs focus:border-brand outline-none transition-all"
                                  />
                                </div>
                              </div>
                              <p className="text-[10px] text-zinc-600 px-1 italic">Applied when 'Mute' action is triggered by Auto-Mod.</p>
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
                                        const isActionActive = autoModSettings.wordFilterActions && autoModSettings.wordFilterActions[action];
                                        return (
                                          <button
                                              key={action}
                                              onClick={() => {
                                                  const currentActions = autoModSettings.wordFilterActions || { delete: true, warn: true, mute: false, ban: false, kick: false };
                                                  updateAutoMod({
                                                      ...autoModSettings,
                                                      wordFilterActions: {
                                                          ...currentActions,
                                                          [action]: !currentActions[action]
                                                      }
                                                  });
                                              }}
                                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${isActionActive ? 'bg-brand/10 border-brand/40 text-brand shadow-lg shadow-brand/5' : 'bg-zinc-900 border-zinc-800 text-zinc-600 opacity-60'}`}
                                          >
                                              {action}
                                          </button>
                                        );
                                    })}
                                </div>
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
                      <RefreshCw className="w-8 h-8 text-brand animate-spin" />
                      <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">Initializing Auto-Mod Engine...</p>
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
                            <Ban className="w-5 h-5 text-rose-500" />
                            Active Banishment Records
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="relative">
                            <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input 
                              type="text" 
                              placeholder="Reason for unban..."
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
                           <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">Retrieving Exile Data...</p>
                         </div>
                      ) : bans.length > 0 ? (
                        bans.map((ban) => (
                          <div key={ban.user.id} className="p-6 flex items-center gap-6 hover:bg-zinc-750/50 transition-all group">
                            <div className="w-12 h-12 rounded-full border border-zinc-700 overflow-hidden bg-zinc-900 flex-shrink-0">
                               <img src={ban.user.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div className="flex-1">
                               <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-zinc-200">{ban.user.tag}</h4>
                                  <span className="text-[10px] text-zinc-600 font-mono">ID: {ban.user.id}</span>
                               </div>
                               <p className="text-xs text-zinc-500 mt-1 italic">Reason: {ban.reason || "No context provided."}</p>
                            </div>
                            <button 
                              onClick={() => handleUnban(ban.user.id)}
                              className="px-6 py-2.5 bg-emerald-600/10 text-emerald-500 border border-emerald-600/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-lg active:scale-95 flex items-center gap-2"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Revoke Banishment
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="py-32 text-center text-zinc-600 italic">No active bans found in this sector...</div>
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
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-1">Active Protocols (Roles)</label>
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
                            <span className="text-[9px] text-zinc-700 font-bold uppercase italic px-1 py-1">No active role-based protocols detected...</span>
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
                            <option value="">Select a protocol to assign...</option>
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

function AutoModGroup({ icon, title, desc, active, onToggle, actions, onActionsChange }: { icon: React.ReactNode; title: string; desc: string; active: boolean; onToggle: (v: boolean) => void; actions?: any; onActionsChange?: (v: any) => void }) {
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
          <h4 className={`text-sm font-bold ${active ? 'text-white' : 'text-zinc-300'}`}>{title}</h4>
          <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{desc}</p>
        </div>
        <button 
          onClick={() => onToggle(!active)}
          className={`w-10 h-5 rounded-full relative transition-colors ${active ? 'bg-brand' : 'bg-zinc-800'} border border-zinc-700 flex-shrink-0 `}
        >
          <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-md transition-all ${active ? 'left-5.5' : 'left-0.5'}`} />
        </button>
      </div>
      
      {active && onActionsChange && actions && (
        <div className="pt-4 border-t border-zinc-800">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-3 ml-1">Simultaneous Actions</p>
          <div className="flex flex-wrap gap-2">
            {(['delete', 'warn', 'kick', 'mute', 'ban'] as const).map(type => (
              <button 
                key={type}
                onClick={() => onActionsChange({ ...actions, [type]: !actions[type] })}
                className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${actions[type] ? 'bg-brand/10 border-brand/40 text-brand shadow-sm' : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:text-zinc-400'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
