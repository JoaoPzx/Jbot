const sharp = require("sharp");
const axios = require("axios");

/**
 * Redimensiona qualquer imagem para 1920x640 mantendo boa qualidade.
 * @param {string} url
 * @returns buffer da nova imagem convertida
 */
async function redimensionarBanner(url) {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);

    // Redimensiona para 1920x640 (proporção 3:1)
    return sharp(buffer)
        .resize(1920, 640, { fit: "cover" })
        .jpeg({ quality: 90 })
        .toBuffer();
}

module.exports = { redimensionarBanner };
