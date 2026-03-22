const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const fs = require('fs');

const app = express();

// 1. CẤU HÌNH DATABASE
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
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 
app.use(express.static(path.join(__dirname, 'public'))); 

// 4. CẤU HÌNH SESSION
app.use(session({
    secret: 'secret_key_080212',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } 
}));

// 5. CÁC API HỆ THỐNG
// API: Kiểm tra trạng thái (Đã sửa để gửi role Admin/User)
app.get('/api/user-status', (req, res) => {
    if (req.session.userId) {
        res.json({ 
            loggedIn: true, 
            username: req.session.userId, 
            role: req.session.role // Trả về role để giao diện hiện nút Admin
        });
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
            res.json(JSON.parse(rawData));
        } else {
            res.status(404).json({ error: "Không tìm thấy file" });
        }
    } catch (error) {
        res.status(500).json({ error: "Lỗi Server" });
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

// TRANG QUẢN LÝ (Admin mới vào được)
app.get('/admin', (req, res) => {
    if (req.session.role !== 'admin') return res.redirect('/');
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// 7. XỬ LÝ ĐĂNG KÝ & ĐĂNG NHẬP
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const userExists = await User.findOne({ username });
        if (userExists) return res.json({ success: false, message: "Tên đăng nhập đã tồn tại!" });

        const newUser = new User({ username, password, role: 'user' });
        await newUser.save();
        res.json({ success: true, message: "Đăng ký thành công!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi hệ thống!" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Kiểm tra Admin (Mật khẩu cố định 080212)
        if (password === "080212") {
            req.session.userId = username || "Admin";
            req.session.role = 'admin'; // Gán quyền Admin
            return res.json({ success: true, message: "Chào Admin!", redirect: "/" });
        }

        const user = await User.findOne({ username, password });
        if (user) {
            req.session.userId = user.username;
            req.session.role = 'user'; // Gán quyền User thường
            return res.json({ success: true, message: "Thành công!", redirect: "/" });
        } else {
            return res.json({ success: false, message: "Sai tài khoản hoặc mật khẩu!" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi Server!" });
    }
});

// 8. ĐĂNG XUẤT
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = app;
