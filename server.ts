import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  PermissionFlagsBits,
  EmbedBuilder,
  ChatInputCommandInteraction
} from "discord.js";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

let genAIInstance: GoogleGenAI | null = null;
let lastUsedApiKey: string | undefined = undefined;
let lastGeminiStatus: 'success' | 'none' | 'missing' | 'permission_denied' | 'other_error' = 'none';

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    lastGeminiStatus = 'missing';
    genAIInstance = null;
    lastUsedApiKey = undefined;
    throw new Error("GEMINI_API_KEY environment variable is not set. Please add your API key in the 'Secrets' panel in the AI Studio settings.");
  }
  
  if (!genAIInstance || lastUsedApiKey !== apiKey) {
    genAIInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    lastUsedApiKey = apiKey;
  }
  return genAIInstance;
}

function runHeuristicFallback(content: string): { violation: boolean, reason?: string } {
  // Local Heuristic Fallback treated as "Light AI"
  const toxicKeywords = ["hate", "kill", "die", "stupid", "idiot", "trash", "garbage", "loser", "noob", "ugly", "fat", "short", "piss", "scum", "hell", "fuck", "shit", "bitch", "asshole"];
  const words = content.toLowerCase().split(/\s+/);
  const toxicCount = words.filter(w => toxicKeywords.some(tok => w === tok || (w.length > 4 && w.includes(tok)))).length;
  
  if (toxicCount >= 2) {
    return { violation: true, reason: "Heuristic AI Detection: High toxicity density" };
  }
  return { violation: false };
}

async function testGeminiAPI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    lastGeminiStatus = 'missing';
    return;
  }
  try {
    const ai = getGenAI();
    await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "ping",
    });
    lastGeminiStatus = 'success';
    console.log("Gemini API connection test: SUCCESS");
  } catch (error: any) {
    if (error?.message?.includes("GEMINI_API_KEY environment variable is not set")) {
      lastGeminiStatus = 'missing';
    } else if (error?.status === 403 || error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('API_KEY_INVALID') || error?.status === 400) {
      lastGeminiStatus = 'permission_denied';
      console.error("Gemini API Connection Test: PERMISSION_DENIED. Check Settings > Secrets.");
    } else {
      lastGeminiStatus = 'other_error';
      console.error("Gemini API Connection Test Error:", error);
    }
  }
}

const app = express();
const PORT = 3000;

// Utility for rate limiting
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

app.use(express.json());

// Database for warnings and settings (Local JSON)
const DB_PATH = path.join(process.cwd(), "database.json");
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ 
    warnings: [], 
    auditLog: [],
    autoMod: {
      antiSpam: true,
      inviteFilter: true,
      wordFilter: [],
      maxMentions: 5,
      mentionFilter: true,
      badWordFilter: true
    }
  }));
}

interface AutoModActions {
  delete: boolean;
  warn: boolean;
  mute: boolean;
  ban: boolean;
  kick: boolean;
  muteDurationMs?: number;
}

const DEFAULT_ACTIONS: AutoModActions = { delete: true, warn: true, mute: false, ban: false, kick: false };

const DEFAULT_AUTOMOD_SETTINGS = { 
  antiSpam: true, 
  antiSpamActions: { ...DEFAULT_ACTIONS },
  antiSpamBypassRoles: [],
  antiSpamBypassPermissions: ["ManageMessages", "ModerateMembers"],
  spamLimit: 5,
  muteDurationMs: 10 * 60 * 1000,
  inviteFilter: true, 
  inviteFilterActions: { ...DEFAULT_ACTIONS, warn: false },
  inviteFilterBypassRoles: [],
  inviteFilterBypassPermissions: ["ManageMessages", "ModerateMembers"],
  wordFilter: [], 
  badWordFilter: true,
  badWordList: [
    // Sexual / NSFW
    "porn", "xxx", "sex", "sexual", "nipple", "pussy", "dick", "cock", "vagina", "penis", "slut", "whore", "escort", "hentai", "cum", "ejaculate", "blowjob", "handjob", "bondage", "bdsm", "rape", "molest", "pedophile", "incest", "orgasm", "clitoris", "ejaculation", "semen", "sperm", "fetish", "pornography", "softcore", "hardcore", "webcam", "strip", "nude", "naked", "erotic", "threesome", "anal", "oral", "facial",
    // Hated / Slurs
    "nigger", "kike", "faggot", "tranny", "retard", "coon", "spic", "wetback", "chink", "gook", "paki", "kyke", "libtard", "cuck", "nazi", "hitler", "holocaust", "genocide", "terrorist", "faig", "dyke", "shemale", "bitch", "whore", "slut", "negro", "blacky", "curry muncher", "dothead", "sand nigger", "coolie", "mick", "wop", "frog", "kraut", "jap", "gook", "zipperhead", "camel jockey", "towelhead",
    // Toxic / Abusive (English)
    "fuck", "shit", "bitch", "asshole", "bastard", "motherfucker", "cunt", "prick", "twat", "dickhead", "douche", "jerk", "idiot", "dumbass", "stupid", "hate", "vulgar", "abusive", "toxic", "harassment", "kill yourself", "kys", "die", "suicide", "trash", "garbage", "loser", "noob", "ugly", "fat", "short", "kill you", "shoot", "stab", "murder", "rape", "burn", "hell", "piss", "scum", "lowlife", "fuck off", "shut up", "idiot", "moron", "imbecile", "trash", "worthless", "retard", "autistic", "cancer", "stfu", "gtfo", "lmfao", "fucking", "shitting", "dick", "pussy",
    // Toxic / Abusive (Hindi/Hinglish)
    "chutiya", "gand", "chod", "randi", "bhen", "bhosdike", "lavde", "harami", "saala", "kamine", "madarchod", "behenchod", "gaandu", "tatte", "lund", "suar", "kutte", "bhadwe", "chinar", "haramkhor", "besharam", "rakhel", "pagal", "gadhe", "ullu", "kamina", "kalua", "bhangi", "chammar", "chutia", "gandu", "muthbaaz", "jhaatu", "lowda", "lawda", "chudai", "gaand", "hijra", "chhaka", "chikna", "saale", "bhadwi", "randwa", "lund", "toat", "mutth", "randi", "chinaar", "kudwa", "kutiya", "kamini", "item", "maal", "pichwada", "jhant", "jhat", "jhantoo", "loda",
    // Devanagari 
    "चूतिया", "गांड", "चोद", "रंडी", "बहन", "भोसड़ीके", "लौड़े", "हरामी", "साला", "कमीने", "मादरचोद", "बहनचोद", "गांडू", "तत्ते", "लुंड", "सूअर", "कुत्ते", "भड़वे", "छिनार", "हरामखोर", "बेशर्म", "रखैल", "पागल", "गधे", "उल्लू", "चुटिया", "गाँडू", "मुठबाज़", "झाँटू", "लौड़ा", "चढ़ाई", "हिजड़ा", "छक्का", "चिकना", "साले", "भड़वी", "रंडवा", "गाँड", "कुतिया", "हरामजादा", "टट्टे", "झाँट"
  ],
  bannedPatterns: [
    // Patterns for obfuscated words
    "(f|ph)[u*@#]+ck",
    "s[h*@#]+it",
    "b[i*@#]+tch",
    "c[h*@#]ut[i*@#]ya",
    "m[a*@#]dar[c*@#]hod",
    "b[e*@#]hen[c*@#]hod",
    "f.u.c.k",
    "s.h.i.t",
    // Patterns for discord invite links (redundant but safe)
    "discord\\.gg\\/[a-z0-9]+",
    "discord\\.com\\/invite\\/[a-z0-9]+",
    // Pattern for mass mention spam (regex version)
    "(<@!?[0-9]+>\\s*){5,}",
    // Toxicity: repeated characters for long words
    "(.)\\1{5,}"
  ],
  badWordIgnoreList: [],
  badWordFilterActions: { ...DEFAULT_ACTIONS },
  badWordFilterBypassRoles: [],
  badWordFilterBypassPermissions: ["ManageMessages", "ModerateMembers"],
  wordFilterActions: { ...DEFAULT_ACTIONS },
  maxMentions: 5,
  mentionFilter: true,
  mentionFilterActions: { ...DEFAULT_ACTIONS },
  mentionFilterBypassRoles: [],
  mentionFilterBypassPermissions: ["ManageMessages", "ModerateMembers"]
};

function getDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const defaultDB = { 
        warnings: [], 
        auditLog: [],
        autoMod: { antiSpam: true, inviteFilter: true, wordFilter: [], maxMentions: 5 },
        serverSettings: { autoRoleId: null, botRoleId: null }
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2));
      return defaultDB;
    }
    const data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    // Ensure default structure if missing or legacy
    if (!data.systemLogs) {
      data.systemLogs = [];
    }
    if (!data.autoMod) {
      data.autoMod = {}; 
    }
    
    // Ensure default settings structure for each guild if accessed via API, 
    // but here we just ensure the top level object exists.
    
    if (!data.auditLog) {
      data.auditLog = [];
    }
    if (!data.warnings) {
      data.warnings = [];
    }
    if (!data.serverSettings) {
      data.serverSettings = { autoRoleId: null, botRoleId: null, autoRoleEnabled: false, botRoleEnabled: false };
    } else {
      if (data.serverSettings.autoRoleEnabled === undefined) data.serverSettings.autoRoleEnabled = !!data.serverSettings.autoRoleId;
      if (data.serverSettings.botRoleEnabled === undefined) data.serverSettings.botRoleEnabled = !!data.serverSettings.botRoleId;
    }
    return data;
  } catch (error) {
    console.error("Critical: Failed to parse database.json, resetting to default.", error);
    const defaultDB = { 
      warnings: [], 
      auditLog: [],
      serverSettings: { autoRoleId: null, botRoleId: null, autoRoleEnabled: false, botRoleEnabled: false }
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2));
    return defaultDB;
  }
}

function saveDB(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function logAction(data: { action: string, targetId: string, targetTag: string, guildId: string, reason: string, moderatorId: string, moderatorTag: string }) {
  const db = getDB();
  db.auditLog.push({
    ...data,
    timestamp: new Date().toISOString()
  });
  saveDB(db);
}

function logSystem(type: "INFO" | "WARN" | "ERROR" | "SUCCESS", message: string, meta?: any) {
  const db = getDB();
  if (!db.systemLogs) db.systemLogs = [];
  
  db.systemLogs.push({
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    type,
    message,
    meta
  });

  // Keep last 200 logs
  if (db.systemLogs.length > 200) {
    db.systemLogs.shift();
  }
  
  saveDB(db);
  console.log(`[${type}] ${message}`, meta || "");
}

// Helper to check if a member bypasses a specific automod module
function isModuleBypassed(member: any, bypassRoles: string[] = [], bypassPermissions: string[] = []) {
  if (!member) return false;
  // Administrators always bypass
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  
  // Check specific roles
  if (bypassRoles && bypassRoles.length > 0) {
    if (bypassRoles.some(roleId => member.roles.cache.has(roleId))) return true;
  }
  
  // Check specific permissions
  if (bypassPermissions && bypassPermissions.length > 0) {
    return bypassPermissions.some(perm => {
      const bit = (PermissionFlagsBits as any)[perm];
      return bit && member.permissions.has(bit);
    });
  }
  
  return false;
}

// Helper to issue a warning and send DM
async function issueWarning(guild: any, target: any, moderator: { id: string, tag: string }, reason: string) {
  const db = getDB();
  
  const targetTag = target.user ? target.user.tag : target.tag;
  
  const newWarning = {
    userId: target.id,
    username: targetTag,
    guildId: guild.id,
    reason,
    timestamp: new Date().toISOString(),
    moderatorId: moderator.id
  };
  
  db.warnings.push(newWarning);
  saveDB(db);

  logAction({
    action: "WARN",
    targetId: target.id,
    targetTag: targetTag,
    guildId: guild.id,
    reason,
    moderatorId: moderator.id,
    moderatorTag: moderator.tag
  });

  // Try to DM the user
  try {
    const dmEmbed = new EmbedBuilder()
      .setTitle(`Warning Issued`)
      .setDescription(`You have been warned in **${guild.name}**`)
      .setColor(0xFFA500)
      .addFields(
        { name: "Reason", value: reason },
        { name: "Moderator", value: moderator.tag }
      )
      .setTimestamp();
    
    const sendTarget = target.user || target;
    await sendTarget.send({ embeds: [dmEmbed] }).catch(() => {
      console.log(`Could not send DM to ${targetTag}`);
    });
  } catch (err) {
    console.error("Error sending DM:", err);
  }
}

// Discord Bot Setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on("error", (err) => {
  logSystem("ERROR", `Discord client internal error: ${err.message}`);
  console.error("Discord Client internal error:", err);
});

client.on("warn", (msg) => {
  logSystem("WARN", `Discord client internal warning: ${msg}`);
});

process.on("unhandledRejection", (reason, promise) => {
  logSystem("ERROR", `Unhandled rejection detected at: ${promise}, reason: ${reason}`);
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  logSystem("ERROR", `Uncaught exception detected: ${error.message}`);
  console.error("Uncaught Exception:", error);
});

async function checkOffenseAI(content: string): Promise<{ violation: boolean, reason?: string }> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      lastGeminiStatus = 'missing';
      return runHeuristicFallback(content);
    }

    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are a professional Discord Moderator AI. 
Analyze the following message for toxic, offensive, abusive, hateful, or highly inappropriate content (English, Hindi, Hinglish, or mixed).
Message: "${content}"

Your goal is to detect harassment, slurs, sexual content, or excessive toxicity.
Respond in JSON format:
{
  "isOffensive": boolean,
  "reason": "very short explanation why it is offensive, else empty"
}
If unsure but it seems toxic, mark as offensive.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isOffensive: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          }
        }
      }
    });

    const result = JSON.parse(response.text);
    lastGeminiStatus = 'success';
    return { 
      violation: result.isOffensive, 
      reason: result.isOffensive ? `AI Detection: ${result.reason}` : undefined 
    };
  } catch (error: any) {
    if (error?.message?.includes("GEMINI_API_KEY environment variable is not set")) {
      lastGeminiStatus = 'missing';
      console.error(error.message);
    } else if (error?.status === 403 || error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('API_KEY_INVALID') || error?.status === 400) {
      lastGeminiStatus = 'permission_denied';
      console.error("Gemini API Permission Error: This usually means your API Key lacks the required scopes or is invalid. Please check Settings > Secrets.");
    } else {
      lastGeminiStatus = 'other_error';
      console.error("Gemini AI Detection Error:", error);
    }
    // Fallback to local heuristic checks if the AI fails
    return runHeuristicFallback(content);
  }
}
const spamCache = new Map<string, { messages: { id: string, timestamp: number }[], lastContent: string, duplicateMessages: string[] }>();

// Clean up caches every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of spamCache.entries()) {
    if (data.messages.length > 0 && now - data.messages[data.messages.length - 1].timestamp > 60000) {
      spamCache.delete(key);
    }
  }
  for (const [key, saturation] of mentionSaturationCache.entries()) {
    if (saturation.length > 0 && now - saturation[saturation.length - 1].time > 60000) {
      mentionSaturationCache.delete(key);
    }
  }
}, 600000);

// Mention saturation cache: guildId-userId => list of { count: number, time: number }
const mentionSaturationCache = new Map<string, { count: number, time: number }[]>();

