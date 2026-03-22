const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();
const mongoURI = "mongodb+srv://thezhongli12:080212@cluster0.fwz1mo6.mongodb.net/tienganh8";

// 1. Kết nối Database
mongoose.connect(mongoURI).then(() => console.log('✅ Hệ thống đã sẵn sàng'));

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
    store: MongoStore.create({ mongoUrl: mongoURI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // Lưu đăng nhập trong 1 ngày
}));

app.use(express.static(path.join(__dirname, 'public')));

// 3. ĐIỀU HƯỚNG TRANG (GET Routes)
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
    // CHẶN NGƯỜI DÙNG: Phải đăng nhập mới được vào học
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'views', 'study.html'));
});

// 4. LOGIC ĐĂNG KÝ (POST /api/register)
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    // Kiểm tra độ dài ngay tại server để đảm bảo an toàn
    if (!username || username.length < 6) {
        return res.json({ success: false, message: "Tên đăng nhập phải có ít nhất 6 ký tự!" });
    }
    if (!password || password.length < 8) {
        return res.json({ success: false, message: "Mật khẩu phải có ít nhất 8 ký tự!" });
    }

    try {
        const newUser = new User({ username, password });
        await newUser.save();
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: "Tên đăng nhập này đã có người sử dụng!" });
    }
});

// 5. LOGIC ĐĂNG NHẬP (POST /api/login) - PHÂN BIỆT LỖI CHI TIẾT
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    // Ưu tiên cho Admin (Sử dụng mật khẩu bí mật của bạn)
    if (password === "080212") {
        req.session.userId = username;
        return res.json({ success: true, message: "Chào Admin!" });
    }

    try {
        // Bước 1: Tìm xem tài khoản có tồn tại không
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.json({ success: false, message: "Tài khoản không tồn tại. Vui lòng đăng ký!" });
        }

        // Bước 2: Nếu tồn tại, kiểm tra mật khẩu
        if (user.password !== password) {
            return res.json({ success: false, message: "Mật khẩu không chính xác. Thử lại nhé!" });
        }

        // Đăng nhập thành công
        req.session.userId = username;
        res.json({ success: true });

    } catch (error) {
        res.json({ success: false, message: "Lỗi hệ thống, vui lòng thử lại sau!" });
    }
});

module.exports = app;
