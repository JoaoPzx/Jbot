const { EmbedBuilder } = require("discord.js");
const Perfil = require("../../models/Perfil");

module.exports = {
    name: "inventario",
    aliases: ["inv", "bag"],
    description: "Mostra os itens que você possui no inventário.",

    async execute(message) {
        const userId = message.author.id;

        let perfil = await Perfil.findOne({ userId });
        if (!perfil) {
            perfil = await Perfil.create({ userId, moedas: 0, inventario: [] });
        }

        // Garantir que inventário exista
        if (!Array.isArray(perfil.inventario)) {
            perfil.inventario = [];
            await perfil.save();
        }

        // Mapear itens da loja para exibir nome e emoji
        const tabelaItens = {
            dica: { nome: "Dica", emoji: "💡" },

            // deixe preparado para itens futuros:
            // superdica: { nome: "Super Dica", emoji: "✨" }
        };

        // Contar quantidades
        const contagem = {};
        for (const item of perfil.inventario) {
            contagem[item] = (contagem[item] || 0) + 1;
        }

        // Criar a embed
        const embed = new EmbedBuilder()
            .setColor("#00c8ff")
            .setTitle(`🎒 Inventário de ${message.author.username}`)
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: "Use ;loja para comprar itens!" })
            .setTimestamp();

        // Mostrar saldo
        embed.addFields({
            name: "💰 Saldo",
            value: `**<:carteira:1440068592354725888> ${perfil.moedas} moedas**`,
            inline: false
        });

        // Inventário vazio
        if (perfil.inventario.length === 0) {
            embed.addFields({
                name: "📦 Inventário vazio",
                value: "Você não possui nenhum item. Use `;loja` para comprar!",
            });

            return message.reply({ embeds: [embed] });
        }

        // Criar listagem organizada
        let textoItens = "";
        for (const key of Object.keys(contagem)) {
            const info = tabelaItens[key] || { nome: key, emoji: "📦" };
            textoItens += `${info.emoji} **${info.nome}** — ${contagem[key]} unidade(s)\n`;
        }

        embed.addFields({
            name: "🧭 Itens",
            value: textoItens
        });

        return message.reply({ embeds: [embed] });
    }
};
