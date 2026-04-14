import express from 'express';
import { authController } from '../controllers/authController.js';


const router = express.Router();

// HTML Pages (GET)
router.get('/sign-in', authController.renderSignIn);
router.get('/sign-up', authController.renderSignUp); // <-- ADD THIS
router.get('/check-email', (req, res) => res.render('pages/check-email', { pageTitle: 'Check Your Email | Ambassadors Assembly' }));
// API Endpoints (POST)
router.post('/api/login', authController.login);
router.post('/api/signup', authController.signUp); // <-- ADD THIS
router.get('/logout', authController.logout);

export default router;