const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const fs = require('fs');

const app = express();

// CẤU HÌNH ĐƯỜNG DẪN CHO VERCEL
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Kết nối MongoDB (Nhớ kiểm tra biến môi trường trên Vercel)
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:hongphap2012@cluster0.fwz1mo6.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI);

app.use(session({
    secret: 'hongphap-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI }),
    cookie: { maxAge: 14 * 24 * 60 * 60 * 1000 }
}));

// ROUTE ĐƠN GIẢN ĐỂ KIỂM TRA LỖI
app.get('/login', (req, res) => {
    try {
        res.render('login');
    } catch (err) {
        res.status(500).send("Lỗi render file login: " + err.message);
    }
});

app.get('/', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('index');
});

module.exports = app; // QUAN TRỌNG: Dòng này giúp Vercel nhận diện app