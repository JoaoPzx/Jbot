const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

module.exports = {
    name: "help",
    description: "Mostra todos os comandos ou os de uma categoria específica.",

    async execute(message, args) {
        const prefix = process.env.PREFIX || ";";
        const client = message.client;

        // =============================
        // 📌 CARREGAR COMANDOS PREFIX
        // =============================
        const comandosPrefix = client.commands;

        const categorias = {};

        for (const [nome, cmd] of comandosPrefix) {
            if (!cmd.filePath) continue;

            const categoria = path.basename(path.dirname(cmd.filePath)).toLowerCase();
            if (!categorias[categoria]) categorias[categoria] = [];

            categorias[categoria].push({
                name: `${prefix}${cmd.name}`,
                desc: cmd.description || "Sem descrição."
            });
        }

        // =============================
        // 📌 CARREGAR COMANDOS SLASH
        // =============================
        let slashCommands = new Map();

// 1) Tentar carregar comandos globais
try {
    const globais = await client.application.commands.fetch();
    globais.forEach(cmd => slashCommands.set(cmd.name, cmd));
} catch (err) {
    console.log("Não carregou globais:", err);
}

// 2) Tentar carregar comandos do servidor onde o help foi executado
try {
    const guildCmds = await message.guild.commands.fetch();
    guildCmds.forEach(cmd => slashCommands.set(cmd.name, cmd));
} catch (err) {
    console.log("Não carregou comandos da guild:", err);
}

console.log("Total de slash:", slashCommands.size);


        slashCommands.forEach(cmd => {
            let categoria =
                cmd.category ||
                cmd?.options?.find(o => o.name === "categoria")?.value ||
                "slash";

            categoria = categoria.toLowerCase();

            if (!categorias[categoria]) categorias[categoria] = [];

            categorias[categoria].push({
                name: `/${cmd.name}`,
                desc: cmd.description || "Sem descrição."
            });
        });

        const categoriaEscolhida = args[0]?.toLowerCase();

        // =====================================================================
        // 📌 SEM CATEGORIA → LISTA TUDO
        // =====================================================================
        if (!categoriaEscolhida) {
            let desc = "";

            for (const cat of Object.keys(categorias)) {
                desc += `### 🔹 ${cat.toUpperCase()}\n`;
                desc += categorias[cat]
                    .map(cmd => `• \`${cmd.name}\` — ${cmd.desc}`)
                    .join("\n");
                desc += "\n\n";
            }

            const embed = new EmbedBuilder()
                .setColor("#00FFAA")
                .setAuthor({
                    name: client.user.username,
                    iconURL: client.user.displayAvatarURL()
                })
                .setTitle("📚 Lista Completa de Comandos")
                .setDescription(desc)
                .setFooter({ text: `Use ${prefix}help <categoria> para filtrar.` })
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        // =====================================================================
        // ❌ CATEGORIA INVÁLIDA
        // =====================================================================
        if (!categorias[categoriaEscolhida]) {
            const lista = Object.keys(categorias)
                .map(cat => `• ${cat}`)
                .join("\n");

            const embedErro = new EmbedBuilder()
                .setColor("Red")
                .setAuthor({
                    name: client.user.username,
                    iconURL: client.user.displayAvatarURL()
                })
                .setTitle("❌ Categoria não encontrada")
                .setDescription(
                    `A categoria **${categoriaEscolhida}** não existe.\n\n` +
                    `📂 **Categorias disponíveis:**\n${lista}`
                );

            return message.channel.send({ embeds: [embedErro] });
        }

        // =====================================================================
        // 📖 PAGINAÇÃO NA CATEGORIA
        // =====================================================================
        const lista = categorias[categoriaEscolhida];
        const itensPorPagina = 6;
        const totalPaginas = Math.ceil(lista.length / itensPorPagina);
        let paginaAtual = 1;

        function gerarEmbed(pagina) {
            const inicio = (pagina - 1) * itensPorPagina;
            const fim = inicio + itensPorPagina;
            const comandosPagina = lista.slice(inicio, fim);

            const desc = comandosPagina
                .map(cmd => `• \`${cmd.name}\`\n${cmd.desc}`)
                .join("\n\n");

            return new EmbedBuilder()
                .setColor("#00FFAA")
                .setAuthor({
                    name: client.user.username,
                    iconURL: client.user.displayAvatarURL()
                })
                .setTitle(`📁 Categoria: ${categoriaEscolhida.toUpperCase()}`)
                .setDescription(desc)
                .setFooter({ text: `Página ${pagina}/${totalPaginas}` })
                .setTimestamp();
        }

        function gerarBotoes(pagina) {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("anterior")
                    .setLabel("⬅️ Anterior")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pagina === 1),
                new ButtonBuilder()
                    .setCustomId("proximo")
                    .setLabel("Próximo ➡️")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pagina === totalPaginas)
            );
        }

        const msg = await message.channel.send({
            embeds: [gerarEmbed(paginaAtual)],
            components: [gerarBotoes(paginaAtual)]
        });

        const filtro = i => i.user.id === message.author.id;
        const coletor = msg.createMessageComponentCollector({
            filter: filtro,
            time: 90000
        });

        coletor.on("collect", async (i) => {
            if (i.customId === "anterior") paginaAtual--;
            if (i.customId === "proximo") paginaAtual++;

            await i.update({
                embeds: [gerarEmbed(paginaAtual)],
                components: [gerarBotoes(paginaAtual)]
            });
        });

        coletor.on("end", () => {
            msg.edit({ components: [] }).catch(() => {});
        });
    }
};
