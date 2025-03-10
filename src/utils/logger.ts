/**
 * Logger service for the application
 * Centralizes logging functionality with different log levels and formatting
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
	[key: string]: unknown;
}

interface Logger {
	error(message: string, context?: LogContext): void;
	warn(message: string, context?: LogContext): void;
	info(message: string, context?: LogContext): void;
	debug(message: string, context?: LogContext): void;
}

/**
 * Format log context object to a string representation
 */
function formatContext(context?: LogContext): string {
	if (!context || Object.keys(context).length === 0) {
		return '';
	}

	try {
		return Object.entries(context)
			.map(([key, value]) => {
				// Handle Error objects specially
				if (value instanceof Error) {
					return `${key}: ${value.message}`;
				}

				// For other values, use JSON stringification
				try {
					return `${key}: ${JSON.stringify(value)}`;
				} catch (err) {
					return `${key}: [Unstringifiable]`;
				}
			})
			.join(', ');
	} catch (err) {
		return '[Error formatting context]';
	}
}

/**
 * Create timestamp for log entries
 */
function getTimestamp(): string {
	return new Date().toISOString();
}

/**
 * Log a message with level and context
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
	const timestamp = getTimestamp();
	const contextStr = formatContext(context);
	const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr ? ` - ${contextStr}` : ''}`;

	switch (level) {
		case 'error':
			console.error(logMessage);
			break;
		case 'warn':
			console.warn(logMessage);
			break;
		case 'info':
			console.info(logMessage);
			break;
		case 'debug':
			// Only log debug messages in development environment
			if (process.env.NODE_ENV !== 'production') {
				console.debug(logMessage);
			}
			break;
	}
}

/**
 * Application logger implementation
 */
export const logger: Logger = {
	error: (message: string, context?: LogContext) => log('error', message, context),
	warn: (message: string, context?: LogContext) => log('warn', message, context),
	info: (message: string, context?: LogContext) => log('info', message, context),
	debug: (message: string, context?: LogContext) => log('debug', message, context),
};

/**
 * Create a logger with a specific prefix for module-level logging
 */
export function createLogger(prefix: string): Logger {
	return {
		error: (message: string, context?: LogContext) => logger.error(`[${prefix}] ${message}`, context),
		warn: (message: string, context?: LogContext) => logger.warn(`[${prefix}] ${message}`, context),
		info: (message: string, context?: LogContext) => logger.info(`[${prefix}] ${message}`, context),
		debug: (message: string, context?: LogContext) => logger.debug(`[${prefix}] ${message}`, context),
	};
}
