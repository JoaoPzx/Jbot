const { EmbedBuilder } = require("discord.js");
const { encerrarPartida, partidasAtivas } = require("./play");

module.exports = {
    name: "fim",
    description: "Encerra manualmente a partida no canal atual.",

    async execute(message) {
        const canalId = message.channel.id;
        const partida = partidasAtivas.get(canalId);

        if (!partida) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription("⚠️ Não há nenhuma partida ativa neste canal.")
                ]
            });
        }

        if (message.author.id !== partida.autorId) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription("❌ Apenas **quem iniciou a partida** pode encerrá-la.")
                ]
            });
        }

        const nomeTema = partida.temaNomeExibir;
        const nivel = partida.nivel;

        const ranking = Object.entries(partida.ranking)
            .sort((a, b) => b[1] - a[1])
            .map(([id, pts], i) => `**${i + 1}. <@${id}> — ${pts} ponto(s)**`)
            .join("\n") || "Nenhum ponto registrado.";

        let tempoTotal = "Indisponível";
        if (partida.inicio) {
            const duracao = Date.now() - partida.inicio;
            const s = Math.floor((duracao / 1000) % 60);
            const m = Math.floor((duracao / 1000 / 60) % 60);
            const h = Math.floor(duracao / 1000 / 60 / 60);

            tempoTotal = (h ? `${h}h ` : "") + (m ? `${m}m ` : "") + `${s}s`;
        }

        encerrarPartida(canalId);

        const embed = new EmbedBuilder()
            .setColor("#f1c40f")
            .setTitle("🛑 Partida Finalizada!")
            .setAuthor({
                name: message.client.user.username,
                iconURL: message.client.user.displayAvatarURL()
            })
            .addFields(
                { name: "Tema", value: `**${nomeTema}**`, inline: true },
                { name: "Nível atingido", value: `**🧩 ${nivel}**`, inline: true },
                { name: "Tempo total", value: `**⏰ ${tempoTotal}**`, inline: true }
            )
            .addFields(
                { name: "🏅 Rank Final", value: ranking }
            )
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }
};
