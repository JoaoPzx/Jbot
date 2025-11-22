// index.js
const { EmbedBuilder, Collection, Client, IntentsBitField } = require('discord.js');
const { partidasAtivas, iniciarRodada } = require("./commands/Game/Partidas/play");

require('dotenv').config();
const { connect } = require('./database');
const fs = require('fs');
const path = require('path');
const Canvas = require("canvas");

// ======================================================
// 🔥 REGISTRO DAS FONTES SF PRO DISPLAY (DEFINITIVO)
// ======================================================

// ============================================
// Registro oficial e correto da SF Pro Display
// ============================================

Canvas.registerFont(
  path.join(__dirname, "assets", "fonts", "SFProDisplay-Regular.ttf"),
  { family: "SF Pro Display", weight: "400" }
);

Canvas.registerFont(
  path.join(__dirname, "assets", "fonts", "SFPRODISPLAYMEDIUM.ttf"),
  { family: "SF Pro Display", weight: "500" }
);

Canvas.registerFont(
  path.join(__dirname, "assets", "fonts", "SFProDisplay-Bold.ttf"),
  { family: "SF Pro Display", weight: "700" }
);

console.log("✔ SF Pro Display (Regular, Medium, Bold,) registrada com sucesso!");



// ======================================================
// 🔥 CONECTAR AO MONGO
// ======================================================

connect();

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMembers
  ]
});

// --- suas configs antigas ---
const canalSorteioID = '1437599327093657600';
const prefix = process.env.PREFIX || ';';

// --- Coleções ---
client.commands = new Collection();
client.slashCommands = new Collection();

// ======================================================
//      🔥 CARREGAR COMANDOS PREFIX — RECURSIVO
// ======================================================

function loadPrefixCommands(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.lstatSync(fullPath);

    if (stat.isDirectory()) {
      if (file !== "slash") loadPrefixCommands(fullPath);
      continue;
    }

    if (file.endsWith(".js")) {
      const command = require(fullPath);
      command.filePath = fullPath;

      if (command.name) {
        client.commands.set(command.name, command);
      }
    }
  }
}

loadPrefixCommands(path.join(__dirname, "commands"));
console.log("Prefix commands carregados (recursivo).");

// ======================================================
//       🔥 CARREGAR COMANDOS SLASH — RECURSIVO
// ======================================================

function loadSlashCommands(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.lstatSync(fullPath);

    if (stat.isDirectory()) {
      loadSlashCommands(fullPath);
      continue;
    }

    if (file.endsWith(".js")) {
      const command = require(fullPath);

      if (command.data && command.execute) {
        client.slashCommands.set(command.data.name, command);
      } else {
        console.warn(`Arquivo de slash inválido: ${file}`);
      }
    }
  }
}

loadSlashCommands(path.join(__dirname, "commands", "slash"));
console.log("Slash commands carregados (recursivo).");

// ======================================================
//                   EVENTS & LISTENERS
// ======================================================

client.on('clientReady', () => {
  console.log(`${client.user.tag} está online!`);
});

// Limpar canal de sorteio
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id === canalSorteioID) {
    try { await message.delete(); } catch (err) {
      console.error('Erro ao apagar mensagem no canal de sorteio:', err);
    }
  }
});

// Handler de prefixo
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command =
    client.commands.get(commandName) ||
    client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (error) {
    console.error(error);
    message.reply('❌ Ocorreu um erro ao executar esse comando.');
  }
});

// Handler de SLASH + BOTÕES
client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isAutocomplete()) {
      const cmd = client.slashCommands.get(interaction.commandName);
      if (cmd?.autocomplete) {
        try { return await cmd.autocomplete(interaction); }
        catch (err) {
          console.error("Erro no autocomplete:", err);
          return interaction.respond([]);
        }
      }
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === "despausar_partida") {
        const partida = partidasAtivas.get(interaction.channel.id);

        if (!partida || !partida.pausada) {
          return interaction.reply({ content: "❌ A partida não está mais pausada.", ephemeral: true });
        }

        if (interaction.user.id !== partida.autorPausa) {
          return interaction.reply({
            content: "❌ Apenas quem pausou pode despausar a partida.",
            ephemeral: true
          });
        }

        partida.pausada = false;
        clearTimeout(partida.despausarTimer);

        const embed = new EmbedBuilder()
          .setColor("#2ecc71")
          .setTitle("▶️ Partida Retomada")
          .setDescription(`A partida foi retomada por ${interaction.user}.`)
          .setFooter({ text: "A próxima imagem será enviada em instantes..." })
          .setTimestamp();

        await interaction.update({
          content: "",
          embeds: [embed],
          components: []
        });

        setTimeout(() => iniciarRodada(interaction.message, partida), 1000);
        return;
      }

      if (interaction.customId === "confirmar_acao") {
        const texto = interaction.message.embeds[0]?.description ?? "Ação concluída.";
        const embed2 = new EmbedBuilder()
          .setColor("Green")
          .setAuthor({
            name: interaction.client.user.username,
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTitle("✅ AÇÃO CONCLUÍDA!")
          .setDescription(texto)
          .setFooter({ text: "Lembrete Finalizado!" })
          .setTimestamp();

        return interaction.update({ embeds: [embed2], components: [] });
      }

      return;
    }

    if (interaction.isChatInputCommand()) {
      const cmd = client.slashCommands.get(interaction.commandName);
      if (!cmd)
        return interaction.reply({ content: 'Comando não registrado no bot.', ephemeral: true });

      return await cmd.execute(interaction);
    }

  } catch (err) {
    console.error('Erro em interactionCreate:', err);
    if (interaction.replied || interaction.deferred) {
      try { await interaction.editReply({ content: '❌ Erro interno ao executar.', embeds: [], components: [] }); } catch {}
    } else {
      try { await interaction.reply({ content: '❌ Erro interno ao executar.', ephemeral: true }); } catch {}
    }
  }
});

client.login(process.env.TOKEN);
