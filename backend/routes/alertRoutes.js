const router = require('express').Router();
const alertController = require('../controllers/alertController');
const auth = require('../middlewares/auth');

router.get('/', auth, alertController.getAll);
router.get('/unread-count', auth, alertController.getUnreadCount);
router.patch('/:id/read', auth, alertController.markRead);
router.patch('/read-all', auth, alertController.markAllRead);
router.delete('/:id', auth, alertController.dismiss);

module.exports = router;
