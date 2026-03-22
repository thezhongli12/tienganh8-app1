const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();
// Kết nối tới Cluster của bạn
const mongoURI = "mongodb+srv://thezhongli12:080212@cluster0.fwz1mo6.mongodb.net/tienganh8";

mongoose.connect(mongoURI)
    .then(() => console.log('✅ Kết nối MongoDB thành công'))
    .catch(err => console.error('❌ Lỗi kết nối DB:', err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sửa lỗi MemoryStore cảnh báo trong logs
app.use(session({
    secret: '080212',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// Định tuyến trả về giao diện trực tiếp để tránh lỗi 404
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/study', (req, res) => res.sendFile(path.join(__dirname, 'views', 'study.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));

module.exports = app;
