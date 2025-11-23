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
            .setTitle("🎨 Personalizar Perfil")
            .setDescription(
                "**Escolha abaixo o que deseja editar:**\n\n" +
                "🖌️ **Cor** — selecione um tema de cor do perfil\n" +
                "🖼️ **Wallpaper** — envie uma imagem para o fundo do perfil\n" +
                "✏️ **Biografia** — escreva uma nova descrição\n\n" +
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
                .setEmoji("🎨"),

            new ButtonBuilder()
                .setCustomId("editar_wallpaper")
                .setLabel("Wallpaper")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("🖼️"),

            new ButtonBuilder()
                .setCustomId("editar_bio")
                .setLabel("Biografia")
                .setStyle(ButtonStyle.Success)
                .setEmoji("✏️")
        );

        return interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: false
        });
    }
};
