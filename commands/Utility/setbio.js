const Perfil = require("../../models/Perfil");

module.exports = {
    name: "setbio",
    description: "Define sua biografia do perfil.",

    async execute(message, args) {

        const texto = args.join(" ");

        if (!texto)
            return message.reply("❌ Escreva a biografia. Ex: `;setbio Sou jogador de Valorant!`");

        if (texto.length > 120)
            return message.reply("❌ A biografia deve ter no máximo **120 caracteres**.");

        let perfil = await Perfil.findOne({ userId: message.author.id });

        if (!perfil) perfil = new Perfil({ userId: message.author.id });

        perfil.bio = texto;
        await perfil.save();

        return message.reply("✅ Biografia atualizada com sucesso!");
    }
};
