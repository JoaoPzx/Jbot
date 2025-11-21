const { EmbedBuilder } = require("discord.js");
const validarItem = require("../../Utility/validarItem");

module.exports = {
    name: "dica",
    aliases: ["d"],
    description: "Mostra uma dica sobre a resposta atual.",

    async execute(message) {

        // Middleware já verifica tudo (pausa, rodada, item, inventário, etc)
        const contexto = await validarItem(message, "dica");
        if (!contexto || contexto.reply) return contexto;

        const { partida, perfil, item } = contexto;

        // Consumir item
        item.quantidade--;
        if (item.quantidade <= 0) {
            perfil.inventario = perfil.inventario.filter(i => i.nome !== "dica");
        }
        await perfil.save();

        // Criar a dica
        const resposta = String(partida.itemAtual.resposta).toUpperCase();
        const letras = resposta.split("");

        const dicaFormatada = letras
            .map((l, i) => (i === 0 || i === letras.length - 1 ? l : "_"))
            .join(" ");

        const embed = new EmbedBuilder()
            .setColor("#f1c40f")
            .setTitle("💡 Dica da Rodada")
            .setDescription("```" + `[${resposta.length}]  ${dicaFormatada}` + "```")
            .setFooter({ text: "1 dica foi consumida do seu inventário." });

        return message.reply({ embeds: [embed] });
    }
};
