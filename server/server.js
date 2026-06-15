require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const sequelize = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const likeRoutes = require('./routes/likes');
const friendRoutes = require('./routes/friends');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/posts', commentRoutes); // mounted at /api/posts/:postId/comments
app.use('/api/posts', likeRoutes);     // mounted at /api/posts/:postId/like
app.use('/api/friends', friendRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// Comment delete route needs separate mount
app.delete('/api/comments/:id', require('./middleware/auth'), async (req, res) => {
  const { Comment } = require('./models');
  try {
    const comment = await Comment.findByPk(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });
    if (comment.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized.' });
    await comment.destroy();
    res.json({ message: 'Comment deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Comment edit route
app.put('/api/comments/:id', require('./middleware/auth'), async (req, res) => {
  const { Comment, User, CommentLike } = require('./models');
  try {
    if (!req.body.content || !req.body.content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    const comment = await Comment.findByPk(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });
    if (comment.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized.' });
    
    await comment.update({ content: req.body.content.trim() });
    
    const fullComment = await Comment.findByPk(comment.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] },
        { model: CommentLike, as: 'likes' },
      ],
    });
    const cJson = fullComment.toJSON();
    cJson.likeCount = cJson.likes ? cJson.likes.length : 0;
    cJson.isLiked = cJson.likes ? cJson.likes.some((l) => l.user_id === req.user.id) : false;
    delete cJson.likes;
    
    res.json({ comment: cJson });
  } catch (error) {
    console.error('Comment edit error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Comment like route
app.post('/api/comments/:id/like', require('./middleware/auth'), async (req, res) => {
  const { Comment, CommentLike, Notification } = require('./models');
  try {
    const commentId = parseInt(req.params.id);
    const comment = await Comment.findByPk(commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });

    const existingLike = await CommentLike.findOne({
      where: { comment_id: commentId, user_id: req.user.id },
    });

    if (existingLike) {
      await existingLike.destroy();
    } else {
      await CommentLike.create({
        comment_id: commentId,
        user_id: req.user.id,
      });

      if (comment.user_id !== req.user.id) {
        await Notification.create({
          user_id: comment.user_id,
          type: 'like',
          reference_id: comment.post_id,
          from_user_id: req.user.id,
          message: `${req.user.display_name || req.user.username} liked your comment.`,
        });
      }
    }

    const likeCount = await CommentLike.count({ where: { comment_id: commentId } });
    res.json({ liked: !existingLike, likeCount });
  } catch (error) {
    console.error('Comment like error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// Database sync and server start
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully.');

    // Sync models (creates tables if they don't exist)
    await sequelize.sync({ alter: false });
    console.log('✅ Database models synced.');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
