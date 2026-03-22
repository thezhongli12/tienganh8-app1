const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const fs = require('fs');

const app = express();
const mongoURI = "mongodb+srv://admin:080212@cluster0.fwz1mo6.mongodb.net/tienganh8?retryWrites=true&w=majority";

// 1. KẾT NỐI DATABASE
mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ Lỗi DB:', err.message));

const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true, minlength: 6 },
    password: { type: String, minlength: 8 }
}));

// 2. MIDDLEWARE & SESSION
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: '080212',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI, serverSelectionTimeoutMS: 5000 }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } 
}));

app.use(express.static(path.join(__dirname, 'public')));

// 3. API HỆ THỐNG
app.get('/api/user-status', (req, res) => {
    res.json(req.session.userId ? { loggedIn: true, username: req.session.userId, role: req.session.role } : { loggedIn: false });
});

// Đọc file unit.json
app.get('/api/questions', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Vui lòng đăng nhập" });
    const data = fs.readFileSync(path.join(__dirname, 'unit.json'), 'utf8');
    res.json(JSON.parse(data));
});

// Lấy danh sách user cho Admin
app.get('/api/admin/users', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json([]);
    const users = await User.find({}, 'username');
    res.json(users);
});

// 4. ĐIỀU HƯỚNG ROUTE
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));
app.get('/study', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views', 'study.html'));
});
app.get('/admin-dashboard', (req, res) => {
    if (req.session.role !== 'admin') return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// 5. LOGIC AUTH (Đăng ký/Đăng nhập)
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        await new User({ username, password }).save();
        res.json({ success: true });
    } catch (e) { res.json({ success: false, message: "Tên quá ngắn hoặc đã tồn tại!" }); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (password === "080212") {
        req.session.userId = username || "Admin";
        req.session.role = 'admin';
        return res.json({ success: true, redirect: "/admin-dashboard" });
    }
    const user = await User.findOne({ username });
    if (user && user.password === password) {
        req.session.userId = username;
        req.session.role = 'user';
        return res.json({ success: true, redirect: "/study" });
    }
    res.json({ success: false, message: "Sai tài khoản hoặc mật khẩu!" });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = app;
