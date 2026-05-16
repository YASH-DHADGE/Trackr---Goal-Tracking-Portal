import { Router } from 'express';
import { getAllUsers, updateUserRole, toggleUserActive } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleGuard } from '../middleware/roleGuard';

const router = Router();

router.use(authMiddleware);
router.use(roleGuard(['admin']));

router.get('/', getAllUsers);
router.patch('/:id/role', updateUserRole);
router.patch('/:id/toggle', toggleUserActive);

export default router;
