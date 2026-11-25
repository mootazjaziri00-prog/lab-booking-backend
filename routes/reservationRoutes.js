const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Reservation, Equipment, User } = require('../models');
const { protect, authorize } = require('../middleware/authMiddleware');

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
    const eq = await Equipment.findByPk(equipment_id);
    if (!eq) return res.status(404).json({ message: 'Équipement introuvable' });

    // منع الحجز المزدوج
    const conflict = await Reservation.findOne({
      where: {
        equipment_id,
        status: 'active',
        start_date: { [Op.lte]: end_date },
        end_date: { [Op.gte]: start_date },
      },
    });
    if (conflict) {
      return res.status(409).json({ message: 'Cet équipement est déjà réservé sur ces dates' });
    }

    const r = await Reservation.create({
      user_id: req.user.id, equipment_id, start_date, end_date,
    });
    res.status(201).json({ message: 'Réservation confirmée ✅', id: r.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/mine', protect, async (req, res) => {
  try {
    const rows = await Reservation.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Equipment, attributes: ['name', 'category', 'brand'] }],
      order: [['start_date', 'DESC']],
    });
    res.json(rows.map((r) => ({
      id: r.id,
      equipment_id: r.equipment_id,
      start_date: r.start_date,
      end_date: r.end_date,
      status: r.status,
      equipment_name: r.Equipment?.name,
      category: r.Equipment?.category,
      brand: r.Equipment?.brand,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/equipment/:id', protect, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await Reservation.findAll({
      attributes: ['id', 'start_date', 'end_date'],
      where: {
        equipment_id: req.params.id,
        status: 'active',
        end_date: { [Op.gte]: today },
      },
      order: [['start_date', 'ASC']],
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const rows = await Reservation.findAll({
      include: [
        { model: User, attributes: ['name'] },
        { model: Equipment, attributes: ['name'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(rows.map((r) => ({
      id: r.id,
      start_date: r.start_date,
      end_date: r.end_date,
      status: r.status,
      user_name: r.User?.name,
      equipment_name: r.Equipment?.name,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const r = await Reservation.findByPk(req.params.id);
    if (!r) return res.status(404).json({ message: 'Réservation introuvable' });
    if (r.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    await r.update({ status: 'cancelled' });
    res.json({ message: 'Réservation annulée ✅' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;