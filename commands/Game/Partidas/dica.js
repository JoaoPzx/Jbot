const { EmbedBuilder } = require("discord.js");
const validarItem = require("../../Utility/validarItem");

module.exports = {
    name: "dica",
    aliases: ["d"],
    description: "Mostra uma dica com letras aleatórias reveladas (30%–50%).",

    async execute(message) {

        const contexto = await validarItem(message, "dica");
        if (!contexto || contexto.reply) return contexto;

        const { partida, perfil, item } = contexto;

        // Consumir item
        item.quantidade--;
        if (item.quantidade <= 0) {
            perfil.inventario = perfil.inventario.filter(i => i.nome !== "dica");
        }
        await perfil.save();


        /* ============================================================
           🔥 NOVO SISTEMA DE DICA (30% a 50% revelado)
        ============================================================ */
        const resposta = String(partida.itemAtual.resposta).toUpperCase();
        const caracteres = resposta.split("");

        const indicesLetras = caracteres
            .map((c, idx) => (c !== " " ? idx : null))
            .filter(idx => idx !== null);

        const porcentagem = 0.30 + Math.random() * 0.20;
        const quantidadeRevelar = Math.max(1, Math.floor(indicesLetras.length * porcentagem));

        const revelados = new Set();
        while (revelados.size < quantidadeRevelar) {
            const idx = indicesLetras[Math.floor(Math.random() * indicesLetras.length)];
            revelados.add(idx);
        }

        const dica = caracteres
            .map((c, idx) => {
                if (c === " ") return " ";
                return revelados.has(idx) ? c : "_";
            })
            .join("");

        const dicaEspacada = dica.split("").join(" "); // 2 espaços igual ao ;resposta


        /* ============================================================
           🎨 BLOCO ANSI (NEGRITO REAL, SEM ASTERISCOS)
        ============================================================ */

        // Se quiser cor ANSI nas letras, troque para o código abaixo:
        // const caixa = `\`\`\`ansi\n[1;38;5;87m${dicaEspacada}[0m\n\`\`\``;

    const caixa =
`\`\`\`ansi
[1;38;5;51m${dicaEspacada}[0m
\`\`\``;



        const embed = new EmbedBuilder()
            .setColor("Green")
            .setDescription(
                "<:icon_dica:1441174865032904745> **Dica Revelada!**\n" +
                caixa
            )
            .setFooter({
                text: `Foram reveladas ${quantidadeRevelar} letras (${Math.round(porcentagem * 100)}%).`
            });

        return message.reply({ embeds: [embed] });
    }
};
