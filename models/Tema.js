const mongoose = require("mongoose");

const TemaSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    nomeLower: { type: String, required: true },
    nomeOriginal: { type: String, default: null },

    criadoPor: { type: String, default: null },
    dataCriacao: { type: Date, default: Date.now },

    banner: { type: String, default: null },

    imagens: [
        {
            resposta: { type: String, required: true },
            url: { type: String, required: true },
            addedBy: { type: String, default: null },
            addedAt: { type: Date, default: null }
        }
    ],

    insignia: { type: String, default: null },
    insigniaEmoji: { type: String, default: null },
    insigniaEmojiId: { type: String, default: null },

    partidasJogadas: { type: Number, default: 0 }
});

module.exports = mongoose.model("Tema", TemaSchema);
