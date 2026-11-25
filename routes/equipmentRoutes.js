const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { Op, fn, col } = require('sequelize');
const { Equipment } = require('../models');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/authMiddleware');

const SORT_FIELDS = ['name', 'category', 'brand', 'created_at', 'id'];

const removeImage = (name) => {
  if (!name) return;
  fs.unlink(path.join(__dirname, '..', 'uploads', name), () => {});
};

const toList = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean);

router.get('/', async (req, res) => {
  try {
    const { search = '', category, brand, location, available,
      sort = 'id', order = 'asc', page = 1, limit = 6 } = req.query;

    const where = {};

    if (search.trim()) {
      const s = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: s } },
        { description: { [Op.like]: s } },
        { brand: { [Op.like]: s } },
        { location: { [Op.like]: s } },
      ];
    }
    if (toList(category).length) where.category = { [Op.in]: toList(category) };
    if (toList(brand).length) where.brand = { [Op.in]: toList(brand) };
    if (toList(location).length) where.location = { [Op.in]: toList(location) };
    if (available === '1' || available === '0') where.available = available === '1';

    const sortField = SORT_FIELDS.includes(sort) ? sort : 'id';
    const sortOrder = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 6));

    const { rows, count } = await Equipment.findAndCountAll({
      where,
      order: [[sortField, sortOrder]],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    });

    res.json({
      data: rows,
      page: pageNum,
      limit: limitNum,
      total: count,
      totalPages: Math.ceil(count / limitNum),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/filters', async (req, res) => {
  try {
    const group = async (field) => {
      const rows = await Equipment.findAll({
        attributes: [[col(field), 'value'], [fn('COUNT', col('id')), 'count']],
        where: { [field]: { [Op.ne]: null } },
        group: [field],
        raw: true,
      });
      return rows.map((r) => ({ value: r.value, count: Number(r.count) }));
    };
    res.json({
      categories: await group('category'),
      brands: await group('brand'),
      locations: await group('location'),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const e = await Equipment.findByPk(req.params.id);
    if (!e) return res.status(404).json({ message: 'Équipement introuvable' });
    res.json(e);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/', protect, authorize('admin'), upload.single('image'), async (req, res) => {
  try {
    const { name, description = '', category, brand = '', location = '', available = 1 } = req.body;
    if (!name || !category) {
      if (req.file) removeImage(req.file.filename);
      return res.status(400).json({ message: 'Nom et catégorie obligatoires' });
    }
    const e = await Equipment.create({
      name, description, category, brand, location,
      image: req.file ? req.file.filename : null,
      available: Number(available) ? true : false,
    });
    res.status(201).json({ message: 'Équipement ajouté ✅', id: e.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/:id', protect, authorize('admin'), upload.single('image'), async (req, res) => {
  try {
    const e = await Equipment.findByPk(req.params.id);
    if (!e) {
      if (req.file) removeImage(req.file.filename);
      return res.status(404).json({ message: 'Équipement introuvable' });
    }
    const b = req.body;
    const oldImage = e.image;

    await e.update({
      name: b.name ?? e.name,
      description: b.description ?? e.description,
      category: b.category ?? e.category,
      brand: b.brand ?? e.brand,
      location: b.location ?? e.location,
      image: req.file ? req.file.filename : e.image,
      available: b.available !== undefined ? !!Number(b.available) : e.available,
    });
    if (req.file) removeImage(oldImage);
    res.json({ message: 'Équipement mis à jour ✅' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const e = await Equipment.findByPk(req.params.id);
    if (!e) return res.status(404).json({ message: 'Équipement introuvable' });
    const image = e.image;
    await e.destroy();
    removeImage(image);
    res.json({ message: 'Équipement supprimé ✅' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;