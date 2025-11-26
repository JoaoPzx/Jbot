// index.js
const { 
    EmbedBuilder, 
    Collection, 
    Client, 
    IntentsBitField 
} = require('discord.js');

const { partidasAtivas, iniciarRodada } = require("./commands/Game/Partidas/play");
const Perfil = require("./models/Perfil"); // IMPORTAÇÃO CORRETA

require('dotenv').config();
const { connect } = require('./database');
const fs = require('fs');
const path = require('path');
const Canvas = require("canvas");

// ======================================================
// 🔥 REGISTRO DAS FONTES SF PRO DISPLAY (DEFINITIVO)
// ======================================================

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

const canalSorteioID = '1437599327093657600';
const prefix = process.env.PREFIX || ';';

// Coleções
client.commands = new Collection();
client.slashCommands = new Collection();

// ======================================================
// 🔥 CARREGAR COMANDOS PREFIX — RECURSIVO
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
// 🔥 CARREGAR COMANDOS SLASH — RECURSIVO
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
// EVENTS & LISTENERS
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

// ======================================================
// 🔥 INTERACTION CREATE — CORRIGIDO E OTIMIZADO
// ======================================================

client.on('interactionCreate', async (interaction) => {
  try {

    // -------------------------
    // AUTOCOMPLETE
    // -------------------------
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

    // -------------------------
    // BOTÕES
    // -------------------------
    if (interaction.isButton()) {

      // ====================================================
      // 🔥 /perfil-editar — BOTÕES (COR / WALLPAPER / BIO)
      // ====================================================

      // ===== COR DO PERFIL =====

      // BOTÃO: Aceitar casamento
if (interaction.customId === "aceitar_casamento") {

    const pedido = interaction.client.pedidosCasamento?.get(interaction.user.id);
    if (!pedido) {
        return interaction.reply({ content: "❌ Não há nenhum pedido pendente!", ephemeral: true });
    }

    const userA = pedido.de;
    const userB = pedido.para;

    await Perfil.findOneAndUpdate({ userId: userA }, { casamento: userB });
    await Perfil.findOneAndUpdate({ userId: userB }, { casamento: userA });

    interaction.client.pedidosCasamento.delete(userB);

    return interaction.update({
        content: `🎉 **PEDIDO ACEITO!**  
❤️ <@${userA}> e <@${userB}> agora estão oficialmente casados! 💍`,
        components: []
    });
}

// BOTÃO: Recusar casamento
if (interaction.customId === "recusar_casamento") {

    const pedido = interaction.client.pedidosCasamento?.get(interaction.user.id);
    if (!pedido) {
        return interaction.reply({ content: "❌ Não há nenhum pedido pendente!", ephemeral: true });
    }

    interaction.client.pedidosCasamento.delete(interaction.user.id);

    return interaction.update({
        content: `❌ O pedido de casamento foi recusado.`,
        components: []
    });
}


      if (interaction.customId === "editar_cor") {
        const { ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");

        const menu = new StringSelectMenuBuilder()
          .setCustomId("select_cor")
          .setPlaceholder("Selecione uma cor...")
          .addOptions([
            { label: "Preto", value: "preto" },
            { label: "Branco", value: "branco" },
            { label: "Azul", value: "azul" },
            { label: "Rosa", value: "rosa" },
            { label: "Vermelho", value: "vermelho" },
            { label: "Roxo", value: "roxo" },
            { label: "Dourado", value: "dourado" },
            { label: "Verde", value: "verde" },
            { label: "Laranja", value: "laranja" },
          ]);

        return interaction.reply({
          content: "🎨 Escolha a nova cor do seu perfil:",
          components: [new ActionRowBuilder().addComponents(menu)],
          ephemeral: true
        });
      }

      // ==============================================
      // ===== WALLPAPER — APENAS ANEXO / ARRASTAR ====
      // ==============================================
      if (interaction.customId === "editar_wallpaper") {

        await interaction.reply({
          content: "📸 **Envie agora seu novo wallpaper.**\n\nArraste uma imagem ou anexe um arquivo.\n❌ *Links não são aceitos.*\n⏳ Você tem **1 minuto**.",
          flags: 64
        });

        const filter = (msg) =>
          msg.author.id === interaction.user.id;

        const collector = interaction.channel.createMessageCollector({
          filter,
          max: 1,
          time: 60_000
        });

        collector.on("collect", async (msg) => {

          const attachment = msg.attachments.first();

          if (!attachment) {
            return interaction.followUp({
              content: "❌ Você precisa **anexar uma imagem verdadeira**.",
              flags: 64
            });
          }

          if (!attachment.contentType?.startsWith("image/")) {
            return interaction.followUp({
              content: "❌ O arquivo enviado **não é uma imagem válida**.",
              flags: 64
            });
          }

          await Perfil.updateOne(
            { userId: interaction.user.id },
            { $set: { wallpaper: attachment.url } },
            { upsert: true }
          );

          return interaction.followUp({
            content: "<:imagemjbot:1440425616359952445> **Wallpaper atualizado com sucesso!**",
            flags: 64
          });
        });

        collector.on("end", (collected) => {
          if (collected.size === 0) {
            interaction.followUp({
              content: "⌛ Tempo esgotado! Clique novamente em *Wallpaper* para tentar novamente.",
              flags: 64
            });
          }
        });

        return;
      }

      // ===== BIOGRAFIA =====
      if (interaction.customId === "editar_bio") {
        const {
          ModalBuilder,
          TextInputBuilder,
          TextInputStyle,
          ActionRowBuilder
        } = require("discord.js");

        const modal = new ModalBuilder()
          .setCustomId("modal_bio")
          .setTitle("Editar Biografia");

        const input = new TextInputBuilder()
          .setCustomId("bio_input")
          .setLabel("Digite sua nova biografia")
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(180);

        modal.addComponents(new ActionRowBuilder().addComponents(input));

        return interaction.showModal(modal);
      }

      // ====================================================
      // 🔥 SISTEMA DE PARTIDAS — DESPAUSAR
      // ====================================================
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
          .setColor("#2c72ec")
          .setTitle("<:playjf:1442673291621040260> Partida Retomada")
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

      // ===== CONFIRMAR AÇÃO =====
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

    // -------------------------
    // SELECT MENU (/perfil-editar)
    // -------------------------
    if (interaction.isStringSelectMenu()) {

      if (interaction.customId === "select_cor") {
        const selected = interaction.values[0];

        await Perfil.updateOne(
          { userId: interaction.user.id },
          { $set: { cor: selected } }
        );

        return interaction.update({
          content: `<:paletejf:1442988083497926706> **Cor atualizada para:** \`${selected}\``,
          components: []
        });
      }
    }
    // -------------------------
    // MODAIS (/perfil-editar)
    // -------------------------
    if (interaction.isModalSubmit()) {

      // ===== SALVAR BIOGRAFIA =====
      if (interaction.customId === "modal_bio") {

        const bio = interaction.fields.getTextInputValue("bio_input");

        await Perfil.updateOne(
          { userId: interaction.user.id },
          { $set: { bio } }
        );

        return interaction.reply({
          content: "<:lapisjf:1442988550466441297> **Biografia atualizada com sucesso!**",
          flags: 64
        });
      }

      return;
    }

    // -------------------------
    // SLASH COMMANDS
    // -------------------------
    if (interaction.isChatInputCommand()) {
      const cmd = client.slashCommands.get(interaction.commandName);
      if (!cmd)
        return interaction.reply({ content: 'Comando não registrado no bot.', flags: 64 });

      return await cmd.execute(interaction);
    }

  } catch (err) {
    console.error('Erro em interactionCreate:', err);

    if (interaction.replied || interaction.deferred) {
      try { 
        await interaction.editReply({ 
          content: '❌ Erro interno ao executar.', 
          embeds: [], 
          components: [] 
        }); 
      } catch {}
    } else {
      try { 
        await interaction.reply({ 
          content: '❌ Erro interno ao executar.', 
          flags: 64 
        }); 
      } catch {}
    }
  }
});

client.login(process.env.TOKEN);

