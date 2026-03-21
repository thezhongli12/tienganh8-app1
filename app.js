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
    .then(() => console.log('✅ Kết nối MongoDB thành công'))
    .catch(err => console.error('❌ Lỗi kết nối DB:', err));

// Định nghĩa Models
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}));

const Score = mongoose.model('Score', new mongoose.Schema({
    username: String,
    lessonTitle: String,
    score: String,
    percentage: Number,
    createdAt: { type: Date, default: Date.now }
}));

// --- 2. CẤU HÌNH VERCEL & SESSION ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'secret_080212',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

const lessonsData = [
    { id: 1, title: "Unit 1: Leisure Activities" },
    { id: 2, title: "Unit 2: Life in the Countryside" },
    { id: 3, title: "Unit 3: Teenagers" },
    { id: 4, title: "Unit 4: Ethnic Groups of VN" },
    { id: 5, title: "Unit 5: Our Customs" },
    { id: 6, title: "Unit 6: Lifestyles" },
    { id: 7, title: "Unit 7: Environmental Protection" },
    { id: 8, title: "Unit 8: Shopping" },
    { id: 9, title: "Unit 9: Natural Disasters" },
    { id: 10, title: "Unit 10: Communication" },
    { id: 11, title: "Unit 11: Science and Tech" },
    { id: 12, title: "Unit 12: Life on other planets" }
];

// --- 3. ROUTES ---

app.get('/', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('index', { user: req.session.user, lessons: lessonsData });
});

// ĐĂNG KÝ (Tên >= 6, MK >= 8)
app.get('/register', (req, res) => res.render('register', { error: null }));
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const userRegex = /^[a-zA-Z0-9]{6,}$/; 

    if (!userRegex.test(username)) return res.render('register', { error: 'Tên ít nhất 6 ký tự, không dấu/cách!' });
    if (password.length < 8) return res.render('register', { error: 'Mật khẩu ít nhất 8 ký tự!' });

    try {
        const checkUser = await User.findOne({ username });
        if (checkUser) return res.render('register', { error: 'Tên đăng nhập đã tồn tại!' });
        
        const newUser = await User.create({ username, password });
        req.session.user = { username: newUser.username };
        req.session.save(() => res.redirect('/')); 
    } catch (e) {
        res.render('register', { error: 'Lỗi hệ thống!' });
    }
});

// ĐĂNG NHẬP (Admin pass: 080212)
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '080212') {
        req.session.user = { username: 'admin' };
        return req.session.save(() => res.redirect('/admin'));
    }
    const found = await User.findOne({ username, password });
    if (found) {
        req.session.user = { username: found.username };
        return req.session.save(() => res.redirect('/'));
    }
    res.render('login', { error: 'Sai tên đăng nhập hoặc mật khẩu!' });
});

// --- PHẦN QUAN TRỌNG NHẤT: SỬA LỖI HIỂN THỊ CÂU HỎI ---
app.get('/study/:id', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const lessonId = req.params.id;
    const lessonInfo = lessonsData.find(l => l.id == lessonId);

    try {
        const dataPath = path.join(__dirname, 'data', 'units.json');
        if (!fs.existsSync(dataPath)) throw new Error("File units.json missing");

        const fileContent = fs.readFileSync(dataPath, 'utf8').trim();
        const allData = JSON.parse(fileContent);
        
        // Lấy đúng Unit (ví dụ unit1, unit2...)
        const unit = allData['unit' + lessonId] || { questions: [] };
        
        // LOGIC "VÁ" DỮ LIỆU: Tự động tìm kiếm nội dung nếu key bị sai
        const safeQuestions = (unit.questions || []).map(q => {
            return {
                // Thử tìm text, nếu không thấy thử tìm 'question' hoặc 'content'
                text: q.text || q.question || q.content || "Nội dung câu hỏi bị lỗi cấu trúc",
                // Thử tìm options, nếu không thấy thử tìm 'answers' hoặc 'choices'
                options: q.options || q.answers || q.choices || [],
                correct: q.correct !== undefined ? q.correct : 0
            };
        });

        res.render('study', { 
            user: req.session.user, 
            lesson: lessonInfo, 
            questions: safeQuestions 
        });
    } catch (err) {
        console.error("Critical Error:", err);
        res.render('study', { 
            user: req.session.user, 
            lesson: lessonInfo, 
            questions: [],
            error: "Không thể tải dữ liệu bài học!" 
        });
    }
});

app.post('/save-score', async (req, res) => {
    if (!req.session.user) return res.status(401).send();
    const { lessonTitle, score, percentage } = req.body;
    await Score.create({ username: req.session.user.username, lessonTitle, score, percentage });
    res.json({ success: true });
});

app.get('/admin', async (req, res) => {
    if (!req.session.user || req.session.user.username !== 'admin') return res.redirect('/login');
    const users = await User.find().sort({ createdAt: -1 });
    const scores = await Score.find().sort({ createdAt: -1 });
    res.render('admin', { usersList: users, scoresList: scores });
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

// QUAN TRỌNG: Cần thiết cho Vercel
module.exports = app;
