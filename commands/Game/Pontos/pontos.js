const { EmbedBuilder } = require("discord.js");
const Tema = require("../../../models/Tema");
const Perfil = require("../../../models/Perfil");
const findUser = require("../../Utility/getUser");

// mesma função usada no /temainfo
function nomeComInsignia(tema) {
    if (tema.insigniaEmoji) {
        return `${tema.insigniaEmoji} ${tema.nomeOriginal || tema.nome}`;
    }
    return tema.nomeOriginal || tema.nome;
}

module.exports = {
    name: "pontos",
    aliases: ["pts"],
    description: "Consultar os pontos de um jogador por tema.",

    async execute(message, args) {

        // ===========================
        // IDENTIFICAR O ALVO
        // ===========================
        let alvo;

        if (!args[0]) {
            alvo = message.author;
        } else {
            alvo = await findUser(message, args.join(" "));
            if (!alvo) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#ff4d4d")
                            .setDescription("<:fecharerr:1442682279322325095> Usuário não encontrado.")
                    ]
                });
            }
        }

        const autor = message.author;

        // ===========================
        // TEXTO DO TÍTULO
        // ===========================
        let textoTitulo =
            (alvo.id === autor.id)
                ? `**${autor.username}**, aqui estão os seus pontos por tema:\n\n`
                : `**${autor.username}**, aqui estão os pontos de **${alvo.username}**:\n\n`;

        // ===========================
        // BUSCAR PERFIL DO USUÁRIO
        // ===========================
        let perfil = await Perfil.findOne({ userId: alvo.id });

        if (!perfil) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("<:fecharerr:1442682279322325095> Esse usuário não possui perfil ainda.")
                ]
            });
        }

        // ===========================
        // BUSCAR TEMAS NO BANCO
        // ===========================
        const temas = await Tema.find({});
        if (!temas.length)
            return message.reply("<:fecharerr:1442682279322325095> Não existem temas cadastrados.");

        // ===========================
        // JUNTAR TEMAS + PONTOS DO PERFIL
        // ===========================
        const listaPontos = temas.map(t => {
            const entry = perfil.pontuacoes?.find(p => p.temaId === t._id.toString());
            return {
                tema: t,
                pontos: entry ? entry.total : 0
            };
        });

        // Ordenação
        const tudoZero = listaPontos.every(item => item.pontos === 0);
        let ordenados;

        if (tudoZero) {
            ordenados = listaPontos.sort((a, b) =>
                (a.tema.nomeOriginal || a.tema.nome).localeCompare(b.tema.nomeOriginal || b.tema.nome)
            );
        } else {
            ordenados = listaPontos.sort((a, b) => b.pontos - a.pontos);
        }

        // ===========================
        // MONTAR TEXTO
        // ===========================
        let texto = textoTitulo;

        const formatar = n => new Intl.NumberFormat("pt-BR").format(n);

        for (const item of ordenados) {
            const tema = item.tema;
            const pontos = formatar(item.pontos);
            const nomeExibir = nomeComInsignia(tema);

            texto += `**${nomeExibir}** — **${pontos} pontos**\n`;
        }

        // ===========================
        // EMBED FINAL
        // ===========================
        const embed = new EmbedBuilder()
            .setColor("#3498db")
            .setDescription(texto)
            .setFooter({
                text: `Solicitado por ${autor.username}`,
                iconURL: autor.displayAvatarURL()
            })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
