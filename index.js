// deploy de teste
// index.js
const { EmbedBuilder, Collection, Client, IntentsBitField } = require('discord.js');
const { partidasAtivas, iniciarRodada } = require("./commands/Game/play");

require('dotenv').config();
const { connect } = require('./database');
const fs = require('fs');
const path = require('path');

connect(); // conecta ao MongoDB Atlas

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent
  ]
});

// --- suas configs antigas ---
const canalSorteioID = '1437599327093657600'; // substitua pelo ID do canal do sorteio
const prefix = process.env.PREFIX || ';';

// --- Coleções ---
client.commands = new Collection();       // comandos por prefixo
client.slashCommands = new Collection();  // comandos slash

// --------------------
// Carregar comandos (prefix)
// --------------------
const commandFolders = fs.readdirSync('./commands').filter(f => f !== 'slash'); // evita pasta slash
for (const folder of commandFolders) {
  const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(__dirname, `./commands/${folder}/${file}`);
    const command = require(filePath);
    command.filePath = filePath;
    if (command.name) client.commands.set(command.name, command);
  }
}

// --------------------
// Carregar comandos (slash) — pasta ./commands/slash
// cada arquivo deve exportar { data: SlashCommandBuilder, execute(interaction) {...} }
// --------------------
const slashPath = path.join(__dirname, 'commands', 'slash');
if (fs.existsSync(slashPath)) {
  const slashFiles = fs.readdirSync(slashPath).filter(f => f.endsWith('.js'));
  for (const file of slashFiles) {
    const filePath = path.join(slashPath, file);
    const command = require(filePath);
    if (command.data && command.execute) {
      client.slashCommands.set(command.data.name, command);
    } else {
      console.warn(`Arquivo de slash inválido: ${file} — precisa exportar { data, execute }`);
    }
  }
}

// --------------------
// Events & Listeners
// --------------------
client.on('clientReady', () => {
  console.log(`${client.user.tag} está online!`);
});

// Limpar canal de sorteio (mantive sua lógica)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id === canalSorteioID) {
    try { await message.delete(); } catch (err) { console.error('Erro ao apagar mensagem no canal de sorteio:', err); }
  }
});

// Prefix handler (mantive sua lógica)
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

// Interaction handler (slash commands & botões)
client.on('interactionCreate', async (interaction) => {
  try {

    // ===============================
    // AUTOCOMPLETE (necessário!)
    // ===============================
    if (interaction.isAutocomplete()) {
      const cmd = client.slashCommands.get(interaction.commandName);
      if (cmd?.autocomplete) {
        try {
          return await cmd.autocomplete(interaction);
        } catch (err) {
          console.error("Erro no autocomplete:", err);
          return await interaction.respond([]);
        }
      }
      return;
    }

    // ===============================
    // BOTÕES
    // ===============================
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

    // Remove pausa
    partida.pausada = false;
    clearTimeout(partida.despausarTimer);

    // EMBED DE RETOMADA
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

    // Reiniciar rodada depois de 1s
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

    // ===============================
    // SLASH COMMANDS
    // ===============================
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
