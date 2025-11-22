const { EmbedBuilder } = require("discord.js");
const Tema = require("../../../models/Tema");
const { BANNER_PADRAO } = require("../../Utility/banners");
const partidasAtivas = new Map();
const Perfil = require("../../../models/Perfil");

/* =====================================================
   SISTEMA DE TEMPO – queda suave e controlada
===================================================== */
function calcularTempo(nivel) {
    if (nivel <= 10) return 60;
    if (nivel >= 300) return 4;

    const decremento = 56 / 290;
    let tempo = 60 - ((nivel - 10) * decremento);
    return tempo < 4 ? 4 : parseFloat(tempo.toFixed(1));
}

function formatarTempo(t) {
    if (t >= 10) return `${Math.round(t)}s`;
    if (t < 10 && t > 4) return `${t.toFixed(1).replace(".", ",")}s`;
    return `4s`;
}

/* =====================================================
   EMBED DE ERRO PADRÃO
===================================================== */
function embedErro(txt) {
    return new EmbedBuilder()
        .setColor("#ff4d4d")
        .setDescription(`❌ ${txt}`);
}

/* =====================================================
   DIFICULDADE POR NÍVEL
===================================================== */
function dificuldadePorNivel(nivel) {
    if (nivel <= 100) return "Fácil";
    if (nivel <= 200) return "Médio";
    if (nivel <= 300) return "Difícil";
    return "Extremo";
}

/* =====================================================
   FUNÇÃO: cálculo do combo por nível (distribuição)
   - níveis 1..3 => 1
   - níveis 4..36 => 2
   - 37..69 => 3
   - ...
   - 268..300 => 10
===================================================== */
function getComboBonusByLevel(level) {
    if (!level || level < 1) level = 1;
    if (level <= 3) return 1;

    const restante = level - 3; // 1..297
    const faixa = Math.ceil(restante / 33); // 1..9 (for 1..297)
    const bonus = faixa + 1; // 2..10
    return Math.min(bonus, 10);
}

