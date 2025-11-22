const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    quantidade: { type: Number, default: 1 }
});

const PerfilSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },

    bio: { type: String, default: "Olá! Eu ainda não personalizei meu perfil." },
    wallpaper: { type: String, default: null },

    pontos: { type: Number, default: 0 },
    moedas: { type: Number, default: 0 },
    lastDaily: { type: Date, default: null },


    comboBonus: { type: Number, default: 1 },
    comboItems: { type: Number, default: 0 }, // quantidade de itens combo no inventário


    insignias: { type: [String], default: [] },

    inventario: {
        type: [ItemSchema],
        default: []
    }
});

module.exports = mongoose.model("Perfil", PerfilSchema);