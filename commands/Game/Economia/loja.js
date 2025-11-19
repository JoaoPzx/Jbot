const { EmbedBuilder } = require("discord.js");
const Perfil = require("../../../models/Perfil");

module.exports = {
    name: "loja",
    description: "Loja de itens do bot. Use ;loja comprar <item>",

    async execute(message, args) {

        const acao = args[0];
        const itemArg = args[1];

        // Lista de itens disponíveis na loja
        const itens = {
            dica: {
                nome: "💡 Dica",
                preco: 5,
                descricao: "Revela uma dica da resposta durante a partida."
            }
        };

        // Carregar perfil do usuário
        let perfil = await Perfil.findOne({ userId: message.author.id });
        if (!perfil) {
            perfil = await Perfil.create({
                userId: message.author.id,
                moedas: 0,
                inventario: []
            });
        }

        // ================================
        // MOSTRAR LOJA
        // ================================
        if (!acao) {
            const embed = new EmbedBuilder()
                .setColor("#2ecc71")
                .setTitle("🛒 Loja do Bot")
                .setDescription("Use **`;loja comprar <item>`** para adquirir um item.\n\nItens disponíveis:")
                .addFields(
                    Object.keys(itens).map(key => ({
                        name: `${itens[key].nome} — ${itens[key].preco} moedas`,
                        value: itens[key].descricao
                    }))
                );

            return message.reply({ embeds: [embed] });
        }

        // ================================
        // COMPRA DE ITEM
        // ================================
        if (acao.toLowerCase() === "comprar") {

            if (!itemArg) {
                const embed = new EmbedBuilder()
                    .setColor("Yellow")
                    .setDescription("⚠️ Use: `;loja comprar <item>`");
                return message.reply({ embeds: [embed] });
            }

            const key = itemArg.toLowerCase();
            const item = itens[key];

            if (!item) {
                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setDescription("❌ Item não encontrado na loja.");
                return message.reply({ embeds: [embed] });
            }

            // Verificar moedas (campo correto: perfil.moedas)
            if (perfil.moedas < item.preco) {
                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setDescription(
                        `❌ Você não tem moedas suficientes!\n` +
                        `💰 Custa **${item.preco} moedas**, mas você tem apenas **${perfil.moedas}**.`
                    );
                return message.reply({ embeds: [embed] });
            }

            // Compra: desconta e adiciona ao inventário
            perfil.moedas -= item.preco;
            perfil.inventario.push(key);
            await perfil.save();

            const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("✔️ Compra realizada!")
                .setDescription(`Você comprou **${item.nome}** por **${item.preco} moedas**!`)
                .addFields({
                    name: "Saldo restante",
                    value: `**<:carteira:1440068592354725888> ${perfil.moedas} moedas**`,
                    inline: true
                });

            return message.reply({ embeds: [embed] });
        }

        // ================================
        // ARGUMENTO INVÁLIDO
        // ================================
        const embed = new EmbedBuilder()
            .setColor("Red")
            .setDescription("❌ Comando inválido.\nUse `;loja` para ver os itens.");
        return message.reply({ embeds: [embed] });
    }
};
