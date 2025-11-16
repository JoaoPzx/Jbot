const { EmbedBuilder } = require("discord.js");
const Tema = require("../../models/Tema");
const cloudinary = require("../../commands/Utility/cloudinary");

module.exports = {
    name: "add",
    description: "Adiciona uma imagem a um tema existente.",

    async execute(message, args) {

        // ====== EMBEDS PADRÃO ======
        const erro = (txt) =>
            message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription(`❌ ${txt}`)
                ],
                allowedMentions: { repliedUser: false }
            });

        const sucesso = (embed) =>
            message.reply({
                embeds: [embed],
                allowedMentions: { repliedUser: false }
            });

        // ====== PERMISSÃO ======
        if (!message.member.permissions.has("Administrator"))
            return erro("Você não tem permissão para usar este comando.");

        if (!args[0])
            return erro("Uso correto: `;add <tema> <resposta>` + imagem");

        // Tema (abreviação aceita)
        const entradaTema = args.shift().toLowerCase().trim();
        const temas = await Tema.find({});
        if (!temas.length) return erro("Nenhum tema cadastrado ainda.");

        const tema = temas.find(t =>
            (t.nomeOriginal || t.nome).toLowerCase().startsWith(entradaTema)
        );
        if (!tema) return erro(`O tema **${entradaTema}** não existe.`);

        // Verifica imagem
        const attachment = message.attachments.first();
        if (!attachment?.url) return erro("Envie a imagem junto com o comando.");

        const resposta = args.join(" ").toLowerCase().trim();
        if (!resposta) return erro("Você precisa informar a resposta da imagem.");


        // =====================================================
        // 🚫 BLOQUEAR DUPLICAÇÃO (Resposta + URL)
        // =====================================================

        // Verifica duplicação por resposta
        const existeResposta = tema.imagens.find(img => img.resposta === resposta);
        if (existeResposta)
            return erro(`Já existe uma imagem com a resposta **${resposta}** neste tema.`);

        // Verifica duplicação por URL Cloudinary antes de salvar
        const jaExisteURL = tema.imagens.find(img => img.url === attachment.url);
        if (jaExisteURL)
            return erro("Esta imagem já foi adicionada anteriormente.");


        // =====================================================
        // UPLOAD PARA CLOUDINARY
        // =====================================================
        let urlFinal;
        try {
            const upload = await cloudinary.uploader.upload(attachment.url, {
                folder: `jbot/${tema.nomeLower}`,   // organiza por tema
                public_id: resposta.replace(/\s+/g, "_"),
                overwrite: false // impede substituição acidental
            });
            urlFinal = upload.secure_url;
        } catch (e) {
            console.error(e);
            return erro("Falha ao hospedar imagem no servidor.");
        }


        // =====================================================
        // SALVAR NO BANCO
        // =====================================================
        tema.imagens.push({
            resposta,
            url: urlFinal,
            addedBy: message.author.id,
            addedAt: new Date()
        });

        await tema.save();


        // =====================================================
        // Embed de Confirmação
        // =====================================================
        const embed = new EmbedBuilder()
            .setColor("Green")
            .setAuthor({
                name: "Imagem adicionada com sucesso ✔️",
                iconURL: message.client.user.displayAvatarURL()
            })
            .addFields(
                { name: "🖼 Tema", value: tema.nomeOriginal || tema.nome, inline: true },
                { name: "💬 Resposta", value: resposta, inline: true },
                { name: "👤 Adicionado por", value: `<@${message.author.id}>`, inline: true }
            )
            .setThumbnail(urlFinal);

        return sucesso(embed);
    }
};
