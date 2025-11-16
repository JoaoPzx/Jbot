const { EmbedBuilder } = require("discord.js");
const Tema = require("../../models/Tema");

module.exports = {
    name: "add",
    description: "Adiciona uma imagem a um tema existente.",

    async execute(message, args) {

        // ==== Função Embed Padrão ====
        const criarEmbed = (cor, descricao) => {
            return new EmbedBuilder()
                .setColor(cor)
                .setDescription(descricao)
        };

        // ==== PERMISSÃO ====
        if (!message.member.permissions.has("Administrator"))
            return message.reply({
                embeds: [
                    criarEmbed("Red", "❌ **Você não tem permissão para usar este comando.**")
                ]
            });

        // ==== USO INCORRETO ====
        if (!args[0])
            return message.reply({
                embeds: [
                    criarEmbed("Yellow", "⚠️ **Uso correto:** `;add <tema> <resposta>` + imagem/anexo")
                ]
            });

        const entradaTema = args.shift().toLowerCase().trim();
        const temas = await Tema.find({});

        // ==== SEM TEMAS ====
        if (!temas.length)
            return message.reply({
                embeds: [
                    criarEmbed("Yellow", "⚠️ **Nenhum tema cadastrado ainda.**")
                ]
            });

        // ==== BUSCAR TEMA POR ABREVIAÇÃO ====
        const tema = temas.find(t =>
            (t.nomeOriginal || t.nome).toLowerCase().startsWith(entradaTema)
        );

        if (!tema)
            return message.reply({
                embeds: [
                    criarEmbed("Red", `❌ **O tema \`${entradaTema}\` não existe.**`)
                ]
            });

        // ==== IMAGEM AUSENTE ====
        const attachment = message.attachments.first();
        if (!attachment || !attachment.url)
            return message.reply({
                embeds: [
                    criarEmbed("Yellow", "⚠️ **Envie uma imagem junto com o comando.**")
                ]
            });

        // ==== RESPOSTA AUSENTE ====
        const resposta = args.join(" ").toLowerCase().trim();
        if (!resposta)
            return message.reply({
                embeds: [
                    criarEmbed("Yellow", "⚠️ **Você precisa informar a resposta da imagem.**")
                ]
            });

        // ==== SALVAR NO DB ====
        tema.imagens.push({
            resposta,
            url: attachment.url,
            addedBy: message.author.id,
            addedAt: new Date()
        });

        await tema.save();

        // ==== EMBED SUCESSO ====
        const embedSucesso = new EmbedBuilder()
            .setColor("Green")
            .setAuthor({
                name: "Imagem adicionada com sucesso!",
                iconURL: message.client.user.displayAvatarURL()
            })
            .addFields(
                { name: "🖼 Tema", value: `\`${tema.nomeOriginal || tema.nome}\``, inline: true },
                { name: "💬 Resposta", value: `\`${resposta}\``, inline: true },
                { name: "👤 Adicionado por", value: `<@${message.author.id}>`, inline: true }
            )
            .setThumbnail(attachment.url)
            .setTimestamp();

        return message.reply({ embeds: [embedSucesso] });
    }
};
