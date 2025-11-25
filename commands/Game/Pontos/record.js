const { EmbedBuilder } = require("discord.js");
const Tema = require("../../../models/Tema");

module.exports = {
    name: "record",
    aliases: ["recordista", "rec"],
    description: "Mostra o recordista atual de um tema.",

    async execute(message, args) {

        // ============================
        // EMBEDS PADRÃO (ERRO)
        // ============================
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

        // ============================
        // VERIFICA ARGUMENTO
        // ============================
        if (!args[0])
            return erro("Uso correto: `;record <tema>`");

        const entrada = args.shift().toLowerCase().trim();

        // ============================
        // BUSCAR TEMAS
        // ============================
        const temas = await Tema.find({});
        if (!temas.length)
            return erro("Nenhum tema cadastrado ainda.");

        // Aceita abreviação
        const tema = temas.find(t =>
            (t.nomeOriginal || t.nome).toLowerCase().startsWith(entrada)
        );

        if (!tema)
            return erro(`Nenhum tema corresponde a **${entrada}**.`);

        // ============================
        // VALIDAR SE TEM RECORDE
        // ============================
        if (!tema.record?.userId || !tema.record?.pontos)
            return erro(`O tema **${tema.nomeOriginal || tema.nome}** ainda não possui um recordista.`);

        // ============================
        // MONTAR INFORMAÇÕES
        // ============================
        const insignia = tema.insigniaEmoji || "";
        const nomeFinal = `${insignia} ${tema.nomeOriginal || tema.nome}`.trim();

        const data = tema.record.data
            ? `<t:${Math.floor(new Date(tema.record.data).getTime() / 1000)}:f>`
            : "Desconhecida";

        // ============================
        // EMBED FINAL
        // ============================
        const embed = new EmbedBuilder()
            .setColor("#FFD700")
            .setAuthor({
                name: message.client.user.username,
                iconURL: message.client.user.displayAvatarURL()
            })
            .setTitle("<:tacadeourorec:1439651590435770500> Recorde Oficial do Tema")
            .addFields(
                { name: "Tema", value: nomeFinal, inline: true },
                { name: "Recordista", value: `<:medalrec:1439649790853124217> <@${tema.record.userId}>`, inline: true },
                { name: "Pontuação", value: `**<:badgejbot:1441489105929371768> ${tema.record.pontos} pontos**`, inline: true },
                { name: "Quando", value: `<:calendariodemesa:1439655247579447326> ${data}`, inline: true }
            )
            .setThumbnail("https://i.ibb.co/bfYzcsm/medalha-de-ouro.png")
            .setFooter({ text: `Solicitado por ${message.author.username}`, iconURL: message.author.displayAvatarURL()  });

        return message.reply({ embeds: [embed] });
    }
};
