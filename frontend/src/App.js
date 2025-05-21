import React, { useEffect, useState } from 'react';
import {
  Container,
  CssBaseline,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  Card,
  CardContent,
  CardActions,
  MenuItem,
  Grid,
  IconButton,
  Alert,
  Snackbar,
  AppBar,
  Toolbar,
  InputAdornment,
  Chip,
  Divider,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Autocomplete,
  Link,
  Tooltip
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import PaletteIcon from '@mui/icons-material/Palette';
import Cookies from 'js-cookie';
import UserManagement from './components/UserManagement';

const statusOptions = [
  { value: 'Backlog', label: 'Backlog' },
  { value: 'Documented', label: 'Documented' },
];

// Format date helper function
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Extract username from domain format (domain\username)
const extractUsername = (domainUsername) => {
  if (!domainUsername) return '';
  const parts = domainUsername.split('\\');
  return parts.length > 1 ? parts[1] : domainUsername;
};

// Truncate text with ellipsis for preview
const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Add theme presets
const themePresets = [
  {
    name: 'Default',
    primary: '#90caf9',
    secondary: '#f48fb1'
  },
  {
    name: 'Ocean',
    primary: '#4fc3f7',
    secondary: '#4dd0e1'
  },
  {
    name: 'Forest',
    primary: '#66bb6a',
    secondary: '#9ccc65'
  },
  {
    name: 'Sunset',
    primary: '#ff7043',
    secondary: '#ffb74d'
  },
  {
    name: 'Royal',
    primary: '#7e57c2',
    secondary: '#b39ddb'
  },
  {
    name: 'Midnight',
    primary: '#5c6bc0',
    secondary: '#7986cb'
  }
];

function App() {
  const [articles, setArticles] = useState([]);
  const [form, setForm] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [authError, setAuthError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [articlesPerPage] = useState(5);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Admin state
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [clearDatabaseDialogOpen, setClearDatabaseDialogOpen] = useState(false);
  const [clearDatabaseError, setClearDatabaseError] = useState('');
  const [clearDatabaseSuccess, setClearDatabaseSuccess] = useState('');
  
  // Add new state for article management
  const [editingArticle, setEditingArticle] = useState(null);
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState(null);
  
  // Add new state for knowledge article ID
  const [knowledgeArticleDialogOpen, setKnowledgeArticleDialogOpen] = useState(false);
  const [knowledgeArticleId, setKnowledgeArticleId] = useState('');
  const [pendingArticleId, setPendingArticleId] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);
  
  // Add new state for tags
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagFilter, setTagFilter] = useState([]);
  
  // Theme customization state
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(Cookies.get('primaryColor') || '#90caf9');
  const [secondaryColor, setSecondaryColor] = useState(Cookies.get('secondaryColor') || '#f48fb1');
  const [selectedPreset, setSelectedPreset] = useState('Default');
  
  // Add user stats state
  const [userStats, setUserStats] = useState(null);
  
  // Create theme based on saved colors
  const theme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: primaryColor,
      },
      secondary: {
        main: secondaryColor,
      },
    },
    typography: {
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 500,
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
            },
          },
        },
      },
    },
  });
  
  // Use window.location.hostname to make it work from different machines
  const API_URL = `http://${window.location.hostname}:3001`;

  // Helper for making authenticated requests
  const fetchWithAuth = async (url, options = {}) => {
    const currentUsername = username || Cookies.get('username') || '';
    const headers = {
      ...options.headers,
      'X-Auth-User': `domain\\${currentUsername}` // Use username from state or cookie
    };

    return fetch(url, { ...options, headers });
  };

  // Handle login dialog open
  const handleOpenLoginDialog = () => {
    setLoginDialogOpen(true);
  };

  // Handle login dialog close
  const handleCloseLoginDialog = () => {
    setLoginDialogOpen(false);
  };

  // Handle username change
  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
  };

  // Check authentication status
  const checkAuth = async () => {
    try {
      console.log('Making auth request with username:', username);
      const res = await fetchWithAuth(`${API_URL}/api/auth/user`);
      if (!res.ok) throw new Error('Authentication check failed');
      
      const data = await res.json();
      console.log('Auth response:', data);
      setAuthUser(data);
      if (!data.isAuthorized) {
        console.log('User not authorized');
        setAuthError(true);
        setIsAuthenticated(false);
        return false;
      } else {
        console.log('User authorized');
        setAuthError(false);
        setIsAuthenticated(true);
        return true;
      }
    } catch (err) {
      console.error('Auth error:', err);
      setAuthError(true);
      setIsAuthenticated(false);
      return false;
    }
  };

  useEffect(() => {
    // Check for existing username cookie
    const savedUsername = Cookies.get('username');
    console.log('Saved username from cookie:', savedUsername);
    
    if (savedUsername) {
      // Set username and wait for state to update
      setUsername(savedUsername);
      
      // Use a separate effect to handle the auth check after username is set
      const authCheck = async () => {
        try {
          console.log('Checking auth...');
          const isAuthorized = await checkAuth();
          console.log('Auth check complete, isAuthorized:', isAuthorized);
          if (isAuthorized) {
            console.log('Fetching data...');
            await Promise.all([fetchArticles(), fetchTags()]);
            console.log('Data fetch complete');
          }
        } catch (err) {
          console.error('Error initializing app:', err);
          setError(err.message);
          setIsAuthenticated(false);
          setLoginDialogOpen(true);
        }
      };
      
      // Small delay to ensure state is updated
      setTimeout(authCheck, 0);
    } else {
      console.log('No saved username, showing login dialog');
      // If no cookie exists, show login dialog
      setLoginDialogOpen(true);
    }
  }, []);

  // Handle login submit
  const handleLoginSubmit = async () => {
    try {
      // First check if the user is authorized
      const res = await fetchWithAuth(`${API_URL}/api/auth/user`);
      if (!res.ok) throw new Error('Authentication check failed');
      
      const data = await res.json();
      if (!data.isAuthorized) {
        setError('You are not authorized to use this application.');
        return;
      }

      // If authorized, save username to cookie for 1 month
      Cookies.set('username', username, { expires: 30 });
      setAuthUser(data);
      setAuthError(false);
      setIsAuthenticated(true);
      setLoginDialogOpen(false);
      
      // Fetch data
      await Promise.all([fetchArticles(), fetchTags()]);
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle logout
  const handleLogout = () => {
    Cookies.remove('username');
    setIsAuthenticated(false);
    setUsername('');
    setAuthUser(null);
    setArticles([]);
    setTags([]);
    setLoginDialogOpen(true);
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/knowledge`);
      if (!res.ok) {
        if (res.status === 403) {
          setAuthError(true);
          throw new Error('You have no permission!');
        }
        throw new Error('Failed to fetch articles');
      }
      const data = await res.json();
      setArticles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tags
  const fetchTags = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/tags`);
      if (!res.ok) throw new Error('Failed to fetch tags');
      const data = await res.json();
      setTags(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetchWithAuth(`${API_URL}/api/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...form, 
          status: 'Backlog',
          tags: selectedTags.map(tag => typeof tag === 'string' ? tag : tag.name)
        }),
      });
      if (!res.ok) {
        if (res.status === 403) {
          setAuthError(true);
          throw new Error('You have no permission!');
        }
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add article');
      }
      setForm({ title: '', description: '' });
      setSelectedTags([]);
      // Fetch both articles and tags to update the lists
      await Promise.all([fetchArticles(), fetchTags()]);
    } catch (err) {
      setError(err.message);
    }
  };

  // Toggle status between Backlog and Documented
  const toggleArticleStatus = async (articleId, currentStatus) => {
    const newStatus = currentStatus === 'Backlog' ? 'Documented' : 'Backlog';
    
    if (newStatus === 'Documented') {
      // Show dialog to ask for knowledge article ID
      setPendingArticleId(articleId);
      setPendingStatus(newStatus);
      setKnowledgeArticleDialogOpen(true);
    } else {
      // If changing to Backlog, no need for knowledge article ID
      await handleStatusChange(articleId, newStatus);
    }
  };

  // Handle knowledge article ID dialog close
  const handleKnowledgeArticleDialogClose = async () => {
    if (pendingArticleId && pendingStatus) {
      // Still update the status even when skipping
      await handleStatusChange(pendingArticleId, pendingStatus);
    }
    setKnowledgeArticleDialogOpen(false);
    setKnowledgeArticleId('');
    setPendingArticleId(null);
    setPendingStatus(null);
  };

  // Handle knowledge article ID submit
  const handleKnowledgeArticleSubmit = async () => {
    if (pendingArticleId && pendingStatus) {
      await handleStatusChange(pendingArticleId, pendingStatus, knowledgeArticleId);
      handleKnowledgeArticleDialogClose();
    }
  };

  // Modify handleStatusChange to include knowledge article ID
  const handleStatusChange = async (articleId, newStatus, knowledgeArticleId = null) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/knowledge/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          knowledgeArticleId: knowledgeArticleId 
        }),
      });
      if (!res.ok) {
        if (res.status === 403) {
          setAuthError(true);
          throw new Error('You have no permission!');
        }
        throw new Error('Failed to update status');
      }
      fetchArticles();
    } catch (err) {
      setError(err.message);
    }
  };

  // Modify filteredArticles to include tag filtering
  const filteredArticles = articles.filter(article => {
    const matchesSearch = searchTerm === '' || 
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || article.status === statusFilter;
    
    const matchesTags = tagFilter.length === 0 || 
      tagFilter.some(filterTag => 
        article.tags?.some(articleTag => articleTag.name === filterTag.name)
      );
    
    return matchesSearch && matchesStatus && matchesTags;
  });

  // Sort articles to place "Documented" status at the bottom if not filtering
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    if (statusFilter === 'all') {
      if (a.status === 'Documented' && b.status !== 'Documented') return 1;
      if (a.status !== 'Documented' && b.status === 'Documented') return -1;
    }
    // Secondary sort by date (newest first)
    return new Date(b.added || 0) - new Date(a.added || 0);
  });

  // Pagination logic
  const indexOfLastArticle = currentPage * articlesPerPage;
  const indexOfFirstArticle = indexOfLastArticle - articlesPerPage;
  const currentArticles = sortedArticles.slice(indexOfFirstArticle, indexOfLastArticle);
  const totalPages = Math.ceil(sortedArticles.length / articlesPerPage);
  
  const handlePageChange = (event, value) => {
    setCurrentPage(value);
    // Scroll to top when changing page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, tagFilter]);

  // Handle admin dialog open
  const handleOpenAdminDialog = () => {
    setAdminDialogOpen(true);
    setAdminPassword('');
    setAdminPasswordError(false);
  };

  // Handle admin dialog close
  const handleCloseAdminDialog = () => {
    setAdminDialogOpen(false);
  };

  // Handle admin password change
  const handleAdminPasswordChange = (e) => {
    setAdminPassword(e.target.value);
    setAdminPasswordError(false);
  };

  // Handle admin login
  const handleAdminLogin = async () => {
    try {
      const startDate = startDateStr ? new Date(startDateStr) : null;
      const endDate = endDateStr ? new Date(endDateStr) : null;
      
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          password: adminPassword,
          startDate: startDate ? startDate.toISOString() : null,
          endDate: endDate ? endDate.toISOString() : null
        }),
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          setAdminPasswordError(true);
          return;
        }
        throw new Error('Failed to fetch stats');
      }
      
      const data = await res.json();
      setStats(data);
      setIsAdmin(true);
      setAdminDialogOpen(false);
      setStatsDialogOpen(true);
    } catch (err) {
      setError('Error fetching stats: ' + err.message);
    }
  };

  // Handle stats dialog close
  const handleCloseStatsDialog = () => {
    setStatsDialogOpen(false);
  };

  // Handle user management dialog open
  const handleOpenUserManagement = () => {
    setUserManagementOpen(true);
  };

  // Handle user management dialog close
  const handleCloseUserManagement = () => {
    setUserManagementOpen(false);
  };

  // Handle admin logout
  const handleAdminLogout = () => {
    setIsAdmin(false);
    setStats(null);
  };

  // Handle date filter change and refresh stats
  const handleDateFilterChange = async () => {
    if (!stats) return;
    
    try {
      const startDate = startDateStr ? new Date(startDateStr) : null;
      const endDate = endDateStr ? new Date(endDateStr) : null;
      
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: adminPassword,
          startDate: startDate ? startDate.toISOString() : null,
          endDate: endDate ? endDate.toISOString() : null
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to refresh stats');
      }
      
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError('Error refreshing stats: ' + err.message);
    }
  };

  // Handle clear database
  const handleClearDatabase = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/clear-database`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword
        }
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to clear database');
      }
      
      setClearDatabaseSuccess('Database cleared successfully');
      setClearDatabaseDialogOpen(false);
      // Refresh the page to show empty state
      window.location.reload();
    } catch (err) {
      setClearDatabaseError(err.message);
    }
  };

  // Handle theme dialog open
  const handleOpenThemeDialog = () => {
    setThemeDialogOpen(true);
  };

  // Handle theme dialog close
  const handleCloseThemeDialog = () => {
    setThemeDialogOpen(false);
  };

  // Handle theme color change
  const handleThemeColorChange = (type, color) => {
    if (type === 'primary') {
      setPrimaryColor(color);
      Cookies.set('primaryColor', color, { expires: 365 });
    } else {
      setSecondaryColor(color);
      Cookies.set('secondaryColor', color, { expires: 365 });
    }
  };

  // Handle theme preset selection
  const handlePresetSelect = (preset) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
    setSelectedPreset(preset.name);
    Cookies.set('primaryColor', preset.primary, { expires: 365 });
    Cookies.set('secondaryColor', preset.secondary, { expires: 365 });
  };

  // Add fetchUserStats function
  const fetchUserStats = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/user/stats`);
      if (!res.ok) throw new Error('Failed to fetch user stats');
      const data = await res.json();
      setUserStats(data);
    } catch (err) {
      console.error('Error fetching user stats:', err);
    }
  };

  // Add useEffect to fetch user stats when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserStats();
    }
  }, [isAuthenticated]);

  // Add useEffect to update user stats when articles change
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserStats();
    }
  }, [articles]);

  // If not authenticated, show login dialog
  if (!isAuthenticated) {
    console.log('Rendering login dialog, isAuthenticated:', isAuthenticated);
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Dialog open={loginDialogOpen} onClose={() => {}}>
          <DialogTitle>Login Required</DialogTitle>
          <DialogContent>
            <Typography variant="body2" paragraph sx={{ mt: 1 }}>
              Please enter your username to access the Knowledge Backlog.
            </Typography>
            <TextField
              autoFocus
              margin="dense"
              label="Username"
              fullWidth
              variant="outlined"
              value={username}
              onChange={handleUsernameChange}
              InputProps={{
                startAdornment: <InputAdornment position="start">domain\</InputAdornment>,
              }}
            />
            {error && (
              <Typography color="error" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleLoginSubmit} variant="contained">Login</Button>
          </DialogActions>
        </Dialog>
      </ThemeProvider>
    );
  }

  // If unauthorized, show error message
  if (authError) {
    console.log('Rendering auth error, authError:', authError);
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mt: 4 }}>
            <Typography variant="h6">You have no permission!</Typography>
            <Typography>Your user account is not authorized to access this application.</Typography>
          </Alert>
        </Container>
      </ThemeProvider>
    );
  }

  console.log('Rendering main app, authUser:', authUser);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 4 }}>
              Knowledge Backlog
            </Typography>
            
            {/* Add User Stats in Toolbar */}
            {userStats && (
              <Box sx={{ 
                display: 'flex', 
                gap: 3, 
                flexGrow: 1, 
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Typography variant="body2" color="inherit" sx={{ mr: 1 }}>
                  Own stats:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="inherit">
                    Added:
                  </Typography>
                  <Typography variant="subtitle1" color="inherit" sx={{ fontWeight: 'bold' }}>
                    {userStats.articlesAdded}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="inherit">
                    Changes:
                  </Typography>
                  <Typography variant="subtitle1" color="inherit" sx={{ fontWeight: 'bold' }}>
                    {userStats.statusChanges}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="inherit">
                    Documented:
                  </Typography>
                  <Typography variant="subtitle1" color="inherit" sx={{ fontWeight: 'bold' }}>
                    {userStats.documentedCount}
                  </Typography>
                </Box>
              </Box>
            )}
            
            <Tooltip title="Customize Theme">
              <IconButton 
                color="inherit" 
                onClick={handleOpenThemeDialog}
                sx={{ ml: 2 }}
              >
                <PaletteIcon />
              </IconButton>
            </Tooltip>
            
            <IconButton 
              color="inherit" 
              onClick={handleOpenAdminDialog}
              sx={{ ml: 2 }}
            >
              <AdminPanelSettingsIcon />
            </IconButton>
            
            {isAdmin && (
              <>
                <IconButton 
                  color="inherit" 
                  onClick={handleOpenUserManagement}
                  sx={{ ml: 1 }}
                  title="Manage Users"
                >
                  <PersonIcon />
                </IconButton>
                <IconButton 
                  color="inherit" 
                  onClick={handleAdminLogout}
                  sx={{ ml: 1 }}
                  title="Logout Admin"
                >
                  <LogoutIcon />
                </IconButton>
              </>
            )}
            
            <IconButton 
              color="inherit" 
              onClick={handleLogout}
              sx={{ ml: 2 }}
              title="Logout"
            >
              <LogoutIcon />
            </IconButton>
            
            {authUser && (
              <Typography variant="subtitle1" sx={{ ml: 1 }}>
                {authUser.username}
              </Typography>
            )}
          </Toolbar>
        </AppBar>
      </Box>

      {/* Admin Password Dialog */}
      <Dialog open={adminDialogOpen} onClose={handleCloseAdminDialog}>
        <DialogTitle>Admin Authentication</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter the admin password to access admin features.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Admin Password"
            type="password"
            fullWidth
            value={adminPassword}
            onChange={handleAdminPasswordChange}
            error={adminPasswordError}
            helperText={adminPasswordError ? "Invalid password" : ""}
          />
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, mt: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="End Date"
              type="date"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAdminDialog}>Cancel</Button>
          <Button onClick={handleAdminLogin}>View Stats</Button>
        </DialogActions>
      </Dialog>

      {/* Admin Stats Dialog */}
      <Dialog
        open={statsDialogOpen}
        onClose={handleCloseStatsDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Admin Statistics</DialogTitle>
        <DialogContent>
          {stats && (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, mb: 3, mt: 1 }}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <Button 
                  variant="contained" 
                  onClick={handleDateFilterChange}
                  sx={{ ml: 2 }}
                >
                  Apply Filter
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => setClearDatabaseDialogOpen(true)}
                  sx={{ ml: 2 }}
                >
                  Clear Database
                </Button>
              </Box>
              
              <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="stats table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      <TableCell align="right">Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell component="th" scope="row">Total Articles</TableCell>
                      <TableCell align="right">{stats.totalArticles}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Articles Added</TableCell>
                      <TableCell align="right">{stats.articlesAdded}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Status Changes</TableCell>
                      <TableCell align="right">{stats.statusChanges}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Articles in Backlog</TableCell>
                      <TableCell align="right">{stats.statusBreakdown.Backlog}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Articles Documented</TableCell>
                      <TableCell align="right">{stats.statusBreakdown.Documented}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* User Statistics Section */}
              {stats.userStats && Object.keys(stats.userStats).length > 0 && (
                <>
                  <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
                    Statistics by User
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }} aria-label="user stats table">
                      <TableHead>
                        <TableRow>
                          <TableCell>Username</TableCell>
                          <TableCell align="right">Articles Added</TableCell>
                          <TableCell align="right">Status Changes</TableCell>
                          <TableCell align="right">Total Activity</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(stats.userStats).map(([username, userData]) => (
                          <TableRow key={username}>
                            <TableCell component="th" scope="row">{username}</TableCell>
                            <TableCell align="right">{userData.articlesAdded}</TableCell>
                            <TableCell align="right">{userData.statusChanges}</TableCell>
                            <TableCell align="right">{userData.articlesAdded + userData.statusChanges}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStatsDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* User Management Dialog */}
      <UserManagement
        open={userManagementOpen}
        onClose={handleCloseUserManagement}
        adminPassword={adminPassword}
      />

      {/* Edit Article Dialog */}
      <Dialog
        open={!!editingArticle}
        onClose={() => setEditingArticle(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Article</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Title"
              fullWidth
              value={editingArticle?.title || ''}
              onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={4}
              value={editingArticle?.description || ''}
              onChange={(e) => setEditingArticle({ ...editingArticle, description: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editingArticle?.status || 'Backlog'}
                label="Status"
                onChange={(e) => setEditingArticle({ ...editingArticle, status: e.target.value })}
              >
                {statusOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Autocomplete
              multiple
              freeSolo
              options={tags}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                return option.name;
              }}
              value={editingArticle?.tags || []}
              onChange={(event, newValue) => {
                const processedValue = newValue.map(value => {
                  if (typeof value === 'string') {
                    const existingTag = tags.find(tag => tag.name === value);
                    return existingTag || value;
                  }
                  return value;
                });
                setEditingArticle({ ...editingArticle, tags: processedValue });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags"
                  placeholder="Add tags..."
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={typeof option === 'string' ? option : option.name}
                    {...getTagProps({ index })}
                    color="primary"
                    variant="outlined"
                  />
                ))
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingArticle(null)}>Cancel</Button>
          <Button 
            variant="contained"
            onClick={async () => {
              try {
                const res = await fetchWithAuth(`${API_URL}/api/knowledge/${editingArticle.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...editingArticle,
                    tags: editingArticle.tags.map(tag => typeof tag === 'string' ? tag : tag.name)
                  }),
                });
                if (!res.ok) throw new Error('Failed to update article');
                setEditingArticle(null);
                fetchArticles();
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialogOpen}
        onClose={() => setDeleteConfirmDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the article "{articleToDelete?.title}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmDialogOpen(false)}>Cancel</Button>
          <Button 
            color="error"
            variant="contained"
            onClick={async () => {
              try {
                const res = await fetchWithAuth(`${API_URL}/api/knowledge/${articleToDelete.id}`, {
                  method: 'DELETE',
                });
                if (!res.ok) throw new Error('Failed to delete article');
                setDeleteConfirmDialogOpen(false);
                setArticleToDelete(null);
                fetchArticles();
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Knowledge Article ID Dialog */}
      <Dialog open={knowledgeArticleDialogOpen} onClose={handleKnowledgeArticleDialogClose}>
        <DialogTitle>Add Knowledge Article ID</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph sx={{ mt: 1 }}>
            Would you like to add a Knowledge Article ID for this document? (Optional)
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Knowledge Article ID"
            fullWidth
            variant="outlined"
            value={knowledgeArticleId}
            onChange={(e) => setKnowledgeArticleId(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleKnowledgeArticleDialogClose}>Skip</Button>
          <Button onClick={handleKnowledgeArticleSubmit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Clear Database Confirmation Dialog */}
      <Dialog
        open={clearDatabaseDialogOpen}
        onClose={() => setClearDatabaseDialogOpen(false)}
      >
        <DialogTitle>Clear Database</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to clear all data from the database? This action cannot be undone.
            All articles, tags, and their relationships will be permanently deleted.
            User accounts will be preserved.
          </DialogContentText>
          {clearDatabaseError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {clearDatabaseError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDatabaseDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleClearDatabase} color="error" variant="contained">
            Clear Database
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!clearDatabaseSuccess}
        autoHideDuration={6000}
        onClose={() => setClearDatabaseSuccess('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setClearDatabaseSuccess('')} severity="success" sx={{ width: '100%' }}>
          {clearDatabaseSuccess}
        </Alert>
      </Snackbar>

      {/* Theme Customization Dialog */}
      <Dialog open={themeDialogOpen} onClose={handleCloseThemeDialog}>
        <DialogTitle>Customize Theme</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            {/* Theme Presets */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Theme Presets
              </Typography>
              <Grid container spacing={1}>
                {themePresets.map((preset) => (
                  <Grid item key={preset.name}>
                    <Tooltip title={preset.name}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          cursor: 'pointer',
                          border: '2px solid',
                          borderColor: selectedPreset === preset.name ? 'primary.main' : 'transparent',
                          background: `linear-gradient(135deg, ${preset.primary} 0%, ${preset.secondary} 100%)`,
                          '&:hover': {
                            transform: 'scale(1.1)',
                            transition: 'transform 0.2s ease-in-out'
                          }
                        }}
                        onClick={() => handlePresetSelect(preset)}
                      />
                    </Tooltip>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Divider />

            {/* Custom Colors */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Custom Colors
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Primary Color
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                      type="color"
                      value={primaryColor}
                      onChange={(e) => {
                        handleThemeColorChange('primary', e.target.value);
                        setSelectedPreset('Custom');
                      }}
                      sx={{ width: 100 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {primaryColor}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Secondary Color
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => {
                        handleThemeColorChange('secondary', e.target.value);
                        setSelectedPreset('Custom');
                      }}
                      sx={{ width: 100 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {secondaryColor}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseThemeDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Add New Backlog
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Title"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
            />
            <TextField
              label="Description"
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              multiline
              minRows={2}
            />
            <Autocomplete
              multiple
              freeSolo
              options={tags}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                return option.name;
              }}
              value={selectedTags}
              onChange={(event, newValue) => {
                const processedValue = newValue.map(value => {
                  if (typeof value === 'string') {
                    const existingTag = tags.find(tag => tag.name === value);
                    return existingTag || value;
                  }
                  return value;
                });
                setSelectedTags(processedValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags"
                  placeholder="Add tags..."
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={typeof option === 'string' ? option : option.name}
                    {...getTagProps({ index })}
                    color="primary"
                    variant="outlined"
                  />
                ))
              }
            />
            <Button type="submit" variant="contained" color="primary">
              Add Knowledge Backlog
            </Button>
            <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => window.open('https://serviceportal.corp.lego.com/kb_knowledge.do?sys_id=-1&sysparm_stack=kb', '_blank')}
              >
                Create KB Article
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => window.open('https://servicenow.corp.lego.com/now/nav/ui/classic/params/target/kb_view.do%3Fsysparm_article%3DKB0013627', '_blank')}
              >
                Best Practices
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => window.open('https://servicenow.corp.lego.com/kb_view.do?sysparm_article=KB0016528', '_blank')}
              >
                How to Create
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => window.open('https://serviceportal.corp.lego.com/sp?id=kb_article_view&sys_kb_id=d8c5d11847eb0a94a1cb5ffbd36d43f4', '_blank')}
              >
                Write Perfect KB
              </Button>
            </Box>
            {error && <Typography color="error">{error}</Typography>}
          </Box>
        </Paper>
        
        <Paper sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search articles"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="status-filter-label">Filter by Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  value={statusFilter}
                  label="Filter by Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <FilterListIcon />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  {statusOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Autocomplete
                multiple
                options={tags}
                getOptionLabel={(option) => option.name}
                value={tagFilter}
                onChange={(event, newValue) => {
                  setTagFilter(newValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Filter by Tags"
                    placeholder="Select tags..."
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option.name}
                      {...getTagProps({ index })}
                      color="primary"
                      variant="outlined"
                    />
                  ))
                }
              />
            </Grid>
          </Grid>
          
          <Typography variant="h5" gutterBottom>
            Backlog
            {sortedArticles.length > 0 && (
              <Box sx={{ display: 'inline-flex', gap: 1, ml: 2 }}>
                <Chip 
                  label={`${sortedArticles.length} total`} 
                  size="small" 
                  color="primary" 
                  onClick={() => setStatusFilter('all')}
                  clickable
                  variant={statusFilter === 'all' ? 'filled' : 'outlined'}
                />
                <Chip 
                  label={`${sortedArticles.filter(a => a.status === 'Backlog').length} backlog`} 
                  size="small" 
                  color="primary" 
                  variant={statusFilter === 'Backlog' ? 'filled' : 'outlined'}
                  onClick={() => setStatusFilter('Backlog')}
                  clickable
                />
                <Chip 
                  label={`${sortedArticles.filter(a => a.status === 'Documented').length} documented`} 
                  size="small" 
                  color="success" 
                  variant={statusFilter === 'Documented' ? 'filled' : 'outlined'}
                  onClick={() => setStatusFilter('Documented')}
                  clickable
                />
              </Box>
            )}
          </Typography>
          
          {loading ? (
            <Typography>Loading...</Typography>
          ) : (
            <>
              {sortedArticles.length === 0 ? (
                <Alert severity="info">No articles found matching your criteria.</Alert>
              ) : (
                <Grid container spacing={3}>
                  {currentArticles.map((article) => (
                    <Grid item xs={12} key={article.id}>
                      <Card raised sx={{ mb: 2 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="h6" component="h2" gutterBottom>
                              {article.title}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Chip 
                                label={article.status} 
                                color={article.status === 'Documented' ? 'success' : 'primary'}
                                size="small"
                              />
                            </Box>
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {article.description}
                          </Typography>
                          
                          {article.tags && article.tags.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                              {article.tags.map((tag) => (
                                <Chip
                                  key={tag.id}
                                  label={tag.name}
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          )}
                          
                          <Divider sx={{ my: 1.5 }} />
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                            <Box>
                              {article.added && (
                                <Typography variant="caption" display="block" color="text.secondary">
                                  Added: {formatDate(article.added)}
                                  {article.authorName ? ` by ${article.authorName}` : article.author ? ` by ${extractUsername(article.author)}` : ''}
                                </Typography>
                              )}
                              {article.modifiedAt && (
                                <Typography variant="caption" display="block" color="text.secondary">
                                  Modified: {formatDate(article.modifiedAt)}
                                  {article.modifiedByName ? 
                                    <Typography component="span" variant="caption" 
                                      sx={{ 
                                        fontWeight: authUser && (authUser.username === article.modifiedByName || extractUsername(authUser.user) === article.modifiedByName) ? 
                                          'bold' : 'normal',
                                        color: authUser && (authUser.username === article.modifiedByName || extractUsername(authUser.user) === article.modifiedByName) ? 
                                          'primary.main' : 'text.secondary'
                                      }}>
                                      {` by ${article.modifiedByName}`}
                                      {article.knowledgeArticleId && (
                                        <Typography component="span" variant="caption">
                                          {' (ID: '}
                                          <Link
                                            href={`https://servicenow.corp.lego.com/kb_view.do?sysparm_article=${article.knowledgeArticleId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                                          >
                                            {article.knowledgeArticleId}
                                          </Link>
                                          {')'}
                                        </Typography>
                                      )}
                                    </Typography> : 
                                    article.modifiedBy ? 
                                    <Typography component="span" variant="caption" 
                                      sx={{ 
                                        fontWeight: authUser && (authUser.username === extractUsername(article.modifiedBy) || extractUsername(authUser.user) === extractUsername(article.modifiedBy)) ? 
                                          'bold' : 'normal',
                                        color: authUser && (authUser.username === extractUsername(article.modifiedBy) || extractUsername(authUser.user) === extractUsername(article.modifiedBy)) ? 
                                          'primary.main' : 'text.secondary'
                                      }}>
                                      {` by ${extractUsername(article.modifiedBy)}`}
                                      {article.knowledgeArticleId && (
                                        <Typography component="span" variant="caption">
                                          {' (KA: '}
                                          <Link
                                            href={`https://servicenow.corp.lego.com/kb_view.do?sysparm_article=${article.knowledgeArticleId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                                          >
                                            {article.knowledgeArticleId}
                                          </Link>
                                          {')'}
                                        </Typography>
                                      )}
                                    </Typography> : ''}
                                </Typography>
                              )}
                            </Box>
                            
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              {isAdmin && (
                                <>
                                  <IconButton
                                    size="small"
                                    onClick={() => setEditingArticle(article)}
                                    title="Edit Article"
                                  >
                                    <EditIcon />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                      setArticleToDelete(article);
                                      setDeleteConfirmDialogOpen(true);
                                    }}
                                    title="Delete Article"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </>
                              )}
                              <IconButton
                                color={article.status === 'Documented' ? 'success' : 'default'}
                                onClick={() => toggleArticleStatus(article.id, article.status)}
                                aria-label="toggle status"
                                title={article.status === 'Documented' ? "Mark as Backlog" : "Mark as Documented"}
                                sx={{ p: 1 }}
                              >
                                {article.status === 'Documented' ? 
                                  <TaskAltIcon /> : 
                                  <CheckCircleOutlineIcon />
                                }
                              </IconButton>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
              
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Pagination 
                    count={totalPages} 
                    page={currentPage} 
                    onChange={handlePageChange} 
                    color="primary" 
                    size="large"
                  />
                </Box>
              )}
            </>
          )}
        </Paper>
      </Container>
      
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
