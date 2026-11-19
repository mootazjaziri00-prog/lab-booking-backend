const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const [[u]] = await db.query(
      `SELECT COUNT(*) AS total,
              SUM(role = 'admin') AS admins,
              SUM(role = 'student') AS students
       FROM users`
    );
    const [[e]] = await db.query(
      `SELECT COUNT(*) AS total,
              SUM(available = 1) AS available,
              SUM(available = 0) AS busy
       FROM equipment`
    );
    const [byCategory] = await db.query(
      'SELECT category, COUNT(*) AS count FROM equipment GROUP BY category'
    );
    const [recentUsers] = await db.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5'
    );

    res.json({
      users: {
        total: Number(u.total),
        admins: Number(u.admins || 0),
        students: Number(u.students || 0),
      },
      equipment: {
        total: Number(e.total),
        available: Number(e.available || 0),
        busy: Number(e.busy || 0),
      },
      byCategory: byCategory.map((c) => ({ category: c.category, count: Number(c.count) })),
      recentUsers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;