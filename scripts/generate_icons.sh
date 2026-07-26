#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

SOURCE_LOGO="assets/Logo.png"
RES_DIR="android/app/src/main/res"

if [ ! -f "$SOURCE_LOGO" ]; then
    echo "Error: Source logo not found at $SOURCE_LOGO"
    exit 1
fi

echo "Generating Android legacy and adaptive icons..."

# Define dimensions
# DPI: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi
# Legacy icon size: 48, 72, 96, 144, 192
# Adaptive foreground size: 108, 162, 216, 324, 432

DPI_LEVELS=("mdpi" "hdpi" "xhdpi" "xxhdpi" "xxxhdpi")
LEGACY_SIZES=(48 72 96 144 192)
FOREGROUND_SIZES=(108 162 216 324 432)

# Temporary directory for intermediate steps
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

# Generate a master adaptive foreground at 1024x1024
# Resizing target foreground content to 614x614 (60%) and centering it on 1024x1024 transparent canvas
echo "Creating master adaptive foreground layer..."
magick "$SOURCE_LOGO" -fuzz 40% -transparent black -resize 614x614 -background none -gravity center -extent 1024x1024 "$TEMP_DIR/adaptive_fg_master.png"

# Resize the source logo to a standard 1024x1024 for legacy processing
magick "$SOURCE_LOGO" -resize 1024x1024 "$TEMP_DIR/logo_1024.png"

# Generate circular mask at 1024x1024
magick -size 1024x1024 xc:black -fill white -draw "circle 512,512 512,0" -alpha off "$TEMP_DIR/circle_mask.png"

for i in "${!DPI_LEVELS[@]}"; do
    DPI="${DPI_LEVELS[$i]}"
    LEGACY_SZ="${LEGACY_SIZES[$i]}"
    FG_SZ="${FOREGROUND_SIZES[$i]}"
    
    TARGET_MIPMAP_DIR="$RES_DIR/mipmap-$DPI"
    mkdir -p "$TARGET_MIPMAP_DIR"
    
    echo "Processing mipmap-$DPI..."
    
    # 1. Legacy Square Icon (ic_launcher.png)
    # We resize the original logo to the legacy size
    magick "$TEMP_DIR/logo_1024.png" -resize "${LEGACY_SZ}x${LEGACY_SZ}" "$TARGET_MIPMAP_DIR/ic_launcher.png"
    
    # 2. Legacy Round Icon (ic_launcher_round.png)
    # Apply circular mask and resize
    magick "$TEMP_DIR/logo_1024.png" "$TEMP_DIR/circle_mask.png" -compose CopyOpacity -composite -resize "${LEGACY_SZ}x${LEGACY_SZ}" "$TARGET_MIPMAP_DIR/ic_launcher_round.png"
    
    # 3. Adaptive Foreground Icon (ic_launcher_foreground.png)
    # Resize the master transparent foreground
    magick "$TEMP_DIR/adaptive_fg_master.png" -resize "${FG_SZ}x${FG_SZ}" "$TARGET_MIPMAP_DIR/ic_launcher_foreground.png"
done

echo "All icons generated successfully!"
