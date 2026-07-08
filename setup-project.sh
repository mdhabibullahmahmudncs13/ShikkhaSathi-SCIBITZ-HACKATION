#!/bin/bash

# ShikkhaSathi Project Setup Script
# For users who just cloned the repository and want to get started quickly

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}\n"
}

# Check if running on supported OS
check_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        DISTRO=$(lsb_release -si 2>/dev/null || echo "Unknown")
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
    else
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    print_status "Detected OS: $OS"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install dependencies based on OS
install_dependencies() {
    print_header "INSTALLING SYSTEM DEPENDENCIES"
    
    if [[ "$OS" == "linux" ]]; then
        print_status "Installing dependencies for Linux..."
        
        # Update package list
        sudo apt-get update
        
        # Install Python 3.9+
        if ! command_exists python3; then
            print_status "Installing Python 3..."
            sudo apt-get install -y python3 python3-pip python3-venv
        else
            print_success "Python 3 is already installed"
        fi
        
        # Install Node.js 16+
        if ! command_exists node; then
            print_status "Installing Node.js..."
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        else
            print_success "Node.js is already installed"
        fi
        
        # Install Docker
        if ! command_exists docker; then
            print_status "Installing Docker..."
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker $USER
            rm get-docker.sh
            print_warning "You may need to log out and back in for Docker permissions to take effect"
        else
            print_success "Docker is already installed"
        fi
        
        # Install Docker Compose
        if ! command_exists docker-compose && ! docker compose version &> /dev/null; then
            print_status "Installing Docker Compose..."
            sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
        else
            print_success "Docker Compose is already installed"
        fi
        
    elif [[ "$OS" == "macos" ]]; then
        print_status "Installing dependencies for macOS..."
        
        # Check if Homebrew is installed
        if ! command_exists brew; then
            print_status "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        
        # Install Python
        if ! command_exists python3; then
            print_status "Installing Python 3..."
            brew install python
        else
            print_success "Python 3 is already installed"
        fi
        
        # Install Node.js
        if ! command_exists node; then
            print_status "Installing Node.js..."
            brew install node
        else
            print_success "Node.js is already installed"
        fi
        
        # Install Docker Desktop
        if ! command_exists docker; then
            print_warning "Please install Docker Desktop for Mac from https://www.docker.com/products/docker-desktop"
            print_warning "Press Enter after installing Docker Desktop..."
            read
        else
            print_success "Docker is already installed"
        fi
        
    elif [[ "$OS" == "windows" ]]; then
        print_error "Windows setup requires manual installation:"
        print_error "1. Install Python 3.9+ from https://python.org"
        print_error "2. Install Node.js 16+ from https://nodejs.org"
        print_error "3. Install Docker Desktop from https://docker.com"
        print_error "4. Run this script in Git Bash or WSL"
        exit 1
    fi
}

# Verify installations
verify_installations() {
    print_header "VERIFYING INSTALLATIONS"
    
    # Check Python
    if command_exists python3; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        print_success "Python $PYTHON_VERSION installed"
    else
        print_error "Python 3 not found"
        exit 1
    fi
    
    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js $NODE_VERSION installed"
    else
        print_error "Node.js not found"
        exit 1
    fi
    
    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_success "npm $NPM_VERSION installed"
    else
        print_error "npm not found"
        exit 1
    fi
    
    # Check Docker
    if command_exists docker; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        print_success "Docker $DOCKER_VERSION installed"
    else
        print_error "Docker not found"
        exit 1
    fi
    
    # Check Docker Compose
    if command_exists docker-compose || docker compose version &> /dev/null; then
        if command_exists docker-compose; then
            COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)
        else
            COMPOSE_VERSION=$(docker compose version --short)
        fi
        print_success "Docker Compose $COMPOSE_VERSION installed"
    else
        print_error "Docker Compose not found"
        exit 1
    fi
}

# Setup backend
setup_backend() {
    print_header "SETTING UP BACKEND"
    
    cd backend
    
    # Create virtual environment
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
    
    # Activate virtual environment
    print_status "Activating virtual environment..."
    source venv/bin/activate
    
    # Upgrade pip
    print_status "Upgrading pip..."
    pip install --upgrade pip
    
    # Install dependencies
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        print_status "Creating .env file..."
        cp .env.example .env
        print_warning "Please update the .env file with your API keys and configuration"
    else
        print_success ".env file already exists"
    fi
    
    cd ..
    print_success "Backend setup completed"
}

# Setup frontend
setup_frontend() {
    print_header "SETTING UP FRONTEND"
    
    cd frontend
    
    # Install dependencies
    print_status "Installing Node.js dependencies..."
    npm install
    
    cd ..
    print_success "Frontend setup completed"
}

