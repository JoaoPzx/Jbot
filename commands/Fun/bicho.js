const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "bicho",
    description: "Sorteia 5 bichos uma vez por dia e envia para um canal fixo",

    async execute(message) {
        const canalID = "1437599327093657600";
        const canalDestino = message.client.channels.cache.get(canalID);

        if (!canalDestino) {
            return message.channel.send("<:avisojf:1442687822208303215> Não consegui encontrar o canal configurado para enviar o sorteio.");
        }

        if (message.deletable) {
            await message.delete().catch(() => {});
        }

        if (global.sorteioBichoLock) {
            return message.reply("⏳ Aguarde, o sorteio está sendo processado...");
        }
        global.sorteioBichoLock = true;

        try {
            const bichos = [
                { nome: "Abelha", emoji: "🐝" },
                { nome: "Cabra", emoji: "🐐" },
                { nome: "Dragão", emoji: "🐉" },
                { nome: "Esquilo", emoji: "🐿️" },
                { nome: "Estrela-do-Mar", emoji: "⭐" },
                { nome: "Flamingo", emoji: "🦩" },
                { nome: "Golfinho", emoji: "🐬" },
                { nome: "Gorila", emoji: "🦍" },
                { nome: "Iéti", emoji: "🧌" },
                { nome: "Joaninha", emoji: "🐞" },
                { nome: "Lhama", emoji: "🦙" },
                { nome: "Pantera", emoji: "🐈‍⬛" },
                { nome: "Porco", emoji: "🐷" },
                { nome: "Rato", emoji: "🐭" },
                { nome: "Urso", emoji: "🐻" },
                { nome: "Urso-Polar", emoji: "🐻‍❄️" },
                { nome: "Vaca", emoji: "🐮" },
                { nome: "Zorrilho", emoji: "🦨" },
            ];

            const dataPath = path.join(__dirname, "../../data/sorteio.json");
            if (!fs.existsSync(path.dirname(dataPath))) {
                fs.mkdirSync(path.dirname(dataPath), { recursive: true });
            }

            let sorteioData = {};
            try {
                sorteioData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
            } catch {
                sorteioData = {};
            }

            const agora = new Date();
            const dataLocal = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
            const hojeIso = dataLocal.toISOString().split("T")[0];
            const hojeDisplay = dataLocal.toLocaleDateString("pt-BR");

            // 🔍 Se já teve sorteio hoje, apenas avisa
            if (sorteioData.data === hojeIso) {
                const embed = new EmbedBuilder()
                    .setColor("Yellow")
                    .setTitle("📅 Sorteio do Dia Já Realizado!")
                    .setDescription(`O sorteio diário de **${hojeDisplay}** já foi realizado.`)
                    .addFields({ name: "🐾 Resultado", value: sorteioData.resultado })
                    .setFooter({ text: "Tente novamente amanhã!" })
                    .setTimestamp();

                const avisoMsg = await canalDestino.send({ embeds: [embed] });
                setTimeout(() => avisoMsg.delete().catch(() => {}), 10000);
                
                return;
            }

            // 🧹 Deletar mensagem do dia anterior (se existir)
            if (sorteioData.mensagemId && sorteioData.canalId) {
                try {
                    const canalAnterior = message.client.channels.cache.get(sorteioData.canalId);
                    if (canalAnterior) {
                        const msgAnterior = await canalAnterior.messages.fetch(sorteioData.mensagemId).catch(() => null);
                        if (msgAnterior) await msgAnterior.delete().catch(() => {});
                    }
                } catch {}
            }

            // 🎲 Novo sorteio
            const sorteados = bichos.sort(() => Math.random() - 0.5).slice(0, 5);
            const resultado = sorteados.map(b => `${b.emoji} **${b.nome}**`).join("\n");

            const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("🎉 Sorteio Diário dos Bichos!")
                .setDescription(`Os 5 bichos escolhidos de **${hojeDisplay}** foram:\n\n${resultado}`)
                .setThumbnail("https://cdn-icons-png.flaticon.com/512/616/616408.png")
                .setFooter({
                    text: `Comando solicitado por ${message.author.username}`,
                    iconURL: message.author.displayAvatarURL(),
                })
                .setTimestamp();

            const msgNova = await canalDestino.send({ embeds: [embed] });

            // 💾 Atualiza banco com ID da nova mensagem
            fs.writeFileSync(
                dataPath,
                JSON.stringify({ data: hojeIso, resultado, mensagemId: msgNova.id, canalId: canalID }, null, 2)
            );

        } finally {
            global.sorteioBichoLock = false;
        }
    },
};
