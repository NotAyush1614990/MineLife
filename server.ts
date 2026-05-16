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

dotenv.config();

const app = express();
const PORT = 3000;

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
      mentionFilter: true
    }
  }));
}

function getDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const defaultDB = { 
        warnings: [], 
        auditLog: [],
        autoMod: { antiSpam: true, inviteFilter: true, wordFilter: [], maxMentions: 5 }
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
      data.autoMod = { 
        antiSpam: true, 
        antiSpamActions: { delete: true, warn: true, mute: false, ban: false, kick: false },
        spamLimit: 5,
        muteDurationMs: 10 * 60 * 1000,
        inviteFilter: true, 
        inviteFilterActions: { delete: true, warn: false, mute: false, ban: false, kick: false },
        wordFilter: [], 
        wordFilterActions: { delete: true, warn: true, mute: false, ban: false, kick: false },
        maxMentions: 5,
        mentionFilter: true,
        mentionFilterActions: { delete: true, warn: true, mute: false, ban: false, kick: false }
      };
    } else {
      // Migrate legacy fields to new structure if they exist but actions are missing
      const defaultActions = { delete: true, warn: true, mute: false, ban: false, kick: false };
      
      if (data.autoMod.spamLimit === undefined) data.autoMod.spamLimit = 5;
      if (data.autoMod.muteDurationMs === undefined) data.autoMod.muteDurationMs = 10 * 60 * 1000;

      if (!data.autoMod.antiSpamActions) {
        data.autoMod.antiSpamActions = { ...defaultActions };
      } else if (data.autoMod.antiSpamActions.kick === undefined) {
        data.autoMod.antiSpamActions.kick = false;
      }

      if (!data.autoMod.inviteFilterActions) {
        data.autoMod.inviteFilterActions = { delete: true, warn: false, mute: false, ban: false, kick: false };
      } else if (data.autoMod.inviteFilterActions.kick === undefined) {
        data.autoMod.inviteFilterActions.kick = false;
      }

      if (!data.autoMod.wordFilterActions) {
        data.autoMod.wordFilterActions = { ...defaultActions };
      } else if (data.autoMod.wordFilterActions.kick === undefined) {
        data.autoMod.wordFilterActions.kick = false;
      }

      if (!data.autoMod.mentionFilterActions) {
        data.autoMod.mentionFilterActions = { ...defaultActions };
      } else if (data.autoMod.mentionFilterActions.kick === undefined) {
        data.autoMod.mentionFilterActions.kick = false;
      }
      
      if (data.autoMod.mentionFilter === undefined) {
        data.autoMod.mentionFilter = true;
      }
      
      // Remove old single-action fields if they exist (optional but cleaner)
      delete data.autoMod.antiSpamAction;
      delete data.autoMod.inviteFilterAction;
      delete data.autoMod.wordFilterAction;
      delete data.autoMod.mentionFilterAction;
    }
    if (!data.auditLog) {
      data.auditLog = [];
    }
    if (!data.warnings) {
      data.warnings = [];
    }
    return data;
  } catch (error) {
    console.error("Critical: Failed to parse database.json, resetting to default.", error);
    const defaultDB = { 
      warnings: [], 
      auditLog: [],
      autoMod: { 
        antiSpam: true, 
        antiSpamActions: { delete: true, warn: true, mute: false, ban: false },
        spamLimit: 5,
        muteDurationMs: 10 * 60 * 1000,
        inviteFilter: true, 
        inviteFilterActions: { delete: true, warn: false, mute: false, ban: false },
        wordFilter: [], 
        wordFilterActions: { delete: true, warn: true, mute: false, ban: false },
        maxMentions: 5,
        mentionFilter: true,
        mentionFilterActions: { delete: true, warn: true, mute: false, ban: false }
      }
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

// Guild-aware anti-spam cache: guildId-userId => data
const spamCache = new Map<string, { count: number, lastMessage: number }>();

// Mention saturation cache: guildId-userId => list of { count: number, time: number }
const mentionSaturationCache = new Map<string, { count: number, time: number }[]>();

// Auto-mod logic
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const db = getDB();
  const settings = db.autoMod;
  let violation = false;
  let reason = "";
  let actions: { delete: boolean, warn: boolean, mute: boolean, ban: boolean, kick: boolean } | null = null;

  // Bypass moderators and administrators
  if (message.member?.permissions.has(PermissionFlagsBits.ModerateMembers) || 
      message.member?.permissions.has(PermissionFlagsBits.ManageMessages) ||
      message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
    return;
  }

  const cacheKey = `${message.guildId}-${message.author.id}`;

  // Anti-Spam Logic (Message Frequency)
  if (settings.antiSpam) {
    const now = Date.now();
    const userData = spamCache.get(cacheKey) || { count: 0, lastMessage: now };
    
    // 3 second sliding window for message frequency
    if (now - userData.lastMessage < 3000) {
      userData.count++;
    } else {
      userData.count = 1;
    }
    userData.lastMessage = now;
    spamCache.set(cacheKey, userData);

    if (userData.count > (settings.spamLimit || 5)) {
      violation = true;
      reason = "Spamming too many messages (burst)";
      actions = settings.antiSpamActions;
    }
  }

  // Invite Link Filter (Improved Regex)
  if (!violation && settings.inviteFilter) {
    // Matches discord.gg, discord.com/invite, discordapp.com/invite, etc.
    const inviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li|com\/invite)|discordapp\.com\/invite)\/[^\s\/]+?(?=\b)/i;
    if (inviteRegex.test(message.content)) {
      violation = true;
      reason = "Unauthorized invite link detected";
      actions = settings.inviteFilterActions;
    }
  }

  // Word Filter
  if (!violation && settings.wordFilter && settings.wordFilter.length > 0) {
    const content = message.content.toLowerCase();
    for (const word of settings.wordFilter) {
      if (content.includes(word.toLowerCase())) {
        violation = true;
        reason = `Banned vocabulary detected: ${word}`;
        actions = settings.wordFilterActions;
        break;
      }
    }
  }

  // Mention Saturation (Advanced: Burst mentions in time window)
  if (!violation && settings.mentionFilter) {
    const now = Date.now();
    // Count mentions in CURRENT message
    const currentMentions = message.mentions.users.size + 
                           message.mentions.roles.size + 
                           (message.mentions.everyone ? 1 : 0);

    if (currentMentions > 0) {
      // Single message limit check
      if (currentMentions > (settings.maxMentions || 5)) {
        violation = true;
        reason = "Mass mention saturation detected (excessive pings)";
        actions = settings.mentionFilterActions;
      } else {
        // Multi-message "saturation" window check (e.g. 15 mentions in 10 seconds)
        let history = mentionSaturationCache.get(cacheKey) || [];
        // Prune entries older than 10 seconds
        history = history.filter(h => now - h.time < 10000);
        history.push({ count: currentMentions, time: now });
        mentionSaturationCache.set(cacheKey, history);

        const totalBurstMentions = history.reduce((sum, h) => sum + h.count, 0);
        
        // If they pinged say, 20 people in 10 seconds across multiple messages
        if (totalBurstMentions > (settings.maxMentions * 1.5 || 10)) {
          violation = true;
          reason = "Mention saturation threshold exceeded (multi-message burst)";
          actions = settings.mentionFilterActions;
        }
      }
    }
  }

  if (violation && actions) {
    try {
      const member = message.member;
      if (!member) return;

      logSystem("WARN", `Auto-Mod Triggered: ${reason} for ${message.author.tag}`, { actions });

      if (actions.delete) {
        await message.delete().catch(() => {});
      }

      if (actions.warn) {
        await issueWarning(message.guild, member, { id: "SENTINEL-AI", tag: "SENTINEL-AI" }, `[Auto-Mod] ${reason}`);
      }

      if (actions.mute && member.manageable) {
        const durationMs = settings.muteDurationMs || 10 * 60 * 1000;
        await member.timeout(durationMs, `[Auto-Mod] ${reason}`);
        
        const h = Math.floor(durationMs / 3600000);
        const m = Math.floor((durationMs % 3600000) / 60000);
        const s = Math.floor((durationMs % 60000) / 1000);
        const timeStr = `${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}m ` : ""}${s > 0 ? `${s}s` : ""}`.trim();

        logAction({
          action: "MUTE",
          targetId: member.id,
          targetTag: member.user.tag,
          guildId: message.guild.id,
          reason: `[Auto-Mod] ${reason} (${timeStr})`,
          moderatorId: "SENTINEL-AI",
          moderatorTag: "SENTINEL-AI"
        });
      }

      if (actions.kick && member.kickable) {
        await member.kick(`[Auto-Mod] ${reason}`);
        logSystem("SUCCESS", `Auto-Mod Kicked ${member.user.tag} for ${reason}`);
        logAction({
          action: "KICK",
          targetId: member.id,
          targetTag: member.user.tag,
          guildId: message.guild.id,
          reason: `[Auto-Mod] ${reason}`,
          moderatorId: "SENTINEL-AI",
          moderatorTag: "SENTINEL-AI"
        });
      }

      if (actions.ban && member.bannable) {
        await member.ban({ reason: `[Auto-Mod] ${reason}` });
        logSystem("SUCCESS", `Auto-Mod Banned ${member.user.tag} for ${reason}`);
        logAction({
          action: "BAN",
          targetId: member.id,
          targetTag: member.user.tag,
          guildId: message.guild.id,
          reason: `[Auto-Mod] ${reason}`,
          moderatorId: "SENTINEL-AI",
          moderatorTag: "SENTINEL-AI"
        });
      }

      console.log(`Auto-Mod: ${reason} Actions: ${JSON.stringify(actions)} User: ${message.author.tag}`);
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

client.on("ready", () => {
  logSystem("SUCCESS", `Connected! Authenticated as ${client.user?.tag}`);
  registerCommands();
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guild } = interaction;

  if (!guild) {
    await interaction.reply({ content: "Commands can only be used in a server.", ephemeral: true });
    return;
  }

  try {
    if (commandName === "warn") {
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

      await interaction.reply({ embeds: [embed] });
    }

    if (commandName === "warnings") {
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

      await interaction.reply({ embeds: [embed] });
    }

    if (commandName === "kick") {
      const targetUser = options.getUser("target")!;
      const reason = options.getString("reason") || "No reason provided";
      const member = await guild.members.fetch(targetUser.id);

      if (!member.kickable) {
        return interaction.reply({ content: "I cannot kick this member. They may have a higher role than me.", ephemeral: true });
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

      await interaction.reply({ embeds: [embed] });
    }

    if (commandName === "ban") {
      const targetUser = options.getUser("target")!;
      const reason = options.getString("reason") || "No reason provided";
      const member = await guild.members.fetch(targetUser.id).catch(() => null);

      if (member && !member.bannable) {
        return interaction.reply({ content: "I cannot ban this member. They may have a higher role than me.", ephemeral: true });
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

      await interaction.reply({ embeds: [embed] });
    }

    if (commandName === "unban") {
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

        await interaction.reply({ embeds: [embed] });
      } catch (err: any) {
        logSystem("ERROR", `Unban failed: ${err.message}`);
        await interaction.reply({ content: `Error: Failed to unban user. ${err.message}`, ephemeral: true });
      }
    }

    if (commandName === "mute") {
      const targetUser = options.getUser("target")!;
      const duration = options.getInteger("duration")!;
      const reason = options.getString("reason") || "No reason provided";
      const member = await guild.members.fetch(targetUser.id);

      if (!member.manageable) {
        return interaction.reply({ content: "I cannot mute this member.", ephemeral: true });
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

      await interaction.reply({ embeds: [embed] });
    }

    if (commandName === "unmute") {
      const targetUser = options.getUser("target")!;
      const member = await guild.members.fetch(targetUser.id);

      if (!member.manageable) {
        return interaction.reply({ content: "I cannot unmute this member.", ephemeral: true });
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

      await interaction.reply({ embeds: [embed] });
    }

    if (commandName === "stats") {
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

      await interaction.reply({ embeds: [embed] });
    }

    if (commandName === "help") {
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
        .setDescription("List of all active operational protocols.")
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
      
      await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }

    if (commandName === "purge") {
      const amount = options.getInteger("amount")!;
      const channel = interaction.channel;

      if (!channel || !('bulkDelete' in channel)) {
        return interaction.reply({ content: "I cannot purge messages in this channel type.", ephemeral: true });
      }

      // Pre-flight permission check
      if (guild.members.me && !guild.members.me.permissionsIn(channel as any).has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: "Operational Failure: I lack the 'Manage Messages' permission in this channel.", ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

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

        await interaction.editReply({ content: statusMsg });
      } catch (err: any) {
        logSystem("ERROR", `Critical: Purge failed: ${err.message}`);
        await interaction.editReply({ content: `Critical Error: Failed to execute purge protocol. Details: ${err.message}` });
      }
    }

    if (commandName === "lock") {
      const channel = interaction.channel;
      if (!channel || !('permissionOverwrites' in channel)) {
        return interaction.reply({ content: "Operational Failure: Channel type does not support permission overrides.", ephemeral: true });
      }

      // Pre-flight permission check: Bot needs Manage Roles to edit overwrites
      if (guild.members.me && !guild.members.me.permissionsIn(channel as any).has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({ content: "Operational Failure: I lack the 'Manage Roles' permission to modify channel lockdowns.", ephemeral: true });
      }

      await interaction.deferReply();

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

        await interaction.editReply({ embeds: [embed] });
      } catch (err: any) {
        logSystem("ERROR", `Lock failed: ${err.message}`);
        await interaction.editReply({ content: `Error: Failed to lock channel. ${err.message}` });
      }
    }

    if (commandName === "unlock") {
      const channel = interaction.channel;
      if (!channel || !('permissionOverwrites' in channel)) {
        return interaction.reply({ content: "Operational Failure: Channel type does not support permission overrides.", ephemeral: true });
      }

      // Pre-flight permission check
      if (guild.members.me && !guild.members.me.permissionsIn(channel as any).has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({ content: "Operational Failure: I lack the 'Manage Roles' permission to modify channel lockdowns.", ephemeral: true });
      }

      await interaction.deferReply();

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

        await interaction.editReply({ embeds: [embed] });
      } catch (err: any) {
        logSystem("ERROR", `Unlock failed: ${err.message}`);
        await interaction.editReply({ content: `Error: Failed to unlock channel. ${err.message}` });
      }
    }

  } catch (error) {
    console.error("Interaction Error:", error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: "There was an error while executing this command!", ephemeral: true });
    } else {
      await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true });
    }
  }
});

async function startServer() {
  // API Routes
  app.get("/api/status", (req, res) => {
    const db = getDB();
    const guildStats = new Map<string, { count: number, commands: Map<string, number> }>();
    
    db.auditLog.forEach((log: any) => {
      if (!log.guildId) return;
      if (!guildStats.has(log.guildId)) {
        guildStats.set(log.guildId, { count: 0, commands: new Map() });
      }
      const stats = guildStats.get(log.guildId)!;
      stats.count++;
      stats.commands.set(log.action, (stats.commands.get(log.action) || 0) + 1);
    });

    res.json({
      online: client.isReady(),
      uptime: client.uptime,
      guilds: client.guilds.cache.size,
      guildList: client.guilds.cache.map(g => {
        const stats = guildStats.get(g.id);
        let topCommand = "N/A";
        if (stats && stats.commands.size > 0) {
          topCommand = Array.from(stats.commands.entries())
            .sort((a, b) => b[1] - a[1])[0][0];
        }

        return {
          id: g.id,
          name: g.name,
          memberCount: g.memberCount,
          commandCount: stats?.count || 0,
          topCommand: topCommand,
          icon: g.iconURL()
        };
      }),
      botName: client.user?.tag || "Offline",
      configMissing: !process.env.DISCORD_TOKEN || !process.env.DISCORD_CLIENT_ID,
      clientId: process.env.DISCORD_CLIENT_ID
    });
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
        username: m.user.username,
        displayName: m.displayName,
        avatar: m.user.displayAvatarURL(),
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
      const roles = guild.roles.cache
        .filter(r => r.name !== "@everyone" && r.comparePositionTo(botMember.roles.highest) < 0 && !r.managed)
        .map(r => ({
          id: r.id,
          name: r.name,
          color: r.hexColor,
          position: r.position
        }))
        .sort((a, b) => b.position - a.position);

      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
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

  app.get("/api/automod", (req, res) => {
    const db = getDB();
    res.json(db.autoMod);
  });

  app.post("/api/automod", (req, res) => {
    const db = getDB();
    db.autoMod = { ...db.autoMod, ...req.body };
    saveDB(db);
    res.json({ success: true, settings: db.autoMod });
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
