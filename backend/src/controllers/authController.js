import { createToken } from '../auth.js';
import { userModel } from '../models/userModel.js';

export const authController = {
  async register(req, res) {
    try {
      const { nombre, name, email, password } = req.body;
      const finalName = nombre || name;

      if (!finalName || !email || !password) {
        return res.status(400).json({ message: 'Nombre, email y contraseña son obligatorios' });
      }

      if (String(password).length < 6) {
        return res.status(400).json({ message: 'La contraseña debe tener mínimo 6 caracteres' });
      }

      const user = await userModel.createClient({ nombre: finalName, email, password });
      res.status(201).json({ user, token: createToken(user) });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'El email ya está registrado' });
      console.error(error);
      res.status(500).json({ message: 'Error al registrar usuario' });
    }
  },

  async login(req, res) {
    const { email, password } = req.body;
    const user = await userModel.findByEmail(email);

    if (!user || !(await userModel.validatePassword(password, user.password_hash))) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    const publicUser = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
    res.json({ user: publicUser, token: createToken(publicUser) });
  },

  async me(req, res) {
    res.json({ user: req.user });
  }
};
