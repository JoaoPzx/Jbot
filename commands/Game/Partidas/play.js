const { EmbedBuilder } = require("discord.js");
const Tema = require("../../../models/Tema");
const { BANNER_PADRAO } = require("../../Utility/banners");
const partidasAtivas = new Map();

const recentEncerradas = new Map(); 

function guardarSnapshotParaRecuperar(channelId, snapshot) {

    const prev = recentEncerradas.get(channelId);
    if (prev && prev.timer) clearTimeout(prev.timer);

    const expiresAt = Date.now() + 15_000;
    const timer = setTimeout(() => {
        recentEncerradas.delete(channelId);
    }, 15_000);

    recentEncerradas.set(channelId, { snapshot, expiresAt, timer });
}

const Perfil = require("../../../models/Perfil");
const tema = require("../ComandosTema/tema");

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
        .setDescription(`<:fecharerr:1442682279322325095> ${txt}`);
}

/* =====================================================
   DIFICULDADE POR NÍVEL
===================================================== */
function dificuldadePorNivel(nivel) {
    if (nivel <= 100) return "<:facil:1442299292021948476> Fácil";
    if (nivel <= 200) return "<:medio:1442299319872127147> Médio";
    if (nivel <= 300) return "<:dificil:1442299352000233586> Difícil";
    return "<:extremo:1442299371008954519> Extremo";
}

