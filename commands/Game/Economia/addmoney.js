const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const Perfil = require("../../../models/Perfil");
const findUser = require("../../Utility/getUser");

module.exports = {
    name: "addmoney",
    aliases: ["add"],
    description: "Adiciona moedas ao usuário informado. (Admin)",

    async execute(message, args) {

        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setTitle("<:fecharerr:1442682279322325095> Erro")
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
                        .setTitle("<:fecharerr:1442682279322325095> Erro")
                        .setDescription("Usuário inválido! Use **menção**, **ID** ou **apelido**.")
                ]
            });
        }

        if (!amountStr) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setTitle("<:fecharerr:1442682279322325095> Erro")
                        .setDescription("Informe uma **quantia válida**. Ex: `1k`, `2500`, `3m`.")
                ]
            });
        }

        // 🔥 Função para converter abreviações: 1k = 1000, 1m = 1.000.000
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
                        .setTitle("<:fecharerr:1442682279322325095> Valor inválido")
                        .setDescription("Use valores como:\n`1000`, `1k`, `2.5m`, `3b`.")
                ]
            });
        }

        let userData = await Perfil.findOne({ userId: target.id });
        if (!userData) userData = await Perfil.create({ userId: target.id, moedas: 0 });

        userData.moedas = (userData.moedas || 0) + amount;
        await userData.save();

        // 🔥 formatar como 10.000
        const amountFormatted = amount.toLocaleString("pt-BR");
        const saldoFormatted = userData.moedas.toLocaleString("pt-BR");

        const embed = new EmbedBuilder()
            .setColor("#00ff90")
            .setTitle("<:adcjbot:1440431531763040476> Moedas adicionadas!")
            .addFields(
                { name: "Usuário", value: `<:user:1440074090663645355> ${target}`, inline: true },
                { name: "Adição", value: `**<:ganhodedinheiro:1440113818134122516> ${amountFormatted} moedas**`, inline: true },
                { name: "Saldo", value: `**<:carteira:1440068592354725888> ${saldoFormatted} moedas**`, inline: true }
            )
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
