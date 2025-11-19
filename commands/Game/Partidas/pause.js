const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { partidasAtivas, iniciarRodada } = require("../play");

module.exports = {
    name: "pause",
    aliases: ["p"],
    description: "Pausa ou retoma a partida.",

    async execute(message) {
    // Aceitar apenas ";p" ou o prefixo que você usa
    const conteudo = message.content.trim().toLowerCase();
    if (conteudo !== ";p" && conteudo !== ";pause") {
        return; // ignora qualquer outra variação
    }

    const partida = partidasAtivas.get(message.channel.id);


        // Nenhuma partida no canal
        if (!partida) {
            const embed = new EmbedBuilder()
                .setColor("#ff4d4d")
                .setDescription("❌ Não existe uma partida ativa neste canal.");
            return message.reply({ embeds: [embed] });
        }

        // Apenas o criador da partida pode pausar ou retomar
        if (message.author.id !== partida.autorId) {
            const embed = new EmbedBuilder()
                .setColor("#ff4d4d")
                .setDescription("❌ Apenas quem iniciou a partida pode pausar ou retomá-la.");
            return message.reply({ embeds: [embed] });
        }

        // Não pode pausar durante contagem de rodada
        if (!partida.pausada && partida.rodadaEmCurso) {
            const embed = new EmbedBuilder()
                .setColor("#ff4d4d")
                .setTitle("⏳ Não é possível pausar agora")
                .setDescription("Você só pode pausar **após alguém acertar**, durante o intervalo da rodada.");
            return message.reply({ embeds: [embed] });
        }

        // =========================
        // TENTANDO DESPAUSAR
        // =========================
        if (partida.pausada) {
            partida.pausada = false;

            if (partida.despausarTimer) {
                clearTimeout(partida.despausarTimer);
                partida.despausarTimer = null;
            }

            const retomado = new EmbedBuilder()
                .setColor("#2ecc71")
                .setTitle("▶️ Partida retomada!");

            await message.reply({ embeds: [retomado] });

            // Retoma rodada após 1s
            return setTimeout(() => {
                partida.rodadaEmCurso = true;
                iniciarRodada(message, partida);
            }, 1000);
        }

        // =========================
        // PAUSANDO
        // =========================
        partida.pausada = true;

        // Cancela timers existentes
        if (partida.timeout) clearTimeout(partida.timeout);
        if (partida.despausarTimer) clearTimeout(partida.despausarTimer);
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

        // Inicia timer de 5 min (300.000ms)
        partida.despausarTimer = setTimeout(() => {
            if (partida.pausada) {
                partida.pausada = false;

                const embedTimeout = new EmbedBuilder()
                    .setColor("#e74c3c")
                    .setTitle("⏰ Pausa expirada")
                    .setDescription("O limite máximo de pausa (**5 minutos**) foi atingido.");

                message.channel.send({ embeds: [embedTimeout] });

                partida.rodadaEmCurso = true;
                iniciarRodada(message, partida);
            }
        }, 300000);
    }
};
