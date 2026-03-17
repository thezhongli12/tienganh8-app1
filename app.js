const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');

const app = express();

// CẤU HÌNH GIAO DIỆN - Sửa lỗi "Failed to lookup view"
app.set('views', path.join(process.cwd(), 'views'));
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

app.use(express.static(path.join(process.cwd(), 'public')));
app.use(express.urlencoded({ extended: true }));

// Kết nối MongoDB từ biến môi trường (Environment Variables)
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log("Kết nối DB thành công"))
    .catch(err => console.error("Lỗi kết nối DB:", err));

app.use(session({
    secret: 'hongphap-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI }),
    cookie: { maxAge: 14 * 24 * 60 * 60 * 1000 }
}));

// ROUTES
app.get('/login', (req, res) => {
    res.render('login'); // Sẽ tìm file views/login.html
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Kiểm tra password admin bạn đã lưu là 080212
    if (username === 'admin' && password === '080212') {
        req.session.user = username;
        return res.redirect('/');
    }
    res.send('Sai tài khoản hoặc mật khẩu!');
});

app.get('/', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('index'); // Sẽ tìm file views/index.html
});

module.exports = app;