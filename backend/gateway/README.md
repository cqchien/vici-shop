# API Gateway (Kong)

Kong is the public entry point for all external traffic. It handles:
- JWT signature validation (all authenticated routes)
- **Tenant resolution** (ADR-009): derive the tenant from the JWT `tid` claim, or from the
  request `Host` for public storefront routes, and forward it as `X-Tenant-Id` (overwriting any
  client-supplied value). Rate limiting is keyed per tenant.
- Rate limiting (per tenant / IP, sliding window, Redis backend)
- CORS header injection
- Request ID injection (for distributed tracing)
- Route proxying to upstream services

Platform-plane routes (`/platform/**`, tenant onboarding, billing webhooks) are **not**
tenant-scoped — see the header comment in `kong/kong.yml`.

## Local Usage

Kong runs in DBless mode (`KONG_DATABASE: "off"`). Configuration is entirely in `kong/kong.yml`.

Apply config changes:
```bash
# Validate config
docker exec vici-kong kong config parse /etc/kong/kong.yml

# Reload (hot reload — no downtime)
docker exec vici-kong kong reload
```

Or if using deck:
```bash
deck sync -s gateway/kong/kong.yml --kong-addr http://localhost:8001
```

## Config Structure

```
kong/
├── kong.yml           Root declarative config (services, routes, plugins)
├── plugins/           Plugin config snippets (rate-limiting, jwt, cors, request-id)
└── routes/            Route definitions per upstream service
```

## Adding a New Service

1. Add a `service` entry to `kong.yml` pointing at the new service's container name + port
2. Add `routes` entries with the URL path prefix
3. Apply the JWT validation plugin to the routes (unless the endpoint is public)
4. Test with: `curl http://localhost:8000/new-endpoint/health`

## Plugin Reference

| Plugin | Purpose |
|---|---|
| `jwt` | Validates RS256 JWT signature; injects `X-Consumer-ID` header |
| `rate-limiting` | Sliding window rate limiting per consumer or IP |
| `cors` | Adds `Access-Control-Allow-Origin` and related headers |
| `request-id` | Injects `X-Request-ID` if not present; propagates to upstream |