# Start databases
start_databases() {
    print_header "STARTING DATABASE SERVICES"
    
    # Make database script executable
    chmod +x start-databases.sh
    
    # Start databases
    print_status "Starting PostgreSQL, MongoDB, and Redis..."
    ./start-databases.sh
    
    # Wait for databases to be ready
    print_status "Waiting for databases to be ready..."
    sleep 15
    
    print_success "Database services started"
}

# Run database migrations
run_migrations() {
    print_header "RUNNING DATABASE MIGRATIONS"
    
    cd backend
    source venv/bin/activate
    
    print_status "Running Alembic migrations..."
    alembic upgrade head
    
    cd ..
    print_success "Database migrations completed"
}

# Create admin user
create_admin_user() {
    print_header "CREATING ADMIN USER"
    
    cd backend
    source venv/bin/activate
    
    if [ -f create_admin_user.py ]; then
        print_status "Creating admin user..."
        python create_admin_user.py
        print_success "Admin user created"
    else
        print_warning "Admin user creation script not found"
    fi
    
    cd ..
}

# Fix teacher profiles
fix_teacher_profiles() {
    print_header "FIXING TEACHER PROFILES"
    
    cd backend
    source venv/bin/activate
    
    if [ -f fix_teacher_profiles.py ]; then
        print_status "Fixing teacher profiles..."
        python fix_teacher_profiles.py
        print_success "Teacher profiles fixed"
    else
        print_warning "Teacher profile fix script not found"
    fi
    
    cd ..
}

# Display final instructions
show_final_instructions() {
    print_header "SETUP COMPLETED SUCCESSFULLY!"
    
    echo -e "${GREEN}🎉 ShikkhaSathi is now ready to use!${NC}\n"
    
    echo -e "${BLUE}To start the application:${NC}"
    echo -e "1. ${YELLOW}Backend:${NC}"
    echo -e "   cd backend"
    echo -e "   source venv/bin/activate"
    echo -e "   python run.py"
    echo -e ""
    echo -e "2. ${YELLOW}Frontend (in a new terminal):${NC}"
    echo -e "   cd frontend"
    echo -e "   npm run dev"
    echo -e ""
    
    echo -e "${BLUE}Access points:${NC}"
    echo -e "• Application: ${GREEN}http://localhost:5173${NC}"
    echo -e "• API Documentation: ${GREEN}http://localhost:8000/docs${NC}"
    echo -e "• Backend API: ${GREEN}http://localhost:8000${NC}"
    echo -e ""
    
    echo -e "${BLUE}Default test accounts:${NC}"
    echo -e "• Student: ${YELLOW}student1@example.com${NC} / ${YELLOW}password123${NC}"
    echo -e "• Teacher: ${YELLOW}teacher1@example.com${NC} / ${YELLOW}password123${NC}"
    echo -e "• Parent: ${YELLOW}parent1@example.com${NC} / ${YELLOW}password123${NC}"
    echo -e ""
    
    echo -e "${BLUE}Important notes:${NC}"
    echo -e "• Update ${YELLOW}backend/.env${NC} with your API keys"
    echo -e "• Databases are running in Docker containers"
    echo -e "• Use ${YELLOW}./start-databases.sh${NC} to restart databases"
    echo -e "• Check ${YELLOW}README.md${NC} for detailed documentation"
    echo -e ""
    
    echo -e "${BLUE}Need help?${NC}"
    echo -e "• Check the troubleshooting section in README.md"
    echo -e "• Report issues: https://github.com/mdhabibullahmahmudncs13/ShikkhaSathi/issues"
    echo -e ""
}

# Main execution
main() {
    print_header "SHIKSHASATHI PROJECT SETUP"
    echo -e "${BLUE}Welcome to ShikkhaSathi setup!${NC}"
    echo -e "${BLUE}This script will install all dependencies and set up the project.${NC}\n"
    
    # Ask for confirmation
    read -p "Do you want to continue with the setup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Setup cancelled by user"
        exit 0
    fi
    
    # Check OS
    check_os
    
    # Install dependencies
    install_dependencies
    
    # Verify installations
    verify_installations
    
    # Setup backend
    setup_backend
    
    # Setup frontend
    setup_frontend
    
    # Start databases
    start_databases
    
    # Run migrations
    run_migrations
    
    # Create admin user
    create_admin_user
    
    # Fix teacher profiles
    fix_teacher_profiles
    
    # Show final instructions
    show_final_instructions
}

# Run main function
main "$@"