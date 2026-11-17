const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
  password: { type: String, required: true, select: false },
}, { versionKey: false });

usuarioSchema.methods.publico = function () {
  return { id: this.id, nombre: this.nombre, email: this.email };
};

module.exports = mongoose.model('Usuario', usuarioSchema);
