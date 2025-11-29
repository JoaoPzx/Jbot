const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Tema = require("../../../models/Tema");
const cloudinary = require("../../Utility/cloudinary");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("add")
        .setDescription("Adiciona uma imagem a um tema existente.")
        .addAttachmentOption(opt =>
            opt.setName("imagem")
                .setDescription("Envie a imagem")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("tema")
                .setDescription("Nome do tema")
                .setAutocomplete(true)
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("resposta")
                .setDescription("Resposta da imagem")
                .setRequired(true)
        ),

    // ================================
    // AUTOCOMPLETE
    // ================================
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const temas = await Tema.find({});

        const lista = temas
            .map(t => ({
                nome: t.nomeOriginal || t.nome,
                value: t.nomeLower
            }))
            .filter(t => t.nome.toLowerCase().includes(focused))
            .slice(0, 25);

        return interaction.respond(lista.map(t => ({
            name: t.nome,
            value: t.value
        })));
    },

    // ================================
    // EXECUTAR
    // ================================
    async execute(interaction) {

        // === PREVENIR UNKNOWN INTERACTION ===
        await interaction.deferReply({ ephemeral: false });

        const imagem = interaction.options.getAttachment("imagem");
        const temaLower = interaction.options.getString("tema").toLowerCase();
        const resposta = interaction.options.getString("resposta").toLowerCase();

        // valida imagem
        if (!imagem || !imagem.url) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("<:fecharerr:1442682279322325095> Não foi possível obter a imagem enviada.")
                ]
            });
        }

        if (!imagem.contentType?.startsWith("image/")) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("<:fecharerr:1442682279322325095> O arquivo enviado não é uma imagem válida.")
                ]
            });
        }

        // buscar tema
        const tema = await Tema.findOne({ nomeLower: temaLower });

        if (!tema) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription(`<:fecharerr:1442682279322325095> O tema **${temaLower}** não existe.`)
                ]
            });
        }

        // ================================
        // VALIDAÇÕES DE DUPLICIDADE
        // ================================
        const respostaExiste = tema.imagens.some(img => img.resposta.toLowerCase() === resposta);

        if (respostaExiste) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription(
                            `<:fecharerr:1442682279322325095> Já existe uma imagem no tema **${tema.nomeOriginal}** com a resposta \`${resposta}\`.`
                        )
                ]
            });
        }

        const imagemExiste = tema.imagens.some(img => img.url === imagem.url);

        if (imagemExiste) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("<:fecharerr:1442682279322325095> Esta imagem já foi adicionada anteriormente neste tema.")
                ]
            });
        }

        // ID único para Cloudinary
        const respostaID = resposta.replace(/[^a-z0-9]/gi, "_").toLowerCase();

        const idJaExiste = tema.imagens.some(img =>
            img.resposta.replace(/[^a-z0-9]/gi, "_").toLowerCase() === respostaID
        );

        if (idJaExiste) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("<:fecharerr:1442682279322325095> Já existe uma imagem com um ID semelhante. Use outra resposta.")
                ]
            });
        }

        // ================================
        // UPLOAD PARA CLOUDINARY
        // ================================
        let upload;
        try {
            upload = await cloudinary.uploader.upload(imagem.url, {
                folder: `jbot/${tema.nomeLower}`,
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
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("<:fecharerr:1442682279322325095> Erro ao salvar imagem no Cloudinary.")
                ]
            });
        }

        // ================================
        // SALVAR NO BANCO
        // ================================
        tema.imagens.push({
            resposta,
            url: upload.secure_url,
            addedBy: interaction.user.id,
            addedAt: new Date()
        });

        await tema.save();

        // ================================
        // FINAL
        // ================================
        const embed = new EmbedBuilder()
            .setColor("Green")
            .setDescription(`<:newjbot:1440423555744534699>  \`${resposta}\` adicionado em \`${tema.nomeOriginal}\``);

        return interaction.editReply({ embeds: [embed] });
    }
};
