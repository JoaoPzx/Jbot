const axios = require("axios");
const FormData = require("form-data");

module.exports.uploadImgBB = async function uploadImgBB(buffer) {
    try {
        if (!process.env.IMGBB_API_KEY) {
            throw new Error("Chave IMGBB_API_KEY não encontrada no .env");
        }

        const form = new FormData();
        form.append("key", process.env.IMGBB_API_KEY);
        form.append("image", buffer.toString("base64"));

        const response = await axios.post("https://api.imgbb.com/1/upload", form, {
            headers: form.getHeaders()
        });

        return response.data?.data?.url || null;

    } catch (err) {
        console.error("Erro ao enviar imagem para ImgBB:", err);
        return null;
    }
};