// Auto-Role and Bot-Role Logic
client.on("guildMemberAdd", async (member) => {
  const db = getDB();
  const settings = db.serverSettings;
  if (!settings) return;

  try {
    if (member.user.bot) {
      if (settings.botRoleEnabled && settings.botRoleId) {
        const role = member.guild.roles.cache.get(settings.botRoleId);
        if (role) {
          await member.roles.add(role);
          logSystem("INFO", `Auto-assigned bot role to ${member.user.tag}`);
        }
      }
    } else {
      if (settings.autoRoleEnabled && settings.autoRoleId) {
        const role = member.guild.roles.cache.get(settings.autoRoleId);
        if (role) {
          await member.roles.add(role);
          logSystem("INFO", `Auto-assigned member role to ${member.user.tag}`);
        }
      }
    }
  } catch (err: any) {
    logSystem("ERROR", `Failed to auto-assign role to ${member.user.tag}: ${err.message}`);
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const db = getDB();
  let guildSettings = db.autoMod?.[message.guild.id];
  if (!guildSettings) {
    guildSettings = { ...DEFAULT_AUTOMOD_SETTINGS };
  } else {
    guildSettings = { ...DEFAULT_AUTOMOD_SETTINGS, ...guildSettings };
  }

  let violation = false;
  let reason = "";
  let actions: AutoModActions | null = null;

  const cacheKey = `${message.guildId}-${message.author.id}`;

  // 1. Anti-Spam
  const spamMessageIdsToDelete: string[] = [];
  if (guildSettings.antiSpam && !isModuleBypassed(message.member, guildSettings.antiSpamBypassRoles, guildSettings.antiSpamBypassPermissions)) {
    const now = Date.now();
    const userData = spamCache.get(cacheKey) || { messages: [], lastContent: "", duplicateMessages: [] };
    
    // Cleanup old messages (older than 5s for better burst detection)
    userData.messages = userData.messages.filter(m => now - m.timestamp < 5000);
    userData.messages.push({ id: message.id, timestamp: now });

    // Duplicate detection
    const cleanContent = message.content.trim().toLowerCase();
    if (cleanContent && userData.lastContent === cleanContent) {
      userData.duplicateMessages.push(message.id);
    } else {
      userData.lastContent = cleanContent;
      // If they changed the message, we only care about the last batch of duplicates
      userData.duplicateMessages = [message.id];
    }
    
    spamCache.set(cacheKey, userData);

    const spamLimit = guildSettings.spamLimit || 5;
    if (userData.messages.length > spamLimit) {
      violation = true;
      reason = `Excessive rapid-fire spam (${userData.messages.length} messages in 5s)`;
      actions = guildSettings.antiSpamActions;
      // Mark all messages in the burst for deletion
      spamMessageIdsToDelete.push(...userData.messages.map(m => m.id));
      // Clear after detection to avoid recursive deletion attempts for same batch
      userData.messages = [];
    } else if (userData.duplicateMessages.length >= 3) { // 3 same messages in a row
      violation = true;
      reason = "Duplicate message spam";
      actions = guildSettings.antiSpamActions;
      // Mark all duplicates for deletion
      spamMessageIdsToDelete.push(...userData.duplicateMessages);
      // Clear duplicates to avoid redundant deletion
      userData.duplicateMessages = [];
    }
  }

  // 2. Invite Filter
  if (!violation && guildSettings.inviteFilter && !isModuleBypassed(message.member, guildSettings.inviteFilterBypassRoles, guildSettings.inviteFilterBypassPermissions)) {
    const inviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li|com\/invite)|discordapp\.com\/invite)\/[^\s\/]+?(?=\b)/i;
    if (inviteRegex.test(message.content)) {
      violation = true;
      reason = "Unauthorized invite link";
      actions = guildSettings.inviteFilterActions;
    }
  }

  // 3. Mentions & Saturation
  if (!violation && guildSettings.mentionFilter && !isModuleBypassed(message.member, guildSettings.mentionFilterBypassRoles, guildSettings.mentionFilterBypassPermissions)) {
    const currentMentions = message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 1 : 0);
    const mentionLimit = guildSettings.maxMentions || 5;

    // Single message check
    if (currentMentions > mentionLimit) {
      violation = true;
      reason = "Mass mentioning in single message";
      actions = guildSettings.mentionFilterActions;
    } else if (currentMentions > 0) {
      // Saturation check (multiple messages)
      const now = Date.now();
      const saturation = mentionSaturationCache.get(cacheKey) || [];
      saturation.push({ count: currentMentions, time: now });
      
      // Keep only last 20 seconds
      const recentSaturation = saturation.filter(s => now - s.time < 20000);
      const totalRecentMentions = recentSaturation.reduce((sum, s) => sum + s.count, 0);
      
      mentionSaturationCache.set(cacheKey, recentSaturation);

      if (totalRecentMentions > mentionLimit * 2) { // 2x the limit in 20s
        violation = true;
        reason = `Mention Saturation: ${totalRecentMentions} mentions in 20s`;
        actions = guildSettings.mentionFilterActions;
      }
    }
  }

  // 4. Advanced Word Filter (English, Hindi, Hinglish, Slang, Leet-speak) + AI
  if (!violation && guildSettings.badWordFilter && !isModuleBypassed(message.member, guildSettings.badWordFilterBypassRoles, guildSettings.badWordFilterBypassPermissions)) {
    const rawContent = message.content;
    const content = rawContent.toLowerCase();
    const badWords = guildSettings.badWordList || DEFAULT_AUTOMOD_SETTINGS.badWordList;
    const ignoreList = guildSettings.badWordIgnoreList || [];
    const filterActions = guildSettings.badWordFilterActions || DEFAULT_AUTOMOD_SETTINGS.badWordFilterActions;

    // Check if message content contains any whitelisted "Safe Context" words
    const hasSafeWord = ignoreList.some(safeWord => content.includes(safeWord.toLowerCase()));
    
    if (!hasSafeWord) {
      // AI Detection (Only for non-tiny messages to save quota and latency)
      if (rawContent.length > 3) {
        const aiResult = await checkOffenseAI(rawContent);
        if (aiResult.violation) {
          violation = true;
          reason = aiResult.reason || "Advanced AI Detection Triggered";
          actions = filterActions;
        }
      }

      if (!violation) {
        // Basic leet-speak and regional character map (Devanagari support)
        const charMap: Record<string, string> = {
        'a': '[a4@\u0905\u0906\u03b1\u0430\u00e0\u00e1\u00e2\u00e3\u00e4\u00e5\u00e6]',
        'b': '[b8\u092C\u03b2\u0432\u00df]',
        'c': '[ck\u0915\u00a9\u03c2\u00e7]',
        'd': '[d\u0926\u0921\u03b4\u0434]',
        'e': '[e3\u090F\u0910\u20ac\u03b5\u0435\u00e8\u00e9\u00ea\u00eb]',
        'f': '[fph\u03c6]',
        'g': '[g96\u0917\u03b3\u0433]',
        'h': '[h\u0939\u03b7\u043d]',
        'i': '[i1!|\u0907\u0908\u03b9\u0456\u00ec\u00ed\u00ee\u00ef]',
        'j': '[j\u091C\u03be]',
        'k': '[ck\u0915\u03ba\u043a]',
        'l': '[l1|\u0932\u03bb]',
        'm': '[m\u092E\u03bc\u043c]',
        'n': '[n\u0928\u03bd\u043d\u00f1]',
        'o': '[o0\u0913\u0914\u03bf\u043e\u00f2\u00f3\u00f4\u00f5\u00f6\u00f8]',
        'p': '[p\u092A\u03c1\u0440]',
        'r': '[r\u0930\u03c1\u0440]',
        's': '[s5$\u0938\u03c3\u03c2]',
        't': '[t7+\u0924\u091F\u03c4]',
        'u': '[uv\u0909\u090A\u03c5\u0443\u00f9\u00fa\u00fb\u00fc]',
        'v': '[vu\u03bd]',
        'w': '[w\u03c9ww]',
        'x': '[x\u03c7\u0445]',
        'y': '[y\u03c8\u0443\u00fd\u00ff]',
        'z': '[z\u0950\u03b6]'
      };

      const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // 1. Normalized check: Flatten repeated characters and ignore non-alpha-numeric
      const normalizedContent = content
        .replace(/[^a-z0-9\u0900-\u097F]/gi, '') // Remove symbols
        .replace(/(.)\1+/g, '$1'); // Collapse repeats like 'ffffuuuuucccckkk' -> 'fuck'

      for (const word of [...(badWords || []), ...(guildSettings.wordFilter || [])]) {
        if (!word) continue;
        
        const cleanWord = word.toLowerCase().trim();
        if (cleanWord.length < 2) continue;

        // Check against normalized content
        if (normalizedContent.includes(cleanWord.replace(/(.)\1+/g, '$1'))) {
          violation = true;
          reason = `Banned word detected (Heuristic): ${word}`;
          actions = filterActions;
          break;
        }

        // 2. Original flexible regex check
        const pattern = word.split('').map(char => {
          const mapped = charMap[char.toLowerCase()];
          if (mapped) return mapped + '+';
          return escapeRegex(char) + '+';
        }).join('[^a-z0-9\u0900-\u097F]*');
        const regex = new RegExp(`(\\b|\\d|_|^)${pattern}(\\b|\\d|_|$)`, 'i');

        if (regex.test(content)) {
          violation = true;
          reason = `Banned word detected: ${word}`;
          actions = filterActions;
          if (!actions.mute && guildSettings.wordFilterActions?.mute) {
            actions = { ...actions, mute: true };
          }
          break;
        }
      }

      // Check Raw Banned Patterns (Regex)
      const patternsToCheck = (guildSettings.bannedPatterns && guildSettings.bannedPatterns.length > 0) 
        ? guildSettings.bannedPatterns 
        : DEFAULT_AUTOMOD_SETTINGS.bannedPatterns;

      if (!violation && patternsToCheck && patternsToCheck.length > 0) {
        for (const pattern of patternsToCheck) {
          try {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(message.content)) {
              violation = true;
              reason = `Banned pattern detected: ${pattern}`;
              actions = filterActions;
              break;
            }
          } catch (e) {
            console.error(`Invalid regex pattern in guild ${message.guildId}: ${pattern}`);
          }
        }
      }

      // 4.1 Zalgo/Glitch Text Detection
      if (!violation && /[\u0300-\u036f]{3,}/.test(message.content)) {
        violation = true;
        reason = "Zalgo/Glitched text detected";
        actions = filterActions;
      }

      // 4.2 Caps Abuse Detection (If message is long enough)
      if (!violation && message.content.length > 20) {
        const capsCount = message.content.replace(/[^A-Z]/g, "").length;
        if (capsCount / message.content.length > 0.7) {
          violation = true;
          reason = "Excessive Caps Lock usage";
          actions = filterActions;
        }
      }
    }
  }
}

  if (violation && actions) {
    try {
      const member = message.member;
      if (!member) return;

      logSystem("WARN", `Auto-Mod Triggered: ${reason} for ${message.author.tag}`, { actions });

      // Escalation Logic
      const userWarnings = db.warnings.filter((w: any) => w.userId === member.id && w.guildId === message.guildId);
      const isRepeatOffender = userWarnings.length >= 3;

      if (actions.delete) {
        if (spamMessageIdsToDelete.length > 0) {
          // Bulk delete if possible, otherwise individual
          const channel = message.channel;
          if ('bulkDelete' in channel) {
            // Remove duplicates from the ID list
            const uniqueIds = Array.from(new Set(spamMessageIdsToDelete));
            await (channel as any).bulkDelete(uniqueIds).catch(async (bulkErr: any) => {
              logSystem("WARN", "Bulk delete failed, attempting individual delete", bulkErr.message);
              // Fallback to individual for each ID
              for (const idToDel of uniqueIds) {
                try {
                  const msgToDel = await channel.messages.fetch(idToDel).catch(() => null);
                  if (msgToDel) await msgToDel.delete().catch(() => {});
                } catch (e) {}
              }
            });
          } else {
            await message.delete().catch(() => {});
          }
        } else {
          await message.delete().catch(() => {});
        }
      }

      if (actions.warn || isRepeatOffender) {
        await issueWarning(message.guild, member, { id: "SENTINEL-AI", tag: "SENTINEL-AI" }, `[Auto-Mod] ${reason} ${isRepeatOffender ? '(Escalated Due to History)' : ''}`);
      }

      if (isRepeatOffender && member.manageable) {
          const escalationDuration = (guildSettings.muteDurationMs || 600000) * 2;
          await member.timeout(escalationDuration, `[Auto-Mod] Repeat Offenses: ${reason}`);
          logSystem("SUCCESS", `Escalated Mute: ${member.user.tag} for ${escalationDuration / 60000}m`);
      } else if (actions.mute && member.manageable) {
        const muteDur = actions.muteDurationMs || guildSettings.muteDurationMs || 600000;
        await member.timeout(muteDur, `[Auto-Mod] ${reason}`);
        logSystem("SUCCESS", `Auto-Mod Mute: ${member.user.tag} for ${muteDur / 60000}m`);
      }

      if (actions.kick && member.kickable) {
        await member.kick(`[Auto-Mod] ${reason}`);
      }

      if (actions.ban && member.bannable) {
        await member.ban({ reason: `[Auto-Mod] ${reason}` });
      }

    } catch (err) {
      console.error("Auto-mod action failed:", err);
    }
  }
});

