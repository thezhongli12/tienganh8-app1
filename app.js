const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const ejs = require('ejs');

const app = express();

// 1. Cấu hình Database (Lấy từ Environment Variables trên Vercel)
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
  .then(() => console.log('Kết nối DB thành công'))
  .catch(err => console.error('Lỗi kết nối DB:', err));

// 2. Cấu hình Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
  secret: 'secret-key-123',
  resave: false,
  saveUninitialized: true
}));

// 3. Cấu hình View Engine (Dùng .html nhưng đọc theo kiểu EJS)
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// 4. Các Route xử lý
// Trang Login
app.get('/login', (req, res) => {
  res.render('login');
});

// Xử lý Đăng nhập
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Kiểm tra tài khoản admin với pass: 080212
  if (username === 'admin' && password === '080212') {
    req.session.user = { username: 'admin', role: 'admin' };
    return res.redirect('/admin');
  } else {
    res.send("<script>alert('Sai tài khoản hoặc mật khẩu!'); window.location.href='/login';</script>");
  }
});

// Trang Admin (Đã sửa lỗi user undefined)
app.get('/admin', (req, res) => {
  if (!req.session.user || req.session.user.username !== 'admin') {
    return res.redirect('/login');
  }
  // TRUYỀN BIẾN user VÀO ĐÂY
  res.render('admin', { user: req.session.user });
});

// Trang chủ
app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('index', { user: req.session.user });
});

// Đăng xuất
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Khởi chạy
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
