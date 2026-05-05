#!/bin/zsh

# Fix Media Center project structure
# Converts current structure to target structure

set -e

autoload colors
colors

PROJECT_ROOT="${1:-.}"

echo "${fg[cyan]}🔧 Fixing project structure...${reset_color}"
echo ""

# Step 1: Create missing directories
echo "${fg[yellow]}📁 Creating missing directories...${reset_color}"

mkdir -p "$PROJECT_ROOT/public/css"
mkdir -p "$PROJECT_ROOT/public/pages"
mkdir -p "$PROJECT_ROOT/dist/js"
mkdir -p "$PROJECT_ROOT/dist/ts"
mkdir -p "$PROJECT_ROOT/ts/boot"

echo "  ✓ Created: public/, dist/, ts/boot/"
echo ""

# Step 2: Move CSS files to public/css
echo "${fg[yellow]}🎨 Moving CSS files...${reset_color}"

if [[ -d "$PROJECT_ROOT/css" ]]; then
    cp -r "$PROJECT_ROOT/css/"* "$PROJECT_ROOT/public/css/" 2>/dev/null
    echo "  ✓ Copied CSS files to public/css/"
fi
echo ""

# Step 3: Move HTML pages to public/pages
echo "${fg[yellow]}📄 Moving HTML pages...${reset_color}"

if [[ -d "$PROJECT_ROOT/pages" ]]; then
    cp -r "$PROJECT_ROOT/pages/"*.html "$PROJECT_ROOT/public/pages/" 2>/dev/null
    echo "  ✓ Copied HTML pages to public/pages/"
fi

# Also copy pages from media-center if exists
if [[ -d "$PROJECT_ROOT/media-center/public/pages" ]]; then
    cp -r "$PROJECT_ROOT/media-center/public/pages/"*.html "$PROJECT_ROOT/public/pages/" 2>/dev/null
    echo "  ✓ Copied from media-center pages"
fi
echo ""

# Step 4: Move favicon to public
echo "${fg[yellow]}🖼️  Moving favicon...${reset_color}"

if [[ -f "$PROJECT_ROOT/favicon.ico" ]]; then
    cp "$PROJECT_ROOT/favicon.ico" "$PROJECT_ROOT/public/" 2>/dev/null
    echo "  ✓ Copied favicon.ico to public/"
fi
echo ""

# Step 5: Move media-center contents to root
echo "${fg[yellow]}📦 Moving media-center contents to root...${reset_color}"

if [[ -d "$PROJECT_ROOT/media-center/src" ]]; then
    # Ensure ts directory exists
    mkdir -p "$PROJECT_ROOT/ts"

    # Copy src contents to ts (not move, to keep backup)
    cp -r "$PROJECT_ROOT/media-center/src/"* "$PROJECT_ROOT/ts/" 2>/dev/null
    echo "  ✓ Copied src/* to ts/"

    # Copy config files if they have content
    if [[ -f "$PROJECT_ROOT/media-center/package.json" && ! -s "$PROJECT_ROOT/package.json" ]]; then
        cp "$PROJECT_ROOT/media-center/package.json" "$PROJECT_ROOT/" 2>/dev/null
        echo "  ✓ Copied package.json"
    fi

    if [[ -f "$PROJECT_ROOT/media-center/tsconfig.json" && ! -s "$PROJECT_ROOT/tsconfig.json" ]]; then
        cp "$PROJECT_ROOT/media-center/tsconfig.json" "$PROJECT_ROOT/" 2>/dev/null
        echo "  ✓ Copied tsconfig.json"
    fi

    if [[ -f "$PROJECT_ROOT/media-center/vite.config.ts" && ! -s "$PROJECT_ROOT/vite.config.ts" ]]; then
        cp "$PROJECT_ROOT/media-center/vite.config.ts" "$PROJECT_ROOT/" 2>/dev/null
        echo "  ✓ Copied vite.config.ts"
    fi
fi
echo ""

# Step 6: Create index.html if missing or update it
echo "${fg[yellow]}🌐 Updating index.html...${reset_color}"

if [[ ! -f "$PROJECT_ROOT/index.html" ]] || [[ ! -s "$PROJECT_ROOT/index.html" ]]; then
    cat > "$PROJECT_ROOT/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Media Center</title>
  <link rel="stylesheet" href="/public/css/styles.css">
  <link rel="stylesheet" href="/public/css/universal-player.css">
  <link rel="icon" type="image/x-icon" href="/public/favicon.ico">
