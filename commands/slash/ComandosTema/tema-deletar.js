const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Tema = require("../../../models/Tema");
const cloudinary = require("../../Utility/cloudinary"); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tema-deletar")
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

        // Permissão
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: "<:fecharerr:1442682279322325095> Você não tem permissão para deletar temas.",
                ephemeral: true
            });
        }

        const nomeLower = interaction.options.getString("tema");
        const tema = await Tema.findOne({ nomeLower });

        if (!tema) {
            return interaction.reply({
                content: "<:fecharerr:1442682279322325095> Tema não encontrado.",
                ephemeral: true
            });
        }

        const nomeExibir = tema.nomeOriginal || tema.nome;

        // ===========================
        // CONFIRMAÇÃO
        // ===========================
        const confirmEmbed = new EmbedBuilder()
            .setColor("#ff4d4d")
            .setTitle("<:deleteTema:1440818346760339656> Confirmar Exclusão do Tema?")
            .setDescription(
                `Tem certeza que deseja deletar o tema **${nomeExibir}**?\n` +
                `Isso apagará imagens, pasta do Cloudinary e sua insígnia (emoji).`
            );

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
            ephemeral: false
        });

        // ===========================
        // COLETOR
        // ===========================
        const coletor = msg.createMessageComponentCollector({ time: 15000 });

        coletor.on("collect", async (i) => {

            if (i.user.id !== interaction.user.id)
                return i.reply({ content: "<:fecharerr:1442682279322325095> Apenas quem executou pode confirmar.", ephemeral: true });

            // CANCELAR
            if (i.customId === "cancelar_delete") {
                coletor.stop("cancelado");
                return i.update({
                    content: "<:fecharerr:1442682279322325095> Ação cancelada.",
                    embeds: [],
                    components: []
                });
            }

            // ===========================
            // CONFIRMAR EXCLUSÃO
            // ===========================
            if (i.customId === "confirmar_delete") {
                coletor.stop("confirmado");

                const pastaCloud = `jbot/${tema.nomeLower}`;

                // 1) Deletar imagens e pasta Cloudinary
                try {
                    await cloudinary.api.delete_resources_by_prefix(`${pastaCloud}/`);
                    await cloudinary.api.delete_folder(pastaCloud);
                } catch (err) {
                    console.error("Erro Cloudinary:", err);
                }

// ===============================
// DELETAR EMOJI DA INSÍGNIA
// ===============================
try {
    const nomeEmoji = `insig_${tema.nomeLower}`;
    const emojiByName = interaction.guild.emojis.cache.find(e => e.name === nomeEmoji);

    let emojiById = null;
    if (tema.insigniaEmojiId) {
        emojiById = interaction.guild.emojis.cache.get(tema.insigniaEmojiId);
    }

    const emoji = emojiById || emojiByName;

    if (emoji) {
        await emoji.delete("Insígnia removida porque o tema foi deletado.");
        console.log(`Emoji deletado: ${emoji.name} (${emoji.id})`);
    } else {
        console.log(`Nenhum emoji encontrado para o tema: ${tema.nomeLower}`);
    }

} catch (err) {
    console.error("Erro ao deletar emoji da insígnia:", err);
}

                // 3) Deletar do MongoDB
                await Tema.deleteOne({ _id: tema._id });

                // 4) Confirmação final
                return i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setDescription("**<:bin:1440818365575729173> Tema Deletado com Sucesso!**")
                    ],
                    components: []
                });
            }
        });

        coletor.on("end", (_, motivo) => {
            if (motivo === "confirmado" || motivo === "cancelado") return;

            msg.edit({
                content: "<:sandclock:1442671562355380409> Tempo esgotado.",
                embeds: [],
                components: []
            }).catch(() => {});
        });
    }
};
