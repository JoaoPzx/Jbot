const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const Economia = require("../../models/Economia");
const findUser = require("../Utility/getUser");

module.exports = {
    name: "removemoney",
    aliases: ["rm"],
    description: "Remove moedas do usuário informado. (Admin)",

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

        const amount = parseInt(amountStr);
        if (amount <= 0) {
            const embed = new EmbedBuilder()
                .setColor("#ff4d4d")
                .setTitle("❌ Erro")
                .setDescription("A quantia deve ser **maior que zero**.");
            return message.reply({ embeds: [embed] });
        }

        let userData = await Economia.findOne({ userId: target.id });
        if (!userData) userData = await Economia.create({ userId: target.id, balance: 0 });

        // 🚫 NOVA VALIDAÇÃO: saldo insuficiente
        if (userData.balance < amount) {
            const embed = new EmbedBuilder()
                .setColor("#ff4d4d")
                .setTitle("❌ Erro")
                .setDescription(`O usuário **${target.username}** não possui **${amount} moedas** para remover.\nSaldo atual: **${userData.balance} moedas**.`);
            return message.reply({ embeds: [embed] });
        }

        userData.balance -= amount;
        await userData.save();

        const embed = new EmbedBuilder()
            .setColor("#ff6969")
            .setTitle("<:rmjbot:1440431569071243314> Moedas removidas!")
            .addFields(
                { name: "Usuário", value: `<:user:1440074090663645355> ${target}`, inline: true },
                { name: "Remoção", value: `**<:perdadedinheiro:1440096747912302753> ${amount} moedas**`, inline: true },
                { name: "Saldo", value: `**<:carteira:1440068592354725888> ${userData.balance} moedas**`, inline: true }
            )
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
