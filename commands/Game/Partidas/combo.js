const { EmbedBuilder } = require("discord.js");
const Perfil = require("../../../models/Perfil");
const playModule = require("./play"); // acessa partidasAtivas
const partidasAtivas = playModule.partidasAtivas;

module.exports = {
    name: "combo",
    aliases: ["c"],
    async execute(message) {

        const userId = message.author.id;
        let perfil = await Perfil.findOne({ userId });

        if (!perfil) {
            return message.reply("❌ Seu perfil não foi encontrado.");
        }

        // Verificar inventário padrão (array de itens { nome, quantidade })
        const itemCombo = perfil.inventario.find(i => i.nome === "combo");

        if (!itemCombo || itemCombo.quantidade <= 0) {
            return message.reply("❌ Você não possui um item **Combo** no inventário.");
        }

        // Verificar se há uma partida ativa no canal
        const partida = partidasAtivas.get(message.channel.id);
        if (!partida) {
            return message.reply("❌ Não existe uma partida ativa neste canal para ativar o Combo.");
        }

        // Só pode usar DURANTE o embed de início, antes da primeira rodada começar.
        // Condição: partida existe e rodada ainda não iniciou (rodadaEmCurso false) e timeout está pendente
        if (partida.rodadaEmCurso || !partida.timeout) {
            return message.reply("❌ Você só pode ativar o Combo **no início da partida** (durante o embed de 10s).");
        }

        // Verifica se jogador já ativou combo nesta partida
        partida.combos = partida.combos || {};
        if (partida.combos[userId]) {
            return message.reply("❌ Você já ativou um Combo para esta partida.");
        }

        // Consome 1 item combo do inventário
        itemCombo.quantidade -= 1;
        if (itemCombo.quantidade <= 0) {
            perfil.inventario = perfil.inventario.filter(i => i.nome !== "combo");
        }
        await perfil.save();

        // Marca combo ativo nesta partida (dura a partida inteira)
        partida.combos[userId] = true;

        const embed = new EmbedBuilder()
            .setColor("#ffaa00")
            .setTitle("🔥 Combo Ativado!")
            .setDescription(`💥 Você ativou seu Combo para esta partida!\nO bônus será aplicado a partir do nível 4 conforme a distribuição do nível.`)
            .addFields(
                { name: "Observação", value: "Níveis 1–3 sempre valem 1 ponto mesmo com combo ativo.", inline: false }
            );

        return message.reply({ embeds: [embed] });
    }
};
