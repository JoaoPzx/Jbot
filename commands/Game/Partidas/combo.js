module.exports = {
    name: "combo",
    aliases: ["c"],
    async execute(client, message, args) {

        const userId = message.author.id;
        const perfil = await Perfil.findOne({ userId });

        if (!perfil) return message.reply("Seu perfil não foi encontrado.");

        // Verifica item combo
        if (perfil.comboItems <= 0) {
            return message.reply("Você não tem um item Combo no inventário.");
        }

        // Calcula bônus com base no nível do jogador
        const bonus = getComboBonus(perfil.level);

        // Desconta item
        perfil.comboItems -= 1;
        perfil.comboBonus = bonus;

        await perfil.save();

        return message.reply(`🔥 Combo ativado!\nSeu bônus agora é **(+${bonus})** e será aplicado à sua pontuação.`);
    }
};

function getComboBonus(level) {
    if (level < 1) level = 1;
    if (level > 300) level = 300;
    return Math.floor(1 + 9 * ((level - 1) / 299));
}
