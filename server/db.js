import { MongoClient } from "mongodb";
import dotenv from 'dotenv'; // Load environment variables from .env file
dotenv.config();// Configure MongoDB connection parameters from environment or defaults

const MONGO_URL = process.env.mongo_url || 'mongodb:localhost';// MONGO_URL: MongoDB server URL (default: 'mongodb:localhost')
const MONGO_PORT = process.env.mongo_port || 27017;// MONGO_PORT: MongoDB port (default: 27017)
const MONGO_DB_NAME = process.env.mongo_name;// MONGO_DB_NAME: Database name from environment variable
const mongo_url = `${MONGO_URL}:${MONGO_PORT}`;

// MongoDB client instance - singleton pattern
// Global db variable holds active database connection
const client = new MongoClient(mongo_url);
let db;

// Establish connection to MongoDB
// Returns: database instance
// Connects client and initializes db variable
// Must be called before using getDB()
async function connectDB() {
    await client.connect();
    db = client.db(MONGO_DB_NAME);
    return db;
}

// Get active database connection
// Returns: database instance
// Throws error if connectDB() hasn't been called yet
// Used by all route handlers to access database
function getDB() {
    if (!db) throw new Error("DB not initialized. Call connectDB() first.");
    return db;
}

// Test database connection
// Returns: ping command result
// Verifies database is responsive
// Logs success message to console
async function health() {
    let result = await db.command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    return result;
} 

// Close database connection
// Closes MongoDB client connection
// Resets db variable to null
// Should be called on application shutdown
async function closeDB() {
    await client.close();
    db = null;
    console.log("Database connection closed");
}

export { connectDB, getDB, health, closeDB, db };