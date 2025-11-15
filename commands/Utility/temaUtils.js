function nomeComInsignia(tema) {
    if (!tema.insignia) return tema.nome; // sem insígnia, retorna nome normal

    // imagem inline simulando emoji
    const emojiImg = `[‎](${tema.insignia})`; 

    return `${emojiImg} ${tema.nome}`;
}

module.exports = { nomeComInsignia };
