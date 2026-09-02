# Infrastructure

## Directory Structure

```
infra/
├── docker/           Local development stack (Docker Compose)
├── terraform/        AWS infrastructure as code
├── kubernetes/       K8s manifests (Kustomize base + overlays)
├── helm/             Helm charts for service packaging
└── observability/    OTel, Prometheus, Grafana, Jaeger configs
```

## Local Development

```bash
# Start infra only
docker compose -f infra/docker/docker-compose.infra.yml up -d

# Start everything
docker compose -f infra/docker/docker-compose.yml up -d
```

See [docs/runbooks/local-dev-setup.md](../docs/runbooks/local-dev-setup.md) for step-by-step guide.

## Kubernetes (Phase 4+)

See [docs/runbooks/kubernetes-deploy.md](../docs/runbooks/kubernetes-deploy.md).

Manifests use Kustomize:
```bash
# Deploy to dev overlay
kubectl apply -k infra/kubernetes/overlays/dev

# Deploy to production overlay
kubectl apply -k infra/kubernetes/overlays/production
```

## Terraform (Phase 6)

```bash
cd infra/terraform/environments/dev
terraform init
terraform plan
terraform apply
```

Modules: `eks`, `rds`, `elasticache`, `msk`, `opensearch`, `lambda`, `eventbridge`, `vpc`
