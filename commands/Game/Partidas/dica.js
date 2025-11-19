const { EmbedBuilder } = require("discord.js");
const { partidasAtivas } = require("../play");
const Perfil = require("../../../models/Perfil");

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
                        .setDescription("❌ Não há uma rodada ativa no momento.")
                ]
            });
        }

        // Carregar perfil
        let perfil = await Perfil.findOne({ userId: message.author.id });

        if (!perfil) {
            perfil = await Perfil.create({
                userId: message.author.id,
                inventario: [],
                moedas: 0
            });
        }

        // Garantir que inventário existe
        if (!Array.isArray(perfil.inventario)) {
            perfil.inventario = [];
            await perfil.save();
        }

        // Verificar se possui item "dica"
        if (!perfil.inventario.includes("dica")) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Você não tem **dicas** no inventário!\nUse `;loja` para comprar.")
                ]
            });
        }

        // Remover 1 dica do inventário
        const index = perfil.inventario.indexOf("dica");
        if (index !== -1) perfil.inventario.splice(index, 1);
        await perfil.save();

        // Criar a dica
        const item = partida.itemAtual;

        if (!item || !item.resposta) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Não foi possível gerar a dica dessa rodada.")
                ]
            });
        }

        const resposta = String(item.resposta).toUpperCase();
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
