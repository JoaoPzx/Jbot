const { EmbedBuilder } = require("discord.js");
const Tema = require("../../../models/Tema");

// Função para abreviar números
function formatarNumero(num) {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2).replace(".00","") + "M";
    if (num >= 100_000) return Math.round(num / 1000) + "k";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(".0","") + "k";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Medalhas automáticas
function medalhaPosicao(pos) {
    if (pos === 0) return "🥇";
    if (pos === 1) return "🥈";
    if (pos === 2) return "🥉";
    return "🏅";
}

module.exports = {
    name: "rank",
    description: "Mostra o ranking acumulado de pontos por tema ou geral.",

    async execute(message, args) {
        const entrada = args.join(" ").toLowerCase().trim();

        // ---------------- RANK POR TEMA ----------------
        if (entrada) {
            const temas = await Tema.find();

            // pega TODOS os temas que começam com a entrada
            const temasFiltrados = temas.filter(t =>
                ((t.nomeOriginal || t.nome || "").toLowerCase()).startsWith(entrada)
            );

            if (!temasFiltrados.length) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Red")
                            .setTitle("<:fecharerr:1442682279322325095> Tema não encontrado!")
                            .setDescription("Use: `;rank <tema>` ou apenas `;rank` para ver o ranking geral.")
                    ]
                });
            }

            // ordena alfabeticamente pelo nome exibido
            temasFiltrados.sort((a, b) => {
                const nomeA = (a.nomeOriginal || a.nome || "").toLowerCase();
                const nomeB = (b.nomeOriginal || b.nome || "").toLowerCase();
                return nomeA.localeCompare(nomeB, "pt-BR", { sensitivity: "base" });
            });

            // pega o primeiro em ordem alfabética
            const tema = temasFiltrados[0];
            const insignia = tema.insigniaEmoji ? `${tema.insigniaEmoji} ` : "";
            const nomeExibicao = `${insignia}${tema.nomeOriginal || tema.nome}`;

            if (!tema.pontuacoes.length) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Yellow")
                            .setTitle(`Nenhum jogador pontuou ainda em **${nomeExibicao}**`)
                    ]
                });
            }

            // insignia + nome formatado

            const ranking = [...tema.pontuacoes]
                .sort((a, b) => b.total - a.total)
                .slice(0, 10);

            let desc = "";
            for (let i = 0; i < ranking.length; i++) {
                const user = await message.client.users.fetch(ranking[i].userId).catch(() => null);
                const pos = medalhaPosicao(i);

                const username = user
                    ? `[${user.username}](https://discord.com/channels/000000000000000000/000000000000000000)`
                    : "Desconhecido";

                desc += `${pos} — ${username} • **${formatarNumero(ranking[i].total)} pts** (${ranking[i].partidas} partidas)\n`;
            }

            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle(`🏆 Ranking do Tema: ${nomeExibicao}`)
                .setDescription(desc)
                .setFooter({ text: "Rank baseado na soma total de pontos no tema" })
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        // ---------------- RANK GERAL ----------------
        const temas = await Tema.find();
        const totalMap = new Map();

        for (const tema of temas) {
            for (const reg of tema.pontuacoes) {
                totalMap.set(
                    reg.userId,
                    {
                        total: (totalMap.get(reg.userId)?.total || 0) + reg.total,
                        partidas: (totalMap.get(reg.userId)?.partidas || 0) + reg.partidas
                    }
                );
            }
        }

        if (totalMap.size === 0) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Yellow")
                        .setTitle("📭 Ainda não há pontuações registradas!")
                ]
            });
        }

        const geral = [...totalMap.entries()]
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 15);

        let desc = "";
        for (let i = 0; i < geral.length; i++) {
            const user = await message.client.users.fetch(geral[i][0]).catch(() => null);
            const pos = medalhaPosicao(i);

            const username = user
                ? `[${user.username}](https://discord.com/channels/000000000000000000/000000000000000000)`
                : "Desconhecido";

            desc += `${pos} — ${username} • **${formatarNumero(geral[i][1].total)} pts** (${geral[i][1].partidas} partidas)\n`;
        }

        const embedGeral = new EmbedBuilder()
            .setColor("Gold")
            .setTitle("🌍 Ranking Geral dos Jogadores")
            .setDescription(desc)
            .setFooter({ text: "Soma total de pontos em todos os temas" })
            .setTimestamp();

        return message.channel.send({ embeds: [embedGeral] });
    }
};
