const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // Thêm cái này để sửa lỗi MemoryStore trong logs của bạn

const app = express();

// 1. Kết nối MongoDB (Giữ nguyên cấu hình của bạn)
const mongoURI = "MONGODB_URI_CUA_BAN_O_DAY"; 
mongoose.connect(mongoURI)
    .then(() => console.log('✅ Kết nối MongoDB thành công'))
    .catch(err => console.error('❌ Lỗi kết nối DB:', err));

// 2. Cấu hình Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sửa lỗi Warning MemoryStore trong logs bằng cách dùng MongoStore
app.use(session({
    secret: '080212', // Dùng admin password làm secret cho đồng bộ
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongoURI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 ngày
}));

// 3. Khai báo thư mục tĩnh (Để truy cập CSS/JS/Images)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// 4. Các Routes xử lý Logic (Đăng nhập/Đăng ký)
app.post('/api/login', async (req, res) => {
    // Logic đăng nhập của bạn ở đây
    // Sau khi đăng nhập thành công:
    // req.session.user = user;
    res.json({ success: true, message: "Đăng nhập thành công" });
});

// 5. Cấu hình để Server hiểu các trang HTML (Phòng hờ cho Vercel)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/study', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'study.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Export app để Vercel sử dụng
module.exports = app;

// Chạy server ở local (Nếu cần test)
if (process.env.NODE_ENV !== 'production') {
    const PORT = 3000;
    app.listen(PORT, () => console.log(`🚀 Server chạy tại http://localhost:${PORT}`));
}
