import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import indexRouter from './routes/index.js'; // Make sure to include .js!

const app = express();
const PORT = process.env.PORT || 3000;

// High IQ Dev Mode: Structured Logging Context
const isDev = process.env.NODE_ENV !== 'production';

// This is a required trick to get folder paths working with modern "import" syntax
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Tell Express we are using EJS for our views folder
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// High IQ Dev Mode: Expose Global Variables to all EJS templates
// These variables will be available in any .ejs file globally without passing them in res.render()
app.locals.siteName = 'Ambassadors Assembly';
app.locals.currentYear = new Date().getFullYear();

// Middleware: Request Logger (High IQ Dev Mode)
app.use((req, res, next) => {
    if (isDev) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
});

// 2. Tell Express where to find your CSS, Images, and Client JS
// This automatically makes everything in your "public" folder available to the browser
app.use(express.static(path.join(__dirname, 'public')));

// 3. Connect your Routes
app.use('/', indexRouter);

// High IQ Dev Mode: 404 handler (Catch-all for missing routes)
app.use((req, res, next) => {
    res.status(404).send('404 - Page Not Found'); // Can eventually render a 404.ejs
});

// High IQ Dev Mode: Global Error Handler
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${err.message}`);
    res.status(500).send('500 - Internal Server Error');
});

// 4. Start the Server!
app.listen(PORT, () => {
    console.log(`🚀 Ambassadors Assembly server is running in ${isDev ? 'Development' : 'Production'} mode!`);
    console.log(`👉 Open your browser to: http://localhost:${PORT}`);
});