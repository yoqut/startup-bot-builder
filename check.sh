echo "Start checking..."
cd backend

echo "Checking types with Ty..."
uv run ty check .

echo "Checking types with Ruff..."
uv run ruff check .

echo "Checking types with Ruff..."
uv run ruff check --fix

echo "Formatting types with Ruff..."
uv run ruff format .