const commands = [
  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addUserOption(option => option.setName("target").setDescription("The member to warn").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("Reason for the warning").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("Check warnings for a member")
    .addUserOption(option => option.setName("target").setDescription("The member to check").setRequired(true)),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member")
    .addUserOption(option => option.setName("target").setDescription("The member to kick").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("Reason for the kick").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
    .addUserOption(option => option.setName("target").setDescription("The member to ban").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("Reason for the ban").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a member")
    .addStringOption(option => option.setName("userid").setDescription("The ID of the user to unban").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mute (timeout) a member")
    .addUserOption(option => option.setName("target").setDescription("The member to mute").setRequired(true))
    .addIntegerOption(option => option.setName("duration").setDescription("Duration in minutes").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("Reason for the mute").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Unmute (remove timeout) a member")
    .addUserOption(option => option.setName("target").setDescription("The member to unmute").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete a batch of messages")
    .addIntegerOption(option => 
      option.setName("amount")
        .setDescription("Number of messages to clear (1-1000)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1000))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock the current channel (Prevents @everyone from sending messages)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Unlock the current channel (Restores @everyone sending privileges)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Display operational statistics of the Cracked Tier system"),

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Display the Cracked Tier Command Manifest"),
].map(command => command.toJSON());

async function registerCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token || !clientId) {
    logSystem("ERROR", "DISCORD_TOKEN or DISCORD_CLIENT_ID missing in environment.");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(token);

  try {
    logSystem("INFO", "Refreshing application (/) commands...");
    
    // Register Global Commands
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    logSystem("SUCCESS", "Successfully reloaded global application (/) commands.");

    // Clear Guild Commands to prevent duplicates from previous registrations
    const guilds = Array.from(client.guilds.cache.values());
    for (const guild of guilds) {
      try {
        await rest.put(Routes.applicationGuildCommands(clientId, guild.id), { body: [] });
        logSystem("INFO", `Cleared legacy guild-specific commands for: ${guild.name}`);
      } catch (gErr: any) {
        logSystem("WARN", `Could not clear commands for guild ${guild.id}: ${gErr.message}`);
      }
    }
  } catch (error: any) {
    logSystem("ERROR", "Error registering commands:", error.message);
  }
}

client.on("ready", async () => {
  logSystem("SUCCESS", `Connected! Authenticated as ${client.user?.tag}`);
  registerCommands();
  
  // Fetch members for all guilds
  for (const guild of client.guilds.cache.values()) {
      logSystem("INFO", `Fetching members for ${guild.name}...`);
      await guild.members.fetch().catch(err => logSystem("ERROR", `Failed to fetch members for ${guild.name}: ${err.message}`));
  }
});

// Safely reply to an interaction, checking deferred/replied states and catching errors.
async function safeReply(interaction: any, options: any) {
  try {
    if (interaction.replied || interaction.deferred) {
      return await interaction.editReply(options);
    } else {
      return await interaction.reply(options);
    }
  } catch (err: any) {
    if (err.code === 10062 || err.message?.includes("Unknown interaction")) {
      console.warn("Interaction expired or already processed (10062):", err.message);
    } else if (err.code === 40060 || err.message?.includes("already been acknowledged")) {
      try {
        return await interaction.editReply(options);
      } catch (nestedErr) {
        console.error("Failed to editReply after acknowledgment error:", nestedErr);
      }
    } else {
      console.error("Failed to answer interaction safely:", err);
    }
  }
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guild } = interaction;

  if (!guild) {
    await interaction.reply({ content: "Commands can only be used in a server.", ephemeral: true }).catch(() => {});
    return;
  }

  try {
    if (commandName === "warn") {
      await interaction.deferReply().catch(() => {});
      const target = options.getUser("target")!;
      const reason = options.getString("reason") || "No reason provided";
      
      await issueWarning(guild, target, { id: interaction.user.id, tag: interaction.user.tag }, reason);

      const embed = new EmbedBuilder()
        .setTitle("Warning Issued")
        .setColor(0xFFA500)
        .addFields(
          { name: "User", value: `${target.tag} (${target.id})`, inline: true },
          { name: "Reason", value: reason, inline: true },
          { name: "Moderator", value: interaction.user.tag, inline: true }
        )
        .setTimestamp();

      await safeReply(interaction, { embeds: [embed] });
    }

    else if (commandName === "warnings") {
      const target = options.getUser("target")!;
      const db = getDB();
      const userWarnings = db.warnings.filter((w: any) => w.userId === target.id && w.guildId === guild.id);

      const embed = new EmbedBuilder()
        .setTitle(`Warnings for ${target.tag}`)
        .setColor(0x0099FF)
        .setDescription(userWarnings.length > 0 ? 
          userWarnings.map((w: any, i: number) => `**${i + 1}.** ${w.reason} (by <@${w.moderatorId}> on ${new Date(w.timestamp).toLocaleDateString()})`).join("\n") : 
          "This user has no warnings.")
        .setTimestamp();

      await safeReply(interaction, { embeds: [embed] });
    }

    else if (commandName === "kick") {
      await interaction.deferReply().catch(() => {});
      const targetUser = options.getUser("target")!;
      const reason = options.getString("reason") || "No reason provided";
      const member = await guild.members.fetch(targetUser.id);

      if (!member.kickable) {
        return safeReply(interaction, { content: "I cannot kick this member. They may have a higher role than me.", ephemeral: true });
      }

      await member.kick(reason);
      
      logAction({
        action: "KICK",
        targetId: targetUser.id,
        targetTag: targetUser.tag,
        guildId: guild.id,
        reason,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag
      });
      
      const embed = new EmbedBuilder()
        .setTitle("Member Kicked")
        .setColor(0xFF4500)
        .addFields(
          { name: "User", value: targetUser.tag, inline: true },
          { name: "Reason", value: reason, inline: true },
          { name: "Moderator", value: interaction.user.tag, inline: true }
        )
        .setTimestamp();

      await safeReply(interaction, { embeds: [embed] });
    }

    else if (commandName === "ban") {
      await interaction.deferReply().catch(() => {});
      const targetUser = options.getUser("target")!;
      const reason = options.getString("reason") || "No reason provided";
      const member = await guild.members.fetch(targetUser.id).catch(() => null);

      if (member && !member.bannable) {
        return safeReply(interaction, { content: "I cannot ban this member. They may have a higher role than me.", ephemeral: true });
      }

      await guild.members.ban(targetUser.id, { reason });

      logAction({
        action: "BAN",
        targetId: targetUser.id,
        targetTag: targetUser.tag,
        guildId: guild.id,
        reason,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag
      });

      const embed = new EmbedBuilder()
        .setTitle("Member Banned")
        .setColor(0xFF0000)
        .addFields(
          { name: "User", value: targetUser.tag, inline: true },
          { name: "Reason", value: reason, inline: true },
          { name: "Moderator", value: interaction.user.tag, inline: true }
        )
        .setTimestamp();

      await safeReply(interaction, { embeds: [embed] });
    }

    else if (commandName === "unban") {
      await interaction.deferReply().catch(() => {});
      const userId = options.getString("userid")!;
      
      try {
        await guild.members.unban(userId);
        
        logAction({
          action: "UNBAN",
          targetId: userId,
          targetTag: "N/A (ID Only)",
          guildId: guild.id,
          reason: "Manual Unban",
          moderatorId: interaction.user.id,
          moderatorTag: interaction.user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle("User Unbanned")
          .setColor(0x00FF00)
          .setDescription(`Successfully revoked exclusion for user ID: ${userId}`)
          .setTimestamp();

        await safeReply(interaction, { embeds: [embed] });
      } catch (err: any) {
        logSystem("ERROR", `Unban failed: ${err.message}`);
        await safeReply(interaction, { content: `Error: Failed to unban user. ${err.message}`, ephemeral: true });
      }
    }

    else if (commandName === "mute") {
      await interaction.deferReply().catch(() => {});
      const targetUser = options.getUser("target")!;
      const duration = options.getInteger("duration")!;
      const reason = options.getString("reason") || "No reason provided";
      const member = await guild.members.fetch(targetUser.id);

      if (!member.manageable) {
        return safeReply(interaction, { content: "I cannot mute this member.", ephemeral: true });
      }

      await member.timeout(duration * 60 * 1000, reason);

      logAction({
        action: "MUTE",
        targetId: targetUser.id,
        targetTag: targetUser.tag,
        guildId: guild.id,
        reason: `${reason} (${duration}m)`,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag
      });

      const embed = new EmbedBuilder()
        .setTitle("Member Muted")
        .setColor(0x808080)
        .addFields(
          { name: "User", value: targetUser.tag, inline: true },
          { name: "Duration", value: `${duration} minutes`, inline: true },
          { name: "Reason", value: reason, inline: true }
        )
        .setTimestamp();

      await safeReply(interaction, { embeds: [embed] });
    }

    else if (commandName === "unmute") {
      await interaction.deferReply().catch(() => {});
      const targetUser = options.getUser("target")!;
      const member = await guild.members.fetch(targetUser.id);

      if (!member.manageable) {
        return safeReply(interaction, { content: "I cannot unmute this member.", ephemeral: true });
      }

      await member.timeout(null);

      logAction({
        action: "UNMUTE",
        targetId: targetUser.id,
        targetTag: targetUser.tag,
        guildId: guild.id,
        reason: "Manual Unmute",
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag
      });

      const embed = new EmbedBuilder()
        .setTitle("Member Unmuted")
        .setColor(0x00FF00)
        .setDescription(`${targetUser.tag} has been unmuted.`)
        .setTimestamp();

      await safeReply(interaction, { embeds: [embed] });
    }

    else if (commandName === "stats") {
      logAction({
        action: "STATS",
        targetId: "SYSTEM",
        targetTag: "N/A",
        guildId: guild.id,
        reason: "Operational Check",
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag
      });

      const db = getDB();
      const uptime = client.uptime || 0;
      const h = Math.floor(uptime / 3600000);
      const m = Math.floor((uptime % 3600000) / 60000);
      
      const embed = new EmbedBuilder()
        .setTitle("📊 Cracked Tier Status")
        .setColor(0x00ff88)
        .addFields(
          { name: "Active Spheres", value: `${client.guilds.cache.size} Servers`, inline: true },
          { name: "Entites Scanned", value: `${client.users.cache.size} Users`, inline: true },
          { name: "Kernel Uptime", value: `${h}h ${m}m`, inline: true },
          { name: "Infractions", value: `${db.warnings.length} Recorded`, inline: true },
          { name: "Audit Volume", value: `${db.auditLog.length} Entries`, inline: true },
          { name: "Latency", value: `${client.ws.ping}ms`, inline: true }
        )
        .setFooter({ text: "Operational Status: NOMINAL" })
        .setTimestamp();

      await safeReply(interaction, { embeds: [embed] });
    }

    else if (commandName === "help") {
      logAction({
        action: "HELP",
        targetId: "SYSTEM",
        targetTag: "N/A",
        guildId: guild.id,
        reason: "Manifest Retrieval",
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag
      });

      const helpEmbed = new EmbedBuilder()
        .setTitle("🛡️ Cracked Tier Command Manifest")
        .setDescription("List of all active server roles and their details.")
        .setColor(0x00ff88)
        .addFields(
          { name: "/stats", value: "View global bot statistics" },
          { name: "/warn", value: "Issue a formal infraction warning" },
          { name: "/mute", value: "Suspend communication privileges" },
          { name: "/kick", value: "Remove entities from the guild" },
          { name: "/ban", value: "Permanent entity exclusion" },
          { name: "/purge", value: "Batch delete legacy messages" },
          { name: "/lock", value: "Restrict channel sending access" },
          { name: "/unlock", value: "Restore channel sending access" },
          { name: "/help", value: "Display this manifest" }
        )
        .setTimestamp()
        .setFooter({ text: "Cracked Tier Security Systems" });
      
      await safeReply(interaction, { embeds: [helpEmbed], ephemeral: true });
    }

    else if (commandName === "purge") {
      const amount = options.getInteger("amount")!;
      const channel = interaction.channel;

      if (!channel || !('bulkDelete' in channel)) {
        return safeReply(interaction, { content: "I cannot purge messages in this channel type.", ephemeral: true });
      }

      // Pre-flight permission check
      if (guild.members.me && !guild.members.me.permissionsIn(channel as any).has(PermissionFlagsBits.ManageMessages)) {
        return safeReply(interaction, { content: "Operational Failure: I lack the 'Manage Messages' permission in this channel.", ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true }).catch(() => {});

      try {
        let remaining = amount;
        let totalDeleted = 0;
        let stopReason = "";

        // Discord limit is 100 per bulkDelete, so loop if needed
        while (remaining > 0) {
          const deleteCount = Math.min(remaining, 100);
          // bulkDelete with 'true' filters out messages older than 14 days
          const deleted = await (channel as any).bulkDelete(deleteCount, true);
          totalDeleted += deleted.size;
          
          if (deleted.size < deleteCount) {
             // We stop if we couldn't find enough messages to delete (usually due to 14-day limit)
             if (deleted.size === 0 && remaining > 0) {
                stopReason = "Remaining messages are likely older than 14 days.";
             } else {
                stopReason = "Reached end of purgeable history.";
             }
             break;
          }
          
          remaining -= deleteCount;
          if (remaining > 0) await new Promise(r => setTimeout(r, 1200)); // Rate limit buffer
        }
        
        logSystem("INFO", `Purge successfully executed by ${interaction.user.tag} in ${channel.id}: ${totalDeleted} messages.`);
        
        logAction({
          action: "PURGE",
          targetId: channel.id,
          targetTag: `#${(channel as any).name || 'unknown-channel'}`,
          guildId: guild.id,
          reason: `Cleared ${totalDeleted} messages.${stopReason ? ` [${stopReason}]` : ""}`,
          moderatorId: interaction.user.id,
          moderatorTag: interaction.user.tag
        });

        const statusMsg = stopReason 
          ? `Successfully purged ${totalDeleted} messages. Note: ${stopReason}`
          : `Successfully purged ${totalDeleted} messages.`;

        await safeReply(interaction, { content: statusMsg });
      } catch (err: any) {
        logSystem("ERROR", `Critical: Purge failed: ${err.message}`);
        await safeReply(interaction, { content: `Critical Error: Failed to delete messages. Details: ${err.message}` });
      }
    }

    else if (commandName === "lock") {
      const channel = interaction.channel;
      if (!channel || !('permissionOverwrites' in channel)) {
        return safeReply(interaction, { content: "Operational Failure: Channel type does not support permission overrides.", ephemeral: true });
      }

      // Pre-flight permission check: Bot needs Manage Roles to edit overwrites
      if (guild.members.me && !guild.members.me.permissionsIn(channel as any).has(PermissionFlagsBits.ManageRoles)) {
        return safeReply(interaction, { content: "Operational Failure: I lack the 'Manage Roles' permission to modify channel lockdowns.", ephemeral: true });
      }

      await interaction.deferReply().catch(() => {});

      try {
        await (channel as any).permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: false
        }, { reason: `Locked by ${interaction.user.tag}` });

        logSystem("INFO", `Channel ${channel.id} locked by ${interaction.user.tag}`);
        
        logAction({
          action: "LOCK",
          targetId: channel.id,
          targetTag: `#${(channel as any).name || 'unknown-channel'}`,
          guildId: guild.id,
          reason: "Manual Channel Lockdown",
          moderatorId: interaction.user.id,
          moderatorTag: interaction.user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle("🔒 Channel Lockdown Initialized")
          .setDescription("This channel has been locked. Only authorized personnel can send transmissions.")
          .setColor(0xFF4500)
          .setTimestamp();

        await safeReply(interaction, { embeds: [embed] });
      } catch (err: any) {
        logSystem("ERROR", `Lock failed: ${err.message}`);
        await safeReply(interaction, { content: `Error: Failed to lock channel. ${err.message}` });
      }
    }

    else if (commandName === "unlock") {
      const channel = interaction.channel;
      if (!channel || !('permissionOverwrites' in channel)) {
        return safeReply(interaction, { content: "Operational Failure: Channel type does not support permission overrides.", ephemeral: true });
      }

      // Pre-flight permission check
      if (guild.members.me && !guild.members.me.permissionsIn(channel as any).has(PermissionFlagsBits.ManageRoles)) {
        return safeReply(interaction, { content: "Operational Failure: I lack the 'Manage Roles' permission to modify channel lockdowns.", ephemeral: true });
      }

      await interaction.deferReply().catch(() => {});

      try {
        await (channel as any).permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: null
        }, { reason: `Unlocked by ${interaction.user.tag}` });

        logSystem("INFO", `Channel ${channel.id} unlocked by ${interaction.user.tag}`);
        
        logAction({
          action: "UNLOCK",
          targetId: channel.id,
          targetTag: `#${(channel as any).name || 'unknown-channel'}`,
          guildId: guild.id,
          reason: "Restored Channel Access",
          moderatorId: interaction.user.id,
          moderatorTag: interaction.user.tag
        });

        const embed = new EmbedBuilder()
          .setTitle("🔓 Channel Lockdown Revoked")
          .setDescription("Transmissions have been restored for all entities.")
          .setColor(0x00FF00)
          .setTimestamp();

        await safeReply(interaction, { embeds: [embed] });
      } catch (err: any) {
        logSystem("ERROR", `Unlock failed: ${err.message}`);
        await safeReply(interaction, { content: `Error: Failed to unlock channel. ${err.message}` });
      }
    }

  } catch (error) {
    console.error("Interaction Error:", error);
    await safeReply(interaction, { content: "There was an error while executing this command!", ephemeral: true });
  }
});

async function startServer() {
  // API Routes
  app.get("/api/status", async (req, res) => {
    try {
      const db = getDB();
      const guildStats = new Map<string, { count: number, commands: Map<string, number> }>();
      
      db.auditLog.forEach((log: any) => {
        if (!log.guildId) return;
        if (!guildStats.has(log.guildId)) {
          guildStats.set(log.guildId, { count: 0, commands: new Map() });
        }
        const stats = guildStats.get(log.guildId)!;
        stats.count++;
        if (log.action) {
          stats.commands.set(log.action, (stats.commands.get(log.action) || 0) + 1);
        }
      });

      const guildList = await Promise.all(client.guilds.cache.map(async (g) => {
        try {
          const stats = guildStats.get(g.id);
          let topCommand = "N/A";
          if (stats && stats.commands.size > 0) {
            topCommand = Array.from(stats.commands.entries())
              .sort((a, b) => b[1] - a[1])[0][0];
          }

          // Use cache
          const members = g.members.cache;

          return {
            id: g.id,
            name: g.name,
            memberCount: g.memberCount,
            botCount: members.filter(m => m.user?.bot).size,
            commandCount: stats?.count || 0,
            topCommand: topCommand,
            icon: g.iconURL()
          };
        } catch (innerErr: any) {
          console.error(`Error processing stats for guild ${g.id}:`, innerErr);
          return {
            id: g.id,
            name: g.name,
            memberCount: g.memberCount,
            botCount: 0,
            commandCount: 0,
            topCommand: "N/A",
            icon: null
          };
        }
      }));

      res.json({
        online: client.isReady(),
        uptime: client.uptime,
        guilds: client.guilds.cache.size,
        guildList: guildList,
        botName: client.user?.tag || "Offline",
        configMissing: !process.env.DISCORD_TOKEN || !process.env.DISCORD_CLIENT_ID,
        clientId: process.env.DISCORD_CLIENT_ID
      });
    } catch (error: any) {
      console.error("Critical error in /api/status:", error);
      res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
  });

  app.get("/api/guild/:guildId/members", async (req, res) => {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    
    if (!guild) {
      return res.status(404).json({ error: "Guild not found" });
    }

    try {
      // Fetch members (limited to 50 for performance in dashboard view)
      const members = await guild.members.fetch({ limit: 50 });
      res.json(members.map(m => ({
        id: m.id,
        username: m.user?.username || "Unknown",
        displayName: m.displayName,
        avatar: m.user?.displayAvatarURL() || "",
        roles: m.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.hexColor })).filter(r => r.name !== "@everyone"),
        joinedAt: m.joinedAt
      })));
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.get("/api/guild/:guildId/roles", async (req, res) => {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    try {
      const botMember = await guild.members.fetch(client.user!.id);
      const isAdmin = botMember.permissions.has(PermissionFlagsBits.Administrator);
      const hasManageRoles = botMember.permissions.has(PermissionFlagsBits.ManageRoles);
      const hasModerateMembers = botMember.permissions.has(PermissionFlagsBits.ModerateMembers);
      const hasKickMembers = botMember.permissions.has(PermissionFlagsBits.KickMembers);
      const hasBanMembers = botMember.permissions.has(PermissionFlagsBits.BanMembers);

      const botHighestRole = botMember.roles.highest;

      const roles = guild.roles.cache
        .map(r => {
          const isBelowBot = r.comparePositionTo(botMember.roles.highest) < 0;
          const isEveryone = r.name === "@everyone";
          return {
            id: r.id,
            name: r.name,
            color: r.hexColor,
            position: r.position,
            permissions: r.permissions.bitfield.toString(),
            hoist: r.hoist,
            mentionable: r.mentionable,
            managed: r.managed,
            memberCount: r.members.size,
            editable: r.editable && isBelowBot && !isEveryone,
            canManagePermissions: (isAdmin || hasManageRoles) && (isBelowBot || isEveryone),
            isBelowBot,
            isEveryone,
            botHasPermission: isAdmin || hasManageRoles,
            isBotRole: r.id === botHighestRole.id
          };
        })
        .sort((a, b) => b.position - a.position);

      res.json({ roles, isAdmin, hasManageRoles, hasModerateMembers, hasKickMembers, hasBanMembers, botHighestRole: { id: botHighestRole.id, name: botHighestRole.name, position: botHighestRole.position } });
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  app.post("/api/guild/:guildId/role", async (req, res) => {
    const { guildId } = req.params;
    const { name } = req.body;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    try {
      const botMember = await guild.members.fetch(client.user!.id);
      if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles) && !botMember.permissions.has(PermissionFlagsBits.Administrator)) {
        return res.status(403).json({ error: "Bot lacks 'Manage Roles' permission." });
      }

      const role = await guild.roles.create({
        name: name || "New Role",
        reason: "Created via Dashboard",
        color: "#999999"
      });
      
      logSystem("SUCCESS", `Created new role ${role.name} in ${guild.name}`);
      res.json({ success: true, role: { id: role.id, name: role.name } });
    } catch (error: any) {
      console.error("Role creation error:", error);
      res.status(500).json({ error: error.message || "Failed to create role." });
    }
  });

  app.delete("/api/guild/:guildId/role/:roleId", async (req, res) => {
    const { guildId, roleId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    try {
      const botMember = await guild.members.fetch(client.user!.id);
      if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles) && !botMember.permissions.has(PermissionFlagsBits.Administrator)) {
        return res.status(403).json({ error: "Bot lacks 'Manage Roles' permission." });
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) return res.status(404).json({ error: "Role not found" });

      if (role.comparePositionTo(botMember.roles.highest) >= 0) {
        return res.status(403).json({ error: "Hierarchy restriction: Cannot delete roles above the bot's rank." });
      }

      await role.delete("Deleted via Dashboard");
      logSystem("SUCCESS", `Deleted role ${role.name} from ${guild.name}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Role deletion error:", error);
      res.status(500).json({ error: error.message || "Failed to delete role." });
    }
  });

  app.patch("/api/guild/:guildId/role/:roleId", async (req, res) => {
    const { guildId, roleId } = req.params;
    const { name, color, position, hoist, mentionable, permissions } = req.body;
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    try {
      const botMember = await guild.members.fetch(client.user!.id);
      const isAdmin = botMember.permissions.has(PermissionFlagsBits.Administrator);
      const hasManageRoles = botMember.permissions.has(PermissionFlagsBits.ManageRoles);

      if (!isAdmin && !hasManageRoles) {
        return res.status(403).json({ error: "Bot lacks 'Manage Roles' or 'Administrator' permission." });
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) return res.status(404).json({ error: "Role not found" });

      const isEveryone = role.name === "@everyone";

      if (role.comparePositionTo(botMember.roles.highest) >= 0 && !isEveryone) {
        return res.status(403).json({ 
          error: "Hierarchy Restriction: This role is higher than or equal to the bot's own highest role. Move the bot's role up in Discord settings to manage this rank." 
        });
      }
      
      if (!role.editable && !isEveryone) {
        return res.status(403).json({ error: "This role is protected or managed by an external system and cannot be modified." });
      }

      const updates: any = {};
      if (name !== undefined && !isEveryone) updates.name = name;
      if (color !== undefined && !isEveryone) updates.color = color;
      if (hoist !== undefined && !isEveryone) updates.hoist = hoist;
      if (mentionable !== undefined && !isEveryone) updates.mentionable = mentionable;
      if (permissions !== undefined) updates.permissions = BigInt(permissions);
      
      if (position !== undefined && !isEveryone) {
        await role.setPosition(position);
      }

      if (Object.keys(updates).length > 0) {
        await role.edit(updates);
      }

      logSystem("SUCCESS", `Reconfigured role ${role.name} in ${guild.name}`);
      res.json({ 
        success: true, 
        role: { 
          id: role.id, 
          name: role.name, 
          color: role.hexColor, 
          position: role.position, 
          permissions: role.permissions.bitfield.toString() 
        } 
      });
    } catch (error) {
      console.error("Role update error:", error);
      res.status(500).json({ error: "Role reconfiguration failed." });
    }
  });

  app.post("/api/guild/:guildId/roles/positions", async (req, res) => {
    const { guildId } = req.params;
    const { positions } = req.body; // Array of { id: string, position: number }
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    try {
      const botMember = await guild.members.fetch(client.user!.id);
      if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles) && !botMember.permissions.has(PermissionFlagsBits.Administrator)) {
        return res.status(403).json({ error: "Bot lacks permissions." });
      }

      await guild.roles.setPositions(positions);
      logSystem("SUCCESS", `Bulk reordered positions for ${positions.length} roles in ${guild.name}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Bulk role position update error:", error);
      res.status(500).json({ error: error.message || "Failed to update role positions." });
    }
  });

  app.get("/api/guild/:guildId/punishments", async (req, res) => {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    try {
      // Fetch Bans
      const banFetch = await guild.bans.fetch().catch(() => new Map());
      const banlist = Array.from(banFetch.values());
      
      const formattedBans = banlist.map((b: any) => ({
        id: b.user.id,
        type: 'BAN',
        user: {
          id: b.user.id,
          tag: b.user.tag,
          username: b.user.username,
          avatar: b.user.displayAvatarURL()
        },
        reason: b.reason || "No reason provided",
        timestamp: null
      }));

      // Fetch Timeouts (Mutes)
      // Note: fetching all members can be slow on very large guilds.
      const allMembers = await guild.members.fetch().catch(() => new Map());
      const timeouts = Array.from(allMembers.values()).filter((m: any) => m.communicationDisabledUntil && m.communicationDisabledUntil > new Date());
      
      const formattedTimeouts = timeouts.map((m: any) => ({
        id: m.id,
        type: 'TIMEOUT',
        user: {
          id: m.user.id,
          tag: m.user.tag,
          username: m.user.username,
          avatar: m.user.displayAvatarURL()
        },
        reason: "Active Timeout",
        expiry: m.communicationDisabledUntil
      }));

      res.json({
        bans: formattedBans,
        timeouts: formattedTimeouts
      });
    } catch (error) {
      console.error("Error fetching punishments:", error);
      res.status(500).json({ error: "Failed to fetch punishments." });
    }
  });

  app.get("/api/guild/:guildId/bans", async (req, res) => {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    
    if (!guild) {
      return res.status(404).json({ error: "Guild not found" });
    }

    try {
      const bans = await guild.bans.fetch();
      res.json(bans.map(b => ({
        user: {
          id: b.user.id,
          tag: b.user.tag,
          username: b.user.username,
          avatar: b.user.displayAvatarURL()
        },
        reason: b.reason
      })));
    } catch (error) {
      console.error("Error fetching bans:", error);
      res.status(500).json({ error: "Failed to fetch bans. Ensure the bot has 'Ban Members' permission." });
    }
  });

  app.post("/api/moderate/unban", async (req, res) => {
    const { guildId, userId, reason } = req.body;
    
    if (!guildId || !userId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    try {
      const modReason = reason || "Unbanned via Dashboard";
      
      // Check permissions
      if (!guild.members.me?.permissions.has("BanMembers")) {
        return res.status(403).json({ error: "Bot lacks 'Ban Members' permission." });
      }

      await guild.bans.remove(userId, modReason);
      logSystem("SUCCESS", `User ${userId} unbanned in guild ${guild.id}`);
      
      logAction({
        action: "UNBAN",
        targetId: userId,
        targetTag: `ID: ${userId}`,
        guildId: guild.id,
        reason: modReason,
        moderatorId: "Dashboard",
        moderatorTag: "Dashboard"
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Unban error:", error);
      res.status(500).json({ error: error.message || "Failed to unban user" });
    }
  });

  app.post("/api/moderate", async (req, res) => {
    const { guildId, userId, action, reason, duration } = req.body;
    
    if (!guildId || !userId || !action) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    if (!client.isReady()) {
      return res.status(503).json({ error: "Discord bot is not currently connected to Discord API." });
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found. Ensure the bot is invited to this server." });

    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return res.status(404).json({ error: "Member not found in this server." });
      
      const { roleId } = req.body;
      const modReason = reason || "No reason provided (Dashboard Action)";
      const modTag = "Dashboard";

      switch (action) {
        case "addRole": {
          if (!roleId) return res.status(400).json({ error: "Role ID required" });
          const role = guild.roles.cache.get(roleId);
          if (!role) return res.status(404).json({ error: "Role not found" });
          
          if (role.comparePositionTo(guild.members.me!.roles.highest) >= 0) {
            return res.status(400).json({ error: "I cannot manage this role. It is higher than or equal to my highest role." });
          }

          await member.roles.add(role, modReason);
          logSystem("SUCCESS", `Assigned role ${role.name} to ${member.user.tag}`);
          logAction({
            action: "ADD_ROLE",
            targetId: member.id,
            targetTag: member.user.tag,
            guildId: guild.id,
            reason: `${modReason} (Role: ${role.name})`,
            moderatorId: "Dashboard",
            moderatorTag: modTag
          });
          break;
        }
        case "removeRole": {
          if (!roleId) return res.status(400).json({ error: "Role ID required" });
          const role = guild.roles.cache.get(roleId);
          if (!role) return res.status(404).json({ error: "Role not found" });

          if (role.comparePositionTo(guild.members.me!.roles.highest) >= 0) {
            return res.status(400).json({ error: "I cannot manage this role. It is higher than or equal to my highest role." });
          }

          await member.roles.remove(role, modReason);
          logSystem("SUCCESS", `Removed role ${role.name} from ${member.user.tag}`);
          logAction({
            action: "REMOVE_ROLE",
            targetId: member.id,
            targetTag: member.user.tag,
            guildId: guild.id,
            reason: `${modReason} (Role: ${role.name})`,
            moderatorId: "Dashboard",
            moderatorTag: modTag
          });
          break;
        }
        case "warn": {
          await issueWarning(guild, member, { id: "Dashboard", tag: modTag }, modReason);
          logSystem("SUCCESS", `Warning issued to ${member.user.tag} via Dashboard`);
          break;
        }
        case "mute": {
          if (!duration) return res.status(400).json({ error: "Duration required for mute" });
          if (!member.manageable) return res.status(400).json({ error: "I cannot mute this member. Check bot permissions and role hierarchy." });
          
          // duration from dashboard is in seconds now
          await member.timeout(duration * 1000, modReason);
          logSystem("SUCCESS", `Mute applied to ${member.user.tag} via Dashboard (${duration}s)`);
          
          const h = Math.floor(duration / 3600);
          const m = Math.floor((duration % 3600) / 60);
          const s = duration % 60;
          const timeStr = `${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}m ` : ""}${s > 0 ? `${s}s` : ""}`.trim();

          logAction({
            action: "MUTE",
            targetId: member.id,
            targetTag: member.user.tag,
            guildId: guild.id,
            reason: `${modReason} (${timeStr})`,
            moderatorId: "Dashboard",
            moderatorTag: modTag
          });
          break;
        }
        case "kick": {
          if (!member.kickable) return res.status(400).json({ error: "I cannot kick this member. Check bot permissions and role hierarchy." });
          await member.kick(modReason);
          logSystem("SUCCESS", `Member ${member.user.tag} kicked via Dashboard`);
          logAction({
            action: "KICK",
            targetId: member.id,
            targetTag: member.user.tag,
            guildId: guild.id,
            reason: modReason,
            moderatorId: "Dashboard",
            moderatorTag: modTag
          });
          break;
        }
        case "ban": {
          if (!member.bannable) return res.status(400).json({ error: "I cannot ban this member. Check bot permissions and role hierarchy." });
          await guild.members.ban(userId, { reason: modReason });
          logSystem("SUCCESS", `Member ${member.user.tag} banned via Dashboard`);
          logAction({
            action: "BAN",
            targetId: member.id,
            targetTag: member.user.tag,
            guildId: guild.id,
            reason: modReason,
            moderatorId: "Dashboard",
            moderatorTag: modTag
          });
          break;
        }
        case "unmute": {
          if (!member.manageable) return res.status(400).json({ error: "I cannot unmute this member. Check bot permissions and role hierarchy." });
          await member.timeout(null);
          logSystem("SUCCESS", `Mute lifted for ${member.user.tag} via Dashboard`);
          logAction({
            action: "UNMUTE",
            targetId: member.id,
            targetTag: member.user.tag,
            guildId: guild.id,
            reason: modReason,
            moderatorId: "Dashboard",
            moderatorTag: modTag
          });
          break;
        }
        default:
          return res.status(400).json({ error: "Invalid action" });
      }

      res.json({ success: true, action });
    } catch (error: any) {
      console.error("Moderation error:", error);
      res.status(500).json({ error: error.message || "Moderation action failed" });
    }
  });

  app.get("/api/automod/:guildId", (req, res) => {
    const { guildId } = req.params;
    const db = getDB();
    if (!db.autoMod) db.autoMod = {};
    
    // Merge with defaults to ensure all fields like muteDurationMs are present
    const settings = { ...DEFAULT_AUTOMOD_SETTINGS, ...(db.autoMod[guildId] || {}) };
    res.json(settings);
  });

  app.post("/api/automod/:guildId", (req, res) => {
    const { guildId } = req.params;
    const db = getDB();
    if (!db.autoMod) db.autoMod = {};
    db.autoMod[guildId] = { ...(db.autoMod[guildId] || {}), ...req.body };
    saveDB(db);
    res.json({ success: true, settings: db.autoMod[guildId] });
  });

  app.get("/api/server-settings/:guildId", (req, res) => {
    const { guildId } = req.params;
    const db = getDB();
    
    if (!db.serverSettings) db.serverSettings = {};
    
    // Migration
    if (!db.serverSettings[guildId] && db.serverSettings.autoRoleId !== undefined) {
      db.serverSettings = { [guildId]: { ...db.serverSettings } };
      saveDB(db);
    }
    
    res.json(db.serverSettings[guildId] || { autoRoleId: null, botRoleId: null, autoRoleEnabled: false, botRoleEnabled: false });
  });

  app.post("/api/server-settings/:guildId", (req, res) => {
    const { guildId } = req.params;
    const db = getDB();
    
    if (!db.serverSettings) db.serverSettings = {};
    
    db.serverSettings[guildId] = { ...(db.serverSettings[guildId] || {}), ...req.body };
    saveDB(db);
    res.json({ success: true, settings: db.serverSettings[guildId] });
  });

  app.post("/api/guild/:guildId/apply-auto-roles", async (req, res) => {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found" });

    const db = getDB();
    const settings = db.serverSettings;
    if (!settings) return res.status(400).json({ error: "No settings found" });

    try {
      const members = await guild.members.fetch();
      let assignedCount = 0;
      for (const member of members.values()) {
        if (member.user.bot) {
          if (settings.botRoleEnabled && settings.botRoleId) {
            const role = guild.roles.cache.get(settings.botRoleId);
            if (role && !member.roles.cache.has(role.id)) {
              await member.roles.add(role);
              assignedCount++;
              await delay(1000); // 1 second delay between role additions
            }
          }
        } else {
          if (settings.autoRoleEnabled && settings.autoRoleId) {
            const role = guild.roles.cache.get(settings.autoRoleId);
            if (role && !member.roles.cache.has(role.id)) {
              await member.roles.add(role);
              assignedCount++;
              await delay(1000); // 1 second delay between role additions
            }
          }
        }
      }
      res.json({ success: true, count: assignedCount });
    } catch (err: any) {
      console.error("Apply auto-roles error:", err);
      res.status(500).json({ error: err.message || "Failed to apply auto-roles" });
    }
  });

  app.get("/api/system-status", (req, res) => {
    const aiActive = (process.env.GEMINI_API_KEY && lastGeminiStatus !== 'permission_denied') ? true : false;
    res.json({
      online: true,
      aiActive: aiActive,
      geminiStatus: lastGeminiStatus,
      discordReady: client.isReady(),
      uptime: process.uptime()
    });
  });

  app.post("/api/retest-gemini", async (req, res) => {
    try {
      // Reload .env file to fetch newly added variables or changes
      dotenv.config({ override: true });
      
      // Clear instance cache to allow recreation with the fresh key
      genAIInstance = null;
      lastUsedApiKey = undefined;
      
      // Execute the test ping
      await testGeminiAPI();
      
      const aiActive = (process.env.GEMINI_API_KEY && lastGeminiStatus !== 'permission_denied') ? true : false;
      res.json({
        success: lastGeminiStatus === 'success',
        geminiStatus: lastGeminiStatus,
        aiActive: aiActive
      });
    } catch (err: any) {
      console.error("Manual Gemini retest error:", err);
      res.status(500).json({ error: err.message || "Failed to retest connection" });
    }
  });

  app.get("/api/users", (req, res) => {
    const db = getDB();
    // Group warnings by user to create a "Database" view
    const userMap = new Map();
    
    db.warnings.forEach((w: any) => {
      if (!userMap.has(w.userId)) {
        userMap.set(w.userId, {
          id: w.userId,
          username: w.username,
          warningCount: 0,
          history: []
        });
      }
      const user = userMap.get(w.userId);
      user.warningCount++;
      user.history.push(w);
    });

    res.json(Array.from(userMap.values()));
  });

  app.get("/api/audit", (req, res) => {
    const db = getDB();
    res.json(db.auditLog.reverse());
  });

  app.get("/api/system-logs", (req, res) => {
    const db = getDB();
    res.json((db.systemLogs || []).slice().reverse());
  });

  app.get("/api/commands", (req, res) => {
    res.json([
      { name: "/stats", desc: "View global bot statistics", perm: "Public" },
      { name: "/warn", desc: "Issue a formal infraction warning", perm: "Moderate Members" },
      { name: "/mute", desc: "Suspend communication privileges", perm: "Moderate Members" },
      { name: "/unmute", desc: "Restore communication privileges", perm: "Moderate Members" },
      { name: "/kick", desc: "Remove entities from the guild", perm: "Kick Members" },
      { name: "/ban", desc: "Permanent entity exclusion", perm: "Ban Members" },
      { name: "/unban", desc: "Revoke entity exclusion", perm: "Ban Members" },
      { name: "/purge", desc: "Batch delete legacy messages (Clear up to 1000)", perm: "Manage Messages" },
      { name: "/lock", desc: "Restrict channel sending access", perm: "Manage Channels" },
      { name: "/unlock", desc: "Restore channel sending access", perm: "Manage Channels" },
      { name: "/help", desc: "Display the Sentinel Command Manifest", perm: "Public" }
    ]);
  });

  app.get("/api/staff", (req, res) => {
    const db = getDB();
    const staffMap = new Map();

    db.auditLog.forEach((log: any) => {
      if (!log.moderatorId) return;
      if (!staffMap.has(log.moderatorId)) {
        let role = "Sentinel Staff";
        // Attempt to extract highest role from discord client
        try {
          const guild = client.guilds.cache.get(log.guildId);
          if (guild) {
            const member = guild.members.cache.get(log.moderatorId);
            if (member) {
              role = member.roles.highest.name;
            }
          }
        } catch (err) {
          // Fallback to default
        }

        staffMap.set(log.moderatorId, {
          id: log.moderatorId,
          tag: log.moderatorTag,
          role: role,
          actions: 0,
          breakdown: { WARN: 0, MUTE: 0, KICK: 0, BAN: 0, UNMUTE: 0, "AUTO-MOD": 0 }
        });
      }
      const staff = staffMap.get(log.moderatorId);
      staff.actions++;
      if (staff.breakdown[log.action] !== undefined) {
        staff.breakdown[log.action]++;
      }
    });

    res.json(Array.from(staffMap.values()));
  });

  app.get("/api/stats", (req, res) => {
    const db = getDB();
    res.json({
      totalWarnings: db.warnings.length,
      recentWarnings: db.warnings.slice(-5).reverse()
    });
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global Error Handler:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal Server Error",
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Test Gemini API connection
    testGeminiAPI();

    // Start Discord Bot
    if (process.env.DISCORD_TOKEN) {
      logSystem("INFO", "Attempting gateway connection...");
      client.login(process.env.DISCORD_TOKEN).catch(err => {
        logSystem("ERROR", `Gateway login failed: ${err.message}`);
      });
    } else {
      logSystem("WARN", "DISCORD_TOKEN not found. Bot entering standby mode.");
    }
  });
}

startServer();
