const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/authMiddleware');

// POST /api/reservations : حجز جديد
router.post('/', protect, async (req, res) => {
  try {
    const { equipment_id, start_date, end_date } = req.body;

    if (!equipment_id || !start_date || !end_date) {
      return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
    }

    const today = new Date().toISOString().slice(0, 10);
    if (start_date < today) {
      return res.status(400).json({ message: 'La date de début est dans le passé' });
    }
    if (end_date < start_date) {
      return res.status(400).json({ message: 'La date de fin doit être après le début' });
    }

    const [eq] = await db.query('SELECT id FROM equipment WHERE id = ?', [equipment_id]);
    if (eq.length === 0) {
      return res.status(404).json({ message: 'Équipement introuvable' });
    }

    // منع الحجز المزدوج: تداخل التواريخ
    const [conflicts] = await db.query(
      `SELECT id FROM reservations
       WHERE equipment_id = ? AND status = 'active'
         AND start_date <= ? AND end_date >= ?`,
      [equipment_id, end_date, start_date]
    );
    if (conflicts.length > 0) {
      return res.status(409).json({ message: 'Cet équipement est déjà réservé sur ces dates' });
    }

    const [result] = await db.query(
      'INSERT INTO reservations (user_id, equipment_id, start_date, end_date) VALUES (?, ?, ?, ?)',
      [req.user.id, equipment_id, start_date, end_date]
    );

    res.status(201).json({ message: 'Réservation confirmée ✅', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/reservations/mine : حجوزاتي
router.get('/mine', protect, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.id, r.equipment_id, r.start_date, r.end_date, r.status,
              e.name AS equipment_name, e.category, e.brand
       FROM reservations r
       JOIN equipment e ON e.id = r.equipment_id
       WHERE r.user_id = ?
       ORDER BY r.start_date DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/reservations/equipment/:id : الأيام المحجوزة لمعدة (للـ Calendar)
router.get('/equipment/:id', protect, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, start_date, end_date FROM reservations
       WHERE equipment_id = ? AND status = 'active' AND end_date >= CURDATE()
       ORDER BY start_date`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/reservations : الكل (admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.id, r.start_date, r.end_date, r.status,
              u.name AS user_name, e.name AS equipment_name
       FROM reservations r
       JOIN users u ON u.id = r.user_id
       JOIN equipment e ON e.id = r.equipment_id
       ORDER BY r.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT /api/reservations/:id/cancel : إلغاء (صاحب الحجز ولا admin)
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id FROM reservations WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Réservation introuvable' });

    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    await db.query("UPDATE reservations SET status = 'cancelled' WHERE id = ?", [req.params.id]);
    res.json({ message: 'Réservation annulée ✅' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;