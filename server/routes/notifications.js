const express = require('express');
const auth = require('../middleware/auth');
const { Notification, User } = require('../models');

const router = express.Router();

// GET /api/notifications
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where: { user_id: req.user.id },
      include: [
        { model: User, as: 'fromUser', attributes: ['id', 'username', 'display_name', 'avatar_url'] },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    const unreadCount = await Notification.count({
      where: { user_id: req.user.id, is_read: false },
    });

    res.json({
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/notifications/read — mark all as read
router.put('/read', auth, async (req, res) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.user.id, is_read: false } }
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/notifications/:id/read — mark one as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    notification.is_read = true;
    await notification.save();

    res.json({ message: 'Notification marked as read.', notification });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/notifications/unread-count — quick poll endpoint
router.get('/unread-count', auth, async (req, res) => {
  try {
    // If user has notifications disabled, always return 0
    if (!req.user.notifications_enabled) {
      return res.json({ unreadCount: 0 });
    }
    const count = await Notification.count({
      where: { user_id: req.user.id, is_read: false },
    });
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
