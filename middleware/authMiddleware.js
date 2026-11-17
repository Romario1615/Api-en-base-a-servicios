const jwt = require('jsonwebtoken');

const emisor = 'biblioteca';

function emitirToken(usuarioId, proposito, duracion) {
  return jwt.sign({}, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    issuer: emisor,
    audience: emisor + ':' + proposito,
    subject: String(usuarioId),
    expiresIn: duracion,
  });
}

function autenticar(req, res, next) {
  const credencial = /^Bearer\s+(\S+)$/i.exec(req.get('Authorization') || '');
  if (!credencial) return res.status(401).json({ mensaje: 'Inicia sesión para acceder a tus reservas.' });

  try {
    const token = jwt.verify(credencial[1], process.env.JWT_SECRET, {
      issuer: emisor,
      audience: emisor + ':acceso',
      algorithms: ['HS256'],
    });
    req.usuarioId = token.sub;
  } catch {
    return res.status(401).json({ mensaje: 'La sesión es inválida o ha caducado.' });
  }
  next();
}

module.exports = { autenticar, emitirToken };
