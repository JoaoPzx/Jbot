const Tema = require("../../models/Tema");
const { EmbedBuilder } = require("discord.js");
const { redimensionarBanner } = require("../../commands/Utility/redimensionarBanner");
const { uploadImgBB } = require("../../commands/Utility/uploadImgBB");

module.exports = {
    name: "banner",
    description: "Adiciona ou atualiza o banner de um tema.",

    async execute(message, args) {

        const erro = (txt) =>
            message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setAuthor({
                            name: message.client.user.username,
                            iconURL: message.client.user.displayAvatarURL()
                        })
                        .setDescription(`❌ ${txt}`)
                ],
                allowedMentions: { repliedUser: false }
            });

        const sucesso = (emb) =>
            message.reply({
                embeds: [emb],
                allowedMentions: { repliedUser: false }
            });

        if (!message.member.permissions.has("Administrator"))
            return erro("Você não tem permissão para usar este comando.");

        if (!args.length)
            return erro("Uso correto: `;banner <tema>` + imagem");

        const entrada = args.shift().toLowerCase();
        const temas = await Tema.find({});
        if (!temas.length) return erro("Nenhum tema cadastrado.");

        const tema = temas.find(t =>
            (t.nomeOriginal || t.nome).toLowerCase().startsWith(entrada)
        );
        if (!tema) return erro(`Nenhum tema encontrado correspondente a **${entrada}**.`);

        const attachment = message.attachments.first();
        if (!attachment) return erro("Envie a imagem como anexo ou colando a imagem!");

        const mime = attachment.contentType || "";
        if (!mime.startsWith("image/"))
            return erro("O arquivo enviado não é uma imagem válida.");

        let bufferFinal;
        try {
            bufferFinal = await redimensionarBanner(attachment.url);
        } catch (e) {
            console.error(e);
            return erro("Não foi possível processar a imagem.");
        }

        // === Enviar para ImgBB ===
        const finalURL = await uploadImgBB(bufferFinal);
        if (!finalURL) return erro("Falha ao enviar o banner para ImgBB.");

        const tinhaAntes = !!tema.banner;
        tema.banner = finalURL;
        await tema.save();

        const insignia = tema.insignia ? tema.insignia + " " : "";
        const nomeExibir = insignia + (tema.nomeOriginal || tema.nome);

        const embed = new EmbedBuilder()
            .setColor("#5865F2")
            .setAuthor({
                name: message.client.user.username,
                iconURL: message.client.user.displayAvatarURL()
            })
            .setTitle("🎨 Banner do Tema Atualizado")
            .addFields(
                { name: "Tema", value: `**${nomeExibir}**`, inline: true },
                {
                    name: "Status",
                    value: tinhaAntes ? "🔄 Atualizado" : "🆕 Adicionado",
                    inline: true
                }
            )
            .setImage(finalURL)
            .setFooter({
                text: `Solicitado por ${message.author.username}`,
                iconURL: message.author.displayAvatarURL()
            })
            .setTimestamp();

        return sucesso(embed);
    },
};
