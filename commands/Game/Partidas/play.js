const { EmbedBuilder } = require("discord.js");
const Tema = require("../../../models/Tema");
const { BANNER_PADRAO } = require("../../Utility/banners");

const partidasAtivas = new Map();

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
   FUNÇÃO PRINCIPAL EXECUTE()
===================================================== */
async function execute(message, args) {

    const entradaRaw = args[0];
    if (!entradaRaw) {
        return message.reply({
            embeds: [embedErro("Use: `;play <tema>`")],
            allowedMentions: { repliedUser: false }
        });
    }

    if (partidasAtivas.has(message.channel.id)) {
        return message.reply({
            embeds: [embedErro("Já existe uma partida ativa neste canal!")],
            allowedMentions: { repliedUser: false }
        });
    }

    const entrada = entradaRaw.toLowerCase();
    const temas = await Tema.find({});

    if (!temas.length) {
        return message.reply({
            embeds: [embedErro("Não há temas cadastrados.")],
            allowedMentions: { repliedUser: false }
        });
    }

    // Normaliza e ordena temas alfabeticamente
const ordenados = temas.sort((a, b) =>
    (a.nomeOriginal || a.nome).localeCompare(b.nomeOriginal || b.nome)
);

// 1️⃣ Filtrar temas que começam com a entrada
let filtrados = ordenados.filter(t =>
    (t.nomeOriginal || t.nome).toLowerCase().startsWith(entrada)
);

// 2️⃣ Se nenhum começar, filtrar por includes()
if (!filtrados.length) {
    filtrados = ordenados.filter(t =>
        (t.nomeOriginal || t.nome).toLowerCase().includes(entrada)
    );
}

// 3️⃣ Se mesmo assim não houver resultados → erro
if (!filtrados.length) {
    return message.reply({
        embeds: [embedErro(`Nenhum tema encontrado para **${entradaRaw}**.`)],
        allowedMentions: { repliedUser: false }
    });
}

// 4️⃣ Selecionar o primeiro da lista (correto alfabeticamente)
const temaEncontrado = filtrados[0];


    if (!temaEncontrado) {
        return message.reply({
            embeds: [embedErro(`Nenhum tema encontrado para **${entradaRaw}**.`)],
            allowedMentions: { repliedUser: false }
        });
    }

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
        rodadaTerminada: false
    };

    partidasAtivas.set(message.channel.id, partida);

    const bannerInicio = validarBanner(temaEncontrado.banner);

    const embedInicio = new EmbedBuilder()
        .setColor(corDaPartida)
        .setAuthor({
            name: `Solicitado por ${message.author.username}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setDescription("🎮 **Iniciando nova partida...**")
        .addFields(
            { name: "Tema", value: `**${temaNomeExibir}**`, inline: true },
            { name: "Palavras", value: `**🖼 ${temaEncontrado.imagens.length}**`, inline: true },
        )
        .setFooter({ text: "⏳ Primeira imagem em 10s" })
        .setImage(bannerInicio);

    await message.channel.send({ embeds: [embedInicio] });

    partida.timeout = setTimeout(() => iniciarRodada(message, partida), 10000);
}

/* =====================================================
   VALIDAÇÃO DO BANNER
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

    const tempoSegundos = calcularTempo(partida.nivel);
    const tempoFormatado = formatarTempo(tempoSegundos);
    const tempoMs = tempoSegundos * 1000;

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

            partida.rodadaTerminada = true;
            collector.stop("acertou");

            msg.react("⭐").catch(() => {});

            partida.ranking[msg.author.id] = (partida.ranking[msg.author.id] || 0) + 1;

            const rankingOrdenado = montarRanking(partida);
            const rankingTexto = formatarRanking(rankingOrdenado);

            const embedAcerto = new EmbedBuilder()
                .setColor(partida.cor)
                .setAuthor({
                    name: `${msg.author.username} acertou ${item.resposta}!`,
                    iconURL: msg.author.displayAvatarURL({ dynamic: true })
                })
                .setDescription(`🏆 **RANKING**\n${rankingTexto}`)
                .setFooter({ text: "⏳ Próxima imagem em 5s" });
                
            await message.channel.send({ embeds: [embedAcerto] });

            partida.nivel++;
            partida.rodadaEmCurso = false;

            partida.timeout = setTimeout(() => iniciarRodada(message, partida), 5000);
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
            ? formatarRanking(rankingOrdenado)
            : "Ninguém pontuou.";

const temaDB = await Tema.findById(partida.tema._id);

// ===== RECORDISTA ATUAL =====
let recordistaLinha;
if (temaDB.record?.userId && temaDB.record?.pontos > 0) {
    recordistaLinha = `<@${temaDB.record.userId}> — **${temaDB.record.pontos} pts**`;
} else {
    recordistaLinha = `<@${message.client.user.id}> — **0 pts**`;
}

// ===== EMBED FINAL (ajustado com 3 fields lado a lado) =====
const embedFim = new EmbedBuilder()
    .setColor(partida.cor)
    .setAuthor({
        name: `A resposta era: ${item.resposta}`,
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

// enviar
await message.channel.send({ embeds: [embedFim] });



// === RECORDISTA ATUAL DO TEMA ===
    
        // === SISTEMA DE RECORDE ===
if (rankingOrdenado.length > 0) {
    const melhorJogadorId = rankingOrdenado[0][0];
    const melhorPontuacao = rankingOrdenado[0][1];

    const temaDB = await Tema.findById(partida.tema._id);

    if (!temaDB.record?.userId || melhorPontuacao > temaDB.record.pontos) {

        temaDB.record = {
            userId: melhorJogadorId,
            pontos: melhorPontuacao,
            data: new Date()
        };
        await temaDB.save();

        const embedRecorde = new EmbedBuilder()
            .setColor("#FFD700")
            .setTitle("🏆 NOVO RECORDE ATINGIDO!")
            .setThumbnail("https://i.ibb.co/3mKpcBQq/medal-1.png")
            .setDescription(
                `🔥 **<@${melhorJogadorId}> Quebrou o recorde!**\n\n` +
                `Pontuação: **${melhorPontuacao} pts**\n` +
                `Tema: **${partida.temaNomeExibir}**\n\n` +
                `✨ *Uma nova lenda foi criada...*`
            );

        await message.channel.send({ embeds: [embedRecorde] });
    }

    // === SISTEMA DE ACÚMULO DE PONTOS POR JOGADOR (NOVO) ===
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
   Ranking helpers
===================================================== */
function montarRanking(partida) {
    return Object.entries(partida.ranking)
        .sort((a, b) => b[1] - a[1]);
}

function formatarRanking(lista) {
    return lista
        .map((r, i) => `${i + 1}. <@${r[0]}> — **${r[1]} ponto(s)**`)
        .join("\n");
}

/* =====================================================
   Exportações FINAL
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
