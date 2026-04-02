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

// 2. MODEL NGƯỜI DÙNG (Đã thêm trường score)
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    score: { type: Number, default: 0 } // Thêm để lưu điểm
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

// 3. CẤU HÌNH VIEW ENGINE & MIDDLEWARE
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

// 5. CÁC API DỮ LIỆU
app.get('/api/dictionary', (req, res) => {
    try {
        const data = fs.readFileSync(path.resolve(__dirname, 'data/dictionary.json'), 'utf8');
        res.json(JSON.parse(data));
    } catch (e) { res.status(500).json({ error: "Lỗi tải dữ liệu" }); }
});

app.get('/api/questions', (req, res) => {
    try {
        const data = fs.readFileSync(path.resolve(__dirname, 'data/units.json'), 'utf8');
        res.json(JSON.parse(data));
    } catch (e) { res.status(500).json({ error: "Lỗi tải bài học" }); }
});

app.get('/api/user-status', async (req, res) => {
    if (req.session.userId) {
        const user = await User.findOne({ username: req.session.userId });
        res.json({ 
            loggedIn: true, 
            username: req.session.userId, 
            role: req.session.role,
            score: user ? user.score : 0 
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// API CẬP NHẬT ĐIỂM (Mới thêm)
app.post('/api/user/update-score', async (req, res) => {
    try {
        if (!req.session.userId) return res.json({ success: false });
        const { points } = req.body;
        await User.findOneAndUpdate(
            { username: req.session.userId },
            { $inc: { score: points } } // Cộng dồn điểm
        );
        res.json({ success: true });
    } catch (err) { res.json({ success: false }); }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        if (req.session.role !== 'admin') return res.json({ success: false, message: "No access" });
        const users = await User.find().sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (err) { res.json({ success: false, message: err.message }); }
});

// 6. ROUTES ĐIỀU HƯỚNG
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'views/index.html')));
app.get('/login', (req, res) => res.sendFile(path.resolve(__dirname, 'views/login.html')));
app.get('/register', (req, res) => res.sendFile(path.resolve(__dirname, 'views/register.html')));
app.get('/admin', (req, res) => {
    if (req.session.role !== 'admin') return res.redirect('/login');
    res.sendFile(path.resolve(__dirname, 'views/admin.html'));
});

app.get('/study', (req, res) => {
    try {
        if (!req.session.userId) return res.redirect('/login');
        const unitId = req.query.unit;
        const allUnits = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'data/units.json'), 'utf8'));
        const unitData = allUnits[unitId];
        if (unitData) return res.render('study.html', { unit: unitData, id: unitId });
        res.redirect('/');
    } catch (err) { res.status(500).send("Error"); }
});

// 7. AUTH LOGIC
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

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (await User.findOne({ username })) return res.json({ success: false, message: "Tên đã tồn tại" });
        await new User({ username, password }).save();
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started`));
