const { EmbedBuilder } = require("discord.js");
const Economia = require("../../models/Economia");

module.exports = {
    name: "daily",
    description: "Resgate sua recompensa diária.",

    async execute(message, args) {
        const userId = message.author.id;
        let userData = await Economia.findOne({ userId });
        if (!userData) userData = await Economia.create({ userId, balance: 0 });

        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000;

        if (userData.lastDaily && now - userData.lastDaily.getTime() < cooldown) {

            const remaining = cooldown - (now - userData.lastDaily.getTime());
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining / (1000 * 60)) % 60);

            const embedCooldown = new EmbedBuilder()
                .setColor("#ff6969")
                .setAuthor({ name: "Recompensa diária já coletada!", iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription(`Você já recebeu sua recompensa!`)
                .addFields(
                    { name: "<:alarme3d:1440073671443091526> Próxima liberação", value: `**${hours}h ${minutes}m restantes**`, inline: true },
                    { name: "\<:doutilizador:1440074090663645355> Usuário", value: `${message.author}`, inline: true }
                )
                .setFooter({ text: "Aguarde a liberação para coletar novamente!" })

            return message.reply({ embeds: [embedCooldown] });
        }

        const amount = Math.floor(Math.random() * (100 - 50 + 1)) + 50;

        userData.balance += amount;
        userData.lastDaily = new Date();
        await userData.save();

        const embed = new EmbedBuilder()
            .setColor("#00FFA6")
            .setAuthor({ name: "Daily Coletado!", iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setDescription(`Você resgatou sua recompensa diária!`)
            .setThumbnail("https://i.ibb.co/Xr6wGhCB/presente-2.png")
            .addFields(
                { name: "<:cofrinho:1440081499465453609> Valor Recebido", value: `**${amount} moedas**`, inline: true },
                { name: "<:bolsadedinheiro:1440072521847275550> Saldo Atual", value: `**${userData.balance} moedas**`, inline: true }
            )
            .setFooter({ text: `Recompensa disponível novamente em: ${cooldown/3600000}h!`, iconURL: 'https://i.ibb.co/C5vBBxr4/alarme-3d.png' })

        return message.reply({ embeds: [embed] });
    }
};
