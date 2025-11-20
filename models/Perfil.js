const mongoose = require("mongoose");

const PerfilSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },

    bio: { type: String, default: "Olá! Eu ainda não personalizei meu perfil." },

    wallpaper: { type: String, default: null },

    pontos: { type: Number, default: 0 }, // Rank geral
    moedas: { type: Number, default: 0 },

    insignias: { type: [String], default: [] },

    inventario: [
    {
        nome: { type: String, required: true },
        quantidade: { type: Number, default: 0 }
    }
]

});

module.exports = mongoose.model("Perfil", PerfilSchema);
