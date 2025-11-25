const { EmbedBuilder } = require("discord.js");
const Perfil = require("../../../models/Perfil");
const { partidasAtivas } = require("./play");

module.exports = {
    name: "tempo",
    aliases: ["t"],
    description: "Adiciona +3s ao tempo das próximas rodadas (dura 30 níveis).",

    async execute(message) {

        const userId = message.author.id;
        const canalId = message.channel.id;
        const partida = partidasAtivas.get(canalId);

        if (!partida) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription("<:fecharerr:1442682279322325095> Não existe uma partida ativa neste canal.")
                ]
            });
        }

        // ===========================
        // BLOQUEAR USO ANTES DO FIM DO EFEITO
        // ===========================
        if (partida.tempoBoostNiveisRestantes && partida.tempoBoostNiveisRestantes > 0) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription(
                            `<:fecharerr:1442682279322325095> Você já ativou o **tempo** nesta partida.`)
                ]
            });
        }

        // ===========================
        // VERIFICAR SE PODE USAR AGORA
        // ===========================
        if (!partida.podeUsarTempoAgora) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription("<:fecharerr:1442682279322325095> Você não pode usar o tempo agora.")
                ]
            });
        }

        // ===========================
        // VERIFICAR INVENTÁRIO
        // ===========================
        let perfil = await Perfil.findOne({ userId });
        if (!perfil) perfil = await Perfil.create({ userId });

        const item = perfil.inventario.find(i => i.nome === "tempo");

        if (!item || item.quantidade < 1) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription("<:fecharerr:1442682279322325095> Você não possui **Tempos** no seu inventário.")
                ]
            });
        }

        // ===========================
        // CONSUMIR ITEM
        // ===========================
        item.quantidade -= 1;
        if (item.quantidade <= 0) {
            perfil.inventario = perfil.inventario.filter(i => i.nome !== "tempo");
        }
        await perfil.save();

        // ===========================
        // ATIVAR BOOST DE TEMPO
        // ===========================
        partida.tempoExtraGlobal = 2;                  // +3s fixo
        partida.tempoBoostNiveisRestantes = 30;        // dura 30 rodadas

        const embed = new EmbedBuilder()
            .setColor("#ffaa00")
            .setDescription(
                `<:icon_tempo:1441174907445837907> Foi aplicado **+2s** no tempo de acerto por 30 níveis!`
            )

        return message.reply({ embeds: [embed] });
    }
};
