import express from 'express';
import * as notificationController from '../controllers/notificationController.js';

const router = express.Router();

// Middleware to ensure user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) return next();
    res.status(401).json({ error: 'Unauthorized' });
};

router.post('/subscribe', notificationController.subscribe);
router.post('/broadcast', isAuthenticated, notificationController.broadcast);

export default router;
