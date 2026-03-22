const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const fs = require('fs'); // THÊM MỚI: Để đọc file unit.json

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

// 2. MIDDLEWARE & SESSION (Giữ nguyên cấu trúc cũ)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: '080212', // Dùng pass admin làm secret luôn cho đồng bộ
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI, serverSelectionTimeoutMS: 5000 }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } 
}));

app.use(express.static(path.join(__dirname, 'public')));

// --- CÁC API THÊM MỚI ĐỂ ĐIỀU KHIỂN WEB ---

// API 1: Kiểm tra ai đang đăng nhập
app.get('/api/user-status', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, username: req.session.userId, role: req.session.role });
    } else {
        res.json({ loggedIn: false });
    }
});

// API 2: Đọc file unit.json gửi cho trang Study
app.get('/api/questions', (req, res) => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'unit.json'), 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: "Không tìm thấy file unit.json" });
    }
});

// API 3: Lấy danh sách user (Chỉ Admin mới xem được)
app.get('/api/admin/users', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).send("Từ chối");
    const users = await User.find({}, 'username');
    res.json(users);
});

// --- ĐIỀU HƯỚNG CÁC TRANG (Giữ nguyên + Thêm trang Admin) ---
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

// --- LOGIC ĐĂNG KÝ / ĐĂNG NHẬP (Sửa lại để phân loại Admin) ---

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (username.length < 6 || password.length < 8) {
        return res.json({ success: false, message: "Tên ≥ 6, MK ≥ 8 ký tự!" });
    }
    try {
        await new User({ username, password }).save();
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: "Tài khoản đã tồn tại!" });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    // KIỂM TRA QUYỀN ADMIN (Mật khẩu 080212)
    if (password === "080212") {
        req.session.userId = username || "Admin_Chinh";
        req.session.role = 'admin';
        return res.json({ success: true, redirect: "/admin-dashboard" });
    }

    // KIỂM TRA USER THƯỜNG
    try {
        const user = await User.findOne({ username });
        if (user && user.password === password) {
            req.session.userId = username;
            req.session.role = 'user';
            return res.json({ success: true, redirect: "/study" });
        }
        res.json({ success: false, message: "Sai tài khoản hoặc mật khẩu!" });
    } catch (err) {
        res.json({ success: false, message: "Lỗi kết nối Database!" });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = app;
