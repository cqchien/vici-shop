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

`docker/docker-compose.yml` is the **one stack for the whole backend** — it `include:`s the infra
file and adds Kong + every service. Each service ships only a `Dockerfile` (and runs its own
migrations on start); no service has its own compose file.

```bash
cd infra/docker && cp .env.example .env

# Everything: postgres + kong (:8000) + all implemented services
docker compose up -d --build

# Infra only (run services from your IDE with `pnpm start:dev`)
docker compose -f docker-compose.infra.yml up -d
```

`init-databases.sql` creates the runtime roles (`vici_app` / `vici_platform` / `vici_relay`) and
the per-service databases.

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
