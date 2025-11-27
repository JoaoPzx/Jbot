// index.js
const { EmbedBuilder, Collection, Client, IntentsBitField } = require('discord.js');
const { partidasAtivas, iniciarRodada } = require("./commands/Game/Partidas/play");
const Perfil = require("./models/Perfil"); // IMPORTAÇÃO CORRETA
const {
  mesas,
  calcularMao,
  gerarEmbed,
  botoesJogo,
  botoesDesativados
} = require("./commands/Game/Cassino/blackjack");



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
    message.reply('<:fecharerr:1442682279322325095> Ocorreu um erro ao executar esse comando.');
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

      // =======================
// 🎰 BOTÕES DO BLACKJACK
// =======================
const userId = interaction.user.id;
const mesa = mesas.get(userId);

if (mesa && interaction.channel.id === mesa.canal) {

    // HIT = comprar carta
    if (interaction.customId === "bj_hit") {
        const carta = mesa.baralho.pop();
        mesa.jogador.push(carta);

        const total = calcularMao(mesa.jogador);

        // estourou
        if (total > 21) {
            const embed = gerarEmbed(mesa, false)
                .setColor("#ff4d4d")
                .setFooter({ text: "💥 Você estourou! Dealer venceu." });

            await interaction.update({
                embeds: [embed],
                components: [botoesDesativados()]
            });

            return mesas.delete(userId);
        }

        const embed = gerarEmbed(mesa, true);

        return interaction.update({
            embeds: [embed],
            components: [botoesJogo()]
        });
    }

    // STAND = parar
    // STAND = parar
if (interaction.customId === "bj_stand") {

    while (calcularMao(mesa.dealer) < 17) {
        mesa.dealer.push(mesa.baralho.pop());
    }

    const totalJog = calcularMao(mesa.jogador);
    const totalDeal = calcularMao(mesa.dealer);

    let resultado = "";
    let cor = "#FFD700";

    let premio = 0;
    let devolucao = 0;

    if (totalDeal > 21) {
        resultado = "🎉 Dealer estourou! Você venceu!";
        premio = mesa.aposta * 2;

    } else if (totalJog > totalDeal) {
        resultado = "🏆 Você venceu!";
        premio = mesa.aposta * 2;

    } else if (totalJog < totalDeal) {
        resultado = "❌ Dealer venceu.";
        cor = "#ff4d4d";

    } else {
        resultado = "🤝 Empate! Push.";
        cor = "#a8a8a8";
        devolucao = mesa.aposta;
    }

    // SALVAR MOEDAS
    const perfil = await Perfil.findOne({ userId: interaction.user.id });
    if (perfil) {
        perfil.moedas += premio;
        perfil.moedas += devolucao;
        await perfil.save();
    }

    const embed = gerarEmbed(mesa, false)
        .setColor(cor)
        .setFooter({ text: resultado });

    await interaction.update({
        embeds: [embed],
        components: [botoesDesativados()]
    });

    return mesas.delete(interaction.user.id);
}};



if (interaction.customId === "aceitar_casamento") {

    const pedido = interaction.client.pedidosCasamento?.get(interaction.user.id);
    if (!pedido) {
        return interaction.reply({ content: "<:fecharerr:1442682279322325095> Não há nenhum pedido pendente!", ephemeral: true });
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
        return interaction.reply({ content: "<:fecharerr:1442682279322325095> Não há nenhum pedido pendente!", ephemeral: true });
    }

    interaction.client.pedidosCasamento.delete(interaction.user.id);

    return interaction.update({
        content: `<:fecharerr:1442682279322325095> O pedido de casamento foi recusado.`,
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
          content: "<:colorjf:1443729261247598710> Escolha a nova cor do seu perfil:",
          components: [new ActionRowBuilder().addComponents(menu)],
          ephemeral: true
        });
      }

      // ==============================================
      // ===== WALLPAPER — APENAS ANEXO / ARRASTAR ====
      // ==============================================
const axios = require("axios");
const cloudinary = require("cloudinary").v2;

