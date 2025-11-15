const { EmbedBuilder } = require("discord.js");
const { encerrarPartida, partidasAtivas } = require("./play");

module.exports = {
    name: "fim",
    description: "Encerra manualmente a partida no canal atual.",

    async execute(message) {
        const canalId = message.channel.id;

        // Verificar se existe partida ativa
        const partida = partidasAtivas.get(canalId);

        if (!partida) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setAuthor({
                            name: message.client.user.username,
                            iconURL: message.client.user.displayAvatarURL()
                        })
                        .setDescription("⚠️ Não há nenhuma partida ativa neste canal.")
                ]
            });
        }

        // ❗ Somente o criador pode encerrar
        if (message.author.id !== partida.autorId) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setAuthor({
                            name: message.client.user.username,
                            iconURL: message.client.user.displayAvatarURL()
                        })
                        .setDescription("❌ Apenas **quem iniciou a partida** pode encerrá-la.")
                ]
            });
        }

        // Executar encerramento
        const encerrado = encerrarPartida(canalId);

        if (!encerrado) {
            return message.channel.send("❌ Ocorreu um erro ao tentar encerrar a partida.");
        }

        return message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor("Yellow")
                    .setAuthor({
                        name: message.client.user.username,
                        iconURL: message.client.user.displayAvatarURL()
                    })
                    .setDescription(`🛑 **${message.author.username} encerrou a partida.**`)
            ]
        });
    }
};
