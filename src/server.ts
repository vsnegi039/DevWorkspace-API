import app from "./app";
import logger from "./logger";
import config from "./config/config";
import MongoConnection from "./db/mongo/connection";


const mongoConnection = new MongoConnection(config.MONGO_URL);

mongoConnection.connect(() => {});


// Close the Mongoose connection, when receiving SIGINT
process.on('SIGINT', () => {
  logger.info('\nGracefully shutting down');
  mongoConnection.close((err) => {
    if (err) {
      logger.log({
        level: 'error',
        message: 'Error shutting closing mongo connection',
        error: err,
      });
    }
    process.exit(0);
  });
});

export default app;