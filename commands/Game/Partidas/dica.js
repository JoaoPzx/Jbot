const { EmbedBuilder } = require("discord.js");
const validarItem = require("../../Utility/validarItem");

module.exports = {
    name: "dica",
    aliases: ["d"],
    description: "Mostra uma dica com letras aleatórias reveladas (30%–50%).",

    async execute(message) {

        // Middleware já verifica tudo (pausa, rodada, inventário etc.)
        const contexto = await validarItem(message, "dica");
        if (!contexto || contexto.reply) return contexto;

        const { partida, perfil, item } = contexto;

        // Consumir o item
        item.quantidade--;
        if (item.quantidade <= 0) {
            perfil.inventario = perfil.inventario.filter(i => i.nome !== "dica");
        }
        await perfil.save();


        /* ============================================================
           🔥 NOVO SISTEMA DE DICA:
              - revela entre 30% e 50% das letras
              - mantém espaços
              - posições reveladas são aleatórias
        ============================================================ */

        const resposta = String(partida.itemAtual.resposta).toUpperCase();

        // transforma a resposta inteira em array
        const caracteres = resposta.split("");

        // índices válidos (somente letras)
        const indicesLetras = caracteres
            .map((c, idx) => (c !== " " ? idx : null))
            .filter(idx => idx !== null);

        // sorteia porcentagem entre 30% e 50%
        const porcentagem = 0.30 + Math.random() * 0.20;
        const quantidadeRevelar = Math.max(1, Math.floor(indicesLetras.length * porcentagem));

        // escolhe posições aleatórias sem repetir
        const revelados = new Set();
        while (revelados.size < quantidadeRevelar) {
            const idx = indicesLetras[Math.floor(Math.random() * indicesLetras.length)];
            revelados.add(idx);
        }

        // monta a dica final
        const dica = caracteres
            .map((c, idx) => {
                if (c === " ") return " ";     // mantém palavra separada
                return revelados.has(idx) ? c : "_";
            })
            .join("");

        // adiciona espaços entre tudo para ficar bonito
        const dicaEspacada = dica.split("").join(" ");

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setDescription("<:icon_dica:1441174865032904745> Dica Revelada!\n ```" + dicaEspacada + "```")
            .setFooter({ text: `Foram reveladas ${quantidadeRevelar} letras (${Math.round(porcentagem * 100)}%).` });

        return message.reply({ embeds: [embed] });
    }
};
