const { EmbedBuilder } = require("discord.js");
const Perfil = require("../../../models/Perfil");
const { partidasAtivas } = require("./play");

module.exports = {
    name: "nitro",
    aliases: ["n"],
    description: "Usa o item Nitro para reduzir o tempo entre as imagens.",

    async execute(message) {
        const userId = message.author.id;
        const canalId = message.channel.id;

        // --- verificar partida ativa ---
        const partida = partidasAtivas.get(canalId);
        if (!partida) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("<:fecharerr:1442682279322325095> Não existe uma partida ativa neste canal.")
                ]
            });
        }


        // --- já está ativo? ---
        if (partida.nitro) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ffcc00")
                        .setDescription("<:avisojf:1442687822208303215> O Nitro já está ativo nesta partida.")
                ]
            });
        }

        // --- carregar perfil ---
        let perfil = await Perfil.findOne({ userId });
        if (!perfil) perfil = await Perfil.create({ userId });

        if (!Array.isArray(perfil.inventario)) perfil.inventario = [];

        // --- buscar item no inventário ---
        const itemNitro = perfil.inventario.find(i => i.nome === "nitro");

        if (!itemNitro || itemNitro.quantidade < 1) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("<:fecharerr:1442682279322325095> Você não possui **Nitros** no seu inventário.")
                ]
            });
        }

        // --- checar se está no momento permitido ---
        // REGRA: nitro pode ser usado mesmo com partida PAUSADA
        // MAS apenas nos embeds de início ou acerto
        if (!partida.podeUsarNitroAgora) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription("<:fecharerr:1442682279322325095> Você não pode usar o Nitro agora.")
                ]
            });
        }

        // --- consumir 1 nitro ---
        itemNitro.quantidade -= 1;

        if (itemNitro.quantidade <= 0) {
            perfil.inventario = perfil.inventario.filter(i => i.nome !== "nitro");
        }

        await perfil.save();

        // --- ativar nitro ---
        partida.nitro = true;

        const embedConfirmacao = new EmbedBuilder()
            .setColor("#ffaa00")
            .setDescription("<:icon_nitro:1441530028658790430> intervalo reduzido de **10s → 5s** em toda a partida.");

        return message.reply({ embeds: [embedConfirmacao] });
    }
};
