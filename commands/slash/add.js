const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");
const Tema = require("../../models/Tema");
const cloudinary = require("../../commands/Utility/cloudinary");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("add")
        .setDescription("Adiciona uma imagem a um tema existente.")
        .addAttachmentOption(opt =>
            opt.setName("imagem")
                .setDescription("Envie a imagem (anexo, arrastar ou copiar imagem)")
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("tema")
                .setDescription("Nome do tema (autocomplete)")
                .setAutocomplete(true)
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("resposta")
                .setDescription("Resposta da imagem")
                .setRequired(true)
        ),

    // ======================
    // AUTOCOMPLETE DE TEMA
    // ======================
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const temas = await Tema.find({});

        const sugestões = temas
            .map(t => t.nomeOriginal || t.nome)
            .filter(nome => nome.toLowerCase().includes(focused))
            .slice(0, 25)
            .map(nome => ({ name: nome, value: nome }));

        return interaction.respond(sugestões);
    },

    // ======================
    // EXECUÇÃO DO COMANDO
    // ======================
    async execute(interaction) {

        const imagem = interaction.options.getAttachment("imagem");
        const entradaTema = interaction.options.getString("tema").toLowerCase().trim();
        const resposta = interaction.options.getString("resposta").toLowerCase().trim();

        // ======================
        // EMBEDS DE RESPOSTA
        // ======================
        const erro = (txt) =>
            interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription(`❌ ${txt}`)
                ],
                ephemeral: true
            });

        const sucesso = (embed) =>
            interaction.reply({
                embeds: [embed],
                ephemeral: false
            });

        // ======================
        // VERIFICA IMAGEM
        // ======================
        if (!imagem?.url) return erro("Não foi possível processar a imagem enviada.");

        // ======================
        // BUSCA TEMA
        // ======================
        const temas = await Tema.find({});
        if (!temas.length) return erro("Nenhum tema cadastrado ainda.");

        const tema = temas.find(t =>
            (t.nomeOriginal || t.nome).toLowerCase().startsWith(entradaTema)
        );

        if (!tema) return erro(`O tema **${entradaTema}** não existe.`);

        // ======================
        // UPLOAD PARA CLOUDINARY
        // ======================
        let urlFinal;
        try {
            const upload = await cloudinary.uploader.upload(imagem.url, {
                folder: `jbot/${tema.nomeLower}`,
                public_id: resposta.replace(/\s+/g, "_"),
                overwrite: true
            });
            urlFinal = upload.secure_url;
        } catch (e) {
            console.error(e);
            return erro("Falha ao hospedar imagem no servidor.");
        }

        // ======================
        // SALVAR NO BANCO
        // ======================
        tema.imagens.push({
            resposta,
            url: urlFinal,
            addedBy: interaction.user.id,
            addedAt: new Date()
        });
        await tema.save();

        // ======================
        // EMBED DE CONFIRMAÇÃO
        // ======================
        const embed = new EmbedBuilder()
            .setColor("Green")
            .setAuthor({
                name: "Imagem adicionada com sucesso ✔️",
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .addFields(
                { name: "🖼 Tema", value: tema.nomeOriginal || tema.nome, inline: true },
                { name: "💬 Resposta", value: resposta, inline: true },
                { name: "👤 Adicionado por", value: `<@${interaction.user.id}>`, inline: true }
            )
            .setThumbnail(urlFinal);

        return sucesso(embed);
    }
};
