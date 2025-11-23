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
                            .setDescription("❌ Não existe uma partida ativa neste canal.")
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
                            .setDescription("❌ A partida já foi finalizada.")
                    ]
                });
            }

            /* ===============================
               3) BLOQUEAR uso no embed da imagem
               (proibido sempre)
            ================================== */
            if (partida.embedImagemId) {
                // se existe um embed de imagem ativo, bloquear
                if (partida.rodadaEmCurso) {
                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("#ff4d4d")
                                .setDescription("❌ Você **não pode ativar o Combo durante a imagem da rodada.**")
                        ]
                    });
                }
            }

            /* ===============================
               4) SE PAUSADO → permitir usar combo
                  (exceto embed da imagem já bloqueado)
            ================================== */

            if (partida.pausada) {
                // permitido
            } else {
                /* ======================================
                   5) NÃO PAUSADO → só pode ativar antes da primeira rodada
                ========================================= */
                if (partida.rodadaEmCurso || partida.nivel > 1) {
                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("#ff4d4d")
                                .setDescription("❌ Você só pode ativar o Combo **nos 10s iniciais**.")
                        ]
                    });
                }
            }

            /* ===============================
               6) Usuário já ativou combo?
            ================================== */
            if (!partida.combos) partida.combos = {};
            if (partida.combos[userId]) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#ff4d4d")
                            .setDescription("❌ Você já ativou um Combo nesta partida.")
                    ]
                });
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
                            .setDescription("❌ Seu perfil não foi encontrado.")
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
                            .setDescription("❌ Você não possui um item **Combo**.")
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
                .setColor("#ffaa00")
                .setTitle("🔥 Combo Ativado!")
                .setDescription(
                    `💥 Você ativou seu Combo!\n` +
                    `📈 Bônus atual: **+${bonus}** (a partir do nível 4).\n\n` +
                    `O Combo permanece ativo durante toda a partida.`
                );

            return message.reply({ embeds: [embed] });

        } catch (err) {
            console.error("Erro no comando combo:", err);
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Erro ao ativar o Combo.")
                ]
            });
        }
    }
};
