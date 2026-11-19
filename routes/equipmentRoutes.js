const express = require('express');
const router = express.Router();
const db = require('../config/db');

const SORT_FIELDS = ['name', 'category', 'brand', 'created_at', 'id'];

router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      category = '',
      brand = '',
      location = '',
      available,
      sort = 'id',
      order = 'asc',
      page = 1,
      limit = 6,
    } = req.query;

    const where = [];
    const params = [];

    if (search.trim()) {
      where.push('(name LIKE ? OR description LIKE ? OR brand LIKE ? OR location LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    const addIn = (field, value) => {
      const list = String(value).split(',').map((v) => v.trim()).filter(Boolean);
      if (list.length) {
        where.push(`${field} IN (${list.map(() => '?').join(',')})`);
        params.push(...list);
      }
    };
    addIn('category', category);
    addIn('brand', brand);
    addIn('location', location);

    if (available === '1' || available === '0') {
      where.push('available = ?');
      params.push(Number(available));
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sortField = SORT_FIELDS.includes(sort) ? sort : 'id';
    const sortOrder = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 6));
    const offset = (pageNum - 1) * limitNum;

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM equipment ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await db.query(
      `SELECT * FROM equipment ${whereSql}
       ORDER BY ${sortField} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    res.json({
      data: rows,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/filters', async (req, res) => {
  try {
    const [categories] = await db.query(
      'SELECT category AS value, COUNT(*) AS count FROM equipment GROUP BY category'
    );
    const [brands] = await db.query(
      'SELECT brand AS value, COUNT(*) AS count FROM equipment WHERE brand IS NOT NULL GROUP BY brand'
    );
    const [locations] = await db.query(
      'SELECT location AS value, COUNT(*) AS count FROM equipment WHERE location IS NOT NULL GROUP BY location'
    );
    res.json({ categories, brands, locations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;