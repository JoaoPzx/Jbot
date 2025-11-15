const Tema = require("../../models/Tema");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { redimensionarBanner } = require("../../commands/Utility/redimensionarBanner");

module.exports = {
    name: "banner",
    description: "Adiciona ou atualiza o banner de um tema.",

    async execute(message, args) {

        /* =====================================================
           EMBEDS PADRONIZADOS
        ====================================================== */
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

        /* =====================================================
           PERMISSÃO
        ====================================================== */
        if (!message.member.permissions.has("Administrator")) {
            return erro("Você não tem permissão para usar este comando.");
        }

        if (!args.length) {
            return erro("Uso correto: `;banner <tema> + imagem`.");
        }

        /* =====================================================
           PROCESSAR TEMA (ACEITA ABREVIAÇÃO)
        ====================================================== */
        const entradaRaw = args.shift();
        const entrada = entradaRaw.toLowerCase();

        const temas = await Tema.find({});
        if (!temas.length) return erro("Nenhum tema cadastrado.");

        const ordenados = temas.sort((a, b) =>
            (a.nomeOriginal || a.nome).localeCompare(b.nomeOriginal || b.nome)
        );

        const tema = ordenados.find((t) =>
            (t.nomeOriginal || t.nome).toLowerCase().startsWith(entrada)
        );

        if (!tema) {
            return erro(`Nenhum tema encontrado correspondente a **${entradaRaw}**.`);
        }

        const insignia = tema.insignia ? tema.insignia + " " : "";
        const nomeExibir = insignia + (tema.nomeOriginal || tema.nome);

        /* =====================================================
           PEGAR IMAGEM (anexo obrigatório)
        ====================================================== */
        const attachment = message.attachments.first();
        if (!attachment) {
            return erro("Envie a imagem como anexo ou usando 'copiar imagem'!");
        }

        const mime = attachment.contentType || "";
        if (!mime.startsWith("image/")) {
            return erro("O arquivo enviado não é uma imagem válida.");
        }

        /* =====================================================
           REDIMENSIONAR BANNER (1920×640)
        ====================================================== */
        let imagemFinalBuffer;
        try {
            imagemFinalBuffer = await redimensionarBanner(attachment.url);
        } catch (e) {
            console.error(e);
            return erro("Não foi possível processar essa imagem.");
        }

        const novoAttachment = new AttachmentBuilder(imagemFinalBuffer, {
            name: `${tema.nomeLower}_banner.jpg`
        });

        /* =====================================================
           ENVIAR IMAGEM TEMPORÁRIA → PEGAR URL CDN
        ====================================================== */
        let tempMsg;
        try {
            tempMsg = await message.channel.send({ files: [novoAttachment] });
        } catch (err) {
            return erro("Erro ao enviar o banner redimensionado.");
        }

        const cdnURL = tempMsg.attachments.first()?.url;
        if (!cdnURL) {
            await tempMsg.delete().catch(() => {});
            return erro("Falha ao obter a URL final do banner.");
        }

        await tempMsg.delete().catch(() => {});

        /* =====================================================
           SALVAR NO BANCO
        ====================================================== */
        const tinhaAntes = !!tema.banner;

        tema.banner = cdnURL;
        await tema.save();

        /* =====================================================
           EMBED FINAL
        ====================================================== */
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
            .setImage(cdnURL)
            .setFooter({
                text: `Solicitado por ${message.author.username}`,
                iconURL: message.author.displayAvatarURL()
            })
            .setTimestamp();

        return sucesso(embed);
    },
};
