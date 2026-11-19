require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

// يمنع الـ cache في كل الـ API (حل مشكل 304)
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/equipment', require('./routes/equipmentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/reservations', require('./routes/reservationRoutes'));


app.get('/', (req, res) => {
  res.json({ message: 'API Lab Booking tekhdem ✅' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  try {
    await db.query('SELECT 1');
    console.log('MySQL connected ✅');
  } catch (err) {
    console.error('MySQL error ❌', err.message);
  }
  console.log(`Server running on http://localhost:${PORT}`);
});