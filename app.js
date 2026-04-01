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

// 2. MIDDLEWARE & VIEW ENGINE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// 3. SESSION
app.use(session({
    secret: 'secret_key_080212',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// 4. API TỪ VỰNG (Sửa lỗi "Lỗi tải dữ liệu")
app.get('/api/dictionary', (req, res) => {
    try {
        const filePath = path.resolve(__dirname, 'data/dictionary.json');
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            res.setHeader('Content-Type', 'application/json');
            return res.send(data);
        }
        res.status(404).json({ error: "File not found" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. API DANH SÁCH UNIT (Để hiện các Unit ở trang chủ)
app.get('/api/questions', (req, res) => {
    try {
        const filePath = path.resolve(__dirname, 'data/units.json');
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            res.setHeader('Content-Type', 'application/json');
            return res.send(data);
        }
        res.status(404).json({ error: "File not found" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/user-status', (req, res) => {
    res.json(req.session.userId ? { loggedIn: true, username: req.session.userId, role: req.session.role } : { loggedIn: false });
});

// 6. ROUTES ĐIỀU HƯỚNG
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'views/index.html')));
app.get('/login', (req, res) => res.sendFile(path.resolve(__dirname, 'views/login.html')));
app.get('/register', (req, res) => res.sendFile(path.resolve(__dirname, 'views/register.html')));

app.get('/study', (req, res) => {
    try {
        if (!req.session.userId) return res.redirect('/login');
        const unitId = req.query.unit;
        const filePath = path.resolve(__dirname, 'data/units.json');
        if (fs.existsSync(filePath)) {
            const allUnits = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const unitData = allUnits[unitId];
            if (unitData) return res.render('study.html', { unit: unitData, id: unitId });
        }
        res.redirect('/');
    } catch (err) {
        res.status(500).send("Lỗi Server: " + err.message);
    }
});

// 7. LOGIN (Sử dụng mật khẩu từ Saved Info)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (password === "080212") {
        req.session.userId = username || "Admin";
        req.session.role = 'admin';
        return res.json({ success: true, redirect: "/" });
    }
    // Logic tìm User bình thường trong DB...
    res.json({ success: false, message: "Sai thông tin!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;
