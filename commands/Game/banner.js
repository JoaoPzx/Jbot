const Tema = require("../../models/Tema");
const { EmbedBuilder } = require("discord.js");
const { redimensionarBanner } = require("../../commands/Utility/redimensionarBanner");
const { uploadImgBB } = require("../../commands/Utility/uploadImgBB");

module.exports = {
    name: "banner",
    description: "Adiciona ou atualiza o banner de um tema (por link ou imagem).",

    async execute(message, args) {

        const erro = (msg) =>
            message.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ff4d4d")
                    .setAuthor({
                        name: message.client.user.username,
                        iconURL: message.client.user.displayAvatarURL()
                    })
                    .setDescription(`❌ ${msg}`)
                ],
                allowedMentions: { repliedUser: false }
            });

        // Permissão
        if (!message.member.permissions.has("Administrator"))
            return erro("Você não tem permissão para usar este comando.");

        // Verificação de argumentos
        if (!args.length)
            return erro("Uso: `;banner <tema> <link opcional>` + imagem (ou link)");

        const entradaTema = args.shift().toLowerCase().trim();

        // Buscar tema
        const temas = await Tema.find({});
        if (!temas.length) return erro("Nenhum tema cadastrado.");

        const tema = temas.find(t => 
            (t.nomeOriginal || t.nome).toLowerCase().startsWith(entradaTema)
        );

        if (!tema) return erro(`Nenhum tema encontrado correspondente a **${entradaTema}**.`);

        const insignia = tema.insigniaEmoji ? `${tema.insigniaEmoji} ` : "";
        const nomeExibir = `${insignia}${tema.nomeOriginal || tema.nome}`;

        let bannerFinalURL;
        const linkRecebido = args[0];
        const anexo = message.attachments.first();

        // =====================================================
        // 1️⃣ CASO LINK
        // =====================================================
        if (linkRecebido && linkRecebido.startsWith("http")) {

            // Se já for link do ImgBB → usar direto
            if (linkRecebido.includes("ibb.co") || linkRecebido.includes("imgbb.com")) {
                bannerFinalURL = linkRecebido;
            } else {
                // Se for link externo → fazer upload
                try {
                    const response = await fetch(linkRecebido);
                    const buffer = Buffer.from(await response.arrayBuffer());
                    bannerFinalURL = await uploadImgBB(buffer);
                } catch {
                    return erro("Falha ao processar o link enviado.");
                }
            }
        }

        // =====================================================
        // 2️⃣ CASO ANEXO
        // =====================================================
        else if (anexo && anexo.url) {
            try {
                const buffer = await redimensionarBanner(anexo.url);
                bannerFinalURL = await uploadImgBB(buffer);
            } catch (err) {
                console.error(err);
                return erro("Não foi possível processar o anexo enviado.");
            }
        }

        // Nenhum banner encontrado
        else {
            return erro("Envie um link ou anexo válido.");
        }

        if (!bannerFinalURL) return erro("Erro inesperado ao processar o banner.");

        const jaTinha = !!tema.banner;
        tema.banner = bannerFinalURL;
        await tema.save();

        // Embed de sucesso
        // Embed de sucesso
const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setAuthor({
        name: message.client.user.username,
        iconURL: message.client.user.displayAvatarURL()
    })
    .setTitle("🎨 Banner do Tema Atualizado")
    .addFields(
        { name: "Tema", value: `**${nomeExibir}**`, inline: true },
        { name: "Status", value: jaTinha ? "🔄 Atualizado" : "🆕 Adicionado", inline: true }
    )
    .setImage(bannerFinalURL);

// Enviar confirmação
message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).then(() => {
    setTimeout(() => {
        if (message.deletable) message.delete().catch(() => {});
    }, 3000); // 3 segundos
});

    }
};
