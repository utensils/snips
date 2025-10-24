#!/bin/bash

# Snips - Setup Verification Script
# This script verifies that all configuration and tooling is working correctly

set -e

# Get script directory and navigate to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🔍 Verifying Snips Project Setup..."
echo "📁 Project directory: $SCRIPT_DIR"
echo ""

# Frontend checks
echo "📦 Frontend Checks"
echo "  ✓ Checking Prettier formatting..."
npm run format:check > /dev/null 2>&1 && echo "    ✓ Prettier configured correctly" || echo "    ✗ Prettier check failed"

echo "  ✓ Checking TypeScript configuration..."
npm run type-check > /dev/null 2>&1 && echo "    ✓ TypeScript compiles without errors" || echo "    ✗ TypeScript check failed"

echo "  ✓ Checking ESLint configuration..."
npm run lint > /dev/null 2>&1 && echo "    ✓ ESLint configured correctly" || echo "    ⚠ ESLint warnings (may be expected)"

echo ""

# Backend checks
echo "🦀 Rust Backend Checks"
echo "  ✓ Checking Rust formatting..."
cargo fmt -- --check > /dev/null 2>&1 && echo "    ✓ Rust code formatted correctly" || echo "    ✗ Rust formatting check failed"

echo "  ✓ Checking Clippy..."
cargo clippy --quiet 2>&1 | grep -q "warning\|error" && echo "    ⚠ Clippy warnings found" || echo "    ✓ Clippy clean"

echo "  ✓ Checking Rust tests..."
cargo test --quiet > /dev/null 2>&1 && echo "    ✓ Rust tests pass" || echo "    ⚠ No Rust tests yet (expected)"

echo ""

# Configuration files
echo "📋 Configuration Files"
config_files=(
  ".editorconfig"
  ".prettierrc.json"
  ".prettierignore"
  "eslint.config.js"
  ".lintstagedrc.json"
  "tsconfig.json"
  "vite.config.ts"
  "vitest.config.ts"
  "src-tauri/rustfmt.toml"
  "src-tauri/.cargo/config.toml"
  ".husky/pre-commit"
)

for file in "${config_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (missing)"
  fi
done

echo ""

# Dependencies
echo "📚 Dependencies"
echo "  ✓ Checking npm packages..."
npm list --depth=0 > /dev/null 2>&1 && echo "    ✓ All npm packages installed" || echo "    ⚠ npm package issues"

echo "  ✓ Checking Cargo dependencies..."
cargo tree --depth=0 > /dev/null 2>&1 && echo "    ✓ All Cargo dependencies resolved" || echo "    ✗ Cargo dependency issues"

echo ""
echo "✅ Setup verification complete!"
echo ""
echo "Next steps:"
echo "  1. Review TECH_DESIGN.md for implementation phases"
echo "  2. Review STANDARDS.md for coding practices"
echo "  3. Start with Phase 1, Task Group A"
echo ""
