const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const axios = require("axios");
const sharp = require("sharp");
const Tema = require("../../models/Tema");

module.exports = {
    name: "temacriar",
    description: "Cria um novo tema com insígnia obrigatória (emoji ou imagem).",

    async execute(message, args) {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send("❌ Você não tem permissão para usar este comando.");
        }

        const nomeOriginal = args[0];

        if (!nomeOriginal) {
            return message.channel.send("❌ Uso correto: `;temacriar <NomeSemEspaços>` + emoji ou imagem.");
        }

        // ❌ Bloquear nomes com espaço
        if (/\s/.test(nomeOriginal)) {
            return message.channel.send("❌ Nome inválido! Use apenas **letras** e **números**, sem espaços.");
        }

        // ❌ Bloquear caracteres fora de A-Z / 0-9
        if (!/^[A-Za-z0-9]+$/.test(nomeOriginal)) {
            return message.channel.send("❌ Nome inválido! Permitido somente caracteres **A-Z**, **a-z** e **0-9**.");
        }

        // Normalizar (remover acentos e padronizar)
        const nomeLimpo = nomeOriginal
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

        const existente = await Tema.findOne({ nomeLower: nomeLimpo });
        if (existente) {
            return message.channel.send(`⚠️ O tema **${existente.nomeOriginal}** já existe!`);
        }

        // ============================
        // INSÍGNIA OBRIGATÓRIA
        // ============================

        let insigniaEmoji = null;
        let insigniaEmojiId = null;
        const guild = message.guild;
        const anexo = message.attachments.first();
        const emojiArg = args[1];

        // 1️⃣ IMAGEM — criar emoji custom
        if (anexo) {
            if (!anexo.contentType?.startsWith("image/")) {
                return message.channel.send("❌ O arquivo enviado **não é uma imagem válida**.");
            }

            try {
                const response = await axios.get(anexo.url, { responseType: "arraybuffer" });
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
                console.log(err);
                return message.channel.send("❌ Não consegui criar a insígnia! Certifique-se de que a imagem tem menos de **256kb**.");
            }
        }

        // 2️⃣ EMOJI CUSTOM TEXTUAL
        if (!insigniaEmoji && emojiArg) {
            const match = emojiArg.match(/^<a?:([^:]+):(\d+)>$/);

            if (!match) {
                return message.channel.send("❌ Emoji inválido! Envie um **emoji custom** ou **imagem**.");
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
                return message.channel.send("❌ Não consegui clonar o emoji.");
            }
        }

        if (!insigniaEmoji) {
            return message.channel.send("❌ Você **deve enviar** uma insígnia (imagem ou emoji).");
        }

        // ============================
        // SALVAR NO BANCO
        // ============================
        const novoTema = new Tema({
            nome: nomeLimpo,
            nomeOriginal,
            nomeLower: nomeLimpo,
            criadoPor: message.author.id,
            insigniaEmoji,
            insigniaEmojiId
        });

        await novoTema.save();

        // ============================
        // EMBED DE SUCESSO
        // ============================
        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("🎉 Novo Tema Criado!")
            .addFields(
                { name: "📌 Nome (Exibição)", value: nomeOriginal },
                { name: "🔠 Nome Interno", value: nomeLimpo },
                { name: "🏅 Insígnia", value: insigniaEmoji },
                { name: "👤 Criado por", value: `<@${message.author.id}>` }
            )
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }
};
