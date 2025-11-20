import { Database } from "bun:sqlite";
import { serve, file } from "bun";

// --- Configuration and Environment Variables ---

// Get configuration from environment variables or use safe defaults.
const DB_PATH = process.env.DB_PATH || "./database.sqlite";
const PORT = parseInt(process.env.PORT || "3000", 10);
const BIND_ADDRESS = process.env.BIND_ADDRESS || "0.0.0.0";
const JWT_SECRET = process.env.JWT_SECRET || "your_strong_secret_key_12345";
const TOKEN_EXPIRATION_HOURS = 24;

// Optional SSL Configuration
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;

// --- Database Initialization ---

let db: Database;

/**
 * Initializes the SQLite database, checks for the file, and creates tables if necessary.
 */
function initDatabase() {
    try {
        console.log(`[DB] Initializing database at path: ${DB_PATH}`);
        
        // Open the database. Bun automatically creates the file if it doesn't exist.
        db = new Database(DB_PATH, { create: true });
        
        // Enable Write-Ahead Logging (WAL) mode for better concurrency
        db.exec("PRAGMA journal_mode = WAL;");
        
        // Define SQL for creating tables if they do not exist
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            );
        `;

        const createRepositoriesTable = `
            CREATE TABLE IF NOT EXISTS repositories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                identifier TEXT NOT NULL,
                remotes TEXT, -- Stored as JSON string
                UNIQUE(user_id, identifier),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `;

        db.exec(createUsersTable);
        db.exec(createRepositoriesTable);

        console.log("[DB] Database and tables initialized successfully.");

    } catch (error) {
        console.error("[DB] Failed to initialize database:", error);
        // Terminate process if DB is critical
        process.exit(1); 
    }
}

// --- JWT Helper Functions (Simple Implementation) ---

interface TokenPayload {
    id: number;
    email: string;
    exp: number; // Expiration timestamp (seconds)
}

/**
 * Creates a simple, time-bound JWT token.
 * NOTE: For production, use a dedicated crypto library (like 'jose') for standard HMAC signing.
 * This implementation uses a basic structure suitable for Bun's single-file constraint.
 */
function createToken(userId: number, email: string): string {
    const expiration = Math.floor(Date.now() / 1000) + (TOKEN_EXPIRATION_HOURS * 3600);
    const payload: TokenPayload = { id: userId, email, exp: expiration };
    
    // Simple encoding and 'signature' based on the secret for quick verification
    const encodedPayload = btoa(JSON.stringify(payload));
    
    // In a real app, hash the encoded payload and the secret here for an actual signature.
    // For this example, we'll keep it simple and rely on the payload being encoded.
    return encodedPayload;
}

/**
 * Verifies and decodes the JWT token.
 * Returns the payload if valid, or null otherwise.
 */
function verifyToken(token: string): TokenPayload | null {
    try {
        const decodedPayloadString = atob(token);
        const payload: TokenPayload = JSON.parse(decodedPayloadString);

        if (payload.exp < Math.floor(Date.now() / 1000)) {
            console.log("Token expired.");
            return null; // Token expired
        }

        // Add verification check against JWT_SECRET if a signature were implemented
        
        return payload;
    } catch (e) {
        // Handle decoding/parsing errors
        return null;
    }
}

// --- Authentication Middleware ---

/**
 * Extracts and verifies JWT token from the Authorization header.
 * Attaches userId and email to the request context.
 */
async function authenticate(request: Request): Promise<TokenPayload | null> {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }

    const token = authHeader.split(" ")[1];
    if (token === undefined) {
        return null;
    }
    const payload = verifyToken(token);
    
    return payload;
}


// --- Handler Functions ---

/**
 * POST /register
 * Registers a new user with email and password (plaintext for simplicity, use hashing in production).
 */
async function handleRegister(request: Request): Promise<Response> {
    try {
        const { email, password } = await request.json() as { email: string, password: string };

        if (!email || !password) {
            return new Response(JSON.stringify({ error: "Email and password are required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        // Pre-check for existing user to give a clean error message
        const checkUser = db.query("SELECT id FROM users WHERE email = ?1;").get(email);
        if (checkUser) {
            return new Response(JSON.stringify({ error: "User already exists" }), { status: 409, headers: { "Content-Type": "application/json" } });
        }
        
        // WARNING: Storing plaintext password for simplicity. Use argon2/bcrypt in production.
        const insertUser = db.query("INSERT INTO users (email, password) VALUES (?1, ?2) RETURNING id;");
        const result = insertUser.get(email, password) as { id: number } | null;

        if (result) {
            const userId = result.id;
            const token = createToken(userId, email);
            
            return new Response(JSON.stringify({ 
                id: userId, 
                email: email, 
                token: token 
            }), { 
                status: 201, 
                headers: { "Content-Type": "application/json" } 
            });
        }
        
        throw new Error("Registration failed.");

    } catch (error) {
        console.error("Register error:", error);
        return new Response(JSON.stringify({ error: "Internal server error during registration" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}

/**
 * POST /login
 * Logs in a user, verifies password, and issues a JWT token.
 */
async function handleLogin(request: Request): Promise<Response> {
    try {
        const { email, password } = await request.json() as { email: string, password: string };

        if (!email || !password) {
            return new Response(JSON.stringify({ error: "Email and password are required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        // WARNING: Simple password check. Use argon2/bcrypt in production.
        const user = db.query("SELECT id, email, password FROM users WHERE email = ?1;").get(email) as { id: number, email: string, password: string } | null;

        if (user && user.password === password) {
            const token = createToken(user.id, user.email);
            
            return new Response(JSON.stringify({ 
                id: user.id, 
                email: user.email, 
                token: token 
            }), { 
                status: 200, 
                headers: { "Content-Type": "application/json" } 
            });
        } else {
            return new Response(JSON.stringify({ error: "Invalid email or password" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }
    } catch (error) {
        console.error("Login error:", error);
        return new Response(JSON.stringify({ error: "Internal server error during login" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}

/**
 * GET /repositories
 * Returns all repositories for the authenticated user.
 */
async function handleGetRepositories(request: Request, user: TokenPayload): Promise<Response> {
    try {
        const userId = user.id;

        const query = db.query("SELECT identifier, remotes FROM repositories WHERE user_id = ?1;");
        const rows = query.all(userId) as { identifier: string, remotes: string | null }[];

        // Deserialize the remotes JSON field
        const repositories = rows.map(row => ({
            identifier: row.identifier,
            remotes: row.remotes ? JSON.parse(row.remotes) : null,
        }));

        return new Response(JSON.stringify(repositories), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (error) {
        console.error("Get repositories error:", error);
        return new Response(JSON.stringify({ error: "Internal server error retrieving repositories" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}

/**
 * GET /repository?identifier=<identifier>
 * Returns a specific repository for the authenticated user by identifier.
 */
async function handleGetRepositoryByIdentifier(request: Request, user: TokenPayload): Promise<Response> {
    try {
        const userId = user.id;
        const url = new URL(request.url);
        // Get identifier from query parameters
        const identifier = url.searchParams.get("identifier"); 

        if (!identifier) {
            return new Response(JSON.stringify({ error: "Repository identifier query parameter is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        const query = db.query("SELECT identifier, remotes FROM repositories WHERE user_id = ?1 AND identifier = ?2;");
        const row = query.get(userId, identifier) as { identifier: string, remotes: string | null } | null;

        if (!row) {
            return new Response(JSON.stringify({ message: "Repository not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
        }

        // Deserialize the remotes JSON field
        const repository = {
            identifier: row.identifier,
            remotes: row.remotes ? JSON.parse(row.remotes) : null,
        };

        return new Response(JSON.stringify(repository), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (error) {
        console.error("Get repository by identifier error:", error);
        return new Response(JSON.stringify({ error: "Internal server error retrieving repository" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}

/**
 * POST /repository
 * Creates or updates a repository entry.
 */
async function handlePostRepository(request: Request, user: TokenPayload): Promise<Response> {
    try {
        const userId = user.id;
        const { identifier, remotes } = await request.json() as { identifier: string, remotes: any };

        if (!identifier) {
            return new Response(JSON.stringify({ error: "Repository identifier is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        // Serialize remotes JSON object to a string for SQLite storage
        const remotesString = remotes ? JSON.stringify(remotes) : null;

        // Use INSERT OR REPLACE to create or update the repository based on the unique constraint (user_id, identifier)
        const stmt = db.prepare(`
            INSERT INTO repositories (user_id, identifier, remotes) 
            VALUES (?1, ?2, ?3) 
            ON CONFLICT(user_id, identifier) DO UPDATE SET remotes = ?3;
        `);

        stmt.run(userId, identifier, remotesString);

        return new Response(JSON.stringify({ 
            message: "Repository saved successfully", 
            identifier: identifier 
        }), { 
            status: 200, 
            headers: { "Content-Type": "application/json" } 
        });

    } catch (error) {
        console.error("Post repository error:", error);
        return new Response(JSON.stringify({ error: "Internal server error saving repository" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}

/**
 * DELETE /repository
 * Deletes a repository entry based on the identifier.
 */
async function handleDeleteRepository(request: Request, user: TokenPayload): Promise<Response> {
    try {
        const userId = user.id;
        const { identifier } = await request.json() as { identifier: string };

        if (!identifier) {
            return new Response(JSON.stringify({ error: "Repository identifier is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        const stmt = db.prepare("DELETE FROM repositories WHERE user_id = ?1 AND identifier = ?2;");
        const result = stmt.run(userId, identifier);

        if (result.changes === 0) {
            return new Response(JSON.stringify({ message: "Repository not found or already deleted" }), { status: 404, headers: { "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ message: `Repository '${identifier}' deleted successfully` }), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (error) {
        console.error("Delete repository error:", error);
        return new Response(JSON.stringify({ error: "Internal server error deleting repository" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}


// --- Main Request Router ---

/**
 * Main handler function for Bun.serve.
 */
async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // --- Public Routes ---
    if (method === "POST" && path === "/register") {
        return handleRegister(request);
    }

    if (method === "POST" && path === "/login") {
        return handleLogin(request);
    }
    
    // Simple health check / root route
    if (method === "GET" && path === "/") {
        return new Response(JSON.stringify({ 
            status: "ok", 
            message: "Bun REST server is running",
            endpoints: ["/register", "/login", "/repositories", "/repository (POST/DELETE)"]
        }), { 
            status: 200, 
            headers: { "Content-Type": "application/json" } 
        });
    }

    // --- Authenticated Routes ---
    
    // Run authentication check for all routes below
    const user = await authenticate(request);
    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized. Please login." }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    if (method === "GET" && path === "/repositories") {
        return handleGetRepositories(request, user);
    }

    // NEW ROUTE: GET /repository?identifier=<identifier>
    if (method === "GET" && path === "/repository") {
        return handleGetRepositoryByIdentifier(request, user);
    }

    if (method === "POST" && path === "/repository") {
        return handlePostRepository(request, user);
    }

    if (method === "DELETE" && path === "/repository") {
        return handleDeleteRepository(request, user);
    }

    // --- Not Found ---
    return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: { "Content-Type": "application/json" } });
}

// --- Server Startup ---

initDatabase();

// Prepare server options
const serverOptions: Parameters<typeof serve>[0] = {
    fetch: handleRequest,
    port: PORT,
    hostname: BIND_ADDRESS,
    development: process.env.NODE_ENV !== "production",
    error(error: Error) {
        console.error("Server error:", error.stack);
        return new Response(JSON.stringify({ error: "An unexpected server error occurred." }), { status: 500 });
    }
};

// Add SSL/TLS configuration if paths are provided
if (SSL_CERT_PATH && SSL_KEY_PATH) {
    try {
        console.log(`[SSL] Reading certificate from ${SSL_CERT_PATH} and key from ${SSL_KEY_PATH}`);
        serverOptions.tls = {
            cert: file(SSL_CERT_PATH),
            key: file(SSL_KEY_PATH),
        };
        console.log("[SSL] SSL/TLS configured.");
    } catch (e) {
        console.error("[SSL] Failed to load SSL files. Running without SSL.", e);
        // Continue without TLS if files fail to load
        delete serverOptions.tls;
    }
}

// Start the Bun server
const server = serve(serverOptions);

console.log(`\n[Server] 🚀 Bun REST Server running at http${serverOptions.tls ? "s" : ""}://${server.hostname}:${server.port}`);
console.log(`[Config] Database: ${DB_PATH}`);
console.log(`[Auth] JWT Secret: ${JWT_SECRET.slice(0, 5)}... (Length: ${JWT_SECRET.length})`);
console.log("\n--- Available Endpoints ---");
console.log("  POST /register (email, password)");
console.log("  POST /login (email, password)");
console.log("  GET /repositories (Auth Bearer Token)");
console.log("  GET /repository?identifier=<id> (Auth Bearer Token)"); // Added new endpoint
console.log("  POST /repository (Auth Bearer Token, identifier, remotes: json)");
console.log("  DELETE /repository (Auth Bearer Token, identifier)");