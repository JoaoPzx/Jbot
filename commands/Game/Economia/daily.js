const { EmbedBuilder } = require("discord.js");
const Perfil = require("../../../models/Perfil");

module.exports = {
    name: "daily",
    description: "Resgate sua recompensa diária.",

    async execute(message) {
        const userId = message.author.id;

        let userData = await Perfil.findOne({ userId });
        if (!userData) {
            userData = await Perfil.create({
                userId,
                moedas: 0,
                lastDaily: null
            });
        }

        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000; // 24h

        // Verificar cooldown
        if (userData.lastDaily && now - userData.lastDaily.getTime() < cooldown) {
            const remaining = cooldown - (now - userData.lastDaily.getTime());
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining / (1000 * 60)) % 60);

            const embedCooldown = new EmbedBuilder()
                .setColor("#ff6969")
                .setAuthor({
                    name: "Recompensa diária já coletada!",
                    iconURL: message.author.displayAvatarURL({ dynamic: true })
                })
                .setDescription(`Você já recebeu sua recompensa!`)
                .addFields(
                    {
                        name: "Próxima liberação",
                        value: `<:alarme:1440073671443091526> **${hours}h ${minutes}m restantes**`,
                        inline: true
                    },
                    {
                        name: "Usuário",
                        value: `<:user:1440074090663645355> ${message.author}`,
                        inline: true
                    }
                )
                .setFooter({ text: "Aguarde a liberação para coletar novamente!" });

            return message.reply({ embeds: [embedCooldown] });
        }

        // Sorteio da recompensa
        const amount = Math.floor(Math.random() * (100 - 50 + 1)) + 50;

        // Aplicar recompensa
        userData.moedas += amount;
        userData.lastDaily = new Date();
        await userData.save();

        const embed = new EmbedBuilder()
            .setColor("#00FFA6")
            .setAuthor({
                name: "Daily Coletado!",
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            })
            .setDescription(`Você resgatou sua recompensa diária!`)
            .setThumbnail("https://i.ibb.co/Xr6wGhCB/presente-2.png")
            .addFields(
                {
                    name: "Valor Recebido",
                    value: `**<:dollar12:1441160561973923982> ${amount} moedas**`,
                    inline: true
                },
                {
                    name: "Saldo Atual",
                    value: `**<:carteira:1440068592354725888> ${userData.moedas} moedas**`,
                    inline: true
                }
            )
            .setFooter({
                text: `Recompensa disponível novamente em: ${cooldown / 3600000}h!`,
                iconURL: "https://i.ibb.co/C5vBBxr4/alarme-3d.png"
            });

        return message.reply({ embeds: [embed] });
    }
};
