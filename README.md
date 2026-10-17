# NEWS — Daily News Portal

## Author

| Roll No. | Name | GitHub username |
|---|---|---|
| 24ESKCS045 | Aney Karnik | karnikaney-cmd |

## About

NEWS is a Daily News Portal that presents news content through a simple, responsive, and user-friendly web interface. This project demonstrates containerization, CI/CD, Kubernetes deployment, and application monitoring.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Web server:** Nginx
- **Containerization:** Docker and Docker Compose
- **Orchestration:** Kubernetes
- **Monitoring:** Prometheus, Nginx Prometheus Exporter, Grafana
- **CI/CD:** GitHub Actions and Jenkins (where configured)

## Live Website

https://skit-devops-2026.github.io/devops-24ESKCS045/

## Run Locally

```bash
make install
make test
make build
make run
```

The local development server runs on port 8000.

## Docker

Build the image:

```bash
docker build -t news-portal:latest .
```

Run the container:

```bash
docker run --rm -p 8080:80 news-portal:latest
```

Open http://localhost:8080.

Published image:

`ghcr.io/karnikaney-cmd/news-portal:v3`

## Docker Compose

Start the application:

```bash
docker compose up -d --build
```

Stop the application:

```bash
docker compose down
```

## Kubernetes

Apply the deployment and service:

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

Check pod status:

```bash
kubectl get pods
kubectl get services
```

## Monitoring

Monitoring components are configured under `monitoring/`.

- **Prometheus:** Collects metrics from Prometheus and the Nginx exporter.
- **Nginx Prometheus Exporter:** Exposes Nginx metrics.
- **Grafana:** Displays monitoring data through the Daily News Portal Monitoring dashboard.

Relevant files:

- `monitoring/prometheus.yml`
- `monitoring/prometheus-deployment.yaml`
- `monitoring/nginx-exporter.yaml`
- `monitoring/grafana.yaml`
- `monitoring/dashboard.json`

Screenshots are available in the `docs/` directory.

## Health Endpoint

`GET /health` returns `OK` when the Nginx-served application is healthy.

## CI Pipeline

GitHub Actions runs the repository hygiene checks and build/test workflow. Docker image publishing is configured for pushes to the main branch.

A Jenkins pipeline is included only where configured in the repository's `Jenkinsfile`.

## Repository Structure

```text
.github/workflows/   GitHub Actions workflow
docs/                Monitoring screenshots
k8s/                 Kubernetes manifests
monitoring/          Prometheus, exporter and Grafana configuration
Dockerfile           Container image definition
docker-compose.yml   Local container orchestration
nginx.conf           Nginx web server configuration
Makefile             Development and build commands
```
