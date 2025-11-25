const { EmbedBuilder } = require("discord.js");
const { encerrarPartida, partidasAtivas } = require("../../Game/Partidas/play");
const Tema = require("../../../models/Tema");
const { BANNER_PADRAO } = require("../../Utility/banners");

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
                .setDescription("<:fecharerr:1442682279322325095> Não há nenhuma partida ativa neste canal.");
            return message.reply({ embeds: [embedErro] });
        }

        if (message.author.id !== partida.autorId) {
            const embedErro = new EmbedBuilder()
                .setColor("#ff4d4d")
                .setDescription("<:fecharerr:1442682279322325095> Apenas **quem iniciou a partida** pode encerrá-la.");
            return message.reply({ embeds: [embedErro] });
        }

        // ============================
        // INFO DA PARTIDA
        // ============================
        const tema = await Tema.findById(partida.tema._id);
        const nomeTema = partida.temaNomeExibir;
        const nivel = partida.nivel;

        const rankingOrdenado = Object.entries(partida.ranking).sort((a, b) => b[1] - a[1]);

        // ===== RANKING COM MEDALHAS =====
        // ===== RANKING APENAS COM O GANHADOR =====
let rankingTexto;

if (rankingOrdenado.length === 0) {
    rankingTexto = "<:nada:1442277644346593462> Sem vencedor";
} else {
    const [vencedorId, pontos] = rankingOrdenado[0];
    const plural = pontos === 1 ? "ponto" : "pontos";
    rankingTexto = `<:vencedor:1442267461545361629> <@${vencedorId}> - **${pontos} ${plural}**`;
}

        // Melhor jogador da partida
        const melhorJogadorId = rankingOrdenado[0]?.[0] || null;
        const melhorPontuacao = rankingOrdenado[0]?.[1] || 0;

        // Tempo total de partida
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
            recordistaTexto = `<:estrela1:1442253518361853962> <@${tema.record.userId}> - **${tema.record.pontos} pts**`;
        } else {
            tema.record = {
                userId: message.client.user.id,
                pontos: 0,
                data: new Date()
            };
            await tema.save();
            recordistaTexto = `<:estrela1:1442253518361853962> <@${message.client.user.id}> - **0 pts**`;
        }
        

        // ============================
        // EMBED FINAL
        // ============================
        const embedFim = new EmbedBuilder()
            .setColor("#f1c40f")
            .setAuthor({
                name: message.client.user.username,
                iconURL: message.client.user.displayAvatarURL()
            })
            .setDescription("**<:parar:1442269401255510098> Partida Finalizada!**")
            .setImage("https://i.ibb.co/HphDW8sq/You-Lose-Game-Over-GIF-by-Universal-Music-Africa.gif")
            .addFields(
                { name: "Tema", value: `**${nomeTema}**`, inline: true },
                { name: "Nível atingido", value: `<:levelup:1442272592789639239> **${nivel}**`, inline: true },
                { name: "Recordista", value: recordistaTexto, inline: true },
                { name: "Duração", value: `**<:duration:1442275100056617021> ${tempoTotal}**`, inline: true },
                { name: "Ganhador", value: rankingTexto, inline: true},
                {name: "Nível Recorde", value: tema.record?.nivel? `**<:levelup:1442272592789639239> ${tema.record.nivel}**`: "Nenhum nível.", inline: true
    },
                
            );

        await message.reply({ embeds: [embedFim] });

        // ============================
        // SISTEMA DE RECORDE
        // ============================
        // ============================
// SISTEMA DE RECORDE (ATUALIZADO)
// ============================
if (melhorJogadorId && melhorPontuacao > 0) {

    const ultrapassouRecorde =
        !tema.record?.userId ||
        melhorPontuacao > tema.record.pontos ||
        nivel > (tema.record?.nivel || 0);

    if (ultrapassouRecorde) {

        // 🔥 SALVAR RECORD COMPLETO
        tema.record = {
            userId: melhorJogadorId,
            pontos: melhorPontuacao,
            nivel: nivel,         // << NOVO: salva também o nível
            data: new Date()
        };

        await tema.save();

        // 🔥 EMBED DE NOVO RECORDE
        const embedRecorde = new EmbedBuilder()
            .setColor("#FFD700")
            .setTitle("NOVO RECORDE ATINGIDO!")
            .setThumbnail("https://i.ibb.co/BMJY9rs/estrela-1.png")
            .setDescription(`<:medalrec:1442253575576354876> <@${melhorJogadorId}> Quebrou o recorde!`
    ) 
            .addFields(
                {name: "Tema",
                value: `**${nomeTema}**`,
                inline: true
                },

                {name: "Pontuação", 
                    value: `**<:pontos:1442182692748791889> ${melhorPontuacao} pontos**`,
                    inline: true
                },

                {name: "Nível Atingido", 
                    value: `**<:levelup:1442272592789639239> ${nivel}**`,
                    inline: true
                }

    )

        message.channel.send({ embeds: [embedRecorde] });
    }
}


        // ============================
        // SISTEMA DE RANK ACUMULADO
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
