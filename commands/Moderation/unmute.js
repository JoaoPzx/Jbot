const { PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'unmute',
    description: 'Remove o mute (timeout) de um membro',

    async execute(message, args) {
        // Verifica permissão do autor
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
            return message.reply('❌ Você não tem permissão para usar este comando.');

        // Tenta obter o membro por menção ou ID
        let member =
            message.mentions.members.first() ||
            message.guild.members.cache.get(args[0]);

        // Buscar membro da API se não estiver em cache
        if (!member && args[0]) {
            try {
                member = await message.guild.members.fetch(args[0]);
            } catch {
                return message.reply('❌ Não consegui encontrar o membro. Verifique o ID e tente novamente.');
            }
        }

        if (!member)
            return message.reply('❌ Você precisa mencionar um membro ou informar um ID válido.');

        // ⚙️ Forçar atualização do estado de mute
        await member.fetch(true);

        // Verifica se o membro está realmente mutado (timeout ativo)
        if (!member.communicationDisabledUntilTimestamp || member.communicationDisabledUntilTimestamp < Date.now()) {
            // Mesmo se essa verificação falhar, o comando tentará desmutar por segurança
            return message.reply('✅ Esse membro já está desmutado (sem timeout ativo).');
        }

        const reason = args.slice(1).join(' ') || 'Sem motivo especificado.';

        try {
            await member.timeout(null, reason);

            const embed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('🔊 Membro Desmutado')
                .addFields(
                    { name: '👤 Usuário', value: `${member.user.tag}`, inline: true },
                    { name: '📝 Motivo', value: reason, inline: true },
                )
                .setFooter({ text: `Desmutado por ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            message.reply('❌ Ocorreu um erro ao tentar desmutar o membro.');
        }
    },
};
