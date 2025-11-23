const { EmbedBuilder } = require("discord.js");
const { partidasAtivas } = require("../Game/Partidas/play");
const Perfil = require("../../models/Perfil");

module.exports = async function validarItem(message, nomeDoItem) {

    const partida = partidasAtivas.get(message.channel.id);

    // Não há partida
    if (!partida) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("#ff4d4d")
                    .setDescription("❌ Não existe uma partida ativa neste canal.")
            ]
        });
    }

    // ❗ BLOQUEIA APENAS O COMBO NO EMBED DE ACERTO
    if (nomeDoItem === "combo" && partida.ultimoEmbed === "acerto") {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("#ff4d4d")
                    .setDescription("❌ Você **não pode usar Combo** no embed de acerto.")
            ]
        });
    }

    // Regras de pausa
    const itensPermitidosNaPausa = ["tempo", "nitro", "combo"];

    if (partida.pausada && !itensPermitidosNaPausa.includes(nomeDoItem)) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("#ff4d4d")
                    .setDescription(`⏸ A partida está pausada.\nVocê **não pode usar** o item **${nomeDoItem}** agora.`)
            ]
        });
    }

    // Partida não pausada → verificar rodada ativa
    if (!partida.pausada && !partida.rodadaEmCurso) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("#ff4d4d")
                    .setDescription("❌ Nenhuma rodada ativa no momento.")
            ]
        });
    }

    // Verificar se existe imagem / resposta ativa
    if (!partida.itemAtual || !partida.itemAtual.resposta) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("#ff4d4d")
                    .setDescription("❌ Não há imagem ativa para usar este item.")
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

    // Garantir estrutura
    if (!Array.isArray(perfil.inventario)) perfil.inventario = [];

    const entrada = perfil.inventario.find(i => i.nome === nomeDoItem);

    if (!entrada || entrada.quantidade <= 0) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("#ff4d4d")
                    .setDescription(`❌ Você não tem **${nomeDoItem}** no inventário.`)
            ]
        });
    }

    // Sucesso! retorna dados para o item
    return {
        partida,
        perfil,
        item: entrada
    };
}
