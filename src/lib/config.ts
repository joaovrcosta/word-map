export const config = {
  jwt: {
    secret: process.env.JWT_SECRET || "fallback-secret-key",
    expiresIn: "7d",
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  app: {
    env: process.env.NODE_ENV || "development",
  },
};
