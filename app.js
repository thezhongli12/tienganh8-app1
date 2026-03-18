const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');

const app = express();

// --- 1. KẾT NỐI DATABASE (Thay MONGO_URI bằng link của bạn) ---
const mongoURI = process.env.MONGO_URI; 
mongoose.connect(mongoURI)
    .then(() => console.log('✅ Kết nối Database thành công!'))
    .catch(err => console.error('❌ Lỗi kết nối DB:', err));

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
    secret: 'phap_anh_8_key_2026',
    resave: false,
    saveUninitialized: true
}));

app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// Danh sách hiển thị trang chủ
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

// ROUTE STUDY: Đọc dữ liệu từ units.json
app.get('/study/:id', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    const lessonId = req.params.id;
    const lessonInfo = lessonsData.find(l => l.id == lessonId);

    try {
        const filePath = path.join(__dirname, 'data', 'units.json');
        if (fs.existsSync(filePath)) {
            const rawData = fs.readFileSync(filePath, 'utf8');
            const allData = JSON.parse(rawData);

            // Tìm key theo định dạng "unit1", "unit2"... trong file của bạn
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
        console.error("Lỗi đọc JSON:", err);
        res.render('study', { user: req.session.user, lesson: lessonInfo, questions: [] });
    }
});

app.get('/register', (req, res) => res.render('register'));
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        await User.create({ username, password });
        req.session.user = { username, role: 'user' };
        res.redirect('/');
    } catch (e) { res.send("<script>alert('Lỗi đăng ký!'); window.location.href='/register';</script>"); }
});

app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '080212') {
        req.session.user = { username: 'admin', role: 'admin' };
        return res.redirect('/admin');
    }
    const found = await User.findOne({ username, password });
    if (found) {
        req.session.user = { username: found.username, role: 'user' };
        return res.redirect('/');
    }
    res.send("<script>alert('Sai thông tin!'); window.location.href='/login';</script>");
});

app.get('/admin', async (req, res) => {
    if (!req.session.user || req.session.user.username !== 'admin') return res.redirect('/login');
    const users = await User.find().sort({ createdAt: -1 });
    res.render('admin', { user: req.session.user, usersList: users });
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
