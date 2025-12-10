import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import apiRouter from './routes/index.js';
import {errorHandler} from './middlewares/errorHandler.js';
import swipeRoutes from './routes/swipeRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
const app = express();
app.use(cors());
// Increase body size limit to 50MB for image uploads (base64 encoded images can be large)
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));
app.use(morgan('dev'));

app.use('/api', apiRouter);
app.use('/api/swipe', swipeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/match', matchRoutes);
app.get('/health', (req, res) => {
  res.status(200).json({status: 'ok'});
});

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Pryvo API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
    },
  });
});

app.use(errorHandler);

export default app;
