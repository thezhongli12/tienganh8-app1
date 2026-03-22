const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const fs = require('fs');

const app = express();

// 1. KẾT NỐI DATABASE
const mongoURI = "mongodb+srv://admin:080212@cluster0.fwz1mo6.mongodb.net/tienganh8?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('✅ Kết nối DB thành công'));

// 2. MODEL (Đã thêm timestamps để hiện thời gian)
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' }
}, { timestamps: true }));

// 3. MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 4. CẤU HÌNH SESSION
app.use(session({
    secret: 'secret_key_080212',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// 5. API HỆ THỐNG
app.get('/api/user-status', (req, res) => {
    res.json(req.session.userId ? { loggedIn: true, username: req.session.userId, role: req.session.role } : { loggedIn: false });
});

// 6. ĐIỀU HƯỚNG TRANG
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/admin', (req, res) => {
    if (req.session.role !== 'admin') return res.redirect('/');
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// 7. LOGIN (Đã sửa để gán đúng quyền Admin)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (password === "080212") {
        req.session.userId = username || "Admin";
        req.session.role = 'admin';
        return res.json({ success: true, redirect: "/" });
    }
    const user = await User.findOne({ username, password });
    if (user) {
        req.session.userId = user.username;
        req.session.role = 'user';
        return res.json({ success: true, redirect: "/" });
    }
    res.json({ success: false, message: "Sai tài khoản!" });
});

// 8. API QUẢN TRỊ (Phần quan trọng nhất bị thiếu)
app.get('/api/admin/users', async (req, res) => {
    try {
        if (req.session.role !== 'admin') {
            return res.json({ success: false, message: "Bạn không có quyền!" });
        }
        // Lấy pass và thời gian tạo
        const users = await User.find({}, 'username password role createdAt').sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (err) {
        res.json({ success: false });
    }
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

module.exports = app;
