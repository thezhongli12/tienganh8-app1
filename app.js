const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // Thư viện lưu phiên đăng nhập
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. KẾT NỐI DATABASE (Dùng link MongoDB Atlas của bạn)
const MONGO_URI = "mongodb+srv://admin:hongphap2012@cluster0.fwz1mo6.mongodb.net/EnglishQuiz8?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Đã kết nối MongoDB Atlas thành công!"))
    .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));

// 2. SCHEMA NGƯỜI DÙNG
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    highScores: { type: Map, of: Number, default: {} }
});
const User = mongoose.model('User', userSchema);

// 3. CẤU HÌNH HỆ THỐNG
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// SỬA LỖI TẠI ĐÂY: Cách gọi MongoStore.create chuẩn cho bản mới nhất
app.use(session({
    secret: 'hongphap-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGO_URI,
        ttl: 14 * 24 * 60 * 60 // Lưu phiên trong 14 ngày
    }),
    cookie: { maxAge: 14 * 24 * 60 * 60 * 1000 }
}));

// 4. HỆ THỐNG ĐIỀU HƯỚNG (ROUTES)
app.get('/login', (req, res) => res.render('login'));

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    // Admin password bạn đã lưu: 080212
    if (username.toLowerCase() === 'admin' && password === '080212') {
        req.session.user = { username: 'admin', role: 'admin' };
        return res.redirect('/');
    }
    const user = await User.findOne({ username, password });
    if (user) {
        req.session.user = user;
        res.redirect('/');
    } else {
        res.send("<script>alert('Sai tài khoản hoặc mật khẩu!'); window.location='/login';</script>");
    }
});

app.get('/', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const unitsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'units.json'), 'utf8'));
    res.render('index', { units: unitsData, user: req.session.user });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.listen(PORT, () => console.log(`🚀 Server chạy tại: http://localhost:${PORT}`));