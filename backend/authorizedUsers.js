/**
 * List of authorized users for the Knowledge Backlog application
 * 
 * This file contains the list of users who are authorized to access the application.
 * Users should be specified by their username (lowercase).
 * 
 * In a production environment, you might want to use a database or external 
 * authentication service rather than a static list.
 */

const authorizedUsers = [
  'hugervam',
  'hu8sutga',
  'hugalava',
  // Add additional authorized users here
];

/**
 * Check if a user is authorized to access the application
 * @param {string} username - The username to check
 * @returns {boolean} - True if the user is authorized, false otherwise
 */
function isUserAuthorized(username) {
  console.log('isUserAuthorized called with:', username);
  
  if (!username) {
    console.log('Username is empty');
    return false;
  }
  
  // Ensure username is lowercase for case-insensitive comparison
  let normalizedUsername = username.toLowerCase();
  console.log('Normalized username:', normalizedUsername);
  
  // If username is in domain\username format, extract just the username part
  if (normalizedUsername.includes('\\')) {
    const parts = normalizedUsername.split('\\');
    normalizedUsername = parts[parts.length - 1];
    console.log('Extracted username part:', normalizedUsername);
  } else if (normalizedUsername.includes('/')) {
    // Also handle the case of domain/username format
    const parts = normalizedUsername.split('/');
    normalizedUsername = parts[parts.length - 1];
    console.log('Extracted username part from forward slash:', normalizedUsername);
  }
  
  // Check against the authorized users list
  const isAuthorized = authorizedUsers.includes(normalizedUsername);
  console.log('Is authorized:', isAuthorized, 'Checking for:', normalizedUsername, 'In list:', authorizedUsers);
  return isAuthorized;
}

module.exports = {
  authorizedUsers,
  isUserAuthorized
}; 