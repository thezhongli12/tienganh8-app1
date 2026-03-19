const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');

const app = express();

// --- 1. KẾT NỐI DATABASE ---
const mongoURI = process.env.MONGO_URI; 
mongoose.connect(mongoURI)
    .then(() => console.log('✅ Đã kết nối MongoDB'))
    .catch(err => console.error('❌ Lỗi DB:', err));

// Schema Người dùng
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}));

// Schema Lưu điểm số
const Score = mongoose.model('Score', new mongoose.Schema({
    username: String,
    lessonTitle: String,
    score: String,
    percentage: Number,
    createdAt: { type: Date, default: Date.now }
}));

// --- 2. CẤU HÌNH ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: 'secret_080212',
    resave: false,
    saveUninitialized: true
}));

app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

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

app.get('/', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('index', { user: req.session.user, lessons: lessonsData });
});

// ĐĂNG KÝ (SỬA ĐỔI: TỰ ĐỘNG ĐĂNG NHẬP)
app.get('/register', (req, res) => res.render('register', { error: null }));
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const userRegex = /^[a-zA-Z0-9]{6,}$/; // Ít nhất 6 ký tự, không dấu/cách

    if (!userRegex.test(username)) {
        return res.render('register', { error: 'Tên đăng nhập phải ít nhất 6 ký tự, không dấu, không cách!' });
    }
    if (password.length < 8) {
        return res.render('register', { error: 'Mật khẩu phải có ít nhất 8 ký tự!' });
    }

    try {
        const checkUser = await User.findOne({ username });
        if (checkUser) return res.render('register', { error: 'Tên đăng nhập đã tồn tại!' });
        
        const newUser = await User.create({ username, password });
        
        // TỰ ĐỘNG ĐĂNG NHẬP SAU KHI ĐĂNG KÝ
        req.session.user = { username: newUser.username };
        res.redirect('/'); 

    } catch (e) {
        res.render('register', { error: 'Lỗi hệ thống, thử lại sau!' });
    }
});

// ĐĂNG NHẬP
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '080212') {
        req.session.user = { username: 'admin' };
        return res.redirect('/admin');
    }
    const found = await User.findOne({ username, password });
    if (found) {
        req.session.user = { username: found.username };
        return res.redirect('/');
    }
    res.render('login', { error: 'Sai tên đăng nhập hoặc mật khẩu!' });
});

// TRANG HỌC & LƯU ĐIỂM
app.get('/study/:id', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const lessonId = req.params.id;
    const lessonInfo = lessonsData.find(l => l.id == lessonId);
    try {
        const allData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'units.json'), 'utf8'));
        const unit = allData['unit' + lessonId];
        res.render('study', { user: req.session.user, lesson: lessonInfo, questions: unit ? unit.questions : [] });
    } catch (err) { res.render('study', { user: req.session.user, lesson: lessonInfo, questions: [] }); }
});

app.post('/save-score', async (req, res) => {
    if (!req.session.user) return res.status(401).send();
    const { lessonTitle, score, percentage } = req.body;
    await Score.create({ username: req.session.user.username, lessonTitle, score, percentage });
    res.json({ success: true });
});

// ADMIN
app.get('/admin', async (req, res) => {
    if (!req.session.user || req.session.user.username !== 'admin') return res.redirect('/login');
    const users = await User.find().sort({ createdAt: -1 });
    const scores = await Score.find().sort({ createdAt: -1 });
    res.render('admin', { usersList: users, scoresList: scores });
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

app.listen(3000, () => console.log('🚀 Server ON: http://localhost:3000'));
