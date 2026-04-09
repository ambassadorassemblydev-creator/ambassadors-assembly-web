import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Home Page Route
router.get('/', async (req, res) => {
    try {
        // Fetch Ministries (top 5 by sort_order)
        const { data: ministries, error: minError } = await supabase
            .from('ministries')
            .select('*')
            .order('sort_order', { ascending: true })
            .limit(6);

        // Fetch Recent Sermons (top 5 by sermon_date)
        const { data: sermons, error: srmError } = await supabase
            .from('sermons')
            .select('*')
            .order('sermon_date', { ascending: false })
            .limit(6);

        // Fetch Upcoming Events (top 7 by start_date)
        const { data: events, error: evtError } = await supabase
            .from('events')
            .select('*')
            .eq('status', 'upcoming')
            .order('start_date', { ascending: true })
            .limit(7);

        // This automatically looks in the 'views' folder for 'index.ejs'
        res.render('pages/index', {
            pageTitle: 'Home | Ambassadors Assembly',
            ministries: ministries || [],
            sermons: sermons || [],
            events: events || []
        });

    } catch (err) {
        console.error("Error fetching data from Supabase:", err);
        res.render('pages/index', {
            pageTitle: 'Home | Ambassadors Assembly',
            ministries: [],
            sermons: [],
            events: []
        });
    }
});

// Sermons Page Route
router.get('/sermons', async (req, res) => {
    try {
        // Fetch all published sermons
        const { data: sermons, error: srmError } = await supabase
            .from('sermons')
            .select('*, sermon_speakers(name)')
            .eq('status', 'published')
            .order('sermon_date', { ascending: false });

        // Fetch ongoing/upcoming series
        const { data: series, error: serError } = await supabase
            .from('sermon_series')
            .select('*')
            .eq('status', 'published')
            .order('start_date', { ascending: false })
            .limit(3);

        res.render('pages/sermons', {
            pageTitle: 'Sermons | Ambassadors Assembly',
            sermons: sermons || [],
            series: series || []
        });

    } catch (err) {
        console.error("Error fetching data from Supabase:", err);
        res.render('pages/sermons', {
            pageTitle: 'Sermons | Ambassadors Assembly',
            sermons: [],
            series: []
        });
    }
});

// Events Page Route
router.get('/events', async (req, res) => {
    try {
        // Fetch all upcoming events (status = 'upcoming')
        const { data: events, error: evtError } = await supabase
            .from('events')
            .select('*')
            .eq('status', 'upcoming')
            .order('start_date', { ascending: true });

        res.render('pages/events', {
            pageTitle: 'Events | Ambassadors Assembly',
            events: events || []
        });

    } catch (err) {
        console.error("Error fetching data from Supabase:", err);
        res.render('pages/events', {
            pageTitle: 'Events | Ambassadors Assembly',
            events: []
        });
    }
});

export default router;