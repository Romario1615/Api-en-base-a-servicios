const express = require('express');
const mongoose = require('mongoose');
const Reserva = require('../models/Reserva');
const { autenticar } = require('../middleware/authMiddleware');

const router = express.Router();
const campos = ['sala', 'fecha', 'hora'];
const noEncontrada = { mensaje: 'No se encontró la reserva.' };

router.use(autenticar);

router.param('id', (req, res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) return res.status(404).json(noEncontrada);
  next();
});

function leerCampos(cuerpo, parcial = false) {
  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) return null;
  const datos = {};
  for (const campo of campos) {
    if (parcial && !Object.hasOwn(cuerpo, campo)) continue;
    if (typeof cuerpo[campo] !== 'string') return null;
    datos[campo] = cuerpo[campo];
  }
  return Object.keys(datos).length ? datos : null;
}

router.get('/', async (req, res) => {
  const reservas = await Reserva.find({ usuario: req.usuarioId }).sort({ fecha: 1, hora: 1, sala: 1 });
  res.json(reservas);
});

router.post('/', async (req, res) => {
  const datos = leerCampos(req.body);
  if (!datos) return res.status(400).json({ mensaje: 'Indica la sala, la fecha y la hora.' });
  const reserva = await Reserva.create({ ...datos, usuario: req.usuarioId });
  res.status(201).json(reserva);
});

router.put('/:id', async (req, res) => {
  const datos = leerCampos(req.body, true);
  if (!datos) return res.status(400).json({ mensaje: 'Indica la sala, la fecha o la hora que deseas cambiar.' });
  const reserva = await Reserva.findOneAndUpdate(
    { _id: req.params.id, usuario: req.usuarioId }, { $set: datos }, { returnDocument: 'after', runValidators: true },
  );
  if (!reserva) return res.status(404).json(noEncontrada);
  res.json(reserva);
});

router.delete('/:id', async (req, res) => {
  const reserva = await Reserva.findOneAndDelete({ _id: req.params.id, usuario: req.usuarioId });
  if (!reserva) return res.status(404).json(noEncontrada);
  res.json({ mensaje: 'Reserva eliminada.' });
});

module.exports = router;
