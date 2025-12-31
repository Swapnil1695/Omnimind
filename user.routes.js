import express from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(authenticateToken);

// User profile
router.get('/me', userController.getCurrentUser);
router.put('/me', upload.single('avatar'), userController.updateProfile);
router.get('/stats', userController.getUserStats);

// Team management
router.get('/team', userController.getTeam);
router.post('/team/invite', userController.inviteTeamMember);
router.put('/team/:userId/role', userController.updateTeamRole);
router.delete('/team/:userId', userController.removeTeamMember);

// Skills & Availability
router.get('/skills', userController.getUserSkills);
router.post('/skills', userController.addSkill);
router.put('/skills/:id', userController.updateSkill);
router.delete('/skills/:id', userController.removeSkill);
router.get('/availability', userController.getAvailability);
router.put('/availability', userController.updateAvailability);

// Activity & Productivity
router.get('/activity', userController.getUserActivity);
router.get('/productivity', userController.getProductivityStats);
router.get('/timeline', userController.getUserTimeline);

// Admin routes
router.get('/', authorizeRoles(['admin']), userController.getAllUsers);
router.get('/:id', authorizeRoles(['admin']), userController.getUserById);
router.put('/:id/status', authorizeRoles(['admin']), userController.updateUserStatus);
router.delete('/:id', authorizeRoles(['admin']), userController.deleteUser);

// Billing & Subscription (for future premium features)
router.get('/subscription', userController.getSubscription);
router.post('/subscribe', userController.createSubscription);
router.post('/cancel-subscription', userController.cancelSubscription);

export default router;