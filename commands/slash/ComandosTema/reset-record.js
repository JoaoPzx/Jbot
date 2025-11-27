const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

const Tema = require("../../../models/Tema");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("reset-record")
        .setDescription("Reseta o recordista de um tema.")
        .addStringOption(option =>
            option.setName("tema")
                .setDescription("Nome do tema que terá o recorde resetado.")
                .setAutocomplete(true)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // -------------------------------------
    // 🔍 AUTOCOMPLETE — apenas nome do tema
    // -------------------------------------
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const temas = await Tema.find().limit(25);

        const filtrados = temas
            .filter(t => t.nomeLower.includes(focused))
            .map(t => ({
                name: t.nomeOriginal || t.nome,
                value: t.nomeLower
            }));

        await interaction.respond(filtrados);
    },

    // -------------------------------------
    // 🎯 EXECUTAR COMANDO
    // -------------------------------------
    async execute(interaction) {
        const temaLower = interaction.options.getString("tema");

        const temas = await Tema.find({});
        if (!temas.length) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("<:fecharerr:1442682279322325095> Nenhum tema cadastrado.")
                ],
                ephemeral: true
            });
        }

        const tema = temas.find(t => t.nomeLower === temaLower);
        if (!tema) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription(`<:fecharerr:1442682279322325095> Tema não encontrado para **${temaLower}**.`)
                ],
                ephemeral: true
            });
        }

        // 📌 Insígnia igual ao comando de prefixo
        const insignia = tema.insigniaEmoji ? `${tema.insigniaEmoji} ` : "";
        const nomeExibir = `${insignia}${tema.nomeOriginal || tema.nome}`;

        // Sem recorde
        if (!tema.record?.userId) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ffcc00")
                        .setDescription(`<:avisojf:1442687822208303215> O tema **${nomeExibir}** não possui recorde registrado.`)
                ],
                ephemeral: true
            });
        }

        // Resetar
        tema.record = {
            userId: null,
            pontos: 0,
            data: null
        };
        await tema.save();

        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setAuthor({
                name: interaction.client.user.username,
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTitle("<:resetrec:1442956821357920406> Recorde Resetado!")
            .setDescription(
                `O recorde do tema **${nomeExibir}** foi **resetado com sucesso**!\n\n` +
                `Agora **qualquer jogador** pode conquistar o trono novamente e se tornar o **novo lendário recordista!** <:estrelasrec:1442956786314252318>`
            );

        return interaction.reply({ embeds: [embed] });
    }
};
