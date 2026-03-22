const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();
const mongoURI = "mongodb+srv://thezhongli12:080212@cluster0.fwz1mo6.mongodb.net/tienganh8";

// 1. Kết nối Database
mongoose.connect(mongoURI).then(() => console.log('✅ Server & DB Ready'));

const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true, minlength: 6 },
    password: { type: String, minlength: 8 }
}));

// 2. Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: '080212',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI })
}));

// Phục vụ file tĩnh (CSS/JS)
app.use(express.static(path.join(__dirname, 'public')));

// 3. ĐIỀU HƯỚNG TRANG (GET Routes) - Sửa lỗi Cannot GET
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/study', (req, res) => {
    // Chỉ cho phép vào học nếu đã đăng nhập
    if (!req.session.userId) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views', 'study.html'));
});

// 4. XỬ LÝ LOGIC (POST Routes) - Sửa lỗi Cannot POST
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    // Kiểm tra điều kiện ký tự
    if (username.length < 6 || password.length < 8) {
        return res.json({ success: false, message: "Tên ≥ 6, MK ≥ 8 ký tự!" });
    }
    try {
        const newUser = new User({ username, password });
        await newUser.save();
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: "Tên đăng nhập đã tồn tại!" });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    
    // Chấp nhận User trong DB hoặc mật khẩu Admin 080212
    if (user || password === "080212") {
        req.session.userId = username;
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "Thông tin sai hoặc không đủ quyền!" });
    }
});

module.exports = app;
