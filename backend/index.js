const express = require('express');
const { authorizedUsers, isUserAuthorized } = require('./authorizedUsers');
const { dbHelpers } = require('./db');
const app = express();
const PORT = process.env.PORT || 3001;

// Add CORS middleware
app.use((req, res, next) => {
  // Allow requests from any origin
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Auth-User');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());

// Helper function to extract username from domain\username format
const extractUsername = (domainUsername) => {
  if (!domainUsername) return '';
  const parts = domainUsername.split('\\');
  return parts.length > 1 ? parts[1] : domainUsername;
};

// Authentication Middleware
// This middleware extracts the authenticated user from the X-Auth-User header
// that is set by the Nginx proxy using HTTP basic auth
app.use((req, res, next) => {
  console.log('Request headers:', req.headers);
  
  // Get authenticated user from header (this is set by Nginx using $remote_user)
  const authUser = req.headers['x-auth-user'] || '';
  console.log('Raw authUser from header:', authUser);
  
  // Make it consistently lowercase
  req.authUser = authUser.toLowerCase();
  console.log('Lowercase authUser:', req.authUser);
  
  // Also store the clean username without domain prefix
  req.username = extractUsername(req.authUser);
  console.log('Extracted username:', req.username);
  
  // Pass to the next middleware
  next();
});

// Authorization middleware - only allow specified users
const authorizeUser = (req, res, next) => {
  console.log('Current user:', req.authUser); // Debug to see what user is being sent
  
  // Check if user is authorized using the imported function
  if (isUserAuthorized(req.authUser)) {
    next(); // User is authorized, continue
  } else {
    // User not authorized
    res.status(403).json({ error: 'You have no permission!' });
  }
};

// GET /api/knowledge — List all articles
app.get('/api/knowledge', authorizeUser, async (req, res) => {
  try {
    const articles = await dbHelpers.getAllArticles();
    res.json(articles);
  } catch (err) {
    console.error('Error fetching articles:', err);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// GET /api/user/stats — Get user-specific statistics
app.get('/api/user/stats', authorizeUser, async (req, res) => {
  try {
    const userStats = await dbHelpers.getUserStats();
    const userData = userStats[req.username] || { articlesAdded: 0, statusChanges: 0 };
    
    // Count documented articles for this user
    const articles = await dbHelpers.getAllArticles();
    const documentedCount = articles.filter(article => 
      article.modifiedByName === req.username && article.status === 'Documented'
    ).length;
    
    res.json({
      articlesAdded: userData.articlesAdded,
      statusChanges: userData.statusChanges,
      documentedCount
    });
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// GET /api/tags — List all tags
app.get('/api/tags', authorizeUser, async (req, res) => {
  try {
    const tags = await dbHelpers.getAllTags();
    res.json(tags);
  } catch (err) {
    console.error('Error fetching tags:', err);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// POST /api/knowledge — Add a new article
app.post('/api/knowledge', authorizeUser, async (req, res) => {
  const { title, description, status, tags } = req.body;
  if (!title || !description || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const newArticle = { 
      id: Date.now(), 
      title, 
      description, 
      status,
      added: new Date().toISOString(),
      author: req.authUser,
      authorName: req.username
    };

    await dbHelpers.addArticle(newArticle);
    
    // Add tags if provided
    if (tags && Array.isArray(tags)) {
      await dbHelpers.setArticleTags(newArticle.id, tags);
    }

    // Get the complete article with tags
    const completeArticle = await dbHelpers.getArticleById(newArticle.id);
    res.status(201).json(completeArticle);
  } catch (err) {
    console.error('Error adding article:', err);
    res.status(500).json({ error: 'Failed to add article' });
  }
});

// PATCH /api/knowledge/:id — Update article status
app.patch('/api/knowledge/:id', authorizeUser, async (req, res) => {
  const { id } = req.params;
  const { status, knowledgeArticleId } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  
  try {
    const updates = {
      status,
      modifiedBy: req.authUser,
      modifiedByName: req.username,
      modifiedAt: new Date().toISOString()
    };

    if (knowledgeArticleId) {
      updates.knowledgeArticleId = knowledgeArticleId;
    }

    const updatedArticle = await dbHelpers.updateArticle(parseInt(id), updates);
    
    if (!updatedArticle) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    res.json(updatedArticle);
  } catch (err) {
    console.error('Error updating article:', err);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// PUT /api/knowledge/:id — Update entire article
app.put('/api/knowledge/:id', authorizeUser, async (req, res) => {
  const { id } = req.params;
  const { title, description, status, tags } = req.body;
  
  if (!title || !description || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const updates = {
      title,
      description,
      status,
      modifiedBy: req.authUser,
      modifiedByName: req.username,
      modifiedAt: new Date().toISOString()
    };

    const updatedArticle = await dbHelpers.updateArticle(parseInt(id), updates);
    
    if (!updatedArticle) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Update tags if provided
    if (tags && Array.isArray(tags)) {
      await dbHelpers.setArticleTags(parseInt(id), tags);
    }

    // Get the complete article with tags
    const completeArticle = await dbHelpers.getArticleById(parseInt(id));
    res.json(completeArticle);
  } catch (err) {
    console.error('Error updating article:', err);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// DELETE /api/knowledge/:id — Delete article
app.delete('/api/knowledge/:id', authorizeUser, async (req, res) => {
  const { id } = req.params;
  
  try {
    const deleted = await dbHelpers.deleteArticle(parseInt(id));
    
    if (!deleted) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting article:', err);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

// Get current authenticated user
app.get('/api/auth/user', (req, res) => {
  res.json({ 
    user: req.authUser,
    username: req.username,
    isAuthenticated: !!req.authUser,
    isAuthorized: req.authUser ? isUserAuthorized(req.authUser) : false
  });
});

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const password = req.body.password || req.headers['x-admin-password'];
  
  // Simple password check
  if (password === 'password123') {
    next();
  } else {
    res.status(401).json({ error: 'Invalid admin password' });
  }
};

// GET /api/admin/stats — Get admin statistics
app.post('/api/admin/stats', authenticateAdmin, async (req, res) => {
  const { startDate, endDate } = req.body;
  
  try {
    const [stats, userStats] = await Promise.all([
      dbHelpers.getStats(startDate, endDate),
      dbHelpers.getUserStats(startDate, endDate)
    ]);

    res.json({
      ...stats,
      statusBreakdown: {
        Backlog: stats.backlogCount || 0,
        Documented: stats.documentedCount || 0
      },
      userStats
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/admin/users — Get list of authorized users
app.get('/api/admin/users', authenticateAdmin, (req, res) => {
  try {
    res.json({ users: authorizedUsers });
  } catch (err) {
    console.error('Error fetching authorized users:', err);
    res.status(500).json({ error: 'Failed to fetch authorized users' });
  }
});

// POST /api/admin/users — Add a new authorized user
app.post('/api/admin/users', authenticateAdmin, (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  try {
    // Normalize username to lowercase
    const normalizedUsername = username.toLowerCase();
    
    // Check if user already exists
    if (authorizedUsers.includes(normalizedUsername)) {
      return res.status(400).json({ error: 'User is already authorized' });
    }
    
    // Add the new user
    authorizedUsers.push(normalizedUsername);
    
    // Update the authorizedUsers.js file
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'authorizedUsers.js');
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const updatedContent = fileContent.replace(
      /const authorizedUsers = \[([\s\S]*?)\];/,
      `const authorizedUsers = [\n  ${authorizedUsers.map(user => `'${user}'`).join(',\n  ')},\n  // Add additional authorized users here\n];`
    );
    
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
    
    res.status(201).json({ message: 'User added successfully', users: authorizedUsers });
  } catch (err) {
    console.error('Error adding authorized user:', err);
    res.status(500).json({ error: 'Failed to add authorized user' });
  }
});

// DELETE /api/admin/users/:username — Remove an authorized user
app.delete('/api/admin/users/:username', authenticateAdmin, (req, res) => {
  const { username } = req.params;
  
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  try {
    // Normalize username to lowercase
    const normalizedUsername = username.toLowerCase();
    
    // Check if user exists
    const userIndex = authorizedUsers.indexOf(normalizedUsername);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found in authorized list' });
    }
    
    // Remove the user
    authorizedUsers.splice(userIndex, 1);
    
    // Update the authorizedUsers.js file
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'authorizedUsers.js');
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const updatedContent = fileContent.replace(
      /const authorizedUsers = \[([\s\S]*?)\];/,
      `const authorizedUsers = [\n  ${authorizedUsers.map(user => `'${user}'`).join(',\n  ')},\n  // Add additional authorized users here\n];`
    );
    
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
    
    res.json({ message: 'User removed successfully', users: authorizedUsers });
  } catch (err) {
    console.error('Error removing authorized user:', err);
    res.status(500).json({ error: 'Failed to remove authorized user' });
  }
});

// POST /api/admin/clear-database — Clear all data except users
app.post('/api/admin/clear-database', authenticateAdmin, async (req, res) => {
  try {
    // Clear articles table
    await dbHelpers.clearArticles();
    // Clear tags table
    await dbHelpers.clearTags();
    // Clear article_tags junction table
    await dbHelpers.clearArticleTags();
    
    res.json({ message: 'Database cleared successfully' });
  } catch (err) {
    console.error('Error clearing database:', err);
    res.status(500).json({ error: 'Failed to clear database' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export the app and PORT for testing/importing
module.exports = { app, PORT }; 