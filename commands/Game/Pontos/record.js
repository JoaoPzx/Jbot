const { EmbedBuilder } = require("discord.js");
const Tema = require("../../../models/Tema");

module.exports = {
    name: "record",
    aliases: ["recordista", "rec"],
    description: "Mostra o recordista atual de um tema.",

    async execute(message, args) {

        const erro = (txt) =>
            message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setAuthor({
                            name: message.client.user.username,
                            iconURL: message.client.user.displayAvatarURL()
                        })
                        .setDescription(`<:fecharerr:1442682279322325095> ${txt}`)
                ]
            });

        if (!args[0])
            return erro("Uso correto: `;record <tema>`");

        const entrada = args.shift().toLowerCase().trim();

        const temas = await Tema.find({});
        if (!temas.length)
            return erro("Nenhum tema cadastrado ainda.");

        const tema = temas.find(t =>
            (t.nomeOriginal || t.nome).toLowerCase().startsWith(entrada)
        );

        if (!tema)
            return erro(`Nenhum tema corresponde a **${entrada}**.`);

        // =============== INSÍGNIA + NOME ===============
        const insignia = tema.insigniaEmoji ? `${tema.insigniaEmoji} ` : "";
        const nomeCompleto = `${insignia}${tema.nomeOriginal || tema.nome}`;

        // =============== SEM RECORDE ===============
        if (!tema.record?.userId || !tema.record?.pontos) {
            return erro(`O tema **${nomeCompleto}** ainda não possui um recordista.`);
        }

        // =============== DATA DO RECORDE ===============
        const data = tema.record.data
            ? `<t:${Math.floor(new Date(tema.record.data).getTime() / 1000)}:f>`
            : "Desconhecida";

        // =============== EMBED FINAL ===============
        const embed = new EmbedBuilder()
            .setColor("#FFD700")
            .setAuthor({
                name: message.client.user.username,
                iconURL: message.client.user.displayAvatarURL()
            })
            .setTitle("Recorde Oficial do Tema")
            .addFields(
                { name: "Tema", value: `**${nomeCompleto}**`, inline: true },
                { name: "Recordista", value: `<:medalrec:1442253575576354876> <@${tema.record.userId}>`, inline: true },
                { name: "Pontuação", value: `**<:pontos:1442182692748791889> ${tema.record.pontos} pontos**`, inline: true },
                { name: "Quando", value: `<:calendariodemesa:1439655247579447326> ${data}`, inline: true }
            )
            .setThumbnail("https://i.ibb.co/BMJY9rs/estrela-1.png")
            .setFooter({
                text: `Solicitado por ${message.author.username}`,
                iconURL: message.author.displayAvatarURL()
            });

        return message.reply({ embeds: [embed] });
    }
};
