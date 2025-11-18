function normalize(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // remove acentos
}

module.exports = async function findUser(message, arg) {
    if (!arg) return null;

    // 1️⃣ Menção
    const mention = message.mentions.users.first();
    if (mention) return mention;

    // Normaliza entrada
    const search = normalize(arg);

    // 2️⃣ Tenta ID (cache primeiro, depois fetch)
    try {
        const byId = await message.client.users.fetch(arg).catch(() => null);
        if (byId) return byId;
    } catch {}

    // 3️⃣ Garante que temos todos os membros carregados
    await message.guild.members.fetch().catch(() => null);

    // 4️⃣ Busca tolerante por username ou nickname
    const member = message.guild.members.cache.find(m => {
        const username = normalize(m.user.username);
        const nickname = m.nickname ? normalize(m.nickname) : null;
        return username.includes(search) || (nickname && nickname.includes(search));
    });

    if (member) return member.user;

    return null;
};
