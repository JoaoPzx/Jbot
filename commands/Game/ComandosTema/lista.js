const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Tema = require("../../../models/Tema");

module.exports = {
    name: "lista",
    description: "Lista todas as palavras de um tema, com paginação.",

    async execute(message, args) {

        // ==========================
        // ERRO PADRÃO
        // ==========================
        const erro = (txt) =>
            message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setAuthor({
                            name: message.client.user.username,
                            iconURL: message.client.user.displayAvatarURL()
                        })
                        .setDescription(`<:fecharerr:1442682279322325095> ${txt}`)
                ],
                allowedMentions: { repliedUser: true }
            });

        // ==========================
        // ARGUMENTO
        // ==========================
        const entradaRaw = args[0];
        if (!entradaRaw) return erro("Uso correto: `;palavras <tema>`");

        const entrada = entradaRaw.toLowerCase();

        // ==========================
        // BUSCAR TEMAS
        // ==========================
        const temas = await Tema.find({});
        if (!temas.length) return erro("Não há temas cadastrados.");

        const ordenados = temas.sort((a, b) =>
            (a.nomeOriginal || a.nome).localeCompare(b.nomeOriginal || b.nome)
        );

        const tema = ordenados.find(t =>
            (t.nomeOriginal || t.nome || "").toLowerCase().startsWith(entrada)
        );

        if (!tema) return erro(`O tema **${entradaRaw}** não existe.`);
        if (!tema.imagens.length) return erro(`<:avisojf:1442687822208303215> O tema **${tema.nomeOriginal || tema.nome}** não possui palavras cadastradas.`);

        // ==========================
        // TRATAMENTO DO NOME
        // ==========================
        const insignia = tema.insigniaEmoji ? tema.insigniaEmoji + " " : "";
        const nomeFinal = `${insignia}${tema.nomeOriginal || tema.nome}`;

        // ==========================
        // PAGINAÇÃO
        // ==========================
        const palavras = tema.imagens
            .map(img => img.resposta.toUpperCase())
            .sort((a, b) => a.localeCompare(b, "pt-BR"));

        const porPagina = 20;
        const totalPaginas = Math.ceil(palavras.length / porPagina);
        let paginaAtual = 1;

        function gerarEmbed() {
            const inicio = (paginaAtual - 1) * porPagina;
            const fim = inicio + porPagina;

            const lista = "```\n" + palavras.slice(inicio, fim).join("\n") + "\n```";

            return new EmbedBuilder()
                .setColor("#9b59b6")
                .setAuthor({
                    name: message.client.user.username,
                    iconURL: message.client.user.displayAvatarURL()
                })
                .setDescription(`**<:tema:1440424182759428206> LISTA DE IMAGENS DO TEMA ${nomeFinal}**\n\n **1 - ${tema.imagens.length}**\n\n${lista}`)
                .setFooter({
                    text: `${tema.imagens.length} palavra(s) cadastrada(s) • solicitado por ${message.author.username}`,
                    iconURL: message.author.displayAvatarURL()
                })
                .setTimestamp();
        }

        function gerarBotoes() {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("primeira")
                    .setEmoji("⏮️")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(paginaAtual === 1),
                new ButtonBuilder()
                    .setCustomId("voltar")
                    .setEmoji("⬅️")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(paginaAtual === 1),
                new ButtonBuilder()
                    .setCustomId("avancar")
                    .setEmoji("➡️")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(paginaAtual === totalPaginas),
                new ButtonBuilder()
                    .setCustomId("ultima")
                    .setEmoji("⏭️")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(paginaAtual === totalPaginas)
            );
        }

        const msg = await message.reply({ embeds: [gerarEmbed()], components: [gerarBotoes()] });

        const collector = msg.createMessageComponentCollector({ time: 120000 });

        collector.on("collect", async (i) => {

            if (i.user.id !== message.author.id)
                return i.reply({ content: "<:fecharerr:1442682279322325095> Apenas quem usou o comando pode navegar.", ephemeral: true });

            if (i.customId === "primeira") paginaAtual = 1;
            if (i.customId === "voltar") paginaAtual--;
            if (i.customId === "avancar") paginaAtual++;
            if (i.customId === "ultima") paginaAtual = totalPaginas;

            await i.update({ embeds: [gerarEmbed()], components: [gerarBotoes()] });
        });

        collector.on("end", () => {
            msg.edit({ components: [] }).catch(() => {});
        });
    }
};
