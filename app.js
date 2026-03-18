const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const ejs = require('ejs');

const app = express();

// --- 1. KẾT NỐI DATABASE ---
const mongoURI = process.env.MONGO_URI; 
mongoose.connect(mongoURI)
    .then(() => console.log('✅ DB Connected'))
    .catch(err => console.error('❌ DB Error:', err));

// Định nghĩa Schema người dùng
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// --- 2. CẤU HÌNH ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: 'phap_secret_key_2026',
    resave: false,
    saveUninitialized: true
}));

app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// --- 3. ROUTES ---

// Trang chủ
app.get('/', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('index', { user: req.session.user });
});

// Đăng ký
app.get('/register', (req, res) => res.render('register'));
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const check = await User.findOne({ username });
        if (check) return res.send("<script>alert('Tài khoản đã tồn tại!'); window.location.href='/register';</script>");
        
        await User.create({ username, password });
        res.send("<script>alert('Đăng ký thành công!'); window.location.href='/login';</script>");
    } catch (e) { res.status(500).send("Lỗi đăng ký"); }
});

// Đăng nhập
app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    // Admin mặc định (Pass: 080212)
    if (username === 'admin' && password === '080212') {
        req.session.user = { username: 'admin', role: 'admin' };
        return res.redirect('/admin');
    }
    // Người dùng thường
    const found = await User.findOne({ username, password });
    if (found) {
        req.session.user = { username: found.username, role: 'user' };
        return res.redirect('/');
    }
    res.send("<script>alert('Sai tài khoản hoặc mật khẩu!'); window.location.href='/login';</script>");
});

// TRANG ADMIN (Chỉ quản lý danh sách người dùng)
app.get('/admin', async (req, res) => {
    if (!req.session.user || req.session.user.username !== 'admin') return res.redirect('/login');
    const users = await User.find().sort({ createdAt: -1 });
    res.render('admin', { user: req.session.user, usersList: users });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
