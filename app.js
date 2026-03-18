const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const ejs = require('ejs');

const app = express();

// --- 1. KẾT NỐI DATABASE ---
const mongoURI = process.env.MONGO_URI; 
mongoose.connect(mongoURI)
    .then(() => console.log('✅ Kết nối Database thành công!'))
    .catch(err => console.error('❌ Lỗi kết nối DB:', err));

// Model Người dùng
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}));

// --- 2. CẤU HÌNH ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: 'phap_anh_8_key',
    resave: false,
    saveUninitialized: true
}));

app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// Dữ liệu 12 Units bài học
const lessonsData = [
    { id: 1, title: "Unit 1: Leisure Activities", desc: "Hoạt động giải trí" },
    { id: 2, title: "Unit 2: Life in the Countryside", desc: "Nông thôn" },
    { id: 3, title: "Unit 3: Teenagers", desc: "Tuổi thiếu niên" },
    { id: 4, title: "Unit 4: Ethnic Groups of VN", desc: "Dân tộc Việt Nam" },
    { id: 5, title: "Unit 5: Our Customs", desc: "Phong tục tập quán" },
    { id: 6, title: "Unit 6: Lifestyles", desc: "Lối sống" },
    { id: 7, title: "Unit 7: Environmental Protection", desc: "Bảo vệ môi trường" },
    { id: 8, title: "Unit 8: Shopping", desc: "Mua sắm" },
    { id: 9, title: "Unit 9: Natural Disasters", desc: "Thiên tai" },
    { id: 10, title: "Unit 10: Communication", desc: "Giao tiếp" },
    { id: 11, title: "Unit 11: Science and Tech", desc: "Khoa học công nghệ" },
    { id: 12, title: "Unit 12: Life on other planets", desc: "Sự sống hành tinh khác" }
];

// --- 3. ROUTES ---

// Trang chủ
app.get('/', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('index', { user: req.session.user, lessons: lessonsData });
});

// Chi tiết bài học
app.get('/study/:id', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const lesson = lessonsData.find(l => l.id == req.params.id);
    res.render('study', { user: req.session.user, lesson: lesson });
});

// Đăng ký (Tự động đăng nhập)
app.get('/register', (req, res) => res.render('register'));
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const newUser = await User.create({ username, password });
        req.session.user = { username: newUser.username, role: 'user' };
        res.redirect('/');
    } catch (e) { res.send("<script>alert('Lỗi hoặc trùng tên!'); window.location.href='/register';</script>"); }
});

// Đăng nhập
app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '080212')
