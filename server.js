require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/equipment', require('./routes/equipmentRoutes'));
app.use('/api/reservations', require('./routes/reservationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.get('/', (req, res) => {
  res.json({ message: 'API Lab Booking tekhdem ✅' });
});

app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ message: err.message || 'Erreur' });
  next();
});

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync(); // يكوّن الـ tables إذا ما كانتش موجودة
    console.log('MySQL connected ✅ (Sequelize)');
  } catch (err) {
    console.error('MySQL error ❌', err.message);
  }
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
})();