const { SlashCommandBuilder } = require("discord.js");
const Tema = require("../../models/Tema");

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
               .setDescription("Nome do tema")
               .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName("resposta")
               .setDescription("Resposta da imagem")
               .setRequired(true)
        ),

    async execute(interaction) {
        const imagem = interaction.options.getAttachment("imagem");
        const temaNome = interaction.options.getString("tema").toLowerCase();
        const resposta = interaction.options.getString("resposta").toLowerCase();

        // Verificar se a imagem tem URL válida
        if (!imagem || !imagem.url) {
            return interaction.reply({
                content: "❌ Não foi possível obter a URL da imagem.",
                ephemeral: true
            });
        }

        // Buscar tema
        const tema = await Tema.findOne({ nomeLower: temaNome });
        if (!tema) {
            return interaction.reply({
                content: `❌ O tema **${temaNome}** não existe.`,
                ephemeral: true
            });
        }

        // Adicionar no banco
        tema.imagens.push({
            resposta,
            url: imagem.url   // << SALVANDO O LINK REAL AQUI
        });

        await tema.save();

        return interaction.reply({
            content: `🖼️ Imagem adicionada ao tema **${tema.nomeOriginal || tema.nome}** com sucesso!`
        });
    }
};
