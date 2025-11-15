const { PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'mute',
    description: 'Silencia um membro do servidor (timeout)',

    async execute(message, args) {
        // Verificar permissão do autor
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
            return message.reply('❌ Você não tem permissão para usar este comando.');

        // Verificar se mencionou alguém ou passou ID
        let member =
            message.mentions.members.first() ||
            message.guild.members.cache.get(args[0]);

        // Buscar da API se não estiver em cache
        if (!member && args[0]) {
            try {
                member = await message.guild.members.fetch(args[0]);
            } catch {
                return message.reply('❌ Não consegui encontrar o membro. Verifique o ID e tente novamente.');
            }
        }

        if (!member)
            return message.reply('❌ Você precisa mencionar um membro ou informar um ID válido.');

        if (member.id === message.author.id)
            return message.reply('❌ Você não pode mutar a si mesmo.');

        if (!member.moderatable)
            return message.reply('❌ Não consigo aplicar mute nesse membro (possivelmente por hierarquia de cargo).');

        // Tempo
        const timeInput = args[1] || '10m';
        const time = parseTime(timeInput);
        if (!time) return message.reply('❌ Tempo inválido. Use formato como `10m`, `1h`, `1d`.');

        const reason = args.slice(2).join(' ') || 'Sem motivo especificado.';

        try {
            await member.timeout(time, reason);

            const embed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('🔇 Membro Mutado')
                .addFields(
                    { name: '👤 Usuário', value: `${member.user.tag}`, inline: true },
                    { name: '⏱ Tempo', value: formatTime(time), inline: true },
                    { name: '📝 Motivo', value: reason, inline: false },
                )
                .setFooter({ text: `Mutado por ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            message.reply('❌ Ocorreu um erro ao tentar mutar o membro.');
        }
    },
};

// Converte formatos tipo 10m, 1h, 1d em milissegundos
function parseTime(str) {
    const match = str.match(/^(\d+)([smhd])$/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

    return value * multipliers[unit];
}

// Formata tempo pra embed (ex: "10 minutos")
function formatTime(ms) {
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${seconds / 60}m`;
    if (seconds < 86400) return `${seconds / 3600}h`;
    return `${seconds / 86400}d`;
}
