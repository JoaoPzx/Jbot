const { EmbedBuilder } = require("discord.js");
const Tema = require("../../models/Tema");

module.exports = {
    name: "add",
    description: "Adiciona uma imagem a um tema existente.",

    async execute(message, args) {
        if (!message.member.permissions.has("Administrator"))
            return message.reply("❌ Você não tem permissão para usar este comando.");

        if (!args[0])
            return message.reply("❌ Uso correto: `;add <tema> <resposta>` + imagem/anexo");

        // Nome do tema
        const temaNomeLower = args.shift().toLowerCase();

        // Buscar tema pelo nomeLower (correto)
        const tema = await Tema.findOne({ nomeLower: temaNomeLower });

        if (!tema)
            return message.reply(`❌ O tema **${temaNomeLower}** não existe.`);

        // -------------------------------------------------------
        // PRIORIDADE ÚNICA: ANEXO (arrastado, colado, copiar imagem)
        // -------------------------------------------------------
        const attachment = message.attachments.first();

        if (!attachment || !attachment.url) {
            return message.reply("⚠️ Envie uma imagem junto com o comando (anexo, arrastada ou colada).");
        }

        const imageURL = attachment.url; // << CDN link — CORRETO para embeds

        // Resposta (resto da mensagem)
        const resposta = args.join(" ").toLowerCase().trim();

        if (!resposta) {
            return message.reply("❌ Você precisa informar a resposta da imagem.");
        }

        // Salvar no MongoDB
        tema.imagens.push({
            resposta,
            url: imageURL
        });

        await tema.save();

        // Confirmar com embed
        const embed = new EmbedBuilder()
            .setColor("Green")
            .setAuthor({
                name: "Imagem adicionada ✔️",
                iconURL: message.client.user.displayAvatarURL()
            })
            .setDescription(`🖼 **Tema:** \`${tema.nomeOriginal || tema.nome}\`\n🔤 **Resposta:** \`${resposta}\``)
            .setThumbnail(imageURL)
            .setFooter({ text: `Adicionado por ${message.author.username}` });

        return message.channel.send({ embeds: [embed] });
    }
};
