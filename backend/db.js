const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const db = new sqlite3.Database(path.join(__dirname, 'knowledge.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

// Initialize database schema
function initDatabase() {
  db.serialize(() => {
    // Create articles table
    db.run(`CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      added TEXT NOT NULL,
      author TEXT,
      authorName TEXT,
      modifiedBy TEXT,
      modifiedByName TEXT,
      modifiedAt TEXT,
      knowledgeArticleId TEXT
    )`);

    // Create tags table
    db.run(`CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    )`);

    // Create article_tags junction table
    db.run(`CREATE TABLE IF NOT EXISTS article_tags (
      article_id INTEGER,
      tag_id INTEGER,
      PRIMARY KEY (article_id, tag_id),
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )`);
  });
}

// Helper functions for database operations
const dbHelpers = {
  // Get all articles
  getAllArticles: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM articles ORDER BY added DESC', [], async (err, articles) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          // Get tags for each article
          for (const article of articles) {
            article.tags = await dbHelpers.getArticleTags(article.id);
          }
          resolve(articles);
        } catch (err) {
          reject(err);
        }
      });
    });
  },

  // Add new article
  addArticle: (article) => {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO articles (
          id, title, description, status, added, author, authorName
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        article.id,
        article.title,
        article.description,
        article.status,
        article.added,
        article.author,
        article.authorName,
        (err) => {
          if (err) reject(err);
          else resolve(article);
        }
      );
      
      stmt.finalize();
    });
  },

  // Update article
  updateArticle: (id, updates) => {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      // Build dynamic update query
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });
      
      if (fields.length === 0) {
        reject(new Error('No fields to update'));
        return;
      }
      
      values.push(id);
      
      const query = `
        UPDATE articles 
        SET ${fields.join(', ')}
        WHERE id = ?
      `;
      
      db.run(query, values, function(err) {
        if (err) reject(err);
        else {
          // Get updated article
          db.get('SELECT * FROM articles WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        }
      });
    });
  },

  // Delete article
  deleteArticle: (id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM articles WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  },

  // Get article by ID
  getArticleById: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM articles WHERE id = ?', [id], async (err, article) => {
        if (err) {
          reject(err);
          return;
        }

        if (!article) {
          resolve(null);
          return;
        }

        try {
          article.tags = await dbHelpers.getArticleTags(article.id);
          resolve(article);
        } catch (err) {
          reject(err);
        }
      });
    });
  },

  // Get statistics
  getStats: (startDate, endDate) => {
    return new Promise((resolve, reject) => {
      const start = startDate ? new Date(startDate).toISOString() : '1970-01-01T00:00:00.000Z';
      const end = endDate ? new Date(endDate).toISOString() : new Date().toISOString();
      
      db.all(`
        SELECT 
          COUNT(*) as totalArticles,
          SUM(CASE WHEN added BETWEEN ? AND ? THEN 1 ELSE 0 END) as articlesAdded,
          SUM(CASE WHEN modifiedAt BETWEEN ? AND ? THEN 1 ELSE 0 END) as statusChanges,
          SUM(CASE WHEN status = 'Backlog' THEN 1 ELSE 0 END) as backlogCount,
          SUM(CASE WHEN status = 'Documented' THEN 1 ELSE 0 END) as documentedCount
        FROM articles
      `, [start, end, start, end], (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0]);
      });
    });
  },

  // Get user statistics
  getUserStats: (startDate, endDate) => {
    return new Promise((resolve, reject) => {
      const start = startDate ? new Date(startDate).toISOString() : '1970-01-01T00:00:00.000Z';
      const end = endDate ? new Date(endDate).toISOString() : new Date().toISOString();
      
      db.all(`
        SELECT 
          authorName as username,
          COUNT(*) as articlesAdded,
          SUM(CASE WHEN modifiedAt BETWEEN ? AND ? THEN 1 ELSE 0 END) as statusChanges
        FROM articles
        WHERE added BETWEEN ? AND ?
        GROUP BY authorName
      `, [start, end, start, end], (err, rows) => {
        if (err) reject(err);
        else {
          const userStats = {};
          rows.forEach(row => {
            userStats[row.username] = {
              articlesAdded: row.articlesAdded,
              statusChanges: row.statusChanges
            };
          });
          resolve(userStats);
        }
      });
    });
  },

  // Tag-related functions
  getAllTags: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM tags ORDER BY name ASC', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  getOrCreateTag: (tagName) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM tags WHERE name = ?', [tagName], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row) {
          resolve(row);
          return;
        }
        
        // Create new tag if it doesn't exist
        const stmt = db.prepare(`
          INSERT INTO tags (name, created_at)
          VALUES (?, ?)
        `);
        
        const now = new Date().toISOString();
        stmt.run(tagName, now, function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          // Get the newly created tag
          db.get('SELECT * FROM tags WHERE id = ?', [this.lastID], (err, newTag) => {
            if (err) reject(err);
            else resolve(newTag);
          });
        });
        
        stmt.finalize();
      });
    });
  },

  getArticleTags: (articleId) => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT t.* 
        FROM tags t
        JOIN article_tags at ON t.id = at.tag_id
        WHERE at.article_id = ?
        ORDER BY t.name ASC
      `, [articleId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  setArticleTags: async (articleId, tagNames) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Start a transaction
        db.run('BEGIN TRANSACTION');
        
        // Delete existing tags for this article
        db.run('DELETE FROM article_tags WHERE article_id = ?', [articleId], (err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }
          
          // If no tags provided, we're done
          if (!tagNames || tagNames.length === 0) {
            db.run('COMMIT');
            resolve();
            return;
          }
          
          // Process each tag
          let processed = 0;
          tagNames.forEach(async (tagName) => {
            try {
              // Get or create the tag
              const tag = await dbHelpers.getOrCreateTag(tagName);
              
              // Add the article-tag relationship
              db.run(
                'INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)',
                [articleId, tag.id],
                (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    reject(err);
                    return;
                  }
                  
                  processed++;
                  if (processed === tagNames.length) {
                    db.run('COMMIT');
                    resolve();
                  }
                }
              );
            } catch (err) {
              db.run('ROLLBACK');
              reject(err);
            }
          });
        });
      });
    });
  },

  // Clear articles table
  clearArticles: () => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM articles', [], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  },

  // Clear tags table
  clearTags: () => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM tags', [], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  },

  // Clear article_tags junction table
  clearArticleTags: () => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM article_tags', [], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }
};

module.exports = { db, dbHelpers }; 