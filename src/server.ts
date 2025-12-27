import app from "./app";
import logger from "./logger";
import config from "./config/config";
import MongoConnection from "./db/mongo/connection";


const mongoConnection = new MongoConnection(config.MONGO_URL);

mongoConnection.connect(() => {
	app.listen(app.get("port"), (): void => {
		logger.info(
			`*\t🌏 Express server started at http://localhost:${app.get(
				"port"
			)}\t\t*`
    );
	});
});


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
