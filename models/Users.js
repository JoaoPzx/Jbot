const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },

    bio: { type: String, default: "Nenhuma biografia definida." },
    wallpaper: { type: String, default: null },

    inventario: { type: [String], default: [] },
    insignias: { type: [String], default: [] }
});

module.exports = mongoose.model("User", UserSchema);
