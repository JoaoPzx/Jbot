const { EmbedBuilder } = require("discord.js");

const { partidasAtivas } = require("../Partidas/play"); 

module.exports = {
    name: "image",
    aliases: ["i"],
    description: "Reenvia a imagem atual da rodada do ;play.",

    async execute(message) {

        // verificar partida ativa no canal
        const partida = partidasAtivas.get(message.channel.id);

        if (!partida || partida.encerrada) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff5555")
                        .setDescription("<:fecharerr:1442682279322325095> Não há uma partida ativa neste canal.")
                ]
            });
        }

        if (!partida.itemAtual || !partida.itemAtual.url) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff5555")
                        .setDescription("<:avisojf:1442687822208303215> Nenhuma imagem carregada no momento.")
                ]
            });
        }

        // reenviar a imagem atual
        const embedImg = new EmbedBuilder()
            .setColor(partida.cor || "#2b2d31")
            .setTitle("<:imagemjbot:1440425616359952445> Imagem da rodada reenviada")
            .setImage(partida.itemAtual.url)

        await message.channel.send({ embeds: [embedImg] });
    }
};
