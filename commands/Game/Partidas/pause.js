const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { partidasAtivas, iniciarRodada } = require("./play");

module.exports = {
    name: "pause",
    aliases: ["p"],
    description: "Pausa ou retoma a partida.",

    async execute(message) {

        const conteudo = message.content.trim().toLowerCase();
        if (conteudo !== ";p" && conteudo !== ";pause") return;

        const partida = partidasAtivas.get(message.channel.id);

        if (!partida) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Não existe uma partida ativa neste canal.")
                ]
            });
        }

        // Apenas o criador pode pausar/despausar
        if (message.author.id !== partida.autorId) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Apenas quem iniciou a partida pode pausar ou retomá-la.")
                ]
            });
        }

        // Bloqueia pausa durante imagem da rodada
        if (!partida.pausada && partida.rodadaEmCurso) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setTitle("⏳ Não é possível pausar agora")
                        .setDescription("Você só pode pausar **após alguém acertar**, durante o intervalo da rodada.")
                ]
            });
        }

        // =========================================================
        // =====================  RETOMAR  ==========================
        // =========================================================
        if (partida.pausada) {

            partida.pausada = false;

            // Cancela timer de expiração da pausa
            if (partida.pauseExpireTimeout) {
                clearTimeout(partida.pauseExpireTimeout);
                partida.pauseExpireTimeout = null;
            }

            const retomado = new EmbedBuilder()
                .setColor("#2ecc71")
                .setTitle("▶️ Partida retomada!");

            await message.reply({ embeds: [retomado] });

            return setTimeout(() => {
                partida.rodadaEmCurso = true;
                iniciarRodada(message, partida);
            }, 1000);
        }

        // =========================================================
        // ======================  PAUSAR  ==========================
        // =========================================================
        partida.pausada = true;

        // Cancela timers existentes
        if (partida.timeout) clearTimeout(partida.timeout);
        if (partida.coletor) partida.coletor.stop("paused");

        const embedPause = new EmbedBuilder()
            .setColor("#f1c40f")
            .setTitle("⏸ Partida pausada!");

        const botao = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("despausar_partida")
                .setLabel("Retomar")
                .setStyle(ButtonStyle.Success)
        );

        await message.reply({ embeds: [embedPause], components: [botao] });

        // =========================================================
        // ========== TIMER DE EXPIRAÇÃO (5 MINUTOS) ===============
        // =========================================================
        partida.pauseExpireTimeout = setTimeout(async () => {

    if (!partida.pausada) return;

    partida.pausada = false;

    const embedTimeout = new EmbedBuilder()
        .setColor("#e74c3c")
        .setTitle("⏰ Pausa expirada")
        .setDescription(
            "O limite máximo de pausa (**5 minutos**) foi atingido.\n" +
            "A partida foi retomada automaticamente."
        );

    await message.channel.send({
        content: `⛔ <@${partida.autorId}>`, // <- MENÇÃO REAL AQUI
        embeds: [embedTimeout]
    });

    partida.rodadaEmCurso = true;
    iniciarRodada(message, partida);

}, 1 * 30 * 1000);
 // 5 minutos
    }
};
