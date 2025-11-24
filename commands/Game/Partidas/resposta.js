const { EmbedBuilder } = require("discord.js");
const validarItem = require("../../Utility/validarItem");

module.exports = {
    name: "resposta",
    aliases: ["r"],
    description: "Revela a resposta completa da rodada (consome 1 item resposta).",

    async execute(message) {

        // Middleware validarItem controla pausa, rodada, existência da imagem e inventário
        const contexto = await validarItem(message, "resposta");
        if (!contexto || contexto.reply) return contexto;

        const { partida, perfil, item } = contexto;

        // Consome item resposta
        item.quantidade--;
        if (item.quantidade <= 0) {
            perfil.inventario = perfil.inventario.filter(i => i.nome !== "resposta");
        }

        await perfil.save();

        // Monta resposta espaçada
        const respostaRaw = String(partida.itemAtual.resposta).toUpperCase();
        const letras = respostaRaw.split("");
        const respostaEspacada = letras.join(" ");

        const embed = new EmbedBuilder()
            .setColor("#3498db")
            .setTitle("🔎 Resposta Revelada")
            .setDescription(
                "```" + respostaEspacada + "```\n" +
                "📦 1 item **Resposta** foi consumido do seu inventário."
            )
            .setFooter({ text: "Use com sabedoria!" });

        return message.reply({ embeds: [embed] });
    }
};
