// deploy-commands.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.TOKEN;

if (!clientId || !guildId || !token) {
  console.error("❌ ERROR: defina CLIENT_ID, GUILD_ID e TOKEN no .env antes de rodar este script.");
  process.exit(1);
}

const commands = [];

function carregarComandos(pasta) {
  const itens = fs.readdirSync(pasta);

  for (const item of itens) {
    const caminho = path.join(pasta, item);
    const stat = fs.statSync(caminho);

    // Se for pasta → lê recursivamente
    if (stat.isDirectory()) {
      carregarComandos(caminho);
      continue;
    }

    // Apenas arquivos .js
    if (!item.endsWith(".js")) continue;

    try {
      const cmd = require(caminho);

      if (!cmd.data) {
        console.warn(`⚠️ Arquivo ignorado (sem campo "data"): ${item}`);
        continue;
      }

      commands.push(cmd.data.toJSON());
      console.log(`📥 Carregado: ${cmd.data.name}`);

    } catch (err) {
      console.error(`❌ Erro ao carregar ${item}:`, err);
    }
  }
}

// Carrega comandos da pasta /commands/slash
const slashRoot = path.join(__dirname, "commands", "slash");
if (fs.existsSync(slashRoot)) {
  carregarComandos(slashRoot);
} else {
  console.warn("⚠️ Pasta commands/slash não existe. Nada para registrar.");
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log(`\n🚀 Registrando ${commands.length} comandos na GUILD ${guildId}...\n`);
    
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log("✅ Comandos registrados com sucesso!");

  } catch (err) {
    console.error("❌ Erro ao registrar comandos:", err);
  }
})();
