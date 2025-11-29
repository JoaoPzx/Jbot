const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const Tema = require("../../../models/Tema");
const { redimensionarBanner } = require("../../Utility/redimensionarBanner");
const cloudinary = require("../../Utility/cloudinary");

// =====================
// EMBED PADRÃO (ERRO)
// =====================
function embedErro(txt) {
    return new EmbedBuilder()
        .setColor("#ff4d4d")
        .setDescription(`<:fecharerr:1442682279322325095> ${txt}`);
}

// =====================
// EMBED SUCESSO
// =====================
function embedSucesso(temaNome, url, atualizado) {
    return new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("<:bannerjf:1443389754094653592> Banner do Tema Atualizado")
        .addFields(
            { name: "Tema", value: `**${temaNome}**`, inline: true },
            { name: "Status", value: atualizado ? "<:attjf:1443389707072438303> Atualizado" : "<:novojf:1443389668656808007> Adicionado", inline: true }
        )
        .setImage(url)
        .setTimestamp();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("banner")
        .setDescription("Adiciona ou atualiza o banner de um tema.")
        .addAttachmentOption(opt =>
            opt.setName("imagem")
                .setDescription("Envie a imagem (anexo, arrastada ou copiar imagem).")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("tema")
                .setDescription("Nome do tema (com autocomplete).")
                .setAutocomplete(true)
                .setRequired(true)
        ),

    // ==========================
    // AUTOCOMPLETE
    // ==========================
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const temas = await Tema.find({});
        
        return interaction.respond(
            temas
                .map(t => t.nomeOriginal || t.nome)
                .filter(n => n.toLowerCase().includes(focused))
                .slice(0, 25)
                .map(n => ({ name: n, value: n }))
        );
    },

    // ==========================
    // EXECUTAR COMANDO
    // ==========================
    async execute(interaction) {

        const imagem = interaction.options.getAttachment("imagem");
        const entradaRaw = interaction.options.getString("tema");
        const entrada = entradaRaw.toLowerCase();

        // Validação inicial
        if (!imagem?.contentType?.startsWith("image/")) {
            return interaction.reply({
                embeds: [embedErro("A imagem deve ser PNG, JPG, JPEG ou WEBP valida.")],
                flags: 64
            });
        }

        const temas = await Tema.find({});
        if (!temas.length) {
            return interaction.reply({ embeds: [embedErro("Nenhum tema cadastrado.")], flags: 64 });
        }

        const tema = temas.find(t =>
            (t.nomeOriginal || t.nome).toLowerCase().startsWith(entrada)
        );

        if (!tema) {
            return interaction.reply({
                embeds: [embedErro(`Nenhum tema encontrado correspondente a **${entradaRaw}**.`)],
                flags: 64
            });
        }

        // === Nome com insignia ===
        const insignia = tema.insigniaEmoji ? `${tema.insigniaEmoji} ` : "";
        const nomeExibir = `${insignia}${tema.nomeOriginal || tema.nome}`;

        // === Redimensionar imagem para 1920x640 ===
        let resizedBuffer;
        try {
            resizedBuffer = await redimensionarBanner(imagem.url);
        } catch (err) {
            return interaction.reply({
                embeds: [embedErro("Erro ao redimensionar a imagem.")],
                flags: 64
            });
        }

        // === Upload para Cloudinary ===
        const cloudFolder = `jbot/banners/${tema.nomeLower}`;

        let finalURL;
        try {
            finalURL = await new Promise((resolve, reject) => {
                const upload = cloudinary.uploader.upload_stream({
                    folder: cloudFolder,
                    public_id: "banner",
                    overwrite: true,
                    format: "jpg"
                }, (err, result) => {
                    if (err) reject(err);
                    else resolve(result.secure_url);
                });

                upload.end(resizedBuffer);
            });
        } catch (err) {
            console.log(err);
            return interaction.reply({
                embeds: [embedErro("Falha ao enviar o banner ao Cloudinary.")],
                flags: 64
            });
        }

        const atualizado = !!tema.banner;
        tema.banner = finalURL;
        await tema.save();

        return interaction.reply({ embeds: [embedSucesso(nomeExibir, finalURL, atualizado)] });
    },
};
