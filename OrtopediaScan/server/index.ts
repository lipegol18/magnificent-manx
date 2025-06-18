import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { addStaticRoutes } from "./static-routes";
import { accessMonitorMiddleware } from "./middlewares/access-monitor";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure CORS para permitir chamadas de aplicações mobile
app.use(cors({
  origin: "*", // Na produção, configure para apenas as origens confiáveis
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"] 
}));

// Adicionar middleware para garantir que as requisições API retornem JSON
app.use((req, res, next) => {
    if (req.path.startsWith('/api/') && !req.is('multipart/form-data')) {
    // Forçar o tipo de conteúdo para JSON em todas as rotas da API
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Adicionar middleware para monitorar acesso à API e enviar para webhook
app.use(accessMonitorMiddleware);

app.use((req, res, next) => {
  // Log especial para uploads de imagem e validação de CRM
  if (req.path === '/api/uploads/exam-image') {
    console.log('🚨 UPLOAD REQUEST INTERCEPTED:', req.method, req.path);
  }
  
  // Log detalhado para requisições de validação de CRM
  if (req.path === '/api/validate-crm') {
    console.log('🔍 CRM VALIDATION REQUEST:', req.method, req.path, req.query);
  }
  
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);
  
  // Adicionar rotas para arquivos estáticos (mockups, etc)
  addStaticRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
