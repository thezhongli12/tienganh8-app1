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
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ DB Error:', err));

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
    secret: 'secret_key_080212',
    resave: false,
    saveUninitialized: true
}));

app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// Dữ liệu hiển thị ở trang chủ
const lessonsData = [
    { id: 1, title: "Unit 1: Leisure Time", desc: "Hoạt động giải trí" },
    { id: 2, title: "Unit 2: Life in the Countryside", desc: "Nông thôn" },
    { id: 3, title: "Unit 3: Teenagers", desc: "Tuổi thiếu niên" },
    { id: 4, title: "Unit 4: Ethnic Groups of VN", desc: "Dân tộc Việt Nam" },
    { id: 5, title: "Unit 5: Our Customs", desc: "Phong tục tập quán" },
    { id: 6, title: "Unit 6: Lifestyles", desc: "Lối sống" },
    { id: 7, title: "Unit 7: Environmental Protection", desc: "Bảo vệ môi trường" },
    { id: 8, title: "Unit 8: Shopping", desc: "Mua sắm" },
    { id: 9, title: "Unit 9: Natural Disasters", desc: "Thiên tai" },
    { id: 10, title: "Unit 10: Communication", desc: "Giao tiếp tương lai" },
    { id: 11, title: "Unit 11: Science and Tech", desc: "Khoa học công nghệ" },
    { id: 12, title: "Unit 12: Life on other planets", desc: "Sự sống ngoài hành tinh" }
];

// --- 3. ROUTES ---

// TRANG CHỦ
app.get('/', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('index', { user: req.session.user, lessons: lessonsData });
});

// TRANG HỌC TẬP (Tính năng chính)
app.get('/study/:id', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    const lessonId = req.params.id;
    const lessonInfo = lessonsData.find(l => l.id == lessonId);

    try {
        const filePath = path.join(__dirname, 'data', 'units.json');
        if (fs.existsSync(filePath)) {
            const rawData = fs.readFileSync(filePath, 'utf8');
            const allData = JSON.parse(rawData);

            // Khớp với Key "unit1", "unit2"... trong JSON của bạn
            const unitKey = 'unit' + lessonId;
            const unitContent = allData[unitKey];

            res.render('study', { 
                user: req.session.user, 
                lesson: lessonInfo, 
                questions: (unitContent && unitContent.questions) ? unitContent.questions : [] 
            });
        } else {
            res.render('study', { user: req.session.user, lesson: lessonInfo, questions: [] });
        }
    } catch (err) {
        res.render('study', { user: req.session.user, lesson: lessonInfo, questions: [] });
    }
});

// ĐĂNG NHẬP / ĐĂNG KÝ
app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    // Admin Master Pass
    if (username === 'admin' && password === '080212') {
        req.session.user = { username: 'admin', role: 'admin' };
        return res.redirect('/admin');
    }
    const found = await User.findOne({ username, password });
    if (found) {
        req.session.user = { username: found.username, role: 'user' };
        return res.redirect('/');
    }
    res.send("<script>alert('Sai tài khoản!'); window.location.href='/login';</script>");
});

app.get('/register', (req, res) => res.render('register'));
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        await User.create({ username, password });
        res.redirect('/login');
    } catch (e) { res.send("Lỗi: Tên đăng nhập đã tồn tại!"); }
});

app.get('/admin', async (req, res) => {
    if (!req.session.user || req.session.user.username !== 'admin') return res.redirect('/login');
    const users = await User.find().sort({ createdAt: -1 });
    res.render('admin', { usersList: users });
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
