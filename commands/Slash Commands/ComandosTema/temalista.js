const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const Tema = require("../../../models/Tema");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("temalista")
        .setDescription("Lista todas as palavras de um tema, com paginação.")
        .addStringOption(opt =>
            opt.setName("tema")
                .setDescription("Selecione o tema")
                .setAutocomplete(true)
                .setRequired(true)
        ),

    // ===============================
    // AUTOCOMPLETE
    // ===============================
    async autocomplete(interaction) {
        const value = interaction.options.getFocused()?.toLowerCase() || "";
        const temas = await Tema.find({});

        const filtrados = temas
            .filter(t =>
                (t.nomeOriginal || t.nome).toLowerCase().includes(value)
            )
            .sort((a, b) =>
                (a.nomeOriginal || a.nome).localeCompare(b.nomeOriginal || b.nome)
            )
            .slice(0, 25)
            .map(t => ({
                name: t.nomeOriginal || t.nome,
                value: t.nomeLower
            }));

        return interaction.respond(filtrados);
    },

    // ===============================
    // EXECUTAR
    // ===============================
    async execute(interaction) {
        const temaLower = interaction.options.getString("tema");
        const tema = await Tema.findOne({ nomeLower: temaLower });

        // Erro: tema não existe
        if (!tema) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Tema não encontrado.")
                ],
                ephemeral: true
            });
        }

        // Erro: nenhuma palavra
        if (!tema.imagens.length) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription(`⚠️ O tema **${tema.nomeOriginal || tema.nome}** não possui palavras cadastradas.`)
                ],
                ephemeral: true
            });
        }

        // Nome bonito
        const insignia = tema.insigniaEmoji ? `${tema.insigniaEmoji} ` : "";
        const nomeFinal = `${insignia}${tema.nomeOriginal || tema.nome}`;

        // ===============================
        // PAGINAÇÃO
        // ===============================
        const palavras = tema.imagens
            .map(i => i.resposta.toUpperCase())
            .sort((a, b) => a.localeCompare(b, "pt-BR"));

        const porPagina = 20;
        const totalPaginas = Math.ceil(palavras.length / porPagina);
        let paginaAtual = 1;

        // EMBED
        function gerarEmbed() {
            const inicio = (paginaAtual - 1) * porPagina;
            const fim = inicio + porPagina;
            const lista = "```\n" + palavras.slice(inicio, fim).join("\n") + "\n```";

            return new EmbedBuilder()
                .setColor("#9b59b6")
                .setAuthor({
                    name: interaction.client.user.username,
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setTitle("📝 Palavras do tema:" `\`${nomeFinal}\``)
                .setDescription(`**1 – ${tema.imagens.length}**\n\n${lista}`)
                .setFooter({
                    text: `${tema.imagens.length} palavra(s) cadastrada(s) • solicitado por ${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();
        }

        // BOTÕES
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

        // Envia primeira página
        const msg = await interaction.reply({
            embeds: [gerarEmbed()],
            components: [gerarBotoes()],
            fetchReply: true
        });

        // Coletor
        const collector = msg.createMessageComponentCollector({
            time: 120000
        });

        collector.on("collect", async (i) => {
            // Somente quem executou pode usar
            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content: "❌ Apenas quem usou o comando pode navegar.",
                    ephemeral: true
                });
            }

            // Controles
            if (i.customId === "primeira") paginaAtual = 1;
            if (i.customId === "voltar") paginaAtual--;
            if (i.customId === "avancar") paginaAtual++;
            if (i.customId === "ultima") paginaAtual = totalPaginas;

            await i.update({
                embeds: [gerarEmbed()],
                components: [gerarBotoes()]
            });
        });

        collector.on("end", () => {
            msg.edit({ components: [] }).catch(() => {});
        });
    }
};
