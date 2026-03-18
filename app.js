const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const ejs = require('ejs');

const app = express();

// --- 1. KẾT NỐI DATABASE ---
const mongoURI = process.env.MONGO_URI; 
mongoose.connect(mongoURI)
    .then(() => console.log('✅ Kết nối MongoDB thành công!'))
    .catch(err => console.error('❌ Lỗi kết nối DB:', err));

// Định nghĩa cấu trúc người dùng (User Model)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now } // Tự động lưu thời gian
});
const User = mongoose.model('User', userSchema);

// --- 2. CẤU HÌNH MIDDLEWARE ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
    secret: 'phap_tieng_anh_8_secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // Session tồn tại 1 ngày
}));

// Cấu hình View Engine để đọc file .html bằng EJS
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// --- 3. CÁC ROUTE (ĐƯỜNG DẪN) ---

// Trang chính (Redirect về Login nếu chưa đăng nhập)
app.get('/', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('index', { user: req.session.user });
});

// Giao diện Đăng nhập
app.get('/login', (req, res) => {
    res.render('login');
});

// Xử lý Đăng nhập
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Kiểm tra quyền Admin tối cao
    if (username === 'admin' && password === '080212') {
        req.session.user = { username: 'admin', role: 'admin' };
        return res.redirect('/admin');
    }

    // Kiểm tra người dùng thường trong Database
    try {
        const foundUser = await User.findOne({ username, password });
        if (foundUser) {
            req.session.user = { username: foundUser.username, role: 'user' };
            return res.redirect('/');
        } else {
            res.send("<script>alert('Sai tài khoản hoặc mật khẩu!'); window.location.href='/login';</script>");
        }
    } catch (err) {
        res.status(500).send("Lỗi hệ thống khi đăng nhập.");
    }
});

// TRANG ADMIN (QUẢN LÝ TÀI KHOẢN & CÂU HỎI)
app.get('/admin', async (req, res) => {
    // Bảo mật: Chỉ admin mới được vào
    if (!req.session.user || req.session.user.username !== 'admin') {
        return res.redirect('/login');
    }

    try {
        // Lấy danh sách tất cả người dùng từ DB để hiện lên bảng
        const usersList = await User.find().sort({ createdAt: -1 });
        
        // Render trang admin và truyền dữ liệu sang
        res.render('admin', { 
            user: req.session.user, 
            usersList: usersList 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Không thể tải danh sách người dùng.");
    }
});

// Route Đăng xuất
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// --- 4. KHỞI CHẠY SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});
