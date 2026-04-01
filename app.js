const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const fs = require('fs');
const ejs = require('ejs');

const app = express();

// 1. KẾT NỐI DATABASE (Giữ nguyên thông tin của bạn)
const mongoURI = "mongodb+srv://admin:080212@cluster0.fwz1mo6.mongodb.net/tienganh8?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('✅ MongoDB Connected'));

// 2. MODEL NGƯỜI DÙNG (Cập nhật đầy đủ các trường mới)
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    displayName: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    bgUrl: { type: String, default: '' }
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

// 3. CẤU HÌNH MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set('views', path.resolve(__dirname, 'views'));

// 4. SESSION (Đảm bảo lưu đăng nhập)
app.use(session({
    secret: 'secret_key_080212',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// 5. API DỮ LIỆU (Sửa lỗi "Lỗi tải dữ liệu")
app.get('/api/dictionary', (req, res) => {
    try {
        const data = fs.readFileSync(path.resolve(__dirname, 'data/dictionary.json'), 'utf8');
        res.json(JSON.parse(data));
    } catch (err) { res.status(500).json({}); }
});

app.get('/api/questions', (req, res) => {
    try {
        const data = fs.readFileSync(path.resolve(__dirname, 'data/units.json'), 'utf8');
        res.json(JSON.parse(data));
    } catch (err) { res.status(500).json({}); }
});

app.get('/api/user-status', async (req, res) => {
    if (req.session.userId) {
        const user = await User.findOne({ username: req.session.userId });
        res.json({ 
            loggedIn: true, 
            username: user.username,
            displayName: user.displayName || user.username,
            avatarUrl: user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}`,
            bgUrl: user.bgUrl,
            role: user.role 
        });
    } else { res.json({ loggedIn: false }); }
});

app.post('/api/user/update-profile', async (req, res) => {
    if (!req.session.userId) return res.json({ success: false });
    const { displayName, avatarUrl, bgUrl } = req.body;
    await User.findOneAndUpdate({ username: req.session.userId }, { displayName, avatarUrl, bgUrl });
    res.json({ success: true });
});

// API ADMIN
app.get('/api/admin/users', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({ success: false });
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, users });
});

// 6. ROUTES ĐIỀU HƯỚNG (Sửa lỗi "Cannot GET /admin")
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'views/index.html')));

app.get('/admin', (req, res) => {
    if (req.session.role !== 'admin') return res.redirect('/');
    res.sendFile(path.resolve(__dirname, 'views/admin.html'));
});

app.get('/study', (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const unitId = req.query.unit;
    const allUnits = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'data/units.json'), 'utf8'));
    if (allUnits[unitId]) return res.render('study.html', { unit: allUnits[unitId], id: unitId });
    res.redirect('/');
});

// 7. AUTH (Mật khẩu admin: 080212)
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
    res.json({ success: false, message: "Sai thông tin!" });
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server ready`));
module.exports = app;
