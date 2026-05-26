const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// View Engine Setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Aiven Database Connection Setup using Environment Variables
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for secure cloud database connections like Aiven
    }
});

// Test Database Connection
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Successfully connected to Aiven Database.');
    release();
});

// --- ROUTES & CRUD OPERATIONS ---

// 1. READ: Homepage & Student List
app.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM students ORDER BY created_at DESC');
        res.render('index', { students: result.rows, title: 'Home' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Database Error: Unable to fetch students.');
    }
});

// 2. CREATE: Render Registration Page
app.get('/register', (req, res) => {
    res.render('register', { title: 'Register Student' });
});

// 2. CREATE: Process Registration Form Submission
app.post('/register', async (req, res) => {
    const { student_id, full_name, course, year_level, email_address } = req.body;
    try {
        await pool.query(
            'INSERT INTO students (student_id, full_name, course, year_level, email_address) VALUES ($1, $2, $3, $4, $5)',
            [student_id, full_name, course, year_level, email_address]
        );
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error registering student. Ensure Student ID or Email is unique.');
    }
});

// 3. UPDATE: Render Edit Form populated with existing data
app.get('/edit/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM students WHERE student_id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).send('Student not found.');
        }
        res.render('edit', { student: result.rows[0], title: 'Edit Student' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error fetching student data.');
    }
});

// 3. UPDATE: Process Edit Form Submission
app.post('/edit/:id', async (req, res) => {
    const { id } = req.params;
    const { full_name, course, year_level, email_address } = req.body;
    try {
        await pool.query(
            'UPDATE students SET full_name = $1, course = $2, year_level = $3, email_address = $4 WHERE student_id = $5',
            [full_name, course, year_level, email_address, id]
        );
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating student records.');
    }
});

// 4. DELETE: Handle Record Deletion
app.post('/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM students WHERE student_id = $1', [id]);
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting student record.');
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
