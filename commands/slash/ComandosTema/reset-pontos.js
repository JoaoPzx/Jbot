const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder 
} = require('discord.js');

const Tema = require('../../../models/Tema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-pontos')
        .setDescription('Reseta os pontos de um jogador em um tema específico.')
        .addUserOption(opt =>
            opt.setName('jogador')
                .setDescription('Jogador que terá os pontos resetados.')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('tema')
                .setDescription('Tema que terá os pontos resetados.')
                .setAutocomplete(true)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    // ---------------------------------
    // 🔍 AUTOCOMPLETE DE TEMAS
    // ---------------------------------
    // ---------------------------------
// 🔍 AUTOCOMPLETE DE TEMAS
// ---------------------------------
async autocomplete(interaction) {
    const focused = interaction.options.getFocused()?.toLowerCase() || "";

    const temas = await Tema.find().limit(25);

    const filtrados = temas
        .filter(t => t.nomeLower.includes(focused))
        .map(t => ({
            name: t.nome,            // ❗ APENAS O NOME DO TEMA (SEM INSÍGNIA)
            value: t.nomeLower
        }));

    await interaction.respond(filtrados);
},


    // ---------------------------------
    // 🎯 EXECUÇÃO DO COMANDO
    // ---------------------------------
    async execute(interaction) {

        const user = interaction.options.getUser('jogador');
        const temaLower = interaction.options.getString('tema');

        const tema = await Tema.findOne({ nomeLower: temaLower });

        if (!tema) {
            const embed = new EmbedBuilder()
                .setColor('#ff4444')
                .setDescription("<:fecharerr:1442682279322325095> Tema não encontrado.");

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // ✨ Insígnia exatamente como resetrecord.js faz
        const insignia = tema.insigniaEmoji ? `${tema.insigniaEmoji} ` : "";
        const nomeExibir = `${insignia}${tema.nomeOriginal || tema.nome}`;

        // Buscar pontos do jogador no tema
        const entry = tema.pontuacoes.find(p => p.userId === user.id);

        if (!entry || entry.total === 0) {
            const embed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setDescription(
                    `<:avisojf:1442687822208303215> O jogador **${user.username}** já possui **0 pontos** no tema **${nomeExibir}**.`
                );

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Resetar
        entry.total = 0;
        entry.partidas = 0;
        await tema.save();

        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setDescription(
                `<:resetrec:1442956821357920406> Os pontos de **${user.username}** no tema **${nomeExibir}** foram resetados com sucesso!`
            );

        return interaction.reply({ embeds: [embed] });
    }
};
