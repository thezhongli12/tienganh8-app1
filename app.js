const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();

// Chuỗi kết nối sử dụng user 'admin' và mật khẩu '080212'
const mongoURI = "mongodb+srv://admin:080212@cluster0.fwz1mo6.mongodb.net/tienganh8?retryWrites=true&w=majority";

// 1. Kết nối Database
mongoose.connect(mongoURI)
    .then(() => console.log('✅ Kết nối MongoDB thành công với user admin'))
    .catch(err => console.error('❌ Lỗi xác thực: Hãy kiểm tra lại nút Update trên Atlas!', err.message));

const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true, minlength: 6 },
    password: { type: String, minlength: 8 }
}));

// 2. Middleware (Ngăn lỗi 500 khi Database đang đồng bộ)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: '080212',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: mongoURI,
        serverSelectionTimeoutMS: 5000 
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } 
}));

app.use(express.static(path.join(__dirname, 'public')));

// 3. ĐIỀU HƯỚNG
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));

app.get('/study', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views', 'study.html'));
});

// 4. LOGIC ĐĂNG KÝ (Tên >= 6, MK >= 8)
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || username.length < 6 || !password || password.length < 8) {
        return res.json({ success: false, message: "Tên đăng nhập ≥ 6, Mật khẩu ≥ 8 ký tự!" });
    }
    try {
        await new User({ username, password }).save();
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: "Tài khoản đã tồn tại!" });
    }
});

// 5. LOGIC ĐĂNG NHẬP (Phân biệt lỗi chi tiết)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    // QUYỀN ADMIN TUYỆT ĐỐI
    if (password === "080212") {
        req.session.userId = username || "Admin";
        return res.json({ success: true, message: "Chào Admin!" });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) return res.json({ success: false, message: "Tài khoản không tồn tại. Vui lòng đăng ký!" });
        if (user.password !== password) return res.json({ success: false, message: "Mật khẩu không chính xác!" });

        req.session.userId = username;
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: "Database đang đồng bộ, hãy đợi 1 phút!" });
    }
});

module.exports = app;
