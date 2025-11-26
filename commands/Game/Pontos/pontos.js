const { EmbedBuilder } = require("discord.js");
const Tema = require("../../../models/Tema");
const findUser = require("../../Utility/getUser"); // <= IMPORTADO DO UTILITY

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

    async execute(message, args) {

        // ===========================
        // IDENTIFICAR O ALVO (NOVO)
        // ===========================
        let alvo;

        if (!args[0]) {
            alvo = message.author; // sem argumentos → você mesmo
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
        // TÍTULO DO EMBED
        // ===========================
        let textoTitulo;

        if (alvo.id === autor.id) {
            textoTitulo = `**${autor.username}**, aqui estão os seus pontos por tema:\n\n`;
        } else {
            textoTitulo = `**${autor.username}**, aqui estão os pontos de **${alvo.username}** por tema:\n\n`;
        }

        // ===========================
        // BUSCAR TEMAS
        // ===========================
        const temas = await Tema.find({});
        if (!temas.length)
            return message.reply("<:fecharerr:1442682279322325095> Não existem temas cadastrados.");

        // ===========================
        // COLETAR PONTOS DO USUÁRIO
        // ===========================
        const listaPontos = temas.map(t => {
            const entrada = t.pontuacoes.find(p => p.userId === alvo.id);
            return {
                tema: t,
                pontos: entrada ? entrada.total : 0
            };
        });

        const tudoZero = listaPontos.every(i => i.pontos === 0);

        let ordenados;

        if (tudoZero) {
            ordenados = listaPontos.sort((a, b) =>
                (a.tema.nomeOriginal || a.tema.nome)
                    .localeCompare(b.tema.nomeOriginal || b.tema.nome)
            );
        } else {
            ordenados = listaPontos.sort((a, b) => b.pontos - a.pontos);
        }

        // ===========================
        // TEXTO FINAL
        // ===========================
        // ===========================
// TEXTO FINAL
// ===========================
let texto = textoTitulo;

// Função local para formatar número sem letras
const formatar = (n) => new Intl.NumberFormat("pt-BR").format(n);

for (const item of ordenados) {
    const tema = item.tema;
    const pontos = formatar(item.pontos); // << FORMATADO AQUI
    const nomeExibir = nomeComInsignia(tema);

    texto += `**${nomeExibir}** - **${pontos} pontos**\n`;
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
