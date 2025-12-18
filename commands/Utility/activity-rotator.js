// Utility/activityRotator.js
const { ActivityType } = require("discord.js");

// Lista de atividades que o bot ficará alternando
const activities = [
    { name: "Comandos do JFlux ⭐", type: ActivityType.Playing },
    { name: "Organizando o banco de dados das imagens 🖼", type: ActivityType.Watching },
    { name: "Blackjack no cassino JFlux ♠️", type: ActivityType.Playing },
    { name: "Tudo, sempre 👀", type: ActivityType.Watching },
    { name: "Analisando estatísticas 📊", type: ActivityType.Watching },
    { name: "João 🤍 Mikaa", type: ActivityType.Watching },
    { name: "Limpando caches 🧹", type: ActivityType.Watching },
    { name: "O dealer dando 21 ♣️", type: ActivityType.Listening },
    { name: "As imagens enviadas no servidor 📸", type: ActivityType.Watching },
    { name: "Processando wallpapers no Cloudinary 📸", type: ActivityType.Playing },
    { name: "Como não perder no lvl 1 🕹", type: ActivityType.Watching }
];

// Tempo de troca (em milissegundos)
const INTERVAL_MS = 15_000; // 15s → pode trocar

module.exports = function activityRotator(client) {
    let index = 0;

    // Definir atividade inicial
    client.user.setActivity(activities[0]);

    // Alternância automática
    setInterval(() => {
        index = (index + 1) % activities.length;
        client.user.setActivity(activities[index]);
    }, INTERVAL_MS);
};
