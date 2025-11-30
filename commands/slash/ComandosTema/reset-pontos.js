const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Tema = require("../../../models/Tema");
const Perfil = require("../../../models/Perfil");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("reset-pontos")
        .setDescription("Reseta toda a pontuação de todos os temas e de todos os jogadores."),

    async execute(interaction) {

        await interaction.deferReply({ ephemeral: false });

        // ============================
        // RESETAR PONTOS NOS TEMAS
        // ============================
        const temas = await Tema.find({});
        for (const tema of temas) {

            tema.pontuacoes = []; // limpa todos os usuários
            tema.record = {
                userId: null,
                pontos: 0,
                nivel: 0,
                data: null
            };

            await tema.save();
        }

        // ============================
        // RESETAR PONTOS NOS PERFIS
        // ============================
        const perfis = await Perfil.find({});
        for (const perfil of perfis) {

            perfil.pontuacoes = [];  // limpa pontuação por tema
            perfil.pontos = 0;       // limpa pontuação geral
            perfil.insignias = [];   // remove todas as insígnias do perfil

            await perfil.save();
        }

        // ============================
        // RESPOSTA FINAL
        // ============================
        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle("<:resetrec:1442956821357920406> Pontos resetados com sucesso!")
            .setDescription("Todas as pontuações, recordes e insígnias foram removidas.")
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};