/* =====================================================
   EXECUTE (INICIAR PARTIDA)
===================================================== */
async function execute(message, args) {

    const entradaRaw = args[0];
    if (!entradaRaw) {
        return message.reply({
            embeds: [embedErro("Use: `;play <tema>`")],
            allowedMentions: { repliedUser: true }
        });
    }

    if (partidasAtivas.has(message.channel.id)) {
        return message.reply({
            embeds: [embedErro("Já existe uma partida ativa neste canal!")],
            allowedMentions: { repliedUser: true }
        });
    }

    const entrada = entradaRaw.toLowerCase();
    const temas = await Tema.find({});

    if (!temas.length) {
        return message.reply({
            embeds: [embedErro("Não há temas cadastrados.")],
            allowedMentions: { repliedUser: true }
        });
    }

    const ordenados = temas.sort((a, b) =>
        (a.nomeOriginal || a.nome).localeCompare(b.nomeOriginal || b.nome)
    );

    let filtrados = ordenados.filter(t =>
        (t.nomeOriginal || t.nome).toLowerCase().startsWith(entrada)
    );

    if (!filtrados.length) {
        filtrados = ordenados.filter(t =>
            (t.nomeOriginal || t.nome).toLowerCase().includes(entrada)
        );
    }

    if (!filtrados.length) {
        return message.reply({
            embeds: [embedErro(`Nenhum tema encontrado para **${entradaRaw}**.`)],
            allowedMentions: { repliedUser: true }
        });
    }

    const temaEncontrado = filtrados[0];

    if (!temaEncontrado.imagens.length) {
        return message.reply({
            embeds: [embedErro(`O tema **${temaEncontrado.nomeOriginal || temaEncontrado.nome}** não possui imagens.`)],
            allowedMentions: { repliedUser: false }
        });
    }

    const insignia = temaEncontrado.insigniaEmoji ? `${temaEncontrado.insigniaEmoji} ` : "";
    const temaNomeExibir = `${insignia}${temaEncontrado.nomeOriginal || temaEncontrado.nome}`;

    const cores = ["#5865F2", "#FF4757", "#FFA502", "#2ED573", "#1E90FF", "#E84393", "#00CEC9", "#6C5CE7", "#FD79A8", "#55EFC4"];
    const corDaPartida = cores[Math.floor(Math.random() * cores.length)];

    const partida = {
        autorId: message.author.id,
        tema: temaEncontrado,
        nivel: 1,
        ranking: {},
        cor: corDaPartida,
        coletor: null,
        timeout: null,
        pausada: false,
        encerrada: false,
        temaNomeExibir,
        inicio: Date.now(),
        rodadaEmCurso: false,
        rodadaTerminada: false,

        // Combos do canal (map userId -> true)
        combos: {},

        // 🔥 Buff de tempo extra (fixo em +3s durante 30 níveis)
        tempoExtraGlobal: 0,
        tempoBoostNiveisRestantes: 0,

        podeUsarTempoAgora: true,
        podeUsarNitroAgora: true,
        nitro: false
    };

    partidasAtivas.set(message.channel.id, partida);

    const bannerInicio = validarBanner(temaEncontrado.banner);

    const embedInicio = new EmbedBuilder()
        .setColor(corDaPartida)
        .setAuthor({
            name: `Solicitado por ${message.author.username}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setDescription("🎮 **Iniciando nova partida...**\n\n🟢 **ATENÇÃO:** use `;combo` agora para ativar seu combo nesta partida (apenas durante os próximos 10s).")
        .addFields(
            { name: "Tema", value: `**${temaNomeExibir}**`, inline: true },
            { name: "Palavras", value: `**🖼 ${temaEncontrado.imagens.length}**`, inline: true }
        )
        .setFooter({ text: "⏳ Primeira imagem em 10s" })
        .setImage(bannerInicio);

    await message.channel.send({ embeds: [embedInicio] });

    // primeira rodada em 10s — durante esse tempo os jogadores podem usar ;combo
    partida.timeout = setTimeout(
        () => iniciarRodada(message, partida),
        10000
    );
}

/* =====================================================
   VALIDAR BANNER
===================================================== */
function validarBanner(banner) {
    return banner && banner.trim() !== "" ? banner : BANNER_PADRAO;
}

/* =====================================================
   INICIAR RODADA
===================================================== */
async function iniciarRodada(message, partida) {

    if (partida.encerrada || partida.pausada) return;

    partida.rodadaEmCurso = true;
    partida.rodadaTerminada = false;

    const tema = partida.tema;
    const item = tema.imagens[Math.floor(Math.random() * tema.imagens.length)];

    partida.itemAtual = item;
    partida.dicaUsada = false;

    // 🔥 BUFF DO +3s (Tempo Extra)
    if (partida.tempoBoostNiveisRestantes > 0) {
        partida.tempoExtraGlobal = 3;
    } else {
        partida.tempoExtraGlobal = 0;
    }

    let tempoSegundos = calcularTempo(partida.nivel);

    if (partida.tempoBoostNiveisRestantes > 0) {
        tempoSegundos += partida.tempoExtraGlobal;
        partida.tempoBoostNiveisRestantes--;

        if (partida.tempoBoostNiveisRestantes <= 0) {
            partida.tempoExtraGlobal = 0;
        }
    }

    const tempoFormatado = formatarTempo(tempoSegundos);
    const tempoMs = tempoSegundos * 1000;

    partida.podeUsarTempoAgora = false;
    partida.podeUsarNitroAgora = false;

    const embedRodada = new EmbedBuilder()
        .setColor(partida.cor)
        .addFields(
            { name: "Nível", value: `**🧩 ${partida.nivel}**`, inline: true },
            { name: "Tempo", value: `**⏰ ${tempoFormatado}**`, inline: true },
            { name: "Dificuldade", value: `**🧠 ${dificuldadePorNivel(partida.nivel)}**`, inline: true }
        )
        .setImage(item.url);

    await message.channel.send({ embeds: [embedRodada] });

    const collector = message.channel.createMessageCollector({
        filter: m => !m.author.bot,
        time: tempoMs
    });

    partida.coletor = collector;

    collector.on("collect", async (msg) => {
        if (msg.content.toLowerCase().trim() === item.resposta.toLowerCase()) {

            if (partida.pausada) return;

            // Atualizar pontos do jogador no Perfil (acúmulo REAL)
            let perfil = await Perfil.findOne({ userId: msg.author.id });
            if (!perfil) perfil = await Perfil.create({ userId: msg.author.id });

            // CÁLCULO DE PONTOS:
            // - se jogador ativou combo nesta partida:
            //     níveis 1..3 => ganha 1 (base)
            //     níveis >=4 => ganha = getComboBonusByLevel(partida.nivel) (substitui o 1)
            // - se não ativou combo => ganha 1
            let ganho;
            const possuiComboAtivo = Boolean(partida.combos && partida.combos[msg.author.id]);

            if (!possuiComboAtivo) {
                ganho = 1;
            } else {
                if (partida.nivel <= 3) ganho = 1;
                else ganho = getComboBonusByLevel(partida.nivel);
            }

            perfil.pontos = (perfil.pontos || 0) + ganho;
            await perfil.save();

            partida.rodadaTerminada = true;
            collector.stop("acertou");

            msg.react("<:badgejbot:1441489105929371768>").catch(() => {});

            partida.ranking[msg.author.id] =
                (partida.ranking[msg.author.id] || 0) + 1;

            const rankingOrdenado = montarRanking(partida);
            const rankingTexto = formatarRanking(rankingOrdenado, partida);

            const embedAcerto = new EmbedBuilder()
                .setColor(partida.cor)
                .setAuthor({
                    name: `${msg.author.username} acertou ${item.resposta}!`,
                    iconURL: message.client.user.displayAvatarURL({ dynamic: true })
                });

            embedAcerto.setDescription(`🏆 **RANKING**\n${rankingTexto}`);
            embedAcerto.setFooter({ text: `⏳ Próxima imagem em ${partida.nitro ? "5s" : "10s"}` });

            await message.channel.send({ embeds: [embedAcerto] });

            partida.podeUsarTempoAgora = true;
            partida.podeUsarNitroAgora = true;

            partida.nivel++;
            partida.rodadaEmCurso = false;

            partida.timeout = setTimeout(
                () => iniciarRodada(message, partida),
                partida.nitro ? 5000 : 10000
            );
        }
    });

    collector.on("end", async (_, motivo) => {
        if (partida.encerrada || motivo === "acertou" || partida.pausada) return;

        partida.rodadaTerminada = true;
        partida.encerrada = true;
        partidasAtivas.delete(message.channel.id);

        const themeBanner = validarBanner(partida.tema.banner);

        const rankingOrdenado = montarRanking(partida);
        const rankingTexto = rankingOrdenado.length
            ? formatarRanking(rankingOrdenado, partida)
            : "Ninguém pontuou.";

        const temaDB = await Tema.findById(partida.tema._id);

        // ===== RECORDISTA ATUAL =====
        let recordistaLinha;
        if (temaDB.record?.userId && temaDB.record?.pontos > 0) {
            recordistaLinha = `<@${temaDB.record.userId}> — **${temaDB.record.pontos} pts**`;
        } else {
            recordistaLinha = `<@${message.client.user.id}> — **0 pts**`;
        }

        // ===== EMBED FINAL =====
        const embedFim = new EmbedBuilder()
            .setColor(partida.cor)
            .setAuthor({
                name: `A resposta era: ${partida.itemAtual.resposta}`,
                iconURL: message.client.user.displayAvatarURL()
            })
            .setImage(themeBanner)
            .addFields(
                { name: "Tema", value: `**${partida.temaNomeExibir}**`, inline: true },
                { name: "Nível atingido", value: `**🧩 ${partida.nivel}**`, inline: true },
                { name: "Recordista", value: `🏆 ${recordistaLinha}`, inline: true }
            )
            .addFields(
                { name: "🏆 Ranking Final", value: rankingTexto }
            );

        await message.channel.send({ embeds: [embedFim] });

        // === atualizar recorde/pontuações do tema (mantive seu código) ===
        if (rankingOrdenado.length > 0) {
            const melhorJogadorId = rankingOrdenado[0][0];
            const melhorPontuacao = rankingOrdenado[0][1];

            const temaAtualizado = await Tema.findById(partida.tema._id);

            let registro = temaAtualizado.pontuacoes.find(p => p.userId === melhorJogadorId);

            if (!registro) {
                temaAtualizado.pontuacoes.push({
                    userId: melhorJogadorId,
                    total: melhorPontuacao,
                    partidas: 1
                });
            } else {
                registro.total += melhorPontuacao;
                registro.partidas += 1;
            }

            await temaAtualizado.save();
        }
    });
}

/* =====================================================
   FUNÇÕES AUXILIARES DE RANKING
   - formatarRanking agora adiciona o (+X) ao lado do jogador
     quando ele possui combo ativo nesta partida (opção A)
===================================================== */
function montarRanking(partida) {
    return Object.entries(partida.ranking).sort((a, b) => b[1] - a[1]);
}

function formatarRanking(lista, partida) {
    return lista
        .map((r, i) => {
            const userId = r[0];
            const pontos = r[1];
            let sufixo = "";

            if (partida.combos && partida.combos[userId]) {
                const bonus = getComboBonusByLevel(partida.nivel);
                // só exibe quando o bônus for maior que 1 (ou seja, a partir do nível 4)
                if (bonus > 1) sufixo = ` (+${bonus})`;
            }

            return `${i + 1}. <@${userId}> — **${pontos} ponto(s)**${sufixo}`;
        })
        .join("\n");
}

/* =====================================================
   EXPORTAR
===================================================== */
module.exports = {
    name: "play",
    description: "Inicia uma partida de adivinhação baseado em um tema.",
    execute,
    partidasAtivas,
    encerrarPartida: function (channelId) {
        const partida = partidasAtivas.get(channelId);
        if (!partida) return false;

        partida.encerrada = true;
        if (partida.coletor) partida.coletor.stop("fim_manual");
        if (partida.timeout) clearTimeout(partida.timeout);

        partidasAtivas.delete(channelId);
        return true;
    },
    calcularTempo,
    formatarTempo,
    iniciarRodada
};
