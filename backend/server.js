require('dotenv').config();

if (!process.env.DB_PASSWORD || !process.env.DB_HOST) {
    console.error('Ошибка: не найден .env. Скопируйте backend/.env.example в backend/.env и заполните данные БД.');
    process.exit(1);
}

const express = require('express');
const cors = require('cors');
const { send500 } = require('./lib/httpError');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes.router);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
    res.json({ ok: true, message: 'Zoobastiks API' });
});

app.use((err, req, res, next) => {
    send500(res, err, 'Unhandled error');
});

app.listen(PORT, () => {
    console.log(`Zoobastiks API: port ${PORT}, DB: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`);
});

