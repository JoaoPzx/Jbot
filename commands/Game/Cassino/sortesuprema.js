const { EmbedBuilder } = require("discord.js");
const Perfil = require("../../../models/Perfil");

module.exports = {
    name: "sortesuprema",
    aliases: ["ss"],
    description: "Aposte um valor e tente multiplicar suas moedas!",

    async execute(message, args) {

        // ===============================
        // 🔎 SUBCOMANDO: ;ss info
        // ===============================
        if (!args.length || args[0].toLowerCase() === "info") {
            const embedInfo = new EmbedBuilder()
                .setColor("#9b59b6")
                .setTitle("🎲 SORTE SUPREMA — Informações")
                .setDescription(
                    "**Aposte e teste sua sorte!**\n" +
                    "Você escolhe um número entre **0 e 10** e um valor para apostar.\n\n" +
                    "🎯 **Aposta mínima:** 20 moedas\n" +
                    "💰 **Aposta máxima:** 100.000 moedas\n\n" +
                    "**📌 Regras do multiplicador:**\n" +
                    "- 🎇 Acerto EXATO → **x10**\n" +
                    "- ✨ Diferença de 1 → **x3**\n" +
                    "- 👍 Diferença de 2 → **x2**\n" +
                    "- 💀 Diferença 3 ou mais → **Perde tudo**\n\n" +
                    "Exemplo: `;ss 7 100`\n" +
                    "O bot sorteia um número de 0–10 e calcula o resultado!"
                )
                .setFooter({ text: "Boa sorte! 🎰" });

            return message.reply({ embeds: [embedInfo] });
        }

        // ===============================
        // 🎯 ARGUMENTOS: ;ss <numero> <aposta>
        // ===============================
        const escolha = parseInt(args[0]);
        const aposta = parseInt(args[1]);

        if (isNaN(escolha) || escolha < 0 || escolha > 10) {
            return message.reply("❌ Escolha um número entre **0 e 10**. Exemplo: `;ss 7 100`");
        }

        if (isNaN(aposta) || aposta < 20) {
            return message.reply("❌ O valor mínimo de aposta é **20 moedas**.");
        }

        if (aposta > 100000) {
            return message.reply("❌ O valor máximo de aposta é **100.000 moedas**.");
        }

        // Carregar perfil
        let perfil = await Perfil.findOne({ userId: message.author.id });
        if (!perfil) {
            perfil = await Perfil.create({ userId: message.author.id, moedas: 0 });
        }

        if (perfil.moedas < aposta) {
            return message.reply(`❌ Você não tem moedas suficientes! Você possui **${perfil.moedas}**.`);
        }

        // ===============================
        // 🎰 DESCONTAR A APOSTA
        // ===============================
        perfil.moedas -= aposta;

        // ===============================
        // 🔥 SORTEIO
        // ===============================
        const sorteado = Math.floor(Math.random() * 11); // 0 a 10
        const diferenca = Math.abs(escolha - sorteado);

        let multiplicador = 0;
        let ganho = 0;
        let resultadoTexto = "";

        if (diferenca === 0) {
            multiplicador = 10;
            ganho = aposta * 10;
            resultadoTexto = "🎇 **ACERTO SUPREMO!** Você acertou o número exato!";
        } 
        else if (diferenca === 1) {
            multiplicador = 3;
            ganho = aposta * 3;
            resultadoTexto = "✨ Quase! Diferença de 1 → multiplicador **x3**";
        } 
        else if (diferenca === 2) {
            multiplicador = 2;
            ganho = aposta * 2;
            resultadoTexto = "👍 Diferença de 2 → multiplicador **x2**";
        } 
        else {
            multiplicador = 0;
            ganho = 0;
            resultadoTexto = "💀 Diferença de 3 ou mais... você perdeu a aposta!";
        }

        // Se ganhou algo, somar moedas
        perfil.moedas += ganho;

        await perfil.save();

        // ===============================
        // 🟣 EMBED DE RESULTADO
        // ===============================
        const embed = new EmbedBuilder()
            .setColor(multiplicador > 0 ? "#2ecc71" : "#e74c3c")
            .setTitle("🎲 SORTE SUPREMA — Resultado")
            .addFields(
                { name: "🎯 Seu número", value: `**${escolha}**`, inline: true },
                { name: "🎲 Número sorteado", value: `**${sorteado}**`, inline: true },
                { name: "💸 Aposta", value: `**${aposta} moedas**`, inline: true },
                { name: "🧮 Multiplicador", value: `**x${multiplicador}**`, inline: true },
                { name: "🏦 Resultado", value: multiplicador > 0 ? `**+${ganho} moedas**` : `**-${aposta} moedas**`, inline: true },
                { name: "📊 Saldo Atual", value: `**${perfil.moedas} moedas**`, inline: true }
            )
            .setFooter({ text: "Aposte com responsabilidade!" });

        return message.reply({ embeds: [embed] });
    }
};
