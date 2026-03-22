const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();
// Chuỗi kết nối dùng user 'admin' và mật khẩu '080212' đã update trên Atlas
const mongoURI = "mongodb+srv://admin:080212@cluster0.fwz1mo6.mongodb.net/tienganh8?retryWrites=true&w=majority";

// 1. KẾT NỐI DATABASE (Chống sập server nếu sai pass)
mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ Lỗi kết nối DB:', err.message));

const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true, minlength: 6 },
    password: { type: String, minlength: 8 }
}));

// 2. MIDDLEWARE
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

app.get('/api/admin/users', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json([]);
    try {
        const users = await User.find({}, 'username');
        res.json(users);
    } catch (e) { res.status(500).send(e); }
});

// 4. ĐIỀU HƯỚNG TRANG
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

// 5. LOGIC ĐĂNG KÝ
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (username.length < 6 || password.length < 8) {
        return res.json({ success: false, message: "Tên ≥ 6, MK ≥ 8 ký tự!" });
    }
    try {
        await new User({ username, password }).save();
        res.json({ success: true });
    } catch (e) { res.json({ success: false, message: "Tài khoản đã tồn tại!" }); }
});

// 6. LOGIC ĐĂNG NHẬP
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    // Check Admin Pass
    if (password === "080212") {
        req.session.userId = username || "Admin";
        req.session.role = 'admin';
        return res.json({ success: true, redirect: "/admin-dashboard" });
    }
    try {
        const user = await User.findOne({ username });
        if (!user) return res.json({ success: false, message: "Tài khoản không tồn tại!" });
        if (user.password !== password) return res.json({ success: false, message: "Sai mật khẩu!" });
        
        req.session.userId = username;
        req.session.role = 'user';
        res.json({ success: true, redirect: "/study" });
    } catch (e) { res.json({ success: false, message: "Lỗi hệ thống!" }); }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = app;
