
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# check for vercel CLI
if ! command -v vercel &> /dev/null; then
  echo "Error: vercel CLI not found. Install with: npm i -g vercel"
  exit 1
fi

if [[ "$1" == "--prod" ]]; then
  echo "Deploying to production"
  vercel --prod
else
  echo "Deploying preview"
  vercel
fi
