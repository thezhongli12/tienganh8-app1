const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const fs = require('fs');
const ejs = require('ejs');

const app = express();

// 1. KẾT NỐI DATABASE
const mongoURI = "mongodb+srv://admin:080212@cluster0.fwz1mo6.mongodb.net/tienganh8?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('✅ MongoDB Connected'));

// 2. CẤU HÌNH VIEW ENGINE (Sửa lỗi render file .html)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set('views', path.resolve(__dirname, 'views'));

// 3. SESSION (Sử dụng mật khẩu từ Saved Info: 080212)
app.use(session({
    secret: 'secret_key_080212',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// 4. API LẤY DỮ LIỆU (Sửa lỗi bảng từ vựng và Unit không hiện)
app.get('/api/dictionary', (req, res) => {
    try {
        const data = fs.readFileSync(path.resolve(__dirname, 'data/dictionary.json'), 'utf8');
        res.json(JSON.parse(data));
    } catch (e) { res.status(500).json({ error: "Lỗi tải từ điển" }); }
});

app.get('/api/questions', (req, res) => {
    try {
        const data = fs.readFileSync(path.resolve(__dirname, 'data/units.json'), 'utf8');
        res.json(JSON.parse(data));
    } catch (e) { res.status(500).json({ error: "Lỗi tải bài học" }); }
});

app.get('/api/user-status', (req, res) => {
    res.json(req.session.userId ? { loggedIn: true, username: req.session.userId, role: req.session.role } : { loggedIn: false });
});

// 5. ĐIỀU HƯỚNG TRANG (ROUTES)
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'views/index.html')));
app.get('/login', (req, res) => res.sendFile(path.resolve(__dirname, 'views/login.html')));
app.get('/register', (req, res) => res.sendFile(path.resolve(__dirname, 'views/register.html')));

// Route Admin (Sửa lỗi Cannot GET /admin)
app.get('/admin', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'views/admin.html'));
});

// Route Study (Sửa lỗi Internal Server Error)
app.get('/study', (req, res) => {
    try {
        if (!req.session.userId) return res.redirect('/login');
        const unitId = req.query.unit;
        const filePath = path.resolve(__dirname, 'data/units.json');
        
        if (fs.existsSync(filePath)) {
            const allUnits = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const unitData = allUnits[unitId];
            if (unitData) {
                // Sử dụng render thay vì sendFile để bơm dữ liệu vào HTML
                return res.render('study.html', { unit: unitData, id: unitId });
            }
        }
        res.redirect('/');
    } catch (err) {
        res.status(500).send("Lỗi hệ thống: " + err.message);
    }
});

// 6. XỬ LÝ ĐĂNG NHẬP
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    // Chấp nhận mật khẩu admin 080212
    if (password === "080212") {
        req.session.userId = username || "Admin";
        req.session.role = 'admin';
        return res.json({ success: true, redirect: "/" });
    }
    // Chỗ này bạn có thể thêm logic tìm trong MongoDB của bạn
    res.json({ success: false, message: "Sai thông tin đăng nhập!" });
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server đang chạy tại port ${PORT}`));

module.exports = app;
