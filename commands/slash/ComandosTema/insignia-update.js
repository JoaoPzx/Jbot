const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const axios = require("axios");
const sharp = require("sharp");
const Tema = require("../../../models/Tema");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("insignia-update")
        .setDescription("Atualiza a insígnia de um tema existente (substitui a atual).")
        .addStringOption(option =>
            option
                .setName("tema")
                .setDescription("Nome do tema (nomeLower)")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("emoji")
                .setDescription("Emoji custom para usar como insígnia (se não enviar imagem)")
                .setRequired(false)
        )
        .addAttachmentOption(option =>
            option
                .setName("imagem")
                .setDescription("Imagem da nova insígnia (será convertida em emoji)")
                .setRequired(false)
        ),

    async execute(interaction) {

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: "<:fecharerr:1442682279322325095> Você não tem permissão para usar este comando.",
                ephemeral: true
            });
        }

        const temaEntrada = interaction.options.getString("tema").toLowerCase();
        const emojiArg = interaction.options.getString("emoji");
        const imagem = interaction.options.getAttachment("imagem");

        const tema = await Tema.findOne({ nomeLower: temaEntrada });
        if (!tema) {
            return interaction.reply({
                content: `<:fecharerr:1442682279322325095> O tema **${temaEntrada}** não existe.`,
                ephemeral: true
            });
        }

        const guild = interaction.guild;

        // ==============================================
        // 🔥 APAGAR INSÍGNIA ANTIGA
        // ==============================================
        if (tema.insigniaEmojiId) {
            try {
                const oldEmoji = guild.emojis.cache.get(tema.insigniaEmojiId);
                if (oldEmoji) await oldEmoji.delete();
            } catch (err) {
                console.error("Erro ao deletar emoji antigo:", err);
            }
        }

        // ==============================================
        // 🔥 NOVA INSÍGNIA
        // ==============================================
        let insigniaEmoji = null;
        let insigniaEmojiId = null;

        // 1️⃣ IMAGEM → virar emoji
        if (imagem) {

            if (!imagem.contentType?.startsWith("image/")) {
                return interaction.reply({
                    content: "<:fecharerr:1442682279322325095> A imagem enviada não é válida.",
                    ephemeral: true
                });
            }

            try {
                const response = await axios.get(imagem.url, { responseType: "arraybuffer" });
                const buffer = Buffer.from(response.data);

                const resized = await sharp(buffer)
                    .resize({
                        width: 128,
                        height: 128,
                        fit: "contain",
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    })
                    .png()
                    .toBuffer();

                const emoji = await guild.emojis.create({
                    attachment: resized,
                    name: `insig_${tema.nomeLower}`
                });

                insigniaEmoji = `<:${emoji.name}:${emoji.id}>`;
                insigniaEmojiId = emoji.id;

            } catch (err) {
                console.error(err);
                return interaction.reply({
                    content: "<:fecharerr:1442682279322325095> Não consegui criar o emoji. Verifique permissões e tamanho.",
                    ephemeral: true
                });
            }
        }

        // 2️⃣ EMOJI CUSTOM TEXTUAL
        if (!insigniaEmoji && emojiArg) {

            const match = emojiArg.match(/^<a?:([^:]+):(\d+)>$/);
            if (!match) {
                return interaction.reply({
                    content: "<:fecharerr:1442682279322325095> Emoji inválido! Use um emoji custom ou envie imagem.",
                    ephemeral: true
                });
            }

            const emojiId = match[2];
            const url = `https://cdn.discordapp.com/emojis/${emojiId}.png?size=128&quality=lossless`;

            try {
                const clone = await guild.emojis.create({
                    attachment: url,
                    name: `insig_${tema.nomeLower}`
                });

                insigniaEmoji = `<:${clone.name}:${clone.id}>`;
                insigniaEmojiId = clone.id;

            } catch (err) {
                return interaction.reply({
                    content: "<:fecharerr:1442682279322325095> Não consegui clonar o emoji.",
                    ephemeral: true
                });
            }
        }

        // 3️⃣ Nenhuma insígnia enviada
        if (!insigniaEmoji) {
            return interaction.reply({
                content: "<:fecharerr:1442682279322325095> Você deve enviar uma nova insígnia (imagem ou emoji).",
                ephemeral: true
            });
        }

        // ==============================================
        // 🔥 SALVAR NO BANCO
        // ==============================================
        tema.insigniaEmoji = insigniaEmoji;
        tema.insigniaEmojiId = insigniaEmojiId;

        await tema.save();

        // ==============================================
        // 🔥 RESPOSTA FINAL
        // ==============================================
        const embed = new EmbedBuilder()
            .setColor("#00ff9d")
            .setTitle("🏅 Insígnia Atualizada!")
            .addFields(
                { name: "📌 Tema", value: tema.nomeOriginal, inline: true },
                { name: "🏅 Nova Insígnia", value: insigniaEmoji, inline: true },
                { name: "👤 Atualizado por", value: `<@${interaction.user.id}>`, inline: true }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
