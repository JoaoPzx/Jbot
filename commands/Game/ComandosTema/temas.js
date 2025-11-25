const { EmbedBuilder } = require("discord.js");
const Tema = require("../../../models/Tema");

module.exports = {
    name: "temas",
    description: "Mostra todos os temas cadastrados e quantidade de imagens.",

    async execute(message) {

        // 🔒 Permissão
        if (!message.member.permissions.has("Administrator")) {
            return message.reply("<:fecharerr:1442682279322325095> Você não tem permissão para usar este comando.");
        }

        // 🧩 Buscar todos os temas no MongoDB
        const temas = await Tema.find();

        if (!temas.length) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setAuthor({
                            name: message.client.user.username,
                            iconURL: message.client.user.displayAvatarURL()
                        })
                        .setTitle("<:pastatema:1442960424193622026> Nenhum Tema Encontrado")
                        .setDescription("Ainda não existem temas cadastrados no banco de dados.")
                        .setTimestamp()
                ]
            });
        }

        // Ordenar por nome
        temas.sort((a, b) => a.nome.localeCompare(b.nome));

        // 🖼 Montar a lista
        const lista = temas.map(t => 
            `<:pastatema:1442960424193622026> **${t.nomeOriginal || t.nome}** - <:imagemjbot:1440425616359952445> ${t.imagens.length} imagen${t.imagens.length !== 1 ? "s" : ""}`
        );

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setAuthor({
                name: message.client.user.username,
                iconURL: message.client.user.displayAvatarURL()
            })
            .setDescription(`**<:pilhatemas:1442951385388941404> Lista de Temas Cadastrados**\n\n ${lista.join("\n")}`)
            .setFooter({
                text: `Solicitado por ${message.author.username}`,
                iconURL: message.author.displayAvatarURL()
            })
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    },
};
