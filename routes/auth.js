const express = require('express');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const { emitirToken } = require('../middleware/authMiddleware');

const router = express.Router();

function normalizarEmail(valor) {
  if (typeof valor !== 'string') return null;
  const email = valor.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

router.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body || {};
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 100) {
    return res.status(400).json({ mensaje: 'Indica un nombre de hasta 100 caracteres.' });
  }
  const correo = normalizarEmail(email);
  if (!correo) return res.status(400).json({ mensaje: 'Indica un correo válido.' });
  if (typeof password !== 'string' || Array.from(password).length < 8 || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ mensaje: 'La contraseña requiere al menos 8 caracteres y admite hasta 72 bytes.' });
  }

  const usuario = await Usuario.create({
    nombre: nombre.trim(), email: correo, password: await bcrypt.hash(password, 12),
  });
  res.status(201).json({ usuario: usuario.publico() });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const correo = normalizarEmail(email);
  const mensaje = 'El correo o la contraseña son incorrectos.';
  if (!correo || typeof password !== 'string' || Buffer.byteLength(password) > 72) {
    return res.status(401).json({ mensaje });
  }

  const usuario = await Usuario.findOne({ email: correo }).select('+password');
  if (!usuario || !(await bcrypt.compare(password, usuario.password))) {
    return res.status(401).json({ mensaje });
  }
  res.json({ token: emitirToken(usuario.id, 'acceso', '1h'), usuario: usuario.publico() });
});

router.post('/recover', async (req, res) => {
  const correo = normalizarEmail(req.body?.email);
  if (!correo) return res.status(400).json({ mensaje: 'Indica un correo válido.' });
  const usuario = await Usuario.findOne({ email: correo }).select('_id');
  if (!usuario) return res.status(404).json({ mensaje: 'No se encontró una cuenta con ese correo.' });

  res.json({
    mensaje: 'Recuperación simulada. El código es válido durante 10 minutos.',
    token: emitirToken(usuario.id, 'recuperacion', '10m'),
    expiraEnMinutos: 10,
  });
});

module.exports = router;
