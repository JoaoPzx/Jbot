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
                        .setDescription("❌ Não há partida ativa neste canal.")
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
                            `❌ O item **Tempo (+3s)** já está ativo!\n` +
                            `⏳ Faltam **${partida.tempoBoostNiveisRestantes} níveis** para o efeito acabar.`
                        )
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
                        .setDescription("❌ O item só pode ser usado **no início da partida** ou **logo após um acerto**.")
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
                        .setDescription("❌ Você não possui o item **Tempo (+3s)**.")
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
        partida.tempoExtraGlobal = 3;                  // +3s fixo
        partida.tempoBoostNiveisRestantes = 30;        // dura 30 rodadas

        const embed = new EmbedBuilder()
            .setColor("#3498db")
            .setTitle("⏳ TEMPO EXTRA ATIVADO!")
            .setDescription(
                `🕒 O tempo de resposta ganhou **+3 segundos**!\n` +
                `🔵 Este efeito durará por **30 níveis**.`
            )
            .addFields(
                { name: "Ativado por", value: `<@${userId}>`, inline: true },
                { name: "Novo tempo", value: `+3s adicionados`, inline: true }
            );

        return message.reply({ embeds: [embed] });
    }
};
