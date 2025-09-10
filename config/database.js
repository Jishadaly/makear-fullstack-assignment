const { MongoClient } = require("mongodb");

let db = null;
let client = null;

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is required");
    }

    if (!process.env.DB_NAME) {
      throw new Error("DB_NAME environment variable is required");
    }

    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    };

    client = new MongoClient(process.env.MONGODB_URI, options);
    await client.connect();

    await client.db(process.env.DB_NAME).command({ ping: 1 });

    db = client.db(process.env.DB_NAME);
    console.log(`Connected to MongoDB: ${process.env.DB_NAME}`);

  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error; 
  }
};

const getDB = () => {
  if (!db) throw new Error("Database not initialized. Call connectDB first.");
  return db;
};

const closeDB = async () => {
  if (client) {
    await client.close();
    console.log("✅ Database connection closed");
  }
};

// Graceful shutdown
process.on("SIGINT", closeDB);
process.on("SIGTERM", closeDB);

module.exports = { connectDB, getDB, closeDB };
