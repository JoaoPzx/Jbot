const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Tema = require("../../../models/Tema");
const cloudinary = require("../../Utility/cloudinary"); // AJUSTE SE NECESSÁRIO

module.exports = {
    data: new SlashCommandBuilder()
        .setName("temadeletar")
        .setDescription("Deleta completamente um tema e sua pasta no Cloudinary.")
        .addStringOption(opt =>
            opt.setName("tema")
                .setDescription("Selecione o tema que deseja deletar.")
                .setAutocomplete(true)
                .setRequired(true)
        ),

    // ===========================
    // AUTOCOMPLETE
    // ===========================
    async autocomplete(interaction) {
        const value = interaction.options.getFocused()?.toLowerCase() || "";
        const temas = await Tema.find({});

        const filtrados = temas
            .filter(t => (t.nomeOriginal || t.nome).toLowerCase().includes(value))
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

    // ===========================
    // EXECUTAR
    // ===========================
    async execute(interaction) {

        // Apenas admins
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: "❌ Você não tem permissão para deletar temas.",
                ephemeral: true
            });
        }

        const nomeLower = interaction.options.getString("tema");
        const tema = await Tema.findOne({ nomeLower: nomeLower });


        if (!tema) {
            return interaction.reply({
                content: "❌ Tema não encontrado.",
                ephemeral: true
            });
        }

        const nomeExibir = tema.nomeOriginal || tema.nome;

        // ===========================
        // CONFIRMAÇÃO
        // ===========================
        const confirmEmbed = new EmbedBuilder()
            .setColor("#ff4d4d")
            .setTitle("🗑 Confirmar Exclusão do Tema?")
            .setDescription(`Tem certeza que deseja deletar o tema **${nomeExibir}**?\nIsso **apagará todas as imagens e a pasta do Cloudinary**.`);

        const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("confirmar_delete")
                .setLabel("Deletar Tema")
                .setEmoji("🗑️")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId("cancelar_delete")
                .setLabel("Cancelar")
                .setEmoji("❌")
                .setStyle(ButtonStyle.Secondary)
        );

        const msg = await interaction.reply({
            embeds: [confirmEmbed],
            components: [botoes],
            ephemeral: true
        });

        // ===========================
        // COLETOR DE BOTÕES
        // ===========================
        const coletor = msg.createMessageComponentCollector({
            time: 15000
        });

        coletor.on("collect", async (i) => {

            if (i.user.id !== interaction.user.id)
                return i.reply({ content: "❌ Apenas quem executou pode confirmar.", ephemeral: true });

            // CANCELAR
            if (i.customId === "cancelar_delete") {
                coletor.stop("cancelado");
                return i.update({
                    content: "❌ Ação cancelada.",
                    embeds: [],
                    components: []
                });
            }

            // CONFIRMAR
            if (i.customId === "confirmar_delete") {
                coletor.stop("confirmado");

                const pastaCloud = `jbot/${tema.nomeLower}`;

                try {
                    // 1) Apagar arquivos da pasta
                    await cloudinary.api.delete_resources_by_prefix(`${pastaCloud}/`);

                    // 2) Apagar pasta
                    await cloudinary.api.delete_folder(pastaCloud);

                } catch (err) {
                    console.error("Erro Cloudinary:", err);
                }

                // 3) Apagar do MongoDB
                await Tema.deleteOne({ _id: tema._id });

                return i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setTitle("🗑 Tema Deletado com Sucesso!")
                            .setDescription(
                                `O tema **${nomeExibir}** foi deletado.\n` +
                                `A pasta **${pastaCloud}** também foi removida do Cloudinary.`
                            )
                    ],
                    components: []
                });
            }
        });

        coletor.on("end", (_, motivo) => {
            if (motivo === "confirmado" || motivo === "cancelado") return;

            msg.edit({
                content: "⏳ Tempo esgotado.",
                embeds: [],
                components: []
            }).catch(() => {});
        });
    }
};
