const { EmbedBuilder } = require("discord.js");
const Tema = require("../../models/Tema");

const partidasAtivas = new Map();

/* =====================================================
   SISTEMA DE TEMPO — queda suave e controlada
===================================================== */
function calcularTempo(nivel) {

    // 1–10 sempre 60s
    if (nivel <= 10) return 60;

    // Mínimo absoluto somente a partir do nível 300
    if (nivel >= 300) return 4;

    // Cálculo calibrado para 60s → 4s do nível 10 ao 300
    const decremento = 56 / 290; // diferença total / range real
    let tempo = 60 - ((nivel - 10) * decremento);

    // Garante que não passa de 4s antes do lvl 300
    if (tempo < 4) tempo = 4;

    return parseFloat(tempo.toFixed(1));
}




/* =====================================================
   Formatar tempo — sem vírgula em números inteiros
===================================================== */
function formatarTempo(t) {

    // Se o tempo for 10 ou mais → sempre inteiro
    if (t >= 10) {
        return `${Math.round(t)}s`;
    }

    // Se o tempo estiver abaixo de 10 → decimal com vírgula
    if (t < 10 && t > 4) {
        return `${t.toFixed(1).replace(".", ",")}s`;
    }

    // Tempo mínimo fixo
    if (t <= 4) {
        return `4s`;
    }
}


/* =====================================================
   EMBED DE ERRO PADRÃO
===================================================== */
function embedErro(txt) {
    return new EmbedBuilder()
        .setColor("#ff4d4d")
        .setDescription(`❌ ${txt}`);
}

function dificuldadePorNivel(nivel) {
    if (nivel <= 100) return "Fácil";
    if (nivel <= 200) return "Médio";
    if (nivel <= 300) return "Difícil";
    return "Extremo";
}


module.exports = {
    name: "play",
    description: "Inicia uma partida de adivinhação baseado em um tema.",

    async execute(message, args) {

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

        const ordenados = temas.sort((a, b) =>
            (a.nomeOriginal || a.nome).localeCompare(b.nomeOriginal || b.nome)
        );

        /* =====================================================
           BUSCA DE TEMA — CORRIGIDA
        ====================================================== */
        const temaEncontrado = ordenados.find(t => {
            const nome = (t.nomeOriginal || t.nome).toLowerCase();
            return (
                nome.startsWith(entrada) ||
                nome.includes(entrada) ||
                t.nomeLower === entrada
            );
        });

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

        /* =====================================================
           INSÍGNIA REAL (emoji salvo no DB)
        ====================================================== */
        const insignia = temaEncontrado.insigniaEmoji ? `${temaEncontrado.insigniaEmoji} ` : "";

        const temaNomeExibir =
            `${insignia}${temaEncontrado.nomeOriginal || temaEncontrado.nome}`;

        /* =====================================================
           Cores aleatórias
        ====================================================== */
        const cores = [
            "#5865F2", "#FF4757", "#FFA502", "#2ED573", "#1E90FF",
            "#E84393", "#00CEC9", "#6C5CE7", "#FD79A8", "#55EFC4"
        ];
        const corDaPartida = cores[Math.floor(Math.random() * cores.length)];

        const partida = {
            autorId: message.author.id,
            tema: temaEncontrado,
            nivel: 1,
            ranking: {},
            cor: corDaPartida,
            coletor: null,
            timeout: null,
            encerrada: false,
            temaNomeExibir
        };

        partidasAtivas.set(message.channel.id, partida);

        /* =====================================================
           EMBED INICIAL DA PARTIDA
        ====================================================== */
        const embedInicio = new EmbedBuilder()
            .setColor(corDaPartida)
            .setAuthor({
                name: `Solicitado por ${message.author.username}`,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            })
            .setDescription("🎮 **Iniciando nova partida...**")
            .addFields(
                { name: "Tema", value: `**${temaNomeExibir}**`, inline: true },
                { name: "Palavras", value: `**🖼 ${temaEncontrado.imagens.length}**`, inline: true }
            )
            .setFooter({ text: "⏳ Primeira imagem em 10s" });

        if (temaEncontrado.banner)
            embedInicio.setImage(temaEncontrado.banner);

        await message.channel.send({ embeds: [embedInicio] });

        partida.timeout = setTimeout(() => iniciarRodada(message, partida), 10000);
    },
};

/* =====================================================
   INICIAR RODADA
===================================================== */
async function iniciarRodada(message, partida) {
    
    partida.rodadaEmCurso = true;

    if (partida.encerrada) return;
    if (partida.pausada) return;


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

            collector.stop("acertou");

            msg.react("⭐").catch(() => {});


            partida.ranking[msg.author.id] =
                (partida.ranking[msg.author.id] || 0) + 1;

            const rankingOrdenado = montarRanking(partida);
            const rankingTexto = formatarRanking(rankingOrdenado);

            partida.rodadaEmCurso = false; // agora pode pausar!
            partida.itemAtual = null;
            partida.dicaUsada = false;


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
            partida.timeout = setTimeout(() => iniciarRodada(message, partida), 5000);
        }
    });

    collector.on("end", async (_, motivo) => {
        if (partida.encerrada) return;
        if (motivo === "acertou") return;
    
        partida.itemAtual = null;
        partida.dicaUsada = false;
        partida.rodadaEmCurso = false;


        partida.encerrada = true;
        partidasAtivas.delete(message.channel.id);

        const rankingOrdenado = montarRanking(partida);
        const rankingTexto = rankingOrdenado.length
            ? formatarRanking(rankingOrdenado)
            : "Ninguém pontuou.";

        const embedFim = new EmbedBuilder()
            .setColor(partida.cor)
            .setAuthor({
                name: `A resposta era: ${item.resposta}`,
                iconURL: message.client.user.displayAvatarURL()
            })
            .setThumbnail("https://cdn-icons-png.flaticon.com/128/8853/8853834.png")
            .setDescription(`🏆 **RANKING FINAL**\n${rankingTexto}`)
            .setFooter({ text: "Tempo esgotado, use ;play para jogar novamente!" });

        await message.channel.send({ embeds: [embedFim] });
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
   Export para ;fim
===================================================== */
module.exports.partidasAtivas = partidasAtivas;

module.exports.encerrarPartida = function (channelId) {
    const partida = partidasAtivas.get(channelId);
    if (!partida) return false;

    partida.encerrada = true;

    if (partida.coletor) partida.coletor.stop("fim_manual");
    if (partida.timeout) clearTimeout(partida.timeout);

    partidasAtivas.delete(channelId);
    return true;

};

module.exports.calcularTempo = calcularTempo;
module.exports.formatarTempo = formatarTempo;
module.exports.iniciarRodada = iniciarRodada;

