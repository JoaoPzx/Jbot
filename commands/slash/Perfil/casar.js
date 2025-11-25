const {SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require("discord.js");

const Perfil = require("../../../models/Perfil");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("casar")
        .setDescription("💍 Peça alguém em casamento!")
        .addUserOption(option =>
            option
                .setName("usuario")
                .setDescription("Quem você quer casar?")
                .setRequired(true)
        ),

    async execute(interaction) {

        const userA = interaction.user;
        const userB = interaction.options.getUser("usuario");

        if (userA.id === userB.id) {
            return interaction.reply({
                content: "<:fecharerr:1442682279322325095> Você não pode casar consigo mesmo!",
                ephemeral: true
            });
        }

        const perfilA = await Perfil.findOne({ userId: userA.id });
        const perfilB = await Perfil.findOne({ userId: userB.id });

        if (perfilA?.casamento) {
            return interaction.reply({
                content: "<:fecharerr:1442682279322325095> Você já está casado!",
                ephemeral: true
            });
        }

        if (perfilB?.casamento) {
            return interaction.reply({
                content: "<:fecharerr:1442682279322325095> Esse usuário já está casado!",
                ephemeral: true
            });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("aceitar_casamento")
                .setLabel("Aceitar 💍")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("recusar_casamento")
                .setLabel("Recusar ❌")
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({
            content: `💌 **${userB}**, você recebeu um pedido de casamento de **${userA}**!\nAceita?`,
            components: [row]
        });

        // Salvar pedido temporariamente
        interaction.client.pedidosCasamento ??= new Map();
        interaction.client.pedidosCasamento.set(userB.id, {
            de: userA.id,
            para: userB.id,
            canal: interaction.channel.id
        });
    }
};
