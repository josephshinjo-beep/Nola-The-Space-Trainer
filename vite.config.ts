import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Runs the server functions in /api during `npm run dev`, so the AI chat
 * and NASA data work on your own computer the same way they do on Vercel.
 * Server settings such as GEMINI_API_KEY are read from .env.local.
 */
function localApi(): Plugin {
  return {
    name: 'nola-local-api',
    configureServer(server) {
      // Make every value in .env.local (not only VITE_ ones) visible to the functions.
      const env = loadEnv(server.config.mode, process.cwd(), '');
      for (const [key, value] of Object.entries(env)) process.env[key] ??= value;

      server.middlewares.use(async (req, res, next) => {
        const match = /^\/api\/([a-z0-9-]+)(?:\?.*)?$/.exec(req.url ?? '');
        const file = match ? resolve(process.cwd(), 'api', `${match[1]}.ts`) : '';
        if (!match || !existsSync(file)) return next();
        try {
          const handlers = (await server.ssrLoadModule(file)) as Record<string, ((request: Request) => Promise<Response>) | undefined>;
          const method = req.method ?? 'GET';
          const handler = handlers[method];
          if (!handler) {
            res.statusCode = 405;
            res.end();
            return;
          }
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const headers = new Headers();
          for (const [name, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
          const request = new Request(`http://localhost${req.url}`, { method, headers, body: method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks) });
          const response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((value, name) => res.setHeader(name, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

/** The commit being built: Vercel provides it; locally it is read from Git. */
function appVersion(): string {
  const fromVercel = process.env.VERCEL_GIT_COMMIT_SHA;
  if (fromVercel) return fromVercel.slice(0, 7);
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'unknown';
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localApi()],
  define: { __APP_VERSION__: JSON.stringify(appVersion()) },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
