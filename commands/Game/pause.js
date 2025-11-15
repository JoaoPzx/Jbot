const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { partidasAtivas, iniciarRodada } = require("./play");

module.exports = {
    name: "pause",
    aliases: ["p"],
    description: "Pausa ou retoma a partida.",

    async execute(message) {
        const partida = partidasAtivas.get(message.channel.id);

        if (!partida) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Não existe uma partida ativa no canal.")
                ]
            });
        }

        // ❌ Tentou pausar durante a rodada
        if (partida.rodadaEmCurso === true) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setTitle("⏳ Fora do tempo de pausa")
                        .setDescription("Você só pode pausar **após alguém acertar**, durante o intervalo de 5s.")
                ]
            });
        }

        // ==========================================
        // DESPAUSE
        // ==========================================
        if (partida.pausada) {

            // Somente quem pausou pode despausar
            if (message.author.id !== partida.autorPausa) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#ff4d4d")
                            .setDescription("❌ Apenas quem pausou a partida pode despausá-la.")
                    ]
                });
            }

            partida.pausada = false;
            clearTimeout(partida.despausarTimer);

            const retomado = new EmbedBuilder()
                .setColor("#2ecc71")
                .setTitle("▶️ Partida Retomada")
                .setDescription(`A partida foi retomada por ${message.author}.`)
                .setTimestamp();

            await message.reply({ embeds: [retomado] });

            return setTimeout(() => {
                partida.rodadaEmCurso = true;
                iniciarRodada(message, partida);
            }, 1000);
        }

        // ==========================================
        // PAUSE
        // ==========================================
        partida.pausada = true;
        partida.autorPausa = message.author.id;

        clearTimeout(partida.timeout);

        const embedPause = new EmbedBuilder()
            .setColor("#f1c40f")
            .setTitle("⏸ Partida Pausada")
            .setDescription(`A partida foi pausada por ${message.author}.`)
            .setTimestamp();

        const botao = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("despausar_partida")
                .setLabel("Retomar")
                .setStyle(ButtonStyle.Success)
        );

        await message.reply({
            embeds: [embedPause],
            components: [botao]
        });

        // Pausa expira após 5 minutos
        partida.despausarTimer = setTimeout(() => {
            if (partida.pausada) {
                partida.pausada = false;

                message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#e74c3c")
                            .setTitle("⏳ Pausa expirada")
                            .setDescription("O tempo máximo de pausa (5 minutos) foi atingido.")
                    ]
                });

                partida.rodadaEmCurso = true;
                iniciarRodada(message, partida);
            }
        }, 5 * 60 * 1000);
    }
};
