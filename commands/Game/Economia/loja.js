const { EmbedBuilder } = require("discord.js");
const Perfil = require("../../../models/Perfil");

module.exports = {
    name: "loja",
    description: "Loja de itens do bot.",

    async execute(message, args) {

        // Lista de itens da loja
        const itens = {
            dica: {
                nome: "Dica",
                nomePlural: "Dicas",
                emoji: "<:icon_dica:1441174865032904745>",
                preco: 5,
                desc: "Revela de **30 a 50%** das letras da resposta.",
                aliases: ["d"]
            },

            resposta: {
                nome: "Resposta",
                nomePlural: "Respostas",
                emoji: "<:icon_resposta:1441904668748939374>",
                preco: 20,
                desc: "Revela a **resposta completa** da imagem da rodada.",
                aliases: ["r"]
            },

            tempo: {
                nome: "Tempo",
                nomePlural: "Tempos",
                emoji: "<:icon_tempo:1441174907445837907>",
                preco: 30,
                desc: "Adiciona **+3 segundos** ao tempo de acerto da partida.",
                aliases: ["t"]
            },

            nitro: {
                nome: "Nitro",
                nomePlural: "Nitros",
                emoji: "<:icon_nitro:1441530028658790430>",
                preco: 50,
                desc: "Reduz o intervalo de **10s → 5s** durante toda a partida.",
                aliases: ["n"]
            },

            pular: {
                nome: "Pular",
                nomePlural: "Pulos",
                emoji: "<:icon_pulo:1441182320462790786>",
                preco: 70,
                desc: "**Pula** a imagem da rodada (Máx 5 por partida).",
                aliases: ["s"]
            },

            combo: {
                nome: "Combo",
                nomePlural: "Combos",
                emoji: "<:icon_combo:1441177424124448868>",
                preco: 100,
                desc: "**Aumenta** a pontuação do jogador progressivamente (+1, +2, +3...).",
                aliases: ["c"]
            },
        };

        // Carregar perfil
        let perfil = await Perfil.findOne({ userId: message.author.id });
        if (!perfil) perfil = await Perfil.create({ userId: message.author.id });


        // ==================================================
        // ;loja info
        // ==================================================
        if (args[0] && args[0].toLowerCase() === "info") {
            const embed = new EmbedBuilder()
                .setColor("#3498db")
                .setTitle("<:informacoes_jbot:1442172090756370625> Informações dos Itens")
                .setFooter({ text: "Use ;loja <item> <quantidade> para comprar", iconURL: "https://i.ibb.co/N2NncX3f/informacoes.png" });

            for (const key of Object.keys(itens)) {
                embed.addFields({
                    name: `${itens[key].emoji} ${itens[key].nome}`,
                    value: itens[key].desc,
                    inline: false
                });
            }

            return message.reply({ embeds: [embed] });
        }



        // ==================================================
        // MOSTRAR LOJA (sem args)
        // ==================================================
        if (!args.length) {
            const embed = new EmbedBuilder()
                .setColor("Purple")
                .setTitle("Loja de Itens do JBot")
                .setDescription("<:shop100:1441161458175180921> Bem-vindo(a) a Loja de itens, confira os nossos itens e seus valores:")
                .setFooter({ text: "Utilize ;loja <nome do item> <quantidade> para comprar", iconURL: "https://i.ibb.co/N2NncX3f/informacoes.png" })
                .addFields(
                    Object.keys(itens).map(key => ({
                        name: `${itens[key].emoji} ${itens[key].nome}`,
                        value: `**<:coin1:1441491987537727669> ${itens[key].preco} Moedas**`,
                        inline: true
                    }))
                );

            return message.reply({ embeds: [embed] });
        }



        // ==================================================
        // COMPRA
        // ==================================================
        const argItemBruto = args[0].toLowerCase();
        const quantidade = parseInt(args[1]) || 1;

        // Encontrar item por nome ou alias
        const keyItem = Object.keys(itens).find(
            k => k === argItemBruto || itens[k].aliases.includes(argItemBruto)
        );

        if (!keyItem) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription("❌ Item não encontrado.\nUse `;loja` para ver os itens.")
                ]
            });
        }

        const item = itens[keyItem];
        const precoTotal = item.preco * quantidade;

        // Verificar saldo
        if (perfil.moedas < precoTotal) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription(
                            `❌ Você não tem moedas suficientes.\n` +
                            `💰 Preço total: **${precoTotal}**\n` +
                            `💸 Seu saldo: **${perfil.moedas}**`
                        )
                ]
            });
        }

        // Descontar moedas
        perfil.moedas -= precoTotal;

        // Adicionar ao inventário
        let itemInv = perfil.inventario.find(i => i.nome === keyItem);

        if (!itemInv) {
            perfil.inventario.push({ nome: keyItem, quantidade });
        } else {
            itemInv.quantidade += quantidade;
        }

        await perfil.save();


        // ==================================================
        // PLURAL AUTOMÁTICO
        // ==================================================
        const nomeFinal =
            quantidade === 1
                ? item.nome
                : item.nomePlural;


        // ==================================================
        // EMBED DE CONFIRMAÇÃO
        // ==================================================
        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("Compra realizada!")
            .setDescription(`<:compras:1442177278099591279> ${message.author}, sua compra foi concluída!`)
            .addFields(
                {
                    name: "Produto",
                    value: `${item.emoji} **${quantidade} ${nomeFinal}**`,
                    inline: true
                },
                {
                    name: "Preço Total",
                    value: `**<:coin1:1441491987537727669> ${precoTotal}**`,
                    inline: true
                },
                {
                    name: "Saldo Atual",
                    value: `**<:carteira:1440068592354725888> ${perfil.moedas} moedas**`,
                    inline: true
                }
            );

        return message.reply({ embeds: [embed] });
    }
};
