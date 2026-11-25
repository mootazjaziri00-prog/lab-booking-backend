const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { protect, authorize } = require('../middleware/authMiddleware');

const FIELDS = ['id', 'name', 'email', 'role', 'created_at'];

router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: FIELDS });
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/me', protect, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Nom obligatoire' });
    await User.update({ name }, { where: { id: req.user.id } });
    res.json({ message: 'Profil mis à jour ✅' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    res.json(await User.findAll({ attributes: FIELDS }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/:id/role', protect, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['student', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }
    const [count] = await User.update({ role }, { where: { id: req.params.id } });
    if (count === 0) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json({ message: 'Rôle mis à jour ✅' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
    }
    const count = await User.destroy({ where: { id: req.params.id } });
    if (count === 0) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json({ message: 'Utilisateur supprimé ✅' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;