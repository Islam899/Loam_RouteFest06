#!/bin/bash

echo "========================================"
echo "RouteFest - Git Setup"
echo "========================================"
echo ""

echo "[1/3] Initializing Git repository..."
git init
if [ $? -ne 0 ]; then
    echo "ERROR: Git is not installed or not in PATH"
    exit 1
fi

echo ""
echo "[2/3] Adding files to Git..."
git add .

echo ""
echo "[3/3] Creating initial commit..."
git commit -m "Initial commit: RouteFest project"

echo ""
echo "========================================"
echo "Git repository initialized successfully!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Create a repository on GitHub"
echo "2. Run these commands (replace YOUR_USERNAME and YOUR_REPO_NAME):"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""

