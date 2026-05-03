import express from 'express';
import * as notificationController from '../controllers/notificationController.js';

const router = express.Router();

// Middleware to ensure user is logged in
const isAuthenticated = (req, res, next) => {
    // High IQ: Support both session-based (Frontend) and JWT-based (Admin Portal) auth
    if ((req.session && req.session.user) || req.user) return next();
    res.status(401).json({ error: 'Unauthorized. Please login.' });
};

router.post('/subscribe', notificationController.subscribe);
router.post('/broadcast', isAuthenticated, notificationController.broadcast);

export default router;
