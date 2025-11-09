#!/bin/bash

# FFmpeg Installation Script for UltraFast Social Platform
# This script installs FFmpeg on different operating systems

echo "🎬 Installing FFmpeg for UltraFast Social Platform..."

# Detect operating system
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "🐧 Detected Linux system"
    
    if command -v apt &> /dev/null; then
        echo "📦 Installing FFmpeg via apt..."
        sudo apt update
        sudo apt install -y ffmpeg
    elif command -v yum &> /dev/null; then
        echo "📦 Installing FFmpeg via yum..."
        sudo yum install -y epel-release
        sudo yum install -y ffmpeg
    elif command -v dnf &> /dev/null; then
        echo "📦 Installing FFmpeg via dnf..."
        sudo dnf install -y ffmpeg
    else
        echo "❌ Package manager not supported. Please install FFmpeg manually."
        exit 1
    fi
    
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "🍎 Detected macOS system"
    
    if command -v brew &> /dev/null; then
        echo "📦 Installing FFmpeg via Homebrew..."
        brew install ffmpeg
    else
        echo "❌ Homebrew not found. Please install Homebrew first:"
        echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows
    echo "🪟 Detected Windows system"
    
    if command -v choco &> /dev/null; then
        echo "📦 Installing FFmpeg via Chocolatey..."
        choco install ffmpeg -y
    else
        echo "❌ Chocolatey not found. Please install Chocolatey first:"
        echo "   https://chocolatey.org/install"
        exit 1
    fi
    
else
    echo "❌ Unsupported operating system: $OSTYPE"
    echo "Please install FFmpeg manually from: https://ffmpeg.org/download.html"
    exit 1
fi

# Verify installation
echo "🔍 Verifying FFmpeg installation..."
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg installed successfully!"
    ffmpeg -version | head -n 1
    echo ""
    echo "🎉 FFmpeg is ready for UltraFast Social Platform!"
    echo "🚀 You can now process videos locally with LL-DASH and LL-HLS streaming!"
else
    echo "❌ FFmpeg installation failed. Please check the installation."
    exit 1
fi





