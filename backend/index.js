import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from 'fs';
import dotenv from "dotenv";
import connectDB from "./db.js";
import userRoute from "./routes/user.route.js";
import messageRoute from "./routes/message.route.js";
import postRoute from "./routes/post.route.js";
import notificationRoute from "./routes/notification.route.js";
import mediaRoute from "./routes/media.route.js";
import draftRoute from "./routes/draft.route.js";
import http from "http";
import { initSocket } from "./socket/socket.js";


// Load environment variables FIRST
console.log('Loading environment variables...');
dotenv.config();
console.log('Environment loaded. MONGO_URI exists:', !!process.env.MONGO_URI);

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));


// During development allow requests from the frontend dev server(s).
// Use a permissive origin handler so Vite can pick a different port (5173/5174).
const corsOptions = {
    origin: true,
    credentials: true,
};

app.use(cors(corsOptions));

// simple request logger (console + file) to help with manual testing
const logFile = new URL('./server.log', import.meta.url).pathname;
app.use((req, res, next) => {
    try {
        const line = `[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.originalUrl}`;
        console.log(line);
        fs.appendFileSync(logFile, line + '\n');
    } catch (e) {
        // ignore logging errors
    }
    next();
});

// Routes
app.get("/", (_, res) => {
    return res.status(200).json({
        message: "I'm coming to backend",
        success: true
    });
});

app.use("/api/v1/user", userRoute);
app.use("/api/v1/message", messageRoute);
app.use("/api/v1/post", postRoute);
app.use("/api/v1/notification", notificationRoute);
app.use("/api/v1/media", mediaRoute);
app.use("/api/v1/draft", draftRoute);

const PORT = process.env.PORT || 8000;

// Connect DB FIRST, THEN start server and initialize socket.io
const startServer = async () => {
    try {
        console.log('Starting server initialization...');

        // Connect to database
        await connectDB();

        // Create HTTP server from Express app so Socket.IO can attach
        const server = http.createServer(app);

        // Initialize socket.io with server
        initSocket(server);

        // Start listening on all interfaces to avoid IPv4/IPv6 binding mismatches
        server.listen(PORT, '0.0.0.0', () => {
            try {
                const addr = server.address();
                const host = addr && addr.address ? addr.address : '0.0.0.0';
                const port = addr && addr.port ? addr.port : PORT;
                console.log(`✅ Server (with sockets) is running on ${host}:${port}`);
            } catch (e) {
                console.log(`✅ Server (with sockets) is running on port ${PORT}`);
            }
        });

        // Log server errors (EADDRINUSE, EACCES, etc.) so we can diagnose connection issues
        server.on('error', (err) => {
            console.error('❌ Server error:', err && err.stack ? err.stack : err);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error.message);
        process.exit(1);
    }
};

// Global process-level error handlers to capture unexpected failures
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err && err.stack ? err.stack : err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server when run via npm lifecycle (dev/start) or when invoked directly with node
// This makes starting the server more reliable in different environments (npm, nodemon, or direct node).
const lifecycle = process.env.npm_lifecycle_event;
const invokedDirectly = typeof process.argv[1] === 'string' && process.argv[1].endsWith('index.js');
if (lifecycle === 'dev' || lifecycle === 'start' || invokedDirectly) {
    startServer();
}

// Export the express app for testing
export default app;













// Add this after your other routes
// app.get("/test-db", async (req, res) => {
//     try {
//         // Check connection state
//         const state = mongoose.connection.readyState;
//         const states = {
//             0: 'disconnected',
//             1: 'connected',
//             2: 'connecting',
//             3: 'disconnecting'
//         };
        
//         return res.json({
//             message: "Database test",
//             connectionState: states[state],
//             connected: state === 1,
//             host: mongoose.connection.host,
//             database: mongoose.connection.name
//         });
//     } catch (error) {
//         return res.status(500).json({
//             message: "CHOLE",
//             error: error.message
//         });
//     }
// });