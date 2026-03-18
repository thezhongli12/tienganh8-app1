const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const ejs = require('ejs');

const app = express();

// --- 1. KẾT NỐI DATABASE (MongoDB Atlas) ---
const mongoURI = process.env.MONGO_URI; 
mongoose.connect(mongoURI)
    .then(() => console.log('✅ Kết nối Database thành công!'))
    .catch(err => console.error('❌ Lỗi kết nối DB:', err));

// Định nghĩa cấu trúc người dùng (User Model)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// --- 2. CẤU HÌNH MIDDLEWARE & VIEW ENGINE ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
    secret: 'phap_anh_8_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // Session tồn tại 1 ngày
}));

app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// --- 3. CÁC ĐƯỜNG DẪN (ROUTES) ---

// TRANG CHỦ: Hiển thị danh sách bài học
app.get('/', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const lessons = [
        { id: 1, title: "Unit 1: Leisure Activities", desc: "Các hoạt động giải trí" },
        { id: 2, title: "Unit 2: Life in the Countryside", desc: "Cuộc sống vùng nông thôn" },
        { id: 3, title: "Unit 3: Teenagers", desc: "Tuổi thiếu niên" },
        { id: 4, title: "Unit 4: Ethnic Groups of Viet Nam", desc: "Các dân tộc Việt Nam" }
    ];

    res.render('index', { 
        user: req.session.user, 
        lessons: lessons 
    });
});

// ĐĂNG KÝ: Lưu vào DB và Tự động đăng nhập
app.get('/register', (req, res) => res.render('register'));

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const check = await User.findOne({ username });
        if (check) return res.send("<script>alert('Tài khoản đã tồn tại!'); window.location.href='/register';</script>");
        
        // Lưu user mới
        const newUser = await User.create({ username, password });
        
        // TỰ ĐỘNG ĐĂNG NHẬP (Cấp session ngay)
        req.session.user = { username: newUser.username, role: 'user' };
        
        // Vào thẳng trang chủ
        res.redirect('/');
    } catch (e) {
        res.status(500).send("Lỗi trong quá trình đăng ký.");
    }
});

// ĐĂNG NHẬP: Kiểm tra Admin hoặc User thường
app.get('/login', (req, res) => res.render('login'));

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Kiểm tra Admin (Mật khẩu: 080212)
    if (username === 'admin' && password === '080212') {
        req.session.user = { username: 'admin', role: 'admin' };
        return res.redirect('/admin');
    }

    // Kiểm tra User thường
    try {
        const foundUser = await User.findOne({ username, password });
        if (foundUser) {
            req.session.user = { username: foundUser.username, role: 'user' };
            return res.redirect('/');
        } else {
            res.send("<script>alert('Sai tài khoản hoặc mật khẩu!'); window.location.href='/login';</script>");
        }
    } catch (err) {
        res.status(500).send("Lỗi đăng nhập.");
    }
});

// TRANG ADMIN: Xem danh sách thành viên (Hiện mật khẩu & Thời gian)
app.get('/admin', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/login');
    }

    try {
        const allUsers = await User.find().sort({ createdAt: -1 });
        res.render('admin', { 
            user: req.session.user, 
            usersList: allUsers 
        });
    } catch (err) {
        res.status(500).send("Lỗi tải danh sách người dùng.");
    }
});

// ĐĂNG XUẤT
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// --- 4. CHẠY SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});
