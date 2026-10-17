
.PHONY: install test build run docker-build docker-up

install:
	@echo "No external dependencies required"

test:
	@echo "Running tests..."
	node tests/test.js

build:
	@echo "Building News Portal..."
	@test -f index.html
	@test -f style.css
	@test -f script.js
	@echo "Build checks passed"

run:
	python -m http.server 8000

docker-build:
	docker build -t news-portal:latest .

docker-up:
	docker compose up -d --build
