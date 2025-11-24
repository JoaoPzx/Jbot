const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require("discord.js");

const { partidasAtivas, iniciarRodada } = require("./play");

module.exports = {
    name: "pause",
    aliases: ["p"],
    description: "Pausa ou retoma a partida.",

    async execute(message) {

        const conteudo = message.content.trim().toLowerCase();
        if (conteudo !== ";p" && conteudo !== ";pause") return;

        const partida = partidasAtivas.get(message.channel.id);

        // =====================================================
        // SEM PARTIDA
        // =====================================================
        if (!partida) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Não existe uma partida ativa neste canal.")
                ]
            });
        }

        // =====================================================
        // APENAS O CRIADOR PODE PAUSAR / RETOMAR
        // =====================================================
        if (message.author.id !== partida.autorId) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Apenas quem iniciou a partida pode pausar ou retomá-la.")
                ]
            });
        }

        // =====================================================
        // NÃO PODE PAUSAR DURANTE A IMAGEM
        // (somente após acerto, no intervalo da rodada)
        // =====================================================
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

            // Cancela timer de expiração (se houver)
            if (partida.pauseExpireTimeout) {
                clearTimeout(partida.pauseExpireTimeout);
                partida.pauseExpireTimeout = null;
            }

            const retomado = new EmbedBuilder()
                .setColor("#2ecc71")
                .setTitle("▶️ Partida retomada!");

            await message.reply({ embeds: [retomado] });

            // Retoma a rodada após 1s
            return setTimeout(() => {
                partida.rodadaEmCurso = true;
                iniciarRodada(message, partida);
            }, 1000);
        }

        // =========================================================
        // ======================  PAUSAR  ==========================
        // =========================================================

        partida.pausada = true;

        // Cancela timers da rodada
        if (partida.timeout) clearTimeout(partida.timeout);
        if (partida.coletor) partida.coletor.stop("paused");

        // Cancela timer antigo de pausa, se existir
        if (partida.pauseExpireTimeout) {
            clearTimeout(partida.pauseExpireTimeout);
            partida.pauseExpireTimeout = null;
        }

        const embedPause = new EmbedBuilder()
            .setColor("#f1c40f")
            .setTitle("⏸ Partida pausada!");

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

        // =========================================================
        // ====== TIMER DE EXPIRAÇÃO AUTOMÁTICA (5 MINUTOS) ========
        // =========================================================

        partida.pauseExpireTimeout = setTimeout(async () => {

            // Se já retomou, cancela
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
                content: `⛔ <@${partida.autorId}>`,
                embeds: [embedTimeout]
            });

            partida.rodadaEmCurso = true;
            iniciarRodada(message, partida);

        }, 5 * 60 * 1000);
    }
};
