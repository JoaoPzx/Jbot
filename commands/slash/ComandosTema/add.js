const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");
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
        // DUPLICIDADES
        // ================================
        if (tema.imagens.some(img => img.resposta.toLowerCase() === resposta)) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription(`Já existe uma imagem no tema **${tema.nomeOriginal}** com a resposta \`${resposta}\`.`)
                ]
            });
        }

        // ID único
        const respostaID = resposta.replace(/[^a-z0-9]/gi, "_").toLowerCase();

        if (tema.imagens.some(img =>
            img.resposta.replace(/[^a-z0-9]/gi, "_").toLowerCase() === respostaID
        )) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("Já existe uma imagem com um ID semelhante. Use outra resposta.")
                ]
            });
        }

        // ================================
        // DOWNLOAD DA IMAGEM (fix para cloud)
        // ================================
        let buffer;
        try {
            const response = await axios.get(imagem.url, {
                responseType: "arraybuffer",
                headers: { "User-Agent": "Mozilla/5.0" } // importante em hosts!
            });
            buffer = Buffer.from(response.data);
        } catch (err) {
            console.error(err);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Erro ao baixar a imagem pelo servidor (cloud).")
                ]
            });
        }

        // transforma buffer em base64
        const base64 = `data:${imagem.contentType};base64,${buffer.toString("base64")}`;

        // ================================
        // UPLOAD REAL PARA CLOUDINARY
        // ================================
        let upload;
        try {
            upload = await cloudinary.uploader.upload(base64, {
                folder: `jbot/${tema.nomeLower}`,
                public_id: respostaID,
                overwrite: true
            });
        } catch (err) {
            console.error(err);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Erro ao enviar imagem para o Cloudinary (cloud-safe).")
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

        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setDescription(`<:newjbot:1440423555744534699>  \`${resposta}\` adicionado em \`${tema.nomeOriginal}\``)
            ]
        });
    }
};
