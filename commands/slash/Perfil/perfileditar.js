const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("perfil-editar")
        .setDescription("Personalize seu perfil: cor, wallpaper ou biografia."),

    async execute(interaction) {

        const embed = new EmbedBuilder()
            .setColor("#2b2d31")
            .setTitle("<:paletejf:1442988083497926706> Personalizar Perfil")
            .setDescription(
                "**Escolha abaixo o que deseja editar:**\n\n" +
                "<:pinceljf:1442988290977304736> **Cor** — selecione um tema de cor do perfil\n" +
                "<:imagemjbot:1440425616359952445> **Wallpaper** — envie uma imagem para o fundo do perfil\n" +
                "<:lapisjf:1442988550466441297> **Biografia** — escreva uma nova descrição\n\n" +
                "Clique em um botão para começar!"
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({
                text: "JBot • Edição avançada de perfil",
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("editar_cor")
                .setLabel("Cor")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("<:paletejf:1442988083497926706>"),

            new ButtonBuilder()
                .setCustomId("editar_wallpaper")
                .setLabel("Wallpaper")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("<:imagemjbot:1440425616359952445>"),

            new ButtonBuilder()
                .setCustomId("editar_bio")
                .setLabel("Biografia")
                .setStyle(ButtonStyle.Success)
                .setEmoji("<:lapisjf:1442988550466441297>")
        );

        return interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: false
        });
    }
};
