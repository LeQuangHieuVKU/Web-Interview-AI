import mongoose from "mongoose";
import dns from "node:dns";

const RETRY_DELAY_MS = 5000;
const DEFAULT_DNS_SERVERS = ["8.8.8.8", "1.1.1.1"];

const configureDnsServers = () => {
  const envServers = process.env.DNS_SERVERS
    ? process.env.DNS_SERVERS.split(",").map((server) => server.trim())
    : DEFAULT_DNS_SERVERS;

  const validServers = envServers.filter(Boolean);
  if (!validServers.length) return;

  try {
    dns.setServers(validServers);
  } catch (error) {
    console.warn(`Could not set custom DNS servers: ${error.message}`);
  }
};

const connectDb = async () => {
  const mongoUrl = process.env.MONGO_URL;

  if (!mongoUrl) {
    console.error("MONGO_URL is not set. Skipping MongoDB connection.");
    return;
  }

  configureDnsServers();

  try {
    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error}`);
    console.log(`Retrying MongoDB connection in ${RETRY_DELAY_MS / 1000}s...`);
    setTimeout(connectDb, RETRY_DELAY_MS);
  }
};

export default connectDb;
