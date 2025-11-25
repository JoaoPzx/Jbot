const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'avatar',
    description: 'Mostra o avatar de um usuário',

    async execute(message, args) {
        let user;

        if (message.mentions.users.size) {
            user = message.mentions.users.first();
        } else if (args[0]) {
            try {
                user = await message.client.users.fetch(args[0]);
            } catch {
                return message.reply('<:fecharerr:1442682279322325095> Usuário não encontrado.');
            }
        } else {
            user = message.author;
        }

        // Novo formato — suporta usuários com e sem discriminador
        const username = user.discriminator === '0' ? `@${user.username}` : `${user.username}#${user.discriminator}`;

        const embed = new EmbedBuilder()
            .setTitle(username)
            .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setColor('Random')
            .setFooter({ text: `Requisitado por ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

        message.channel.send({ embeds: [embed] });
    }
};
