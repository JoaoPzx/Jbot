const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const axios = require("axios");
const sharp = require("sharp");
const Tema = require("../../models/Tema");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("temacriar")
        .setDescription("Cria um novo tema com insígnia obrigatória (imagem ou emoji).")
        .addStringOption(option =>
            option
                .setName("nome")
                .setDescription("Nome do tema (somente letras e números, sem espaços)")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("emoji")
                .setDescription("Emoji para definir como insígnia (usar apenas se não enviar imagem)")
                .setRequired(false)
        )
        .addAttachmentOption(option =>
            option
                .setName("imagem")
                .setDescription("Imagem da insígnia (será convertida automaticamente em emoji)")
                .setRequired(false)
        ),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "❌ Você não tem permissão para usar este comando.", ephemeral: true });
        }

        const nomeOriginal = interaction.options.getString("nome");
        const emojiArg = interaction.options.getString("emoji");
        const imagem = interaction.options.getAttachment("imagem");

        // ❌ Bloquear espaços
        if (/\s/.test(nomeOriginal)) {
            return interaction.reply({ content: "❌ Nome inválido! Use apenas **letras e números**, sem espaços.", ephemeral: true });
        }

        // ❌ Bloquear caracteres fora de A-Z / 0-9
        if (!/^[A-Za-z0-9]+$/.test(nomeOriginal)) {
            return interaction.reply({ content: "❌ Nome inválido! Permitido somente caracteres **A-Z**, **a-z** e **0-9**.", ephemeral: true });
        }

        // Normalizar e baixar acentos
        const nomeLimpo = nomeOriginal
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

        const existente = await Tema.findOne({ nomeLower: nomeLimpo });
        if (existente) {
            return interaction.reply({ content: `⚠️ O tema **${existente.nomeOriginal}** já existe!`, ephemeral: true });
        }

        // ============================
        // INSÍGNIA OBRIGATÓRIA
        // ============================
        let insigniaEmoji = null;
        let insigniaEmojiId = null;
        const guild = interaction.guild;

        // 1️⃣ IMAGEM → transformar em emoji custom
        if (imagem) {
            if (!imagem.contentType?.startsWith("image/")) {
                return interaction.reply({ content: "❌ O arquivo enviado **não é uma imagem válida**.", ephemeral: true });
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
                    name: `insig_${nomeLimpo}`
                });

                insigniaEmoji = `<:${emoji.name}:${emoji.id}>`;
                insigniaEmojiId = emoji.id;

            } catch (err) {
                console.error(err);
                return interaction.reply({ content: "❌ Não consegui criar o emoji! Verifique permissões e tamanho (<256kb).", ephemeral: true });
            }
        }

        // 2️⃣ EMOJI CUSTOM TEXTUAL
        if (!insigniaEmoji && emojiArg) {
            const match = emojiArg.match(/^<a?:([^:]+):(\d+)>$/);

            if (!match) {
                return interaction.reply({ content: "❌ Emoji inválido! Envie um **emoji custom** ou **imagem**.", ephemeral: true });
            }

            const emojiId = match[2];
            const url = `https://cdn.discordapp.com/emojis/${emojiId}.png?size=128&quality=lossless`;

            try {
                const clone = await guild.emojis.create({
                    attachment: url,
                    name: `insig_${nomeLimpo}`
                });

                insigniaEmoji = `<:${clone.name}:${clone.id}>`;
                insigniaEmojiId = clone.id;

            } catch {
                return interaction.reply({ content: "❌ Não consegui clonar o emoji custom.", ephemeral: true });
            }
        }

        // 3️⃣ Nenhuma insígnia enviada
        if (!insigniaEmoji) {
            return interaction.reply({
                content: "❌ Você **deve enviar** uma insígnia (imagem ou emoji).",
                ephemeral: true
            });
        }

        // ============================
        // SALVAR NO BANCO
        // ============================
        const novoTema = new Tema({
            nome: nomeLimpo,
            nomeOriginal,
            nomeLower: nomeLimpo,
            criadoPor: interaction.user.id,
            insigniaEmoji,
            insigniaEmojiId,
            dataCriacao: Date.now()
        });

        await novoTema.save();

        // ============================
        // SUCESSO
        // ============================
        const embed = new EmbedBuilder()
            .setColor("#00ff9d")
            .setTitle("🎉 Novo Tema Criado!")
            .addFields(
                { name: "📌 Nome", value: nomeOriginal, inline: true },
                { name: "🏅 Insígnia", value: insigniaEmoji, inline: true },
                { name: "👤 Criado por", value: `<@${interaction.user.id}>`, inline: true },
                { name: "Criado em", value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
