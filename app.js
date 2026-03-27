const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const fs = require('fs');

const app = express();

// 1. KẾT NỐI DATABASE
const mongoURI = "mongodb+srv://admin:080212@cluster0.fwz1mo6.mongodb.net/tienganh8?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('✅ Kết nối MongoDB thành công'));

// 2. MODEL NGƯỜI DÙNG (Thêm timestamps để hiện thời gian đăng ký)
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' }
}, { timestamps: true })); 

// 3. MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 4. SESSION (Lưu trạng thái đăng nhập)
app.use(session({
    secret: 'secret_key_080212',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// 5. API HỆ THỐNG
app.get('/api/user-status', (req, res) => {
    res.json(req.session.userId ? { loggedIn: true, username: req.session.userId, role: req.session.role } : { loggedIn: false });
});

app.get('/api/questions', (req, res) => {
    const filePath = path.join(__dirname, 'data', 'units.json');
    if (fs.existsSync(filePath)) res.json(JSON.parse(fs.readFileSync(filePath, 'utf8')));
    else res.status(404).json({ error: "File not found" });
});

// 6. ĐIỀU HƯỚNG TRANG (ROUTES)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));
app.get('/study', (req, res) => req.session.userId ? res.sendFile(path.join(__dirname, 'views', 'study.html')) : res.redirect('/login'));

app.get('/admin', (req, res) => {
    if (req.session.role !== 'admin') return res.redirect('/');
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// 7. XỬ LÝ ĐĂNG KÝ & ĐĂNG NHẬP
// --- PHẦN THÊM MỚI: XỬ LÝ ĐĂNG KÝ ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Kiểm tra xem tên đăng nhập đã tồn tại chưa
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.json({ success: false, message: "Tên đăng nhập này đã có người dùng!" });
        }

        // Lưu người dùng mới vào database
        const newUser = new User({ username, password });
        await newUser.save();
        
        res.json({ success: true, message: "Đăng ký thành công!" });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Lỗi hệ thống khi đăng ký!" });
    }
});

// --- GIỮ NGUYÊN: XỬ LÝ ĐĂNG NHẬP ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (password === "080212") {
        req.session.userId = username || "Admin";
        req.session.role = 'admin';
        return res.json({ success: true, redirect: "/" });
    }
    const user = await User.findOne({ username, password });
    if (user) {
        req.session.userId = user.username;
        req.session.role = 'user';
        return res.json({ success: true, redirect: "/" });
    }
    res.json({ success: false, message: "Sai tài khoản hoặc mật khẩu!" });
});

// 8. API QUẢN TRỊ (Lấy danh sách có Mật khẩu + Thời gian)
app.get('/api/admin/users', async (req, res) => {
    if (req.session.role !== 'admin') return res.json({ success: false, message: "Không có quyền!" });
    try {
        const users = await User.find({}, 'username password role createdAt').sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (err) { res.json({ success: false }); }
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

module.exports = app;
