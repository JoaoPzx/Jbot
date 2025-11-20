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
                        .setDescription("❌ Não há partida ativa neste canal.")
                ]
            });
        }

        // --- apenas o autor ---
        if (partida.autorId !== userId) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Apenas quem iniciou a partida pode usar Nitro.")
                ]
            });
        }

        // --- já ativado? ---
        if (partida.nitro) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ffcc00")
                        .setDescription("⚠️ O Nitro já está ativo nesta partida.")
                ]
            });
        }

        // --- buscar perfil ---
        let perfil = await Perfil.findOne({ userId });
        if (!perfil) perfil = await Perfil.create({ userId });

        // --- procurar item no inventário ---
        const itemNitro = perfil.inventario.find(i => i.nome === "nitro");

        if (!itemNitro || itemNitro.quantidade < 1) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff4d4d")
                        .setDescription("❌ Você não possui o item **Nitro**.")
                ]
            });
        }

        // --- verificar se está no momento correto ---
        // Buscar últimas mensagens e pegar a última do BOT
        const mensagens = await message.channel.messages.fetch({ limit: 10 });
        const ultimaMsgDoBot = mensagens.find(m => m.author.id === message.client.user.id);

        const embed = ultimaMsgDoBot?.embeds[0];


        // Permitir apenas no início ou logo após acerto
if (!partida.podeUsarNitroAgora) {
    return message.reply({
        embeds: [
            new EmbedBuilder()
                .setColor("Red")
                .setDescription("❌ O Nitro só pode ser usado **no início da partida** ou **logo após um acerto**.")
        ]
    });
}


        // --- consumir 1 nitro ---
        itemNitro.quantidade -= 1;

        if (itemNitro.quantidade <= 0) {
            perfil.inventario = perfil.inventario.filter(i => i.nome !== "nitro");
        }

        await perfil.save();

        // --- ativar nitro na partida ---
        partida.nitro = true;

        const embedConfirmacao = new EmbedBuilder()
            .setColor("#00ff9d")
            .setTitle("⚡ NITRO ATIVADO!")
            .setDescription("O intervalo entre as imagens agora será de **10s → 5s** durante toda a partida.");

        return message.reply({ embeds: [embedConfirmacao] });
    }
};
