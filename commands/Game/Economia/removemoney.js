const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const Perfil = require("../../../models/Perfil");
const findUser = require("../../Utility/getUser");

module.exports = {
    name: "removemoney",
    aliases: ["rm"],
    description: "Remove moedas do usuário informado. (Admin)",

    async execute(message, args) {

        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setTitle("❌ Erro")
                        .setDescription("Você **não possui permissão** para usar este comando.")
                ]
            });
        }

        const target = await findUser(message, args[0]);
        const amountStr = args[1];

        if (!target) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setTitle("❌ Erro")
                        .setDescription("Usuário inválido! Use **menção**, **ID** ou **apelido**.")
                ]
            });
        }

        if (!amountStr) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setTitle("❌ Valor inválido")
                        .setDescription("Informe uma quantia válida. Ex: `2000`, `1k`, `2.5m`.")
                ]
            });
        }

        // 🔥 Conversor de abreviações (1k, 1m, 1b)
        function parseAmount(str) {
            str = str.toLowerCase();

            if (/^\d+(\.\d+)?k$/.test(str)) {
                return Math.round(parseFloat(str) * 1000);
            }
            if (/^\d+(\.\d+)?m$/.test(str)) {
                return Math.round(parseFloat(str) * 1_000_000);
            }
            if (/^\d+(\.\d+)?b$/.test(str)) {
                return Math.round(parseFloat(str) * 1_000_000_000);
            }
            if (/^\d+(\.\d+)?$/.test(str)) {
                return Math.round(parseFloat(str));
            }
            return NaN;
        }

        const amount = parseAmount(amountStr);

        if (!amount || isNaN(amount) || amount <= 0) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setTitle("❌ Valor inválido")
                        .setDescription("Use valores como: `1000`, `1k`, `2.5m`, `3b`.")
                ]
            });
        }

        let userData = await Perfil.findOne({ userId: target.id });
        if (!userData) userData = await Perfil.create({ userId: target.id });

        if (userData.moedas < amount) {
            const saldoFmt = userData.moedas.toLocaleString("pt-BR");
            const amountFmt = amount.toLocaleString("pt-BR");

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setTitle("❌ Saldo insuficiente")
                        .setDescription(
                            `O usuário **${target.username}** não possui **${amountFmt} moedas** para remover.\n` +
                            `Saldo atual: **${saldoFmt} moedas**.`
                        )
                ]
            });
        }

        userData.moedas -= amount;
        await userData.save();

        const amountFormatted = amount.toLocaleString("pt-BR");
        const saldoFormatted = userData.moedas.toLocaleString("pt-BR");

        const embed = new EmbedBuilder()
            .setColor("#ff6969")
            .setTitle("<:rmjbot:1440431569071243314> Moedas removidas!")
            .addFields(
                { name: "Usuário", value: `<:user:1440074090663645355> ${target}`, inline: true },
                { name: "Remoção", value: `**<:perdadedinheiro:1440096747912302753> ${amountFormatted} moedas**`, inline: true },
                { name: "Saldo", value: `**<:carteira:1440068592354725888> ${saldoFormatted} moedas**`, inline: true }
            )
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
