const Perfil = require("../../models/Perfil");

module.exports = {
    name: "setwallpaper",
    description: "Define o wallpaper do seu perfil.",

    async execute(message, args) {

        const url = 
            message.attachments.first()?.url ||
            args[0];

        if (!url)
            return message.reply("❌ Envie uma imagem ou um link. Ex: `;setwallpaper https://img.com/bg.jpg`");

        let perfil = await Perfil.findOne({ userId: message.author.id });
        if (!perfil) perfil = new Perfil({ userId: message.author.id });

        perfil.wallpaper = url;
        await perfil.save();

        return message.reply("🖼️ Wallpaper atualizado com sucesso!");
    }
};
