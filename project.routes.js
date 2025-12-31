import express from 'express';
import { projectController } from '../controllers/project.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateProject } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticateToken);

// Project CRUD
router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.post('/', validateProject, projectController.createProject);
router.put('/:id', validateProject, projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

// Project actions
router.post('/:id/archive', projectController.archiveProject);
router.post('/:id/restore', projectController.restoreProject);
router.post('/:id/share', projectController.shareProject);
router.post('/:id/collaborators', projectController.addCollaborator);
router.delete('/:id/collaborators/:userId', projectController.removeCollaborator);

// Task management
router.get('/:id/tasks', projectController.getProjectTasks);
router.post('/:id/tasks', projectController.createTask);
router.put('/:id/tasks/:taskId', projectController.updateTask);
router.delete('/:id/tasks/:taskId', projectController.deleteTask);
router.post('/:id/tasks/:taskId/complete', projectController.completeTask);
router.post('/:id/tasks/reorder', projectController.reorderTasks);

// AI features
router.post('/:id/analyze', projectController.analyzeProject);
router.post('/:id/generate-tasks', projectController.generateTasks);
router.post('/:id/predict-timeline', projectController.predictTimeline);

// Analytics
router.get('/:id/analytics', projectController.getProjectAnalytics);
router.get('/:id/insights', projectController.getProjectInsights);

export default router;