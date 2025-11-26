const { EmbedBuilder } = require("discord.js");
const Perfil = require("../../../models/Perfil");

function formatarNumero(num) {
    return new Intl.NumberFormat("pt-BR").format(num);
}

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
        const cooldown = 24 * 60 * 60 * 1000; // 24 horas

        // ================================
        // VALIDAR COOLDOWN
        // ================================
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
                .setDescription("Você já recebeu sua recompensa!")
                .addFields(
                    {
                        name: "Próxima liberação",
                        value: `**<:alarme:1440073671443091526> ${hours}h ${minutes}m restantes**`,
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

        // ================================
        // SORTEIO DO DAILY
        // ================================
        const baseMoedas = Math.floor(Math.random() * (100 - 50 + 1)) + 50; // 50–100
        const porcentagem = Math.floor(Math.random() * (100 - 50 + 1)) + 50; // 50–100%

        const bonus = Math.floor(baseMoedas * (porcentagem / 100));
        const total = baseMoedas + bonus;

        // Atualizar perfil
        userData.moedas += total;
        userData.lastDaily = new Date();
        await userData.save();

        // ================================
        // EMBED FINAL
        // ================================
        const embed = new EmbedBuilder()
            .setColor("#00FFA6")
            .setAuthor({
                name: "Daily coletado com sucesso!",
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            })
            .setThumbnail("https://i.ibb.co/Xr6wGhCB/presente-2.png")
            .addFields(
                {
                    name: "Sorteio de Moedas",
                    value: `<:sorteio:1441544915082281044> **${formatarNumero(baseMoedas)} moedas**`,
                    inline: true
                },
                {
                    name: "Sorteio de %",
                    value: `<:percentual:1441546241820459068> **${porcentagem}% → +${formatarNumero(bonus)} moedas**`,
                    inline: true
                },
                { name: "", value: "", inline: false },
                {
                    name: "Ganho Total",
                    value: `<:coin1:1441491987537727669> **${formatarNumero(total)} moedas**`,
                    inline: true
                },
                {
                    name: "Saldo Atual",
                    value: `<:carteira:1440068592354725888> **${formatarNumero(userData.moedas)} moedas**`,
                    inline: true
                }
            )
            .setFooter({
                text: "Próximo daily liberado em 24h",
                iconURL: "https://i.ibb.co/C5vBBxr4/alarme-3d.png"
            });

        return message.reply({ embeds: [embed] });
    }
};
