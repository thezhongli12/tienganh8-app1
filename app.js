const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const fs = require('fs');

const app = express();
// Mật khẩu admin: 080212 đã cập nhật theo yêu cầu
const mongoURI = "mongodb+srv://admin:080212@cluster0.fwz1mo6.mongodb.net/tienganh8?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ Lỗi kết nối DB:', err.message));

const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true, minlength: 6 },
    password: { type: String, minlength: 8 }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: '080212',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } 
}));

app.use(express.static(path.join(__dirname, 'public')));

// API TRẠNG THÁI USER
app.get('/api/user-status', (req, res) => {
    res.json(req.session.userId ? { loggedIn: true, username: req.session.userId, role: req.session.role } : { loggedIn: false });
});

// API LẤY CÂU HỎI TỪ JSON
app.get('/api/questions', (req, res) => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'unit.json'), 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: "Lỗi đọc file unit.json" });
    }
});

// ĐIỀU HƯỚNG TRANG
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));
app.get('/study', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views', 'study.html'));
});

// LOGIC ĐĂNG NHẬP (Phân loại Admin/User)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (password === "080212") {
        req.session.userId = username || "Admin";
        req.session.role = 'admin';
        return res.json({ success: true, redirect: "/" });
    }
    const user = await User.findOne({ username });
    if (user && user.password === password) {
        req.session.userId = username;
        req.session.role = 'user';
        return res.json({ success: true, redirect: "/" });
    }
    res.json({ success: false, message: "Sai tài khoản hoặc mật khẩu!" });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = app;
