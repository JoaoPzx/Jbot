const { EmbedBuilder } = require("discord.js");
const { partidasAtivas } = require("./play");

module.exports = {
    name: "dica",
    aliases: ["d"],
    description: "Mostra uma dica sobre a resposta atual.",

    async execute(message) {
        const partida = partidasAtivas.get(message.channel.id);

        if (!partida || !partida.rodadaEmCurso) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Nenhuma rodada ativa para mostrar dica.")
                ]
            });
        }

        const item = partida.itemAtual;
        if (!item) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Não foi possível gerar a dica dessa rodada.")
                ]
            });
        }

        const resposta = item.resposta.toUpperCase();
        const letras = resposta.split("");

        const dicaFormatada = letras
            .map((l, i) => {
                if (i === 0 || i === letras.length - 1) return l;
                return "_";
            })
            .join(" ");

        const embed = new EmbedBuilder()
            .setColor("#f1c40f")
            .setTitle("💡 Dica da Rodada")
            .setDescription(
                "```" + `[${resposta.length}]  ${dicaFormatada}` + "```"
            )

        return message.reply({ embeds: [embed] });
    }
};
