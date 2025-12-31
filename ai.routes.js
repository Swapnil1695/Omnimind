import express from 'express';
import { aiController } from '../controllers/ai.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(authenticateToken);

// AI Assistant
router.post('/chat', aiController.chat);
router.post('/voice', aiController.processVoice);
router.get('/conversations', aiController.getConversations);
router.get('/conversations/:id', aiController.getConversation);
router.delete('/conversations/:id', aiController.deleteConversation);

// Document Analysis
router.post('/analyze-document', upload.single('document'), aiController.analyzeDocument);
router.post('/analyze-email', aiController.analyzeEmail);
router.post('/extract-data', upload.array('files', 5), aiController.extractData);

// Project Generation
router.post('/generate-project', aiController.generateProject);
router.post('/optimize-schedule', aiController.optimizeSchedule);
router.post('/suggest-resources', aiController.suggestResources);

// Error Detection
router.post('/detect-errors', aiController.detectErrors);
router.post('/suggest-fixes', aiController.suggestFixes);
router.post('/auto-correct', aiController.autoCorrect);

// Predictive Analytics
router.post('/predict-risks', aiController.predictRisks);
router.post('/forecast-completion', aiController.forecastCompletion);
router.post('/recommend-actions', aiController.recommendActions);

// Learning & Improvement
router.post('/feedback', aiController.submitFeedback);
router.get('/ai-stats', aiController.getAIStats);

export default router;