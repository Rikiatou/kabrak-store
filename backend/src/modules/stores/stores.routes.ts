import { Router } from 'express';
import { getAll, create, update, remove, switchTo, overview, products, createTransfer, transfers, requireBusinessHome } from './stores.controller';
import { authorize } from '../../middleware/auth';

// An owner's boutiques. Listing and switching stay open so the owner can always get back to another boutique.
const router = Router();

router.use(authorize('OWNER'));
router.get('/', getAll);
router.post('/:id/switch', switchTo);
router.get('/overview', requireBusinessHome, overview);
router.get('/transfers', requireBusinessHome, transfers);
router.post('/transfers', requireBusinessHome, createTransfer);
router.get('/:id/products', requireBusinessHome, products);
router.post('/', requireBusinessHome, create);
router.put('/:id', requireBusinessHome, update);
router.delete('/:id', requireBusinessHome, remove);

export default router;
