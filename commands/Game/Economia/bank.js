const { EmbedBuilder } = require("discord.js");
const Perfil = require("../../../models/Perfil");

module.exports = {
    name: "bank",
    aliases: ["saldo"],
    description: "Veja seu saldo ou o saldo de outro usuário.",

    async execute(message, args) {
        const target = message.mentions.users.first() 
            || message.client.users.cache.get(args[0]) 
            || message.author;

        let perfil = await Perfil.findOne({ userId: target.id });
        if (!perfil) {
            perfil = await Perfil.create({ userId: target.id, moedas: 0 });
        }

        // 🔥 Formatar moedas: 10000 → 10.000
        const saldoFormatado = perfil.moedas.toLocaleString("pt-BR");

        const embed = new EmbedBuilder()
            .setColor("#6FB1FF")
            .setAuthor({
                name: `Banco de ${target.username}`,
                iconURL: "https://i.ibb.co/j1vhkSG/bolsa-de-dinheiro.png"
            })
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .setDescription(`Aqui estão as informações bancárias de **${target.username}**`)
            .addFields({
                name: "Saldo",
                value: `**<:carteira:1440068592354725888> ${saldoFormatado} moedas**`,
                inline: true
            })
            .setFooter({ text: "Use as suas moedas com sabedoria!" })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
