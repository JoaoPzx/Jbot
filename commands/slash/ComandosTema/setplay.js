const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Perfil = require("../../../models/Perfil");
const Tema = require("../../../models/Tema");
const { partidasAtivas, calcularTempo, iniciarRodada } = require("../../Game/Partidas/play");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setplay")
        .setDescription("Inicia uma partida customizada com nível e pontos definidos.")
        .addUserOption(option =>
            option.setName("jogador")
                .setDescription("Jogador que iniciará a partida.")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName("pontos")
                .setDescription("Quantidade de pontos iniciais.")
                .setMinValue(0)
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName("nivel")
                .setDescription("Nível inicial da partida.")
                .setMinValue(1)
                .setMaxValue(9999)
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply();

        const jogador = interaction.options.getUser("jogador");
        const pontos = interaction.options.getInteger("pontos");
        const nivel = interaction.options.getInteger("nivel");

        const canalId = interaction.channel.id;

        // impedir duas partidas no mesmo canal
        if (partidasAtivas.has(canalId)) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Já existe uma partida ativa neste canal.")
                ]
            });
        }

        // carregar temas
        const temas = await Tema.find({});
        if (!temas.length) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Nenhum tema encontrado no banco de dados.")
                ]
            });
        }

        // escolher tema aleatório
        const temaEscolhido = temas[Math.floor(Math.random() * temas.length)];
        const nomeTema = temaEscolhido.nomeOriginal || temaEscolhido.nome;

        // garantir que o jogador tem perfil
        let perfil = await Perfil.findOne({ userId: jogador.id });
        if (!perfil) {
            perfil = await Perfil.create({ userId: jogador.id, inventario: [], moedas: 0, pontos: 0 });
        }

        // aplicar pontos no perfil
        perfil.pontos = pontos;
        await perfil.save();

        // gerar cor aleatória
        const cores = ["#5865F2", "#FF4757", "#FFA502", "#2ED573", "#1E90FF", "#E84393", "#00CEC9"];
        const corDaPartida = cores[Math.floor(Math.random() * cores.length)];

        // registrar nova partida
        const partida = {
            autorId: jogador.id,
            tema: temaEscolhido,
            nivel,
            ranking: { [jogador.id]: pontos },
            cor: corDaPartida,
            coletor: null,
            timeout: null,
            pausada: false,
            encerrada: false,
            temaNomeExibir: nomeTema,
            inicio: Date.now(),
            rodadaEmCurso: false,
            combos: {},
            tempoExtraGlobal: 0,
            tempoBoostNiveisRestantes: 0,
            podeUsarTempoAgora: true,
            podeUsarNitroAgora: true,
            nitro: false
        };

        partidasAtivas.set(canalId, partida);

        // tempo da rodada
        const tempo = calcularTempo(nivel);

        // embed inicial
        const embed = new EmbedBuilder()
            .setColor(corDaPartida)
            .setTitle("⚙️ Partida personalizada iniciada!")
            .addFields(
                { name: "Jogador", value: `<@${jogador.id}>`, inline: true },
                { name: "Tema", value: `**${nomeTema}**`, inline: true },
                { name: "Nível inicial", value: `🧩 **${nivel}**`, inline: true },
                { name: "Pontos iniciais", value: `⭐ **${pontos}**`, inline: true },
                { name: "Tempo calculado", value: `⏱ **${tempo}s**`, inline: true }
            )
            .setFooter({ text: "A primeira imagem será enviada em 3 segundos..." });

        await interaction.editReply({ embeds: [embed] });

        // start rodada após 3s
        partida.timeout = setTimeout(() => iniciarRodada(interaction, partida), 3000);
    }
};
