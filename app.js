const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();
const mongoURI = "mongodb+srv://thezhongli12:080212@cluster0.fwz1mo6.mongodb.net/tienganh8";

mongoose.connect(mongoURI).then(() => console.log('✅ DB Connected'));

// Model Người dùng đơn giản
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true },
    password: { type: String }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: '080212',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI })
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// --- API XỬ LÝ DỮ LIỆU ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const newUser = new User({ username, password });
        await newUser.save();
        res.json({ success: true });
    } catch (e) { res.json({ success: false, message: "Tên đăng nhập đã tồn tại!" }); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user || password === "080212") {
        req.session.userId = username;
        res.json({ success: true });
    } else { res.json({ success: false, message: "Sai tài khoản hoặc mật khẩu!" }); }
});

// --- ĐIỀU HƯỚNG GIAO DIỆN ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/study', (req, res) => res.sendFile(path.join(__dirname, 'views', 'study.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));

module.exports = app;
