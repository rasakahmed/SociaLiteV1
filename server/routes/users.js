const express = require('express');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { User, Post, FriendRequest, Block } = require('../models');

const router = express.Router();

// GET /api/users/search?q=
router.get('/search', auth, async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters.' });
    }

    const blocks = await Block.findAll({
      where: {
        [Op.or]: [
          { blocker_id: req.user.id },
          { blocked_id: req.user.id },
        ],
      },
    });

    const blockedIds = blocks.map((b) =>
      b.blocker_id === req.user.id ? b.blocked_id : b.blocker_id
    );

    const users = await User.findAll({
      where: {
        [Op.and]: [
          { id: { [Op.ne]: req.user.id } },
          { id: { [Op.notIn]: blockedIds } },
          {
            [Op.or]: [
              { username: { [Op.like]: `%${query}%` } },
              { display_name: { [Op.like]: `%${query}%` } },
              { bio: { [Op.like]: `%${query}%` } },
            ],
          },
        ],
      },
      attributes: ['id', 'username', 'display_name', 'avatar_url', 'bio'],
      limit: 20,
    });

    res.json({ users });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/users/blocked — list blocked users
router.get('/blocked', auth, async (req, res) => {
  try {
    const blocks = await Block.findAll({
      where: { blocker_id: req.user.id },
      include: [
        { model: User, as: 'blocked', attributes: ['id', 'username', 'display_name', 'avatar_url'] },
      ],
    });

    const blockedUsers = blocks.map(b => b.blocked);
    res.json({ blockedUsers });
  } catch (error) {
    console.error('Get blocked users error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/users/:id — public profile
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'display_name', 'avatar_url', 'bio', 'created_at'],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Get post count
    const postCount = await Post.count({ where: { user_id: user.id } });

    // Get friend count
    const friendCount = await FriendRequest.count({
      where: {
        status: 'accepted',
        [Op.or]: [
          { sender_id: user.id },
          { receiver_id: user.id },
        ],
      },
    });

    // Check if blocked
    const blockRecord = await Block.findOne({
      where: { blocker_id: req.user.id, blocked_id: user.id },
    });

    res.json({
      user: {
        ...user.toJSON(),
        postCount,
        friendCount,
        isBlocked: !!blockRecord,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/users/profile — update own profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { display_name, bio } = req.body;

    const updates = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (bio !== undefined) updates.bio = bio;

    await req.user.update(updates);

    res.json({ user: req.user.toSafeJSON() });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/users/avatar — upload profile picture
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    const avatar_url = `/uploads/${req.file.filename}`;
    await req.user.update({ avatar_url });

    res.json({ avatar_url, user: req.user.toSafeJSON() });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/users/block/:id — block a user
router.post('/block/:id', auth, async (req, res) => {
  try {
    const blockedId = parseInt(req.params.id);
    if (blockedId === req.user.id) {
      return res.status(400).json({ error: 'Cannot block yourself.' });
    }

    const existingBlock = await Block.findOne({
      where: { blocker_id: req.user.id, blocked_id: blockedId },
    });

    if (existingBlock) {
      return res.status(400).json({ error: 'User is already blocked.' });
    }

    await Block.create({
      blocker_id: req.user.id,
      blocked_id: blockedId,
    });

    // Also remove any friend requests between the two
    await FriendRequest.destroy({
      where: {
        [Op.or]: [
          { sender_id: req.user.id, receiver_id: blockedId },
          { sender_id: blockedId, receiver_id: req.user.id },
        ],
      },
    });

    res.json({ message: 'User blocked successfully.' });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/users/block/:id — unblock a user
router.delete('/block/:id', auth, async (req, res) => {
  try {
    const blockedId = parseInt(req.params.id);
    const existingBlock = await Block.findOne({
      where: { blocker_id: req.user.id, blocked_id: blockedId },
    });

    if (!existingBlock) {
      return res.status(404).json({ error: 'Block not found.' });
    }

    await existingBlock.destroy();
    res.json({ message: 'User unblocked successfully.' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
