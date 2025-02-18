import express from 'express';
import dotenv from 'dotenv';
import { logRequest } from './services/logger/logger';
import { handleErrors } from './utils/errorHadler';
import { envValidationMiddleware } from './middleware/envVariablesCheck';
import psbRouter from './routes/psb';
import paydayRouter from './routes/payday';
dotenv.config();
// interface and port to launch web server on
const PORT = 3002;
const INTERFACE = 'localhost';
// creates web server
const app = express();
// validates .env constants
app.use(envValidationMiddleware);
// подключаю миддлеваре >>>>>>>>>>>>>>
app.use(express.json()); // Parse JSON
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data
app.use(logRequest);
// Описываю маршруты >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
app.use('/psb', psbRouter);
app.use('/paydayreport', paydayRouter);
// errors handler
app.use(handleErrors)
// определяю точку входа
async function main() {
	app.listen(PORT, INTERFACE, () => {
		console.log(`The server started on ${INTERFACE} port ${PORT}`);
	});
}
main();
