const { EmbedBuilder } = require("discord.js");
const { encerrarPartida, partidasAtivas } = require("./play");
const Tema = require("../../models/Tema");
const { BANNER_PADRAO } = require("../../commands/Utility/banners");

// Função padrão de validação — mesma do ;play
function validarBanner(banner) {
    return banner && typeof banner === "string" && banner.trim() !== ""
        ? banner
        : BANNER_PADRAO;
}

module.exports = {
    name: "fim",
    description: "Encerra manualmente a partida no canal atual.",

    async execute(message) {
        const canalId = message.channel.id;
        const partida = partidasAtivas.get(canalId);

        // ============================
        // VALIDAÇÕES
        // ============================
        if (!partida) {
            const embedErro = new EmbedBuilder()
                .setColor("#ff4d4d")
                .setDescription("❌ Não há nenhuma partida ativa neste canal.");
            return message.reply({ embeds: [embedErro] });
        }

        if (message.author.id !== partida.autorId) {
            const embedErro = new EmbedBuilder()
                .setColor("#ff4d4d")
                .setDescription("❌ Apenas **quem iniciou a partida** pode encerrá-la.");
            return message.reply({ embeds: [embedErro] });
        }

        // ============================
        // INFO
        // ============================
        const tema = await Tema.findById(partida.tema._id);
        const nomeTema = partida.temaNomeExibir;
        const nivel = partida.nivel;

        const rankingOrdenado = Object.entries(partida.ranking).sort((a, b) => b[1] - a[1]);
        const rankingTexto = rankingOrdenado
            .map(([id, pts], i) => `**${i + 1}. <@${id}> — ${pts} ponto(s)**`)
            .join("\n") || "Nenhum ponto registrado.";

        const melhorJogadorId = rankingOrdenado[0]?.[0] || null;
        const melhorPontuacao = rankingOrdenado[0]?.[1] || 0;

        // Tempo total
        let tempoTotal = "Indisponível";
        if (partida.inicio) {
            const duracao = Date.now() - partida.inicio;
            const s = Math.floor((duracao / 1000) % 60);
            const m = Math.floor((duracao / 1000 / 60) % 60);
            const h = Math.floor(duracao / 1000 / 60 / 60);
            tempoTotal = (h ? `${h}h ` : "") + (m ? `${m}m ` : "") + `${s}s`;
        }

        // Finalizar cache
        encerrarPartida(canalId);

        // ============================
        // BANNER
        // ============================
        const bannerFinal = validarBanner(tema.banner);

        // ============================
        // DEFININDO RECORDISTA ATUAL
        // ============================
        let recordistaTexto;

        if (tema.record?.userId && tema.record?.pontos > 0) {
            recordistaTexto = `🏆 <@${tema.record.userId}> — **${tema.record.pontos} pts**`;
        } else {
            tema.record = {
                userId: message.client.user.id,
                pontos: 0,
                data: new Date()
            };
            await tema.save();
            recordistaTexto = `🏆 <@${message.client.user.id}> — **0 pts**`;
        }

        // ============================
        // EMBED FINAL (NOVO FORMATO)
        // ============================
        const embedFim = new EmbedBuilder()
            .setColor("#f1c40f")
            .setAuthor({
                name: message.client.user.username,
                iconURL: message.client.user.displayAvatarURL()
            })
            .setTitle("🛑 Partida Finalizada!")
            .setImage(bannerFinal)
            .addFields(
                { name: "Tema", value: `**${nomeTema}**`, inline: true },
                { name: "Nível atingido", value: `🧩 **${nivel}**`, inline: true },
                { name: "Recordista", value: recordistaTexto, inline: true }
            )
            .addFields({
                name: "🏆 Ranking Final",
                value: rankingTexto
            });

        await message.reply({ embeds: [embedFim] });

        // ============================
        // SISTEMA DE RECORDE (SEM ALTERAÇÃO)
        // ============================
        if (melhorJogadorId && melhorPontuacao > 0) {
            if (!tema.record?.userId || melhorPontuacao > tema.record.pontos) {

                tema.record = {
                    userId: melhorJogadorId,
                    pontos: melhorPontuacao,
                    data: new Date()
                };
                await tema.save();

                const embedRecorde = new EmbedBuilder()
                    .setColor("#FFD700")
                    .setTitle("🏆 **NOVO RECORDE ATINGIDO!**")
                    .setThumbnail("https://i.ibb.co/3mKpcBQq/medal-1.png")
                    .setDescription(
                        `🔥 **<@${melhorJogadorId}> Quebrou o recorde!**\n\n` +
                        `Pontuação: **${melhorPontuacao} pts**\n` +
                        `Tema: **${nomeTema}**\n\n` +
                        `✨ *Uma nova lenda foi criada...*`
                    );

                message.channel.send({ embeds: [embedRecorde] });
            }
        }

        // ============================
        // 🔥 SISTEMA DE RANK ACUMULADO (NOVO)
        // ============================
        if (melhorJogadorId && melhorPontuacao > 0) {
            let registro = tema.pontuacoes?.find((p) => p.userId === melhorJogadorId);

            if (!registro) {
                tema.pontuacoes.push({
                    userId: melhorJogadorId,
                    total: melhorPontuacao,
                    partidas: 1
                });
            } else {
                registro.total += melhorPontuacao;
                registro.partidas += 1;
            }

            await tema.save();
        }
    }
};