</head>
<body>
  <div id="app"></div>

  <!-- TypeScript compiled bundle -->
  <script type="module" src="/dist/ts/index.js"></script>
</body>
</html>
EOF
    echo "  ✓ Created index.html"
else
    echo "  ⚠️  Keeping existing index.html"
fi
echo ""

# Step 7: Create proper tsconfig.json if missing
echo "${fg[yellow]}⚙️  Updating tsconfig.json...${reset_color}"

if [[ ! -f "$PROJECT_ROOT/tsconfig.json" ]] || [[ ! -s "$PROJECT_ROOT/tsconfig.json" ]]; then
    cat > "$PROJECT_ROOT/tsconfig.json" << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "outDir": "./dist/ts",
    "rootDir": "./ts",
    "removeComments": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "paths": {
      "@/*": ["./ts/*"],
      "@types/*": ["./ts/types/*"],
      "@core/*": ["./ts/core/*"],
      "@api/*": ["./ts/api/*"],
      "@models/*": ["./ts/models/*"],
      "@services/*": ["./ts/services/*"],
      "@ui/*": ["./ts/ui/*"],
      "@utils/*": ["./ts/utils/*"]
    }
  },
  "include": ["ts/**/*"],
  "exclude": ["node_modules", "dist", "media-center"]
}
EOF
    echo "  ✓ Created tsconfig.json"
else
    echo "  ⚠️  Keeping existing tsconfig.json"
fi
echo ""

# Step 8: Create entry point index.ts if missing
echo "${fg[yellow]}🚀 Creating entry point...${reset_color}"

if [[ ! -f "$PROJECT_ROOT/ts/index.ts" ]]; then
    cat > "$PROJECT_ROOT/ts/index.ts" << 'EOF'
// Main entry point
import { EventBus } from './core/events/EventBus';
import { AppState } from './core/state/AppState';

console.log('Media Center v3.0 - TypeScript version');

// Initialize application
const eventBus = new EventBus();
const appState = AppState.getInstance();

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).__MEDIA_CENTER__ = { eventBus, appState };
}

// TODO: Initialize modules
export { eventBus, appState };
EOF
    echo "  ✓ Created ts/index.ts"
fi
echo ""

# Step 9: Clean up old directories (optional)
echo "${fg[yellow]}🧹 Cleanup options:${reset_color}"
echo -n "  Remove old directories (css, pages, js, ts-old, media-center)? (y/N) "
read -r cleanup

if [[ "$cleanup" =~ ^[Yy]$ ]]; then
    echo ""
    echo "${fg[red]}🗑️  Removing old directories...${reset_color}"

    # Remove old directories but keep backups just in case
    backup_dir="$PROJECT_ROOT/.backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"

    for dir in css pages js ts-old media-center; do
        if [[ -d "$PROJECT_ROOT/$dir" ]]; then
            mv "$PROJECT_ROOT/$dir" "$backup_dir/" 2>/dev/null
            echo "  ✓ Moved $dir to $backup_dir/"
        fi
    done

    # Remove old ts directory if empty
    if [[ -d "$PROJECT_ROOT/ts" && -z "$(ls -A $PROJECT_ROOT/ts 2>/dev/null)" ]]; then
        rmdir "$PROJECT_ROOT/ts" 2>/dev/null
        echo "  ✓ Removed empty ts/"
    fi

    echo ""
    echo "${fg[blue]}💾 Backup saved to: $backup_dir${reset_color}"
fi
echo ""

# Step 10: Show final structure
echo "${fg[green]}✅ Structure fixed!${reset_color}"
echo ""
echo "${fg[cyan]}📁 Final project structure:${reset_color}"
echo ""
tree -L 2 "$PROJECT_ROOT" 2>/dev/null || ls -la "$PROJECT_ROOT" | head -20

echo ""
echo "${fg[yellow]}📝 Next steps:${reset_color}"
echo "  1. cd $PROJECT_ROOT"
echo "  2. npm install"
echo "  3. npm run build"
echo "  4. npm run dev"
echo ""
echo "${fg[green]}✨ Your TypeScript project is ready!${reset_color}"
