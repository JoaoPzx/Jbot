const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'bicho',
    description: 'Sorteia 5 bichos uma vez por dia e envia para um canal fixo',

    async execute(message) {
        // 🧩 ID do canal fixo onde o bot sempre postará o resultado
        const canalID = '1437599327093657600'; // 🔁 substitua pelo ID do canal desejado
        const canalDestino = message.client.channels.cache.get(canalID);

        // Se o canal não for encontrado
        if (!canalDestino) {
            return message.channel.send('⚠️ Não consegui encontrar o canal configurado para enviar o sorteio.');
        }

        // 🧹 Apaga a mensagem do comando (se possível)
        if (message.deletable) {
            await message.delete().catch(() => {});
        }

        const bichos = [
            { nome: 'Aranha', emoji: '🕷️' },
            { nome: 'Boi', emoji: '🐂' },
            { nome: 'Boto', emoji: '🐬' },
            { nome: 'Cobra', emoji: '🐍' },
            { nome: 'Girafa', emoji: '🦒' },
            { nome: 'Hamster', emoji: '🐹' },
            { nome: 'Hipopótamo', emoji: '🦛' },
            { nome: 'Jacaré', emoji: '🐊' },
            { nome: 'Macaco', emoji: '🐒' },
            { nome: 'Morcego', emoji: '🦇' },
            { nome: 'Ouriço', emoji: '🦔' },
            { nome: 'Ovelha', emoji: '🐑' },
            { nome: 'Peixe-palhaço', emoji: '🐠' },
            { nome: 'Raposa', emoji: '🦊' },
            { nome: 'Tricerátopo', emoji: '🦖' },
            { nome: 'Urso-polar', emoji: '🐻‍❄️' },
            { nome: 'Urubu', emoji: '🦅' },
            { nome: 'Veado', emoji: '🦌' },
        ];

        const dataPath = path.join(__dirname, '../../data/sorteio.json');

        if (!fs.existsSync(path.dirname(dataPath))) {
            fs.mkdirSync(path.dirname(dataPath), { recursive: true });
        }

        let sorteioData = {};
        if (fs.existsSync(dataPath)) {
            try {
                sorteioData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            } catch {
                sorteioData = {};
            }
        }

        const hojeIso = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' });
        const hojeDisplay = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' });

        // 🕓 Já houve sorteio hoje?
        if (sorteioData.data === hojeIso) {
            const embed = new EmbedBuilder()
                .setColor('Yellow')
                .setTitle('📅 Sorteio de Hoje Já Realizado!')
                .setDescription(`O sorteio diário de **${hojeDisplay}** já foi feito!`)
                .addFields({ name: '🐾 Resultado', value: sorteioData.resultado })
                .setFooter({ text: 'Tente novamente amanhã!' })
                .setTimestamp();

            const avisoMsg = await canalDestino.send({ embeds: [embed] });
            setTimeout(() => avisoMsg.delete().catch(() => {}), 10000);
            return;
        }

        // 🎲 Novo sorteio
        const sorteados = bichos.sort(() => Math.random() - 0.5).slice(0, 5);
        const resultado = sorteados.map(b => `${b.emoji} **${b.nome}**`).join('\n');

        sorteioData = { data: hojeIso, resultado };
        fs.writeFileSync(dataPath, JSON.stringify(sorteioData, null, 2), 'utf8');

        const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('🎉 Sorteio Diário dos Bichos!')
            .setDescription(`Os 5 bichos escolhidos de **${hojeDisplay}** para apostar foram:\n\n${resultado}`)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/616/616408.png')
            .setFooter({
                text: `Comando solicitado por ${message.author.username}`,
                iconURL: message.author.displayAvatarURL(),
            })
            .setTimestamp();

        // 📤 Envia o embed diretamente no canal fixo
        await canalDestino.send({ embeds: [embed] });
    },
};
