# Frontend QA preview

The image builds the React app and serves it through Nginx, including fallback to `index.html` for client routes. The existing CI still checks the source build and lint separately.

This image is a UI preview. It does not include a mock account or fake JWT. To access private routes, configure `VITE_API_BASE_URL`, `VITE_FIREBASE_AUTH_URL`, and `VITE_FIREBASE_API_KEY` for a Firebase project linked to an operational API account. Without that configuration, authentication fails and private routes remain protected. The shared QA Compose stack binds the preview to localhost.

```bash
docker build --tag mottainai-frontend:qa .
docker run --rm -p 127.0.0.1:18081:8080 mottainai-frontend:qa
```

Check `http://localhost:18081/healthz` and then the page at `http://localhost:18081`.
