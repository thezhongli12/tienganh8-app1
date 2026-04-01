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

// 2. MODEL NGƯỜI DÙNG (Giữ cũ + Thêm mới)
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    // --- PHẦN MỚI THÊM ---
    displayName: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    bgUrl: { type: String, default: '' }
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

// 3. MIDDLEWARE & VIEW ENGINE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set('views', path.resolve(__dirname, 'views'));

// 4. SESSION
app.use(session({
    secret: 'secret_key_080212',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// 5. API HỆ THỐNG (Giữ nguyên không đổi)
app.get('/api/dictionary', (req, res) => {
    const data = fs.readFileSync(path.resolve(__dirname, 'data/dictionary.json'), 'utf8');
    res.json(JSON.parse(data));
});

app.get('/api/questions', (req, res) => {
    const data = fs.readFileSync(path.resolve(__dirname, 'data/units.json'), 'utf8');
    res.json(JSON.parse(data));
});

// API STATUS (Cập nhật để gửi Profile về)
app.get('/api/user-status', async (req, res) => {
    if (req.session.userId) {
        const user = await User.findOne({ username: req.session.userId });
        res.json({ 
            loggedIn: true, 
            username: user.username,
            displayName: user.displayName || user.username,
            avatarUrl: user.avatarUrl || 'https://ui-avatars.com/api/?name=' + user.username,
            bgUrl: user.bgUrl,
            role: user.role 
        });
    } else { res.json({ loggedIn: false }); }
});

// API CẬP NHẬT PROFILE (MỚI THÊM)
app.post('/api/user/update-profile', async (req, res) => {
    try {
        if (!req.session.userId) return res.json({ success: false });
        const { displayName, avatarUrl, bgUrl } = req.body;
        await User.findOneAndUpdate(
            { username: req.session.userId },
            { displayName, avatarUrl, bgUrl }
        );
        res.json({ success: true });
    } catch (err) { res.json({ success: false, message: err.message }); }
});

// API ADMIN (Giữ nguyên)
app.get('/api/admin/users', async (req, res) => {
    if (req.session.role !== 'admin') return res.json({ success: false });
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, users });
});

// 6. ROUTES (Giữ nguyên)
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'views/index.html')));
app.get('/admin', (req, res) => {
    if (req.session.role !== 'admin') return res.redirect('/login');
    res.sendFile(path.resolve(__dirname, 'views/admin.html'));
});
app.get('/study', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    const unitId = req.query.unit;
    const allUnits = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'data/units.json'), 'utf8'));
    const unitData = allUnits[unitId];
    if (unitData) return res.render('study.html', { unit: unitData, id: unitId });
    res.redirect('/');
});

// 7. AUTH (Giữ nguyên mật khẩu admin 080212)
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
