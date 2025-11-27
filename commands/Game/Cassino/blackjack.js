const { EmbedBuilder } = require("discord.js");

// Baralho clássico
const cartas = [
    "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"
];

function puxarCarta() {
    const carta = cartas[Math.floor(Math.random() * cartas.length)];
    return carta;
}

// Calcula pontuação de mão
function calcularPontos(mao) {
    let total = 0;
    let ases = 0;

    for (const carta of mao) {
        if (["J", "Q", "K"].includes(carta)) total += 10;
        else if (carta === "A") {
            ases++;
            total += 11;
        } else total += parseInt(carta);
    }

    // Ajusta Ás
    while (total > 21 && ases > 0) {
        total -= 10;
        ases--;
    }

    return total;
}

module.exports = {
    name: "blackjack",
    aliases: ["bj"],
    description: "Jogue Blackjack clássico.",

    async execute(message) {

        // ==========================
        // CRIAR PARTIDA
        // ==========================
        let jogador = [puxarCarta(), puxarCarta()];
        let dealer = [puxarCarta(), puxarCarta()];

        // ==========================
        // EMBED DE INÍCIO
        // ==========================
        const embedInicio = new EmbedBuilder()
            .setColor("#1e1f22")
            .setTitle("🃏 Blackjack – Cassino JBot")
            .setDescription(
                `**Suas Cartas:** ${jogador.join(" • ")}\n` +
                `**Total:** ${calcularPontos(jogador)}\n\n` +
                `**Dealer:** ${dealer[0]} • ❓\n\n` +
                "**Digite:**\n" +
                "➡ `hit` para comprar carta\n" +
                "➡ `stand` para parar"
            );

        await message.reply({ embeds: [embedInicio] });

        // ==========================
        // ESPERAR AÇÃO DO JOGADOR
        // ==========================
        const filter = (m) =>
            m.author.id === message.author.id &&
            ["hit", "stand"].includes(m.content.toLowerCase());

        const collected = await message.channel.awaitMessages({
            filter,
            max: 1,
            time: 30000
        }).catch(() => null);

        if (!collected || collected.size === 0) {
            return message.channel.send("⌛ **Tempo esgotado!**");
        }

        const escolha = collected.first().content.toLowerCase();

        // ==========================
        // AÇÃO DO JOGADOR
        // ==========================
        if (escolha === "hit") {
            jogador.push(puxarCarta());
        }

        let pontosJogador = calcularPontos(jogador);

        if (pontosJogador > 21) {
            const embedDerrota = new EmbedBuilder()
                .setColor("#ff4d4d")
                .setTitle("💥 Estourou!")
                .setDescription(
                    `Você passou de **21**.\n\n` +
                    `Suas cartas: ${jogador.join(" • ")}\n` +
                    `Total: ${pontosJogador}\n\n` +
                    "🔻 **Você perdeu.**"
                );

            return message.channel.send({ embeds: [embedDerrota] });
        }

        // ==========================
        // AÇÃO DO DEALER
        // ==========================
        let pontosDealer = calcularPontos(dealer);

        while (pontosDealer < 17) {
            dealer.push(puxarCarta());
            pontosDealer = calcularPontos(dealer);
        }

        // ==========================
        // RESULTADO FINAL
        // ==========================
        let titulo = "";
        let desc = "";

        if (pontosJogador === pontosDealer) {
            titulo = "🤝 Empate!";
            desc = "Ninguém ganhou dessa vez.";
        } else if (pontosDealer > 21 || pontosJogador > pontosDealer) {
            titulo = "🏆 Você venceu!";
            desc = "Parabéns! Vitória limpa.";
        } else {
            titulo = "❌ Você perdeu...";
            desc = "O dealer venceu.";
        }

        const embedFinal = new EmbedBuilder()
            .setColor("#2b2d31")
            .setTitle(titulo)
            .addFields(
                {
                    name: "Suas Cartas",
                    value: `${jogador.join(" • ")}\n**Total: ${pontosJogador}**`
                },
                {
                    name: "Cartas do Dealer",
                    value: `${dealer.join(" • ")}\n**Total: ${pontosDealer}**`
                }
            )
            .setFooter({ text: "Cassino JBot – Blackjack Clássico" });

        return message.channel.send({ embeds: [embedFinal] });
    }
};
