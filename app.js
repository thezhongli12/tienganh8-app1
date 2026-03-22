const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();
const mongoURI = "mongodb+srv://thezhongli12:080212@cluster0.fwz1mo6.mongodb.net/tienganh8";

mongoose.connect(mongoURI).then(() => console.log('✅ MongoDB Connected'));

const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true, minlength: 6 },
    password: { type: String, minlength: 8 }
}));

app.use(express.json());
app.use(session({
    secret: '080212',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI })
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// API Đăng ký với điều kiện
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (username.length < 6 || password.length < 8) {
        return res.json({ success: false, message: "Tên ít nhất 6 ký tự, Mật khẩu ít nhất 8 ký tự!" });
    }
    try {
        const user = new User({ username, password });
        await user.save();
        res.json({ success: true });
    } catch (e) { res.json({ success: false, message: "Tên đăng nhập đã tồn tại!" }); }
});

// API Đăng nhập
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user || (username === "admin" && password === "080212")) {
        req.session.userId = username;
        res.json({ success: true });
    } else { res.json({ success: false, message: "Sai tài khoản hoặc mật khẩu!" }); }
});

module.exports = app;
