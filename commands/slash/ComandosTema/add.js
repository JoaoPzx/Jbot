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
        const imagem = interaction.options.getAttachment("imagem");
        const temaLower = interaction.options.getString("tema").toLowerCase();
        const resposta = interaction.options.getString("resposta").toLowerCase();

        // valida imagem
        if (!imagem || !imagem.url) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Não foi possível obter a imagem enviada.")
                ],
                ephemeral: true
            });
        }

        if (!imagem.contentType?.startsWith("image/")) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ O arquivo enviado não é uma imagem válida.")
                ],
                ephemeral: true
            });
        }

        // buscar tema
        const tema = await Tema.findOne({ nomeLower: temaLower });

        if (!tema) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription(`❌ O tema **${temaLower}** não existe.`)
                ],
                ephemeral: true
            });
        }

        // ================================
        // VALIDAÇÕES DE DUPLICIDADE
        // ================================

        // Resposta duplicada
        const respostaExiste = tema.imagens.some(img => img.resposta.toLowerCase() === resposta);

        if (respostaExiste) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription(`❌ Já existe uma imagem no tema **${tema.nomeOriginal}** com a resposta \`${resposta}\`.`)
                ],
                ephemeral: true
            });
        }

        // Imagem duplicada (mesma URL de upload)
        const imagemExiste = tema.imagens.some(img => img.url === imagem.url);

        if (imagemExiste) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Esta imagem já foi adicionada anteriormente neste tema.")
                ],
                ephemeral: true
            });
        }

        // ID único para o Cloudinary
        const respostaID = resposta.replace(/[^a-z0-9]/gi, "_").toLowerCase();

        const idJaExiste = tema.imagens.some(img =>
            img.resposta.replace(/[^a-z0-9]/gi, "_").toLowerCase() === respostaID
        );

        if (idJaExiste) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Já existe uma imagem com um ID semelhante. Tente usar outro nome de resposta.")
                ],
                ephemeral: true
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
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Erro ao salvar imagem no Cloudinary.")
                ],
                ephemeral: true
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
        // RESPOSTA FINAL
        // ================================
        const embed = new EmbedBuilder()
            .setColor("Green")
            .setDescription(`🖼  \`${resposta}\` adicionado em \`${tema.nomeOriginal}\``);

        return interaction.reply({ embeds: [embed] });
    }
};
