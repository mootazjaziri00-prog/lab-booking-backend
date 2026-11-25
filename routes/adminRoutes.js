const express = require('express');
const router = express.Router();
const { fn, col } = require('sequelize');
const { User, Equipment } = require('../models');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const [total, admins, students, eqTotal, available] = await Promise.all([
      User.count(),
      User.count({ where: { role: 'admin' } }),
      User.count({ where: { role: 'student' } }),
      Equipment.count(),
      Equipment.count({ where: { available: true } }),
    ]);

    const byCategory = (await Equipment.findAll({
      attributes: ['category', [fn('COUNT', col('id')), 'count']],
      group: ['category'],
      raw: true,
    })).map((c) => ({ category: c.category, count: Number(c.count) }));

    const recentUsers = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 5,
    });

    res.json({
      users: { total, admins, students },
      equipment: { total: eqTotal, available, busy: eqTotal - available },
      byCategory,
      recentUsers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;