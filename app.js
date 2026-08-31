const express = require('express');
const path = require('path');
const session = require('express-session');
const fs = require('fs');
const ejs = require('ejs');
const admin = require('firebase-admin');

const app = express();

// 1. KẾT NỐI FIREBASE FIRESTORE
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
    serviceAccount = require('./serviceAccountKey.json');
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const usersRef = db.collection('users');

// 2. CẤU HÌNH VIEW ENGINE & MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
app.set('views', path.resolve(__dirname, 'views'));

// 3. SESSION
app.use(session({
    secret: 'secret_key_080212',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// 4. CÁC API DỮ LIỆU
app.get('/api/dictionary', (req, res) => {
    try {
        const data = fs.readFileSync(path.resolve(__dirname, 'data/dictionary.json'), 'utf8');
        res.json(JSON.parse(data));
    } catch (e) { res.status(500).json({ error: "Lỗi tải dữ liệu" }); }
});

app.get('/api/questions', (req, res) => {
    try {
        const data = fs.readFileSync(path.resolve(__dirname, 'data/units.json'), 'utf8');
        res.json(JSON.parse(data));
    } catch (e) { res.status(500).json({ error: "Lỗi tải bài học" }); }
});

app.get('/api/user-status', async (req, res) => {
    if (req.session.userId) {
        const userDoc = await usersRef.doc(req.session.userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;
        res.json({ 
            loggedIn: true, 
            username: req.session.userId, 
            role: req.session.role,
            score: userData && userData.score ? userData.score : 0 
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// API CẬP NHẬT ĐIỂM
app.post('/api/user/update-score', async (req, res) => {
    try {
        if (!req.session.userId) return res.json({ success: false });
        const { points } = req.body;
        await usersRef.doc(req.session.userId).update({
            score: admin.firestore.FieldValue.increment(points)
        });
        res.json({ success: true });
    } catch (err) { res.json({ success: false }); }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        if (req.session.role !== 'admin') return res.json({ success: false, message: "No access" });
        const snapshot = await usersRef.get();
        const users = [];
        snapshot.forEach(doc => users.push(doc.data()));
        res.json({ success: true, users });
    } catch (err) { res.json({ success: false, message: err.message }); }
});

// 5. ROUTES ĐIỀU HƯỚNG
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'views/index.html')));
app.get('/login', (req, res) => res.sendFile(path.resolve(__dirname, 'views/login.html')));
app.get('/register', (req, res) => res.sendFile(path.resolve(__dirname, 'views/register.html')));
app.get('/admin', (req, res) => {
    if (req.session.role !== 'admin') return res.redirect('/login');
    res.sendFile(path.resolve(__dirname, 'views/admin.html'));
});

app.get('/study', (req, res) => {
    try {
        if (!req.session.userId) return res.redirect('/login');
        const unitId = req.query.unit;
        const allUnits = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'data/units.json'), 'utf8'));
        const unitData = allUnits[unitId];
        if (unitData) return res.render('study.html', { unit: unitData, id: unitId });
        res.redirect('/');
    } catch (err) { res.status(500).send("Error"); }
});

// 6. AUTH LOGIC
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (password === "080212") {
        req.session.userId = username || "Admin";
        req.session.role = 'admin';
        return res.json({ success: true, redirect: "/" });
    }
    const userDoc = await usersRef.doc(username).get();
    if (userDoc.exists && userDoc.data().password === password) {
        req.session.userId = username;
        req.session.role = 'user';
        return res.json({ success: true, redirect: "/" });
    }
    res.json({ success: false, message: "Sai thông tin!" });
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const userDoc = await usersRef.doc(username).get();
        if (userDoc.exists) return res.json({ success: false, message: "Tên đã tồn tại" });
        
        await usersRef.doc(username).set({
            username: username,
            password: password,
            role: 'user',
            score: 0,
            createdAt: new Date().toISOString()
        });
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started`));
