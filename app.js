const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();

// CHUỖI KẾT NỐI CHUẨN (Đã thêm tên DB 'tienganh8' và timeout)
const mongoURI = "mongodb+srv://admin:080212@cluster0.fwz1mo6.mongodb.net/tienganh8?retryWrites=true&w=majority&serverSelectionTimeoutMS=5000";

// 1. Kết nối Database
mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ Lỗi xác thực Database:', err.message));

const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true, minlength: 6 },
    password: { type: String, minlength: 8 }
}));

// 2. Middleware (Sửa MongoStore để không gây lỗi 500)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: '080212',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: mongoURI,
        connectTimeoutMS: 5000 // Sau 5 giây nếu DB ko phản hồi thì bỏ qua để web chạy tiếp
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

// 4. ĐĂNG KÝ
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || username.length < 6 || !password || password.length < 8) {
        return res.json({ success: false, message: "Tên ≥ 6, MK ≥ 8 ký tự!" });
    }
    try {
        await new User({ username, password }).save();
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: "Lỗi: Tài khoản đã tồn tại hoặc DB chưa kết nối!" });
    }
});

// 5. ĐĂNG NHẬP (Phân biệt lỗi chi tiết)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    // QUYỀN ADMIN TUYỆT ĐỐI (Dùng pass 080212 thì không cần check DB)
    if (password === "080212") {
        req.session.userId = username || "Admin";
        return res.json({ success: true, message: "Chào Admin!" });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) return res.json({ success: false, message: "Tài khoản không tồn tại!" });
        if (user.password !== password) return res.json({ success: false, message: "Mật khẩu không chính xác!" });

        req.session.userId = username;
        res.json({ success: true });
    } catch (error) {
        // Nếu DB lỗi auth, Admin vẫn đăng nhập được ở trên, còn User thường báo lỗi này
        res.json({ success: false, message: "Hệ thống đang bảo trì Database, vui lòng thử lại sau!" });
    }
});

module.exports = app;
