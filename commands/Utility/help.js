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
        const comandos = client.commands;

        // Organizar comandos automaticamente pelas pastas
        const categorias = {};

        for (const [nome, cmd] of comandos) {
            if (!cmd.filePath) continue;

            const categoria = path.basename(path.dirname(cmd.filePath)).toLowerCase();
            if (!categorias[categoria]) categorias[categoria] = [];

            categorias[categoria].push({
                name: `${prefix}${cmd.name}`,
                desc: cmd.description || "Sem descrição."
            });
        }

        const categoriaEscolhida = args[0]?.toLowerCase();

        // =====================================================================
        // 📌 SEM CATEGORIA → LISTA TODOS OS COMANDOS
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
        // 📖 PAGINAÇÃO DA CATEGORIA
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
        const coletor = msg.createMessageComponentCollector({ filter: filtro, time: 90000 });

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
