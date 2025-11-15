const mongoose = require("mongoose");

const imagemSchema = new mongoose.Schema({
    resposta: { type: String, required: true },
    url: { type: String, required: true }
});

const temaSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    nomeLower: { type: String, required: true, unique: true },
    criadoPor: { type: String, required: true },
    dataCriacao: { type: Date, default: Date.now },

    banner: { type: String, default: null },

    // ⭐ NECESSÁRIO PARA INSÍGNIA VIA EMOJI
    insigniaEmoji: { type: String, default: null },
    insigniaEmojiId: { type: String, default: null },

    imagens: { type: [imagemSchema], default: [] },
    partidasJogadas: { type: Number, default: 0 }
});

module.exports = mongoose.model("Tema", temaSchema);
