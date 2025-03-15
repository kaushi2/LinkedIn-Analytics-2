const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const session = require('express-session');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo');

// Load environment variables
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const app = express();
const port = 5000;

app.use(cors({
    credentials: true,
    origin: process.env.REACT_APP_API_BASE_URL,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const mongoUri = process.env.MONGODB_URI;
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// MongoDB User Schema and Model
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

axios.defaults.withCredentials = true;

// Passport Configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI, // Your MongoDB connection string
    }),
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Set to true in production
        maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(
    new LocalStrategy(async (username, password, done) => {
        try {
            const user = await User.findOne({ username: username });
            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return done(null, false, { message: 'Incorrect password.' });
            }
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    })
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        console.log("Deserializing User with ID:", id);
        const user = await User.findById(id);
        console.log("User found:", user);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// Routes
app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = new User({
            username: req.body.username,
            password: hashedPassword,
        });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/login', (req, res, next) => { // Added 'next'
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err); // Pass errors to Express.
        }
        if (!user) {
            return res.status(401).json({ message: info.message }); // Send specific error
        }
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            req.session.save((err) => {
                if (err) {
                    console.error("Session save error:", err);
                    return res.status(500).send("Error saving session.");
                }
                //res.json({ message: 'Login successful', user: req.user });
                return res.json({ message: 'Login successful', user: req.user });
            });
        });
    })(req, res, next); // Call the passport authenticate function
});

app.get('/logout', (req, res) => {
    req.logout(() => {
        res.json({ message: 'Logout successful' });
    });
});

app.get('/protected', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ message: "Protected route access granted" });
    } else {
        res.status(401).json({ message: "Unauthorized" });
    }
});

// LinkedIn OAuth 2.0 Configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;
const LINKEDIN_POST_ID = process.env.LINKEDIN_POST_ID;

// Redirect to LinkedIn authorization
app.get('/linkedin/auth', (req, res) => {
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?
    response_type=code&
    client_id=${LINKEDIN_CLIENT_ID}&
    redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&
    scope=email,openid,profile,w_member_social,r_member_social`;
    res.redirect(authUrl);
});

// Callback route
app.get('/linkedin/callback', async (req, res) => {
    const { code } = req.query;

    // Exchange code for access token
    try {
        const tokenResponse = await axios.post(
            'https://www.linkedin.com/oauth/v2/accessToken',
            new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: LINKEDIN_REDIRECT_URI,
                callback: 'http://localhost:5000/linkedin/callback',
                client_id: LINKEDIN_CLIENT_ID,
                client_secret: LINKEDIN_CLIENT_SECRET,
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        req.session.linkedinAccessToken = tokenResponse.data.access_token;

        //res.json({ message: 'LinkedIn Login successful' });
        res.redirect(`http://localhost:3000?isLoggedIn=true&linkedInAuthenticated=true`);
        // res.redirect(`/linkedin/stats`);

        //res.json({ success: true, message: 'Authentication successful' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error');
    }
});

app.get('/linkedin/process-linkedin-auth', (req, res) => {
    if (req.isAuthenticated() && req.session.linkedinAccessToken) {
        res.redirect(`http://localhost:3000/?isLoggedIn=true&linkedInAuthenticated=true`); // Redirect to frontend
    } else {
        res.redirect(`http://localhost:3000/?isLoggedIn=false&linkedInAuthenticated=true`);
    }
});
app.get('/linkedin/isLinkedInAuthenticated', (req, res) => {
    if (req.session.linkedinAccessToken) {
        res.json({ linkedInAuthenticated: true });
    } else {
        res.json({ linkedInAuthenticated: false });
    }
});

app.get('/linkedin/stats', async (req, res) => {
    const accessToken = req.session.linkedinAccessToken;
    if (!accessToken) {
        return res.status(401).send("Not Authorized");
    }

    try {
        const headers = {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
        };

        // Ensure the LinkedIn Post ID is in the correct format
        const formattedPostId = LINKEDIN_POST_ID.startsWith("urn:li:ugcPost:")
            ? LINKEDIN_POST_ID
            : `urn:li:ugcPost:${LINKEDIN_POST_ID}`;

        // Fetch engagement stats
        const engagementResponse = await axios.get(
            `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(formattedPostId)}`,
            { headers }
        );

        // Extract values safely
        const sharesCount = engagementResponse.data.numShares || 0;
        const commentsCount = engagementResponse.data.numComments || 0;
        const likesCount = engagementResponse.data.numLikes || 0;

        res.json({ shares: sharesCount, comments: commentsCount, likes: likesCount });

    } catch (error) {
        console.error('Error fetching LinkedIn stats:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch LinkedIn stats' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