/* =====================================================
   FUNÇÃO: cálculo do combo por nível (distribuição)
   - níveis 1..3 => 1
   - níveis 4..36 => 2
   - 37..69 => 3
   - ...
   - 268..300 => 10
   - acima de 300 permanece 10
===================================================== */
function getComboBonusByLevel(level) {
    if (!level || level < 1) level = 1;
    if (level <= 3) return 1;

    const restante = level - 3; // 1..297
    const faixa = Math.ceil(restante / 33); // 1..9 (para 1..297)
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
        ranking: {},          // agora guarda PONTOS, não só acertos
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

        // referência do embed da rodada (imagem) – usado pelo ;combo
        embedRodada: null,

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
        .setDescription("🎮 **Iniciando nova partida...**")
        .addFields(
            { name: "Tema", value: `**${temaNomeExibir}**`, inline: true },
            { name: "Palavras", value: `**<:imagemjbot:1440425616359952445> ${temaEncontrado.imagens.length}**`, inline: true },
        )
        .setFooter({ text: "Primeira imagem em 10s", iconURL: "https://i.ibb.co/ZpnWwHT9/sand-clock.png" })
        .setImage(bannerInicio);

    await message.channel.send({ embeds: [embedInicio] });
    partida.ultimoEmbed = "inicio";


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

function gerarFooterDicas() {
    const dicas = [
        "Use ;dica para revelar uma ajuda especial!",
        "Use ;resposta para revelar a resposta!",
        "Use ;tempo para ganhar +2 segundos!",
        "Use ;nitro para reduzir o tempo de espera!",
        "Use ;sobrevida para recuperar uma partida!",
        "Use ;combo para aumentar sua pontuação!"
    ];

    const aleatorio = Math.floor(Math.random() * dicas.length);
    return dicas[aleatorio];
}

    const tempoFormatado = formatarTempo(tempoSegundos);
    const tempoMs = tempoSegundos * 1000;

    partida.podeUsarTempoAgora = false;
    partida.podeUsarNitroAgora = false;

    const embedRodada = new EmbedBuilder()
        .setColor(partida.cor)
        .addFields(
            { name: "Nível", value: `**<:levelup:1442272592789639239> ${partida.nivel}**`, inline: true },
            { name: "Tempo", value: `**<:alarme:1440073671443091526> ${tempoFormatado}**`, inline: true },
            { name: "Dificuldade", value: `**${dificuldadePorNivel(partida.nivel)}**`, inline: true }
        )
        .setImage(item.url)

        embedRodada.setFooter({text: gerarFooterDicas()})

    // ⬇️ AQUI: registramos o embed da rodada para o comando ;combo saber qual embed é proibido
    const msgRodada = await message.channel.send({ embeds: [embedRodada] });
    partida.embedRodada = msgRodada;
    partida.ultimoEmbed = "imagem";


    const collector = message.channel.createMessageCollector({
        filter: m => !m.author.bot,
        time: tempoMs
    });

    partida.coletor = collector;

    collector.on("collect", async (msg) => {

    if (partida.encerrada) return;

    if (msg.content.toLowerCase().trim() === item.resposta.toLowerCase()) {

        if (partida.pausada) return;

        // Atualizar pontos no perfil
        let perfil = await Perfil.findOne({ userId: msg.author.id });
        if (!perfil) perfil = await Perfil.create({ userId: msg.author.id });

        // Cálculo do combo
        let ganho;
        const possuiComboAtivo = Boolean(partida.combos && partida.combos[msg.author.id]);

        if (!possuiComboAtivo) {
            ganho = 1;
        } else {
            if (partida.nivel <= 3) ganho = 1;
            else ganho = getComboBonusByLevel(partida.nivel);
        }

        // Pontos globais
        perfil.pontos = (perfil.pontos || 0) + ganho;
        await perfil.save();

       // Ranking da partida
partida.ranking[msg.author.id] =
    (partida.ranking[msg.author.id] || 0) + ganho;

// ⭐ RECOMPENSA DE 1 MOEDA POR NÍVEL CONCLUÍDO
try {
    const jogador = await Perfil.findOne({ userId: msg.author.id }) || await Perfil.create({ userId: msg.author.id });

    jogador.moedas = (jogador.moedas || 0) + 1; // +1 moeda por subir de nível
    await jogador.save().catch(() => {});
} catch (err) {
    console.error("Erro ao adicionar moeda por nível:", err);
};

partida.rodadaTerminada = true;
collector.stop("acertou");

msg.react("<:pontos:1442182692748791889>").catch(() => {});


        // 🔥 AGORA usa formatarRanking → mostra (+2), (+3), etc
        const rankingOrdenado = montarRanking(partida);
        const rankingTexto = formatarRanking(rankingOrdenado, partida);

        // Montagem do título dinâmico com ícones de itens ativos
let tituloRanking = "<:ranking:1442253471356289284> RANKING⠀";

// ÍCONE DO NITRO (apenas enquanto estiver ativo na partida)
if (partida.nitro) {
    tituloRanking += "<:icon_nitro:1441530028658790430>⠀";
}

// ÍCONE DO TEMPO (mostra níveis restantes)
if (partida.tempoBoostNiveisRestantes && partida.tempoBoostNiveisRestantes > 0) {
    tituloRanking += `<:icon_tempo:1441174907445837907>⠀`;
}

const embedAcerto = new EmbedBuilder()
    .setColor(partida.cor)
    .setAuthor({
        name: `${msg.author.username} acertou ${item.resposta}!`,
        iconURL: message.client.user.displayAvatarURL({ dynamic: true })
    })
    .setTitle(tituloRanking)
    .setDescription(`${rankingTexto}`)
    .setThumbnail(msg.author.displayAvatarURL({ dynamic: true }))
    .setFooter({
        text: `Próxima imagem em ${partida.nitro ? "5s" : "10s"}`,
        iconURL: "https://i.ibb.co/ZpnWwHT9/sand-clock.png"
    });

await message.channel.send({ embeds: [embedAcerto] });

try {
    // --------------------------------------------------------
    // 🔥 GARANTIR PERFIL EXISTE
    // --------------------------------------------------------
    let perfilTema = await Perfil.findOne({ userId: msg.author.id });
    if (!perfilTema)
        perfilTema = await Perfil.create({ userId: msg.author.id, moedas: 0, pontos: 0 });

    // --------------------------------------------------------
    // 🔥 ATUALIZAR PONTUAÇÃO DO TEMA IMEDIATAMENTE
    // --------------------------------------------------------
    const temaIdStr = partida.tema._id.toString();
    let entry = perfilTema.pontuacoes.find(p => p.temaId === temaIdStr);

    if (!entry) {
        perfilTema.pontuacoes.push({
            temaId: temaIdStr,
            total: ganho,      // ganho calculado nesta rodada
            partidas: 1
        });
    } else {
        entry.total = (entry.total || 0) + ganho;
        entry.partidas = (entry.partidas || 0) + 1;
    }

    await perfilTema.save();

    // --------------------------------------------------------
    // 🏅 CONCEDER INSÍGNIA IMEDIATAMENTE SE ATINGIR META
    // --------------------------------------------------------
    if (partida.tema.insigniaEmojiId) {

        const DEFAULT_META = 3;  // 🔧 meta default (pode alterar)
        const META = (typeof partida.tema.pontosParaInsignia === "number" && partida.tema.pontosParaInsignia > 0)
            ? partida.tema.pontosParaInsignia
            : DEFAULT_META;

        // recarrega entry atualizada
        entry = perfilTema.pontuacoes.find(p => p.temaId === temaIdStr);

        // verificar se o jogador já tem a insígnia
        const jaTem = (perfilTema.insignias || []).some(i => {
            if (typeof i === "string") return i === partida.tema.insigniaEmojiId;
            if (i && i.insigniaEmojiId) return i.insigniaEmojiId === partida.tema.insigniaEmojiId;
            return false;
        });

        // condições para conceder
        if (!jaTem && entry && entry.total >= META) {

            // objeto de insígnia salvo no perfil
            const novoObj = {
                temaId: temaIdStr,
                nome: partida.tema.nomeOriginal || partida.tema.nome,
                nomeLower: (partida.tema.nomeOriginal || partida.tema.nome).toLowerCase(),
                insigniaEmoji: partida.tema.insigniaEmoji || null,
                insigniaEmojiId: partida.tema.insigniaEmojiId || null,
                pontos: entry.total,
                grantedAt: new Date()
            };

            perfilTema.insignias.push(novoObj);
            await perfilTema.save();

            // --------------------------------------------------------
            // 📢 ENVIAR EMBED DA INSÍGNIA
            // --------------------------------------------------------
            const embedInsignia = new EmbedBuilder()
                .setColor("#FFD700")
                .setTitle("NOVA INSÍGNIA CONQUISTADA!")
                .setThumbnail("https://i.ibb.co/LX2YqbyS/premio.png")
                .setDescription(
                    `${partida.tema.insigniaEmoji ? partida.tema.insigniaEmoji + " " : ""}<@${msg.author.id}> acaba de conquistar a insígnia do tema **${novoObj.nome}**!\n\n` +
                    `Pontos no tema: **${novoObj.pontos}**`
                )
                .setTimestamp();

            // parar a rodada atual
            if (collector && !collector.ended) {
                partida.pausada = true;
                collector.stop("pause_for_insignia");
            } else {
                partida.pausada = true;
            }

            await message.channel.send({ embeds: [embedInsignia] }).catch(() => {});

            // --------------------------------------------------------
            // ⏳ ESPERAR 10s E CONTINUAR A PARTIDA
            // --------------------------------------------------------
            setTimeout(async () => {
                try {
                    partida.pausada = false;
                    partida.nivel = (partida.nivel || 1) + 1;
                    partida.rodadaEmCurso = false;
                    partida.embedRodada = null;

                    await iniciarRodada(message, partida);
                } catch (err) {
                    console.error("Erro ao retomar após insígnia:", err);
                }
            }, 15000);

            return; // impede continuar fluxo normal
        }
    }

} catch (err) {
    console.error("Erro ao atualizar pontuação/insígnia no acerto:", err);
}

// --------------------------------------------------------
// 🔄 Continuação normal após acerto (sem insígnia)
// --------------------------------------------------------
partida.ultimoEmbed = "acerto";
partida.podeUsarTempoAgora = true;
partida.podeUsarNitroAgora = true;

partida.nivel++;
partida.rodadaEmCurso = false;
partida.embedRodada = null;

partida.timeout = setTimeout(
    () => iniciarRodada(message, partida),
    partida.nitro ? 5000 : 10000
);

    }
});
    collector.on("end", async (_, motivo) => {

    if (partida.encerrada) return;

    if (motivo === "acertou" || partida.pausada) return;

   partida.encerrada = true;

// === antes de remover: salvar snapshot para possibilidade de recuperar (apenas TIMEOUT real) ===
const channelId = message.channel.id;
const snapshot = {
    tema: partida.tema,
    temaNomeExibir: partida.temaNomeExibir,
    nivel: partida.nivel,
    ranking: partida.ranking,
    cor: partida.cor,
    combos: partida.combos || {},
    nitro: partida.nitro || false,
    tempoBoostNiveisRestantes: partida.tempoBoostNiveisRestantes || 0,
    tempoExtraGlobal: partida.tempoExtraGlobal || 0,
    inicio: partida.inicio || Date.now(),
    // pode adicionar mais se for necessário depois
};

// guarda por 15s para possível recuperação
guardarSnapshotParaRecuperar(channelId, snapshot);

// agora sim remove a partida do cache
partidasAtivas.delete(message.channel.id);


    const temaDB = await Tema.findById(partida.tema._id);

    // ===== RECORDISTA ATUAL =====
    let recordistaLinha;
    if (temaDB.record?.userId && temaDB.record?.pontos > 0) {
        recordistaLinha = `**<@${temaDB.record.userId}> - ${temaDB.record.pontos} pontos**`;
    } else {
        recordistaLinha = `**<@${message.client.user.id}> - 0 pontos**`;
    }

    const rankingOrdenado = montarRanking(partida);

    // ===== RECORDE DO TEMA =====
    if (rankingOrdenado.length > 0) {
        const melhorJogadorId = rankingOrdenado[0][0];
        const melhorPontuacao = rankingOrdenado[0][1];

        // Salva recorde completo
        if (!temaDB.record || melhorPontuacao > temaDB.record.pontos) {
            temaDB.record = {
                userId: melhorJogadorId,
                pontos: melhorPontuacao,
                nivel: partida.nivel,
                data: new Date()
            };
            await temaDB.save();
        }
    }

    let tempoTotal = "Indisponível";
    if (partida.inicio) {
        const duracao = Date.now() - partida.inicio;
        const s = Math.floor((duracao / 1000) % 60);
        const m = Math.floor((duracao / 1000 / 60) % 60);
        const h = Math.floor(duracao / 1000 / 60 / 60);
        tempoTotal = (h ? `${h}h ` : "") + (m ? `${m}m ` : "") + `${s}s`;
    }

    // ===== EMBED FINAL =====

    

const embedFim = new EmbedBuilder()
    .setColor(partida.cor)
    .setAuthor({
        name: `A resposta era: ${partida.itemAtual.resposta}`,
        iconURL: message.client.user.displayAvatarURL()
    })
    .setImage("https://i.ibb.co/HphDW8sq/You-Lose-Game-Over-GIF-by-Universal-Music-Africa.gif")
    .addFields(
        // === LINHA 1 ===
        {
            name: "Tema",
            value: `**${partida.temaNomeExibir}**`,
            inline: true
        },
        {
            name: "Nível atingido",
            value: `**<:levelup:1442272592789639239> ${partida.nivel}**`,
            inline: true
        },
        {
            name: "Ganhador",
            value:
                rankingOrdenado.length === 0
                    ? "<:nada:1442277644346593462> Sem vencedor"
                    : (() => {
                          const [vencedorId, pontos] = rankingOrdenado[0];
                          const plural = pontos === 1 ? "ponto" : "pontos";
                          return `<:vencedor:1442267461545361629> <@${vencedorId}> - **${pontos} ${plural}**`;
                      })(),
            inline: true
        },

        // === LINHA 2 ===
        {
            name: "Recordista",
            value: `<:medalrec:1442253575576354876> **${recordistaLinha}**`,
            inline: true
        },
        {
            name: "Nível Recorde",
            value: `**<:levelup:1442272592789639239> ${temaDB.record?.nivel || 0}**`,
            inline: true
        },
        {
            name: "Duração",
            value: `**<:duration:1442275100056617021> ${tempoTotal}**`,
            inline: true
        }
    );

await message.channel.send({ embeds: [embedFim] });

// =====================================================
//   🔽 SALVAR E CHECAR RECORDE / PONTOS / INSÍGNIA
// =====================================================

// ======================
// BLOCO B: substituição no final da partida (collector.on("end", ...))
// Atualiza recorde e garante persistência final da pontuação por tema.
// Insígnias NÃO são tratadas aqui (foram entregues durante a partida).
// ======================

const rankingOrdenadoLocal = Object.entries(partida.ranking).sort((a, b) => b[1] - a[1]);
const melhorJogadorId = rankingOrdenadoLocal?.[0]?.[0] || null;
const melhorPontuacao = rankingOrdenadoLocal?.[0]?.[1] || 0;
const nivelAtual = partida.nivel || 0;

if (melhorJogadorId && melhorPontuacao > 0) {
    // garante perfil do vencedor
    let perfilFinal = await Perfil.findOne({ userId: melhorJogadorId });
    if (!perfilFinal) perfilFinal = await Perfil.create({ userId: melhorJogadorId, moedas: 0, pontos: 0 });

    // ATUALIZA RECORDE DO TEMA SE PRECISAR
    const temaDB = await Tema.findById(partida.tema._id);
    if (temaDB) {
        const ultrapassouRecorde =
            !temaDB.record?.userId ||
            melhorPontuacao > (temaDB.record?.pontos || 0) ||
            nivelAtual > (temaDB.record?.nivel || 0);

        if (ultrapassouRecorde) {
            temaDB.record = {
                userId: melhorJogadorId,
                pontos: melhorPontuacao,
                nivel: nivelAtual,
                data: new Date()
            };
            await temaDB.save();

            // envia embed de novo recorde (se desejar)
            const nomeTema = temaDB.insigniaEmoji
                ? `${temaDB.insigniaEmoji} ${temaDB.nomeOriginal || temaDB.nome}`
                : (temaDB.nomeOriginal || temaDB.nome);

            const embedRecorde = new (require("discord.js").EmbedBuilder)()
                .setColor("#FFD700")
                .setTitle("NOVO RECORDE ATINGIDO!")
                .setThumbnail("https://i.ibb.co/BMJY9rs/estrela-1.png")
                .setDescription(`<:medalrec:1442253575576354876> <@${melhorJogadorId}> estabeleceu um novo recorde!`)
                .addFields(
                    { name: "Tema", value: `**${nomeTema}**`, inline: true },
                    { name: "Pontuação", value: `**<:pontos:1442182692748791889> ${melhorPontuacao} pontos**`, inline: true },
                    { name: "Nível Atingido", value: `**<:levelup:1442272592789639239> ${nivelAtual}**`, inline: true }
                );

            message.channel.send({ embeds: [embedRecorde] }).catch(() => {});
        }
    }

    // GARANTE que a pontuação por tema foi atualizada (caso algum acerto final não tenha sido persistido)
    try {
        let perfilCheck = await Perfil.findOne({ userId: melhorJogadorId });
        if (!perfilCheck) perfilCheck = await Perfil.create({ userId: melhorJogadorId, moedas: 0, pontos: 0 });

        const temaIdStr = partida.tema._id.toString();
        let e = perfilCheck.pontuacoes.find(p => p.temaId === temaIdStr);
        if (!e) {
            perfilCheck.pontuacoes.push({
                temaId: temaIdStr,
                total: melhorPontuacao,
                partidas: 1
            });
        } else {
            // já somamos durante a partida, mas garantimos que esteja salvo
            e.total = Math.max(e.total || 0, (e.total || 0));
            e.partidas = (e.partidas || 0);
        }
        await perfilCheck.save();
    } catch (err) {
        console.error("Erro ao garantir pontuação final por tema:", err);
    }
}


});
}

/* =====================================================
   FUNÇÕES AUXILIARES DE RANKING
   - agora o ranking mostra PONTOS (já com combo aplicado)
   - (+X) aparece a partir do nível 4 para quem tem combo
===================================================== */
function montarRanking(partida) {
    return Object.entries(partida.ranking).sort((a, b) => b[1] - a[1]);
}

function formatarRanking(lista, partida) {
    return lista
        .map((r, i) => {
            const userId = r[0];
            const pontos = r[1];

            // ================================
            // 🏅 MEDALHAS POR POSIÇÃO
            // ================================
            let medalha;
        const MEDAL_1 = "<:podio1:1442253692542648441>";
        const MEDAL_2 = "<:podio2:1442253730245378099>";
        const MEDAL_3 = "<:podio3:1442253772402196621>";
        const MEDAL_PADRAO = "<:podio:1442253851091800205>";


            if (i === 0) medalha = MEDAL_1;        // 🥇 primeiro
            else if (i === 1) medalha = MEDAL_2;  // 🥈 segundo
            else if (i === 2) medalha = MEDAL_3;  // 🥉 terceiro
            else medalha = MEDAL_PADRAO;          // 🔹 padrão para 4º+

            // ================================
            // (+X) bônus do combo
            // ================================
            let sufixo = "";
            if (partida.combos && partida.combos[userId]) {
                const bonus = getComboBonusByLevel(partida.nivel);
                if (bonus > 1) sufixo = ` (+${bonus})`;
            }

            const label = pontos === 1 ? "ponto" : "pontos";

            return `${medalha} <@${userId}> — **${pontos}** ${label}${sufixo}`;
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
    recentEncerradas,   // <- exporte o mapa para uso por comandos
    encerrarPartida: function (channelId) {
        const partida = partidasAtivas.get(channelId);
        if (!partida) return false;

        // limpar snapshot expired timer (caso exista)
        const recent = recentEncerradas.get(channelId);
        if (recent && recent.timer) {
            clearTimeout(recent.timer);
            recentEncerradas.delete(channelId);
        }

        partida.encerrada = true;
        if (partida.coletor) partida.coletor.stop("fim_manual");
        if (partida.timeout) clearTimeout(partida.timeout);

        partidasAtivas.delete(channelId);
        return true;
    },
    calcularTempo,
    formatarTempo,
    iniciarRodada,
    getComboBonusByLevel
};

