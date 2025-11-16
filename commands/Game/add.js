const { EmbedBuilder } = require("discord.js");
const Tema = require("../../models/Tema");
const cloudinary = require("../../commands/Utility/cloudinary");

module.exports = {
    name: "add",
    description: "Adiciona uma imagem a um tema existente.",

    async execute(message, args) {
        if (!message.member.permissions.has("Administrator")) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Você não tem permissão para usar este comando.")
                ]
            });
        }

        if (!args.length) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Uso correto: `;add <tema> <resposta>` + imagem")
                ]
            });
        }

        const entradaTema = args.shift().toLowerCase();
        const resposta = args.join(" ").toLowerCase().trim();

        if (!resposta) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Você precisa informar a resposta da imagem.")
                ]
            });
        }

        const temas = await Tema.find({});
        const tema = temas.find(t =>
            (t.nomeOriginal || t.nome).toLowerCase().startsWith(entradaTema)
        );

        if (!tema) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription(`❌ O tema **${entradaTema}** não existe.`)
                ]
            });
        }

        const attachment = message.attachments.first();
        if (!attachment?.url) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("⚠️ Envie uma imagem válida junto do comando.")
                ]
            });
        }

        // Nome final com insígnia
        const insignia = tema.insigniaEmoji ? `${tema.insigniaEmoji} ` : "";
        const nomeFinal = `${insignia}${tema.nomeOriginal || tema.nome}`;

        // Upload no Cloudinary
        const pastaTema = tema.nomeLower;
        const respostaID = resposta.replace(/[^a-z0-9]/gi, "_");

        let upload;
        try {
            upload = await cloudinary.uploader.upload(attachment.url, {
                folder: `jbot/${pastaTema}`,
                public_id: respostaID,
                resource_type: "image",
                format: "png",
                transformation: [
                    { fetch_format: "auto" },
                    { quality: "auto:best" }
                ]
            });
        } catch (err) {
            console.error(err);
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Erro ao enviar imagem ao Cloudinary, tente novamente.")
                ]
            });
        }

        tema.imagens.push({
            resposta,
            url: upload.secure_url,
            addedBy: message.author.id,
            addedAt: new Date()
        });

        await tema.save();

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setAuthor({
                name: "Imagem adicionada ✔️",
                iconURL: message.client.user.displayAvatarURL()
            })
            .addFields(
                { name: "Tema", value: nomeFinal, inline: true },
                { name: "Resposta", value: `\`${resposta}\``, inline: true },
                { name: "Adicionado por", value: `👤 <@${message.author.id}>`, inline: true }
            )
            .setImage(upload.secure_url)
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
