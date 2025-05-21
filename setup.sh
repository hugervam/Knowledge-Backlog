#!/bin/bash

# ANSI color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Knowledge Backlog Setup Script ===${NC}"
echo -e "${BLUE}====================================${NC}"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ -f /etc/debian_version ]]; then
        echo "debian"
    elif [[ -f /etc/redhat-release ]]; then
        echo "redhat"
    else
        echo "unknown"
    fi
}

# Function to install Node.js
install_nodejs() {
    local os=$(detect_os)
    echo -e "${YELLOW}Installing Node.js...${NC}"
    
    if [ "$os" = "macos" ]; then
        if ! command_exists brew; then
            echo -e "${YELLOW}Installing Homebrew...${NC}"
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        brew install node
    elif [ "$os" = "debian" ]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [ "$os" = "redhat" ]; then
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    else
        echo -e "${RED}Unsupported OS for automatic Node.js installation${NC}"
        echo -e "${YELLOW}Please install Node.js manually from https://nodejs.org/${NC}"
        exit 1
    fi
}

# Function to install Git
install_git() {
    local os=$(detect_os)
    echo -e "${YELLOW}Installing Git...${NC}"
    
    if [ "$os" = "macos" ]; then
        brew install git
    elif [ "$os" = "debian" ]; then
        sudo apt-get update
        sudo apt-get install -y git
    elif [ "$os" = "redhat" ]; then
        sudo yum install -y git
    else
        echo -e "${RED}Unsupported OS for automatic Git installation${NC}"
        echo -e "${YELLOW}Please install Git manually from https://git-scm.com/${NC}"
        exit 1
    fi
}

# Function to install project dependencies
install_dependencies() {
    echo -e "${BLUE}Installing project dependencies...${NC}"
    
    # Install backend dependencies
    if [ -d "backend" ]; then
        echo -e "${YELLOW}Installing backend dependencies...${NC}"
        cd backend
        npm install
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to install backend dependencies${NC}"
            exit 1
        fi
        cd ..
    else
        echo -e "${RED}Backend directory not found${NC}"
        exit 1
    fi
    
    # Install frontend dependencies
    if [ -d "frontend" ]; then
        echo -e "${YELLOW}Installing frontend dependencies...${NC}"
        cd frontend
        npm install
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to install frontend dependencies${NC}"
            exit 1
        fi
        cd ..
    else
        echo -e "${RED}Frontend directory not found${NC}"
        exit 1
    fi
}

# Check and install Node.js
if ! command_exists node; then
    echo -e "${YELLOW}Node.js is not installed${NC}"
    install_nodejs
else
    echo -e "${GREEN}Node.js is already installed${NC}"
    node --version
fi

# Check and install npm
if ! command_exists npm; then
    echo -e "${YELLOW}npm is not installed${NC}"
    install_nodejs # This will install npm as well
else
    echo -e "${GREEN}npm is already installed${NC}"
    npm --version
fi

# Check and install Git
if ! command_exists git; then
    echo -e "${YELLOW}Git is not installed${NC}"
    install_git
else
    echo -e "${GREEN}Git is already installed${NC}"
    git --version
fi

# Install global npm packages
echo -e "${BLUE}Installing global npm packages...${NC}"
npm install -g npm@latest

# Clone repository if not already cloned
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Repository not found. Please make sure you're in the correct directory.${NC}"
    exit 1
fi

# Install project dependencies
install_dependencies

# Make start script executable
chmod +x start-servers.sh

echo -e "\n${GREEN}=== Setup Complete ===${NC}"
echo -e "${GREEN}You can now run ./start-servers.sh to start the application${NC}" 