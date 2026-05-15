const express = require('express');
const auth = require('../middleware/auth');
const { Like, Post, Notification } = require('../models');

const router = express.Router();

// POST /api/posts/:postId/like — toggle like
router.post('/:postId/like', auth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const existingLike = await Like.findOne({
      where: { post_id: post.id, user_id: req.user.id },
    });

    if (existingLike) {
      // Unlike
      await existingLike.destroy();
      const likeCount = await Like.count({ where: { post_id: post.id } });
      return res.json({ liked: false, likeCount });
    }

    // Like
    await Like.create({ post_id: post.id, user_id: req.user.id });
    const likeCount = await Like.count({ where: { post_id: post.id } });

    // Notify post author (unless liking own post)
    if (post.user_id !== req.user.id) {
      await Notification.create({
        user_id: post.user_id,
        type: 'like',
        reference_id: post.id,
        from_user_id: req.user.id,
        message: `${req.user.display_name || req.user.username} liked your post.`,
      });
    }

    res.json({ liked: true, likeCount });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
