const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const fs = require('fs');

const app = express();

// 1. CẤU HÌNH DATABASE (Dùng mật khẩu admin 080212 của bạn)
const mongoURI = "mongodb+srv://admin:080212@cluster0.fwz1mo6.mongodb.net/tienganh8?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
    .then(() => console.log('✅ Kết nối MongoDB thành công!'))
    .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// 2. ĐỊNH NGHĨA MODEL NGƯỜI DÙNG
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' }
}));

// 3. CẤU HÌNH MIDDLEWARE
app.use(express.json()); // Để đọc được dữ liệu JSON gửi lên
app.use(express.urlencoded({ extended: true })); // Để đọc dữ liệu từ Form
app.use(express.static(path.join(__dirname, 'public'))); // Thư mục chứa CSS, Ảnh

// 4. CẤU HÌNH SESSION (Giúp tài khoản không bị thoát ra khi load lại trang)
app.use(session({
    secret: 'secret_key_080212',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // Giữ đăng nhập trong 24 giờ
}));

// 5. CÁC API HỆ THỐNG
// API: Kiểm tra xem user đã đăng nhập chưa
app.get('/api/user-status', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, username: req.session.userId, role: req.session.role });
    } else {
        res.json({ loggedIn: false });
    }
});

// API: Đọc câu hỏi từ data/units.json
app.get('/api/questions', (req, res) => {
    try {
        const filePath = path.join(__dirname, 'data', 'units.json');
        if (fs.existsSync(filePath)) {
            const rawData = fs.readFileSync(filePath, 'utf8');
            const jsonData = JSON.parse(rawData);
            res.json(jsonData);
        } else {
            res.status(404).json({ error: "Không tìm thấy file data/units.json" });
        }
    } catch (error) {
        res.status(500).json({ error: "Lỗi đọc dữ liệu từ Server" });
    }
});

// 6. ĐIỀU HƯỚNG TRANG (ROUTES)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));
app.get('/study', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views', 'study.html'));
});

// 7. XỬ LÝ ĐĂNG NHẬP
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Kiểm tra quyền Admin bằng mật khẩu 080212
    if (password === "080212") {
        req.session.userId = username || "Admin";
        req.session.role = 'admin';
        return res.json({ success: true, redirect: "/" });
    }

    // Kiểm tra User bình thường trong Database
    try {
        const user = await User.findOne({ username, password });
        if (user) {
            req.session.userId = user.username;
            req.session.role = 'user';
            return res.json({ success: true, redirect: "/" });
        } else {
            res.json({ success: false, message: "Sai tài khoản hoặc mật khẩu!" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi hệ thống!" });
    }
});

// 8. ĐĂNG XUẤT
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = app;
