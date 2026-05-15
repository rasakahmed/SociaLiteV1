const Filter = require('bad-words');
const filter = new Filter();

// Add any additional custom words
// filter.addWords('customword1', 'customword2');

/**
 * Middleware that checks 'content' field in request body for profanity.
 * Replaces profanity with asterisks rather than rejecting the request,
 * providing a better UX while still filtering content.
 */
const profanityFilter = (req, res, next) => {
  try {
    if (req.body && req.body.content && typeof req.body.content === 'string') {
      req.body.content = filter.clean(req.body.content);
    }
  } catch (err) {
    // If filter fails, let content through rather than blocking
    console.error('Profanity filter error:', err);
  }
  next();
};

/**
 * Strict version that rejects the request if profanity is detected.
 */
const profanityReject = (req, res, next) => {
  try {
    if (req.body && req.body.content && typeof req.body.content === 'string') {
      if (filter.isProfane(req.body.content)) {
        return res.status(400).json({
          error: 'Your content contains inappropriate language. Please revise and try again.',
        });
      }
    }
  } catch (err) {
    console.error('Profanity check error:', err);
  }
  next();
};

module.exports = { profanityFilter, profanityReject };
