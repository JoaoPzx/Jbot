const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const Tema = require("../../../models/Tema");
const cloudinary = require("../../Utility/cloudinary");

// Função para exibir nome + insígnia
function nomeComInsignia(tema) {
    return tema.insigniaEmoji
        ? `${tema.insigniaEmoji} ${tema.nomeOriginal || tema.nome}`
        : (tema.nomeOriginal || tema.nome);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("imgdelete")
        .setDescription("Exclui uma imagem de um tema específico.")
        .addStringOption(opt =>
            opt.setName("tema")
                .setDescription("Escolha o tema")
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(opt =>
            opt.setName("imagem")
                .setDescription("Escolha a resposta da imagem a ser removida")
                .setRequired(true)
                .setAutocomplete(true)
        ),

    // ==========================
    // AUTOCOMPLETE
    // ==========================
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const temaSelecionado = interaction.options.getString("tema");
        const temas = await Tema.find({});

        // Autocomplete do tema
        if (!temaSelecionado || interaction.options.getFocused(true).name === "tema") {
            const lista = temas
                .map(t => t.nomeOriginal || t.nome)
                .filter(n => n.toLowerCase().includes(focused.toLowerCase()))
                .slice(0, 25);

            return interaction.respond(lista.map(n => ({ name: n, value: n })));
        }

        // Autocomplete da imagem (resposta)
        const tema = temas.find(t =>
            (t.nomeOriginal || t.nome).toLowerCase() === temaSelecionado.toLowerCase()
        );

        if (!tema || !tema.imagens.length)
            return interaction.respond([]);

        const lista = tema.imagens
            .map(img => img.resposta)
            .filter(r => r.toLowerCase().includes(focused.toLowerCase()))
            .slice(0, 25);

        return interaction.respond(lista.map(r => ({ name: r, value: r })));
    },

    // ==========================
    // EXECUTAR COMANDO
    // ==========================
    async execute(interaction) {
        const temaNome = interaction.options.getString("tema").toLowerCase();
        const resposta = interaction.options.getString("imagem").toLowerCase();

        const tema = await Tema.findOne({
            $or: [
                { nomeLower: temaNome },
                { nome: new RegExp(`^${temaNome}$`, "i") },
                { nomeOriginal: new RegExp(`^${temaNome}$`, "i") },
            ]
        });

        if (!tema) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription(`<:fecharerr:1442682279322325095> O tema **${temaNome}** não existe.`)
                ],
                ephemeral: true
            });
        }

        const imagem = tema.imagens.find(i => i.resposta.toLowerCase() === resposta);
        if (!imagem) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription(`<:fecharerr:1442682279322325095> Nenhuma imagem encontrada com a resposta **${resposta}**.`)
                ],
                ephemeral: true
            });
        }

        const nomeExibir = nomeComInsignia(tema);

        // CONFIRMAÇÃO
        const embedConfirma = new EmbedBuilder()
            .setColor("#f1c40f")
            .setDescription(
                `⚠️ Tem certeza que deseja **remover** a imagem?\n\n` +
                `**Tema:** ${nomeExibir}\n` +
                `**Resposta:** \`${imagem.resposta}\``
            )
            .setImage(imagem.url);

        const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("confirmar_delete")
                .setLabel("Sim, excluir")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId("cancelar_delete")
                .setLabel("Cancelar")
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ embeds: [embedConfirma], components: [botoes] });

        // Collector dos botões
        const collector = interaction.channel.createMessageComponentCollector({
            time: 15000
        });

        collector.on("collect", async btn => {
            if (btn.user.id !== interaction.user.id)
                return btn.reply({ content: "<:fecharerr:1442682279322325095> Não é você quem executou o comando!", ephemeral: true });

            if (btn.customId === "cancelar_delete") {
                collector.stop("cancelado");
                return btn.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#2ecc71")
                            .setDescription("Operação cancelada ✔️")
                    ],
                    components: []
                });
            }

            // ========== EXCLUIR DA CLOUDINARY ==========
            try {
                const publicId = imagem.url.split("/").pop().split(".")[0];
                await cloudinary.uploader.destroy(`jbot/${tema.nomeLower}/${publicId}`);
            } catch {}

            // ========== EXCLUIR DO BANCO ==========
            tema.imagens = tema.imagens.filter(i => i.url !== imagem.url);
            await tema.save();

            collector.stop("excluido");

            return btn.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#e74c3c")
                        .setDescription(
                            `🗑️ A imagem foi **removida com sucesso**!\n\n` +
                            `**Tema:** ${nomeExibir}\n` +
                            `**Resposta:** \`${resposta}\``
                        )
                ],
                components: []
            });
        });

        collector.on("end", (_, motivo) => {
            if (motivo === "time")
                interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#ff4d4d")
                            .setDescription("⏳ Tempo expirado, operação cancelada automaticamente.")
                    ],
                    components: []
                }).catch(() => {});
        });
    }
};
