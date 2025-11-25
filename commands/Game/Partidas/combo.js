const { EmbedBuilder } = require("discord.js");
const Perfil = require("../../../models/Perfil");
const playModule = require("./play");
const partidasAtivas = playModule.partidasAtivas;
const getComboBonusByLevel = playModule.getComboBonusByLevel;

module.exports = {
    name: "combo",
    aliases: ["c"],

    async execute(message) {
        try {
            const userId = message.author.id;
            const partida = partidasAtivas.get(message.channel.id);

            /* ===============================
               1) Precisa existir partida ativa
            ================================== */
            if (!partida) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#ff4d4d")
                            .setDescription("<:fecharerr:1442682279322325095> Não existe uma partida ativa neste canal.")
                    ]
                });
            }

            /* ===============================
               2) Partida encerrada
            ================================== */
            if (partida.encerrada) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#ff4d4d")
                            .setDescription("<:fecharerr:1442682279322325095> A partida já foi finalizada.")
                    ]
                });
            }

             /* ===============================
               3) Usuário já ativou combo?
            ================================== */
            if (!partida.combos) partida.combos = {};
            if (partida.combos[userId]) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#ffcc00")
                            .setDescription("<:avisojf:1442687822208303215> Você já ativou o Combo nesta partida.")
                    ]
                });
            }

            /* ===============================
               34 BLOQUEAR uso no embed da imagem
               (proibido sempre)
            ================================== */
            if (partida.embedRodada) {
                // se existe um embed de imagem ativo, bloquear
                if (partida.rodadaEmCurso) {
                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("#ff4d4d")
                                .setDescription("<:fecharerr:1442682279322325095> Você não pode ativar o Combo agora.")
                        ]
                    });
                }
            }

            /* ===============================
               5) SE PAUSADO → permitir usar combo
                  (exceto embed da imagem já bloqueado)
            ================================== */

            if (partida.pausada) {
                // permitido
            }


            /* ===============================
               7) Validar inventário
            ================================== */
            let perfil = await Perfil.findOne({ userId });
            if (!perfil) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#ff4d4d")
                            .setDescription("<:fecharerr:1442682279322325095> Seu perfil não foi encontrado.")
                    ]
                });
            }

            if (!Array.isArray(perfil.inventario)) perfil.inventario = [];

            const itemCombo = perfil.inventario.find(i => i.nome === "combo");
            if (!itemCombo || itemCombo.quantidade <= 0) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#ff4d4d")
                            .setDescription("<:fecharerr:1442682279322325095> Você não possui **Combos** no seu inventário.")
                    ]
                });
            }

            /* ===============================
               8) Consumir item
            ================================== */
            itemCombo.quantidade -= 1;
            if (itemCombo.quantidade <= 0) {
                perfil.inventario = perfil.inventario.filter(i => i.nome !== "combo");
            }
            await perfil.save();

            /* ===============================
               9) Ativar combo
            ================================== */
            partida.combos[userId] = true;

            /* ===============================
               10) Embed OK
            ================================== */
            const bonus = getComboBonusByLevel(partida.nivel);
            const embed = new EmbedBuilder()
                .setColor("Green")
                .setDescription(`<:icon_combo:1441177424124448868> Você ativou seu combo, bônus atual: (+${bonus})`);

            return message.reply({ embeds: [embed] });

        } catch (err) {
            console.error("Erro no comando combo:", err);
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("<:fecharerr:1442682279322325095> Erro ao ativar o Combo.")
                ]
            });
        }
    }
};
