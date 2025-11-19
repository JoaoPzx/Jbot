const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const Perfil = require("../../models/Perfil");
const findUser = require("../Utility/getUser");

module.exports = {
    name: "addmoney",
    aliases: ["add"],
    description: "Adiciona moedas ao usuário informado. (Admin)",

    async execute(message, args) {

        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const embed = new EmbedBuilder()
                .setColor("#ff4d4d")
                .setTitle("❌ Erro")
                .setDescription("Você **não possui permissão** para usar este comando.");
            return message.reply({ embeds: [embed] });
        }

        const target = await findUser(message, args[0]);
        const amountStr = args[1];

        if (!target) {
            const embed = new EmbedBuilder()
                .setColor("#ff4d4d")
                .setTitle("❌ Erro")
                .setDescription("Usuário inválido! Use **menção**, **ID** ou **apelido**.");
            return message.reply({ embeds: [embed] });
        }

        if (!amountStr || !/^\d+$/.test(amountStr)) {
            const embed = new EmbedBuilder()
                .setColor("#ff4d4d")
                .setTitle("❌ Erro")
                .setDescription("Informe uma **quantia numérica válida**, **sem letras ou símbolos**.");
            return message.reply({ embeds: [embed] });
        }

        const amount = parseInt(amountStr, 10);
        if (amount <= 0) {
            const embed = new EmbedBuilder()
                .setColor("#ff4d4d")
                .setTitle("❌ Erro")
                .setDescription("A quantia deve ser **maior que zero**.");
            return message.reply({ embeds: [embed] });
        }

        // Usando Perfil (unificado)
        let userData = await Perfil.findOne({ userId: target.id });
        if (!userData) userData = await Perfil.create({ userId: target.id, moedas: 0 });

        userData.moedas = (userData.moedas || 0) + amount;
        await userData.save();

        const embed = new EmbedBuilder()
            .setColor("#00ff90")
            .setTitle("<:adcjbot:1440431531763040476> Moedas adicionadas!")
            .addFields(
                { name: "Usuário", value: `<:user:1440074090663645355> ${target}`, inline: true },
                { name: "Adição", value: `**<:ganhodedinheiro:1440113818134122516> ${amount} moedas**`, inline: true },
                { name: "Saldo", value: `**<:carteira:1440068592354725888> ${userData.moedas} moedas**`, inline: true }
            )
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