if (interaction.customId === "editar_wallpaper") {

    await interaction.reply({
        content: "<:camerajf:1442989958678712411> **Envie agora seu novo wallpaper.**\n\nArraste uma imagem ou anexe um arquivo.\n❌ *Links não são aceitos.*\n⏳ Você tem **1 minuto**.",
        flags: 64
    });

    const filter = (msg) => msg.author.id === interaction.user.id;

    const collector = interaction.channel.createMessageCollector({
        filter,
        max: 1,
        time: 60_000
    });

    collector.on("collect", async (msg) => {

        const attachment = msg.attachments.first();
        if (!attachment)
            return interaction.followUp({ content: "<:fecharerr:1442682279322325095> Envie uma **imagem**.", flags: 64 });

        if (!attachment.contentType?.startsWith("image/"))
            return interaction.followUp({ content: "<:fecharerr:1442682279322325095> Arquivo inválido.", flags: 64 });

        try {
            // 1️⃣ Baixar a imagem do Discord CDN
            const imgBuffer = await axios.get(attachment.url, {
                responseType: "arraybuffer"
            });

            // 2️⃣ Enviar o buffer ao Cloudinary
            const upload = await cloudinary.uploader.upload_stream(
                {
                    folder: "jbot/wallpapers",
                    public_id: `wallpaper_${interaction.user.id}`,
                    overwrite: true
                },
                async (error, result) => {
                    if (error) {
                        console.error(error);
                        return interaction.followUp({
                            content: "<:fecharerr:1442682279322325095> Erro ao enviar a imagem para o Cloudinary.",
                            flags: 64
                        });
                    }

                    // 3️⃣ Salvar no perfil
                    await Perfil.updateOne(
                        { userId: interaction.user.id },
                        { wallpaper: result.secure_url },
                        { upsert: true }
                    );

                    return interaction.followUp({
                        content: "<:imagemjbot:1440425616359952445> **Wallpaper atualizado com sucesso!**",
                        flags: 64
                    });
                }
            );

            // enviar buffer ao stream
            upload.end(Buffer.from(imgBuffer.data));

        } catch (err) {
            console.error(err);
            return interaction.followUp({
                content: "<:fecharerr:1442682279322325095> Ocorreu um erro ao processar sua imagem.",
                flags: 64
            });
        }
    });

    collector.on("end", (collected) => {
        if (collected.size === 0) {
            interaction.followUp({
                content: "<:sandclock:1442671562355380409> Tempo esgotado! Clique novamente em *Wallpaper* para tentar novamente.",
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
        return interaction.reply({ 
            content: "<:fecharerr:1442682279322325095> A partida não está mais pausada.",
            ephemeral: true 
        });
    }

    // 💥 CORREÇÃO: garantir que o autor seja reconhecido corretamente
    if (interaction.user.id !== partida.autorId) {
        return interaction.reply({
            content: "<:fecharerr:1442682279322325095> Apenas quem pausou pode despausar a partida.",
            ephemeral: true
        });
    }

    partida.pausada = false;

    if (partida.pauseExpireTimeout) {
        clearTimeout(partida.pauseExpireTimeout);
        partida.pauseExpireTimeout = null;
    }

    const embed = new EmbedBuilder()
        .setColor("#2c72ec")
        .setTitle("<:playjf:1442673291621040260> Partida retomada!")

    await interaction.update({
        content: "",
        embeds: [embed],
        components: []
    });

    // retomada segura após 5 segundos
    setTimeout(() => {
        if (!partida.encerrada) {
            partida.rodadaEmCurso = true;
            iniciarRodada(interaction, partida);
        }
    }, 3000);
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
          .setDescription(`**<:checkjf:1443729850568413256> AÇÃO CONCLUÍDA!**\n\n ${texto}`)
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
          content: '<:fecharerr:1442682279322325095> Erro interno ao executar.', 
          embeds: [], 
          components: [] 
        }); 
      } catch {}
    } else {
      try { 
        await interaction.reply({ 
          content: '<:fecharerr:1442682279322325095> Erro interno ao executar.', 
          flags: 64 
        }); 
      } catch {}
    }
  }
});

client.login(process.env.TOKEN);

