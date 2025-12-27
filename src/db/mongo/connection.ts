import mongoose from "mongoose";
import logger from "../../logger";

/**
 * Mongoose Connection Helper
 * Connects to MongoDB reliably with retries
 */
export default class MongoConnection {
	private mongoUrl: string;
	private onConnectedCallback: Function = () => {};
	private isConnectedBefore = false;

	/**
	 * @param mongoUrl MongoDB connection URL, example: mongodb://localhost:27017/books
	 */
	constructor(mongoUrl: string) {
		this.mongoUrl = mongoUrl;
		this.setupConnectionListeners();
	}

	/**
	 * Setup Mongoose connection listeners
	 */
	private setupConnectionListeners() {
		mongoose.connection.on("error", this.onError);
		mongoose.connection.on("disconnected", this.onDisconnected);
		mongoose.connection.on("connected", this.onConnected);
		mongoose.connection.on("reconnected", this.onReconnected);
	}

	/**
	 * Close connection to MongoDB
	 * @param onClosed Callback function when disconnecting is complete
	 */
	public close(onClosed?: (err?: Error) => void) {
		logger.info("Closing MongoDB connection...");
		// Mongoose 6.x: connection.close() returns a Promise and no longer accepts a callback.
		mongoose.connection
			.close()
			.then(() => {
				if (onClosed) onClosed();
			})
			.catch(err => {
				if (onClosed) onClosed(err);
				else logger.error("Error closing MongoDB connection:", err);
			});
	}

	/**
	 * Attempt to connect to MongoDB
	 * @param onConnectedCallback Function to be called when the connection is established
	 */
	public connect(onConnectedCallback?: Function) {
		if (onConnectedCallback) {
			this.onConnectedCallback = onConnectedCallback;
		}

		// Mongoose 6.x no longer needs the old connection options like `useNewUrlParser`
		mongoose
			.connect(this.mongoUrl)
			.then(() => {
				mongoose.set("toJSON", { versionKey: false, virtuals: true });
				mongoose.set("toObject", { versionKey: false, virtuals: true });
			})
			.catch(error => {
				logger.error("Error connecting to MongoDB:", error);
			});
	}

	/**
	 * `onConnected` callback for Mongoose
	 */
	private onConnected = () => {
		logger.info("Connected to MongoDB");
		this.isConnectedBefore = true;
		if (this.onConnectedCallback) {
			this.onConnectedCallback();
		}
	};

	/**
	 * `onReconnected` callback for Mongoose
	 */
	private onReconnected = () => {
		logger.info("Reconnected to MongoDB");
	};

	/**
	 * `onError` callback for Mongoose
	 */
	private onError = (error: any) => {
		logger.error(`MongoDB connection error: ${error.message || error}`);
	};

	/**
	 * `onDisconnected` callback for Mongoose
	 * Reconnects if the connection is lost
	 */
	private onDisconnected = () => {
		if (!this.isConnectedBefore) {
			logger.info("Retrying MongoDB connection...");
			setTimeout(() => {
				this.connect();
			}, 2000);
		} else {
			logger.warn("MongoDB disconnected");
		}
	};
}
