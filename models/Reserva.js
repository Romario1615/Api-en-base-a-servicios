const mongoose = require('mongoose');

function fechaValida(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha.startsWith('0000')) return false;
  const dia = new Date(fecha + 'T00:00:00.000Z');
  return Number.isFinite(dia.getTime()) && dia.toISOString().slice(0, 10) === fecha;
}

const reservaSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
  sala: {
    type: String,
    required: [true, 'Indica la sala.'],
    maxlength: [100, 'La sala admite hasta 100 caracteres.'],
    set: valor => valor.normalize('NFC').trim().replace(/\s+/gu, ' '),
  },
  fecha: {
    type: String,
    required: [true, 'Indica la fecha.'],
    validate: [fechaValida, 'Indica una fecha válida en formato AAAA-MM-DD.'],
  },
  hora: {
    type: String,
    required: [true, 'Indica la hora.'],
    match: [/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Indica una hora válida en formato HH:mm.'],
  },
}, {
  versionKey: false,
  toJSON: {
    transform: (_doc, { _id, sala, fecha, hora }) => ({ _id, sala, fecha, hora }),
  },
});

// La misma sala no admite dos reservas para el mismo turno, aun entre usuarios.
reservaSchema.index({ sala: 1, fecha: 1, hora: 1 }, {
  unique: true, collation: { locale: 'es', strength: 2 }, name: 'turno_unico_por_sala',
});

module.exports = mongoose.model('Reserva', reservaSchema);
