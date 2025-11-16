const Tema = require("../../models/Tema");
const { EmbedBuilder } = require("discord.js");
const { redimensionarBanner } = require("../../commands/Utility/redimensionarBanner");
const cloudinary = require("../../commands/Utility/cloudinary");

module.exports = {
    name: "banner",
    description: "Adiciona ou atualiza o banner de um tema via link ou upload.",

    async execute(message, args) {

        // Função embed de erro
        const erro = (msg) =>
            message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setAuthor({
                            name: message.client.user.username,
                            iconURL: message.client.user.displayAvatarURL()
                        })
                        .setDescription(`❌ ${msg}`)
                ],
                allowedMentions: { repliedUser: true }
            });

        // Permissão
        if (!message.member.permissions.has("Administrator"))
            return erro("Você não tem permissão para usar este comando.");

        if (!args.length)
            return erro("Uso: `;banner <tema> <link opcional>` + (imagem ou link)");

        const entradaTema = args.shift().toLowerCase().trim();

        // Buscar tema
        const temas = await Tema.find({});
        if (!temas.length) return erro("Nenhum tema cadastrado.");

        const tema = temas.find(t =>
            (t.nomeOriginal || t.nome).toLowerCase().startsWith(entradaTema)
        );

        if (!tema)
            return erro(`Nenhum tema encontrado correspondente a **${entradaTema}**.`);

        // Nome final com insígnia
        const insignia = tema.insigniaEmoji ? `${tema.insigniaEmoji} ` : "";
        const nomeExibir = `${insignia}${tema.nomeOriginal || tema.nome}`;

        // Dados da imagem
        const linkRecebido = args[0];
        const anexo = message.attachments.first();
        let bannerFinalURL;

        const cloudFolder = `jbot/banners/${tema.nomeLower}`;

        try {
            // =====================================================
            // 1️⃣ - Link enviado pelo usuário
            // =====================================================
            if (linkRecebido && linkRecebido.startsWith("http")) {
                const respostaHTTP = await fetch(linkRecebido);
                const buffer = Buffer.from(await respostaHTTP.arrayBuffer());
                const resized = await redimensionarBanner(buffer);

                const upload = await cloudinary.uploader.upload_stream({
                    folder: cloudFolder,
                    public_id: "banner",
                    overwrite: true,
                    format: "jpg",
                    transformation: [
                        { quality: "auto:good" },
                        { fetch_format: "auto" }
                    ]
                });

                bannerFinalURL = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream({
                        folder: cloudFolder,
                        public_id: "banner",
                        overwrite: true,
                        format: "jpg"
                    }, (err, result) => {
                        if (err) reject(err);
                        else resolve(result.secure_url);
                    });
                    stream.end(resized);
                });
            }

            // =====================================================
            // 2️⃣ - Upload via anexo
            // =====================================================
            else if (anexo && anexo.url) {
                const resized = await redimensionarBanner(anexo.url);

                bannerFinalURL = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream({
                        folder: cloudFolder,
                        public_id: "banner",
                        overwrite: true,
                        format: "jpg"
                    }, (err, result) => {
                        if (err) reject(err);
                        else resolve(result.secure_url);
                    });
                    uploadStream.end(resized);
                });
            }

            else return erro("Envie uma imagem válida ou link.");
        } catch (err) {
            console.error(err);
            return erro("Falha ao processar o banner.");
        }

        // Atualiza DB
        const jaExistia = !!tema.banner;
        tema.banner = bannerFinalURL;
        await tema.save();

        // Embed final
        const embed = new EmbedBuilder()
            .setColor("#5865F2")
            .setAuthor({
                name: message.client.user.username,
                iconURL: message.client.user.displayAvatarURL()
            })
            .setTitle("🎨 Banner do Tema Atualizado")
            .addFields(
                { name: "Tema", value: `**${nomeExibir}**`, inline: true },
                { name: "Status", value: jaExistia ? "🔄 Atualizado" : "🆕 Adicionado", inline: true }
            )
            .setImage(bannerFinalURL);

        message.reply({ embeds: [embed], allowedMentions: { repliedUser: true } }).then(() => {
            setTimeout(() => {
                if (message.deletable) message.delete().catch(() => {});
            }, 3000);
        });
    }
};
