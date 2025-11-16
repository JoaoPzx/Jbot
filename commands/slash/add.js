const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Tema = require("../../models/Tema");
const cloudinary = require("../../commands/Utility/cloudinary");

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

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const temas = await Tema.find({});
        const lista = temas
            .map(t => t.nomeOriginal || t.nome)
            .filter(n => n.toLowerCase().includes(focused))
            .slice(0, 25);

        return interaction.respond(lista.map(n => ({ name: n, value: n })));
    },

    async execute(interaction) {
        const imagem = interaction.options.getAttachment("imagem");
        const temaNome = interaction.options.getString("tema").toLowerCase();
        const resposta = interaction.options.getString("resposta").toLowerCase();

        if (!imagem || !imagem.url) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ff4d4d")
                    .setDescription("❌ Não foi possível obter a imagem enviada.")],
                flags: 64
            });
        }

        const tema = await Tema.findOne({ nomeLower: temaNome });

        if (!tema) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ff4d4d")
                    .setDescription(`❌ O tema **${temaNome}** não existe.`)],
                flags: 64
            });
        }

        // Nome final com insígnia
        const insignia = tema.insigniaEmoji ? `${tema.insigniaEmoji} ` : "";
        const nomeFinal = `${insignia}${tema.nomeOriginal || tema.nome}`;

        const pastaTema = tema.nomeLower;
        const respostaID = resposta.replace(/[^a-z0-9]/gi, "_");

        let upload;
        try {
            upload = await cloudinary.uploader.upload(imagem.url, {
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
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor("#ff4d4d")
                    .setDescription("❌ Erro ao salvar imagem no Cloudinary.")],
                flags: 64
            });
        }

        tema.imagens.push({
            resposta,
            url: upload.secure_url,
            addedBy: interaction.user.id,
            addedAt: new Date()
        });

        await tema.save();

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setAuthor({
                name: "Imagem adicionada ✔️",
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .addFields(
                { name: "Tema", value: nomeFinal, inline: true },
                { name: "Resposta", value: `\`${resposta}\``, inline: true },
                { name: "Adicionado por", value: `👤 <@${interaction.user.id}>`, inline: true }
            )
            .setImage(upload.secure_url)
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
