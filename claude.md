# Workshop MCP Server — Instrucciones para Claude Code

## Objetivo
Construir un servidor MCP minimalista con Node.js + TypeScript + Express que exponga tools de ejemplo para un workshop de AI Engineering. El servidor usa **Streamable HTTP transport** (el estándar moderno, SSE está deprecated).

---

## Stack
- Runtime: Node.js 18+
- Lenguaje: TypeScript
- Framework HTTP: Express
- SDK MCP: `@modelcontextprotocol/sdk`
- Validación de schemas: `zod`

---

## Estructura de archivos a crear

```
workshop-mcp-server/
├── src/
│   └── index.ts          ← servidor principal
├── package.json
├── tsconfig.json
└── README.md
```

---

## Paso 1 — Inicializar el proyecto

```bash
mkdir workshop-mcp-server
cd workshop-mcp-server
npm init -y
```

---

## Paso 2 — Instalar dependencias

```bash
npm install @modelcontextprotocol/sdk zod express
npm install -D typescript @types/node @types/express ts-node tsx
```

---

## Paso 3 — Crear `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Paso 4 — Crear `src/index.ts`

Crear el archivo con el siguiente contenido **exacto**:

```typescript
import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const PORT = 3333;

// ─── Crear el servidor MCP ────────────────────────────────────────────────────
function buildMcpServer(): McpServer {
  const server = new McpServer({
    name: "workshop-mcp-server",
    version: "1.0.0",
  });

  // Tool 1: saludo personalizado
  server.tool(
    "saludar",
    "Genera un saludo personalizado para el workshop",
    {
      nombre: z.string().describe("Nombre de la persona a saludar"),
      rol: z
        .enum(["estudiante", "instructor", "invitado"])
        .default("invitado")
        .describe("Rol en el workshop"),
    },
    async ({ nombre, rol }) => {
      const emojis: Record<string, string> = {
        estudiante: "📚",
        instructor: "🎓",
        invitado: "👋",
      };
      const emoji = emojis[rol] ?? "👋";
      return {
        content: [
          {
            type: "text",
            text: `¡Hola, ${nombre}! ${emoji} Bienvenido/a al workshop de MCP como ${rol}. Este mensaje fue generado por un tool MCP real.`,
          },
        ],
      };
    }
  );

  // Tool 2: info del workshop
  server.tool(
    "info_workshop",
    "Devuelve información sobre el workshop actual",
    {},
    async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                titulo: "Taller: MCP Servers con Claude Code",
                tecnologias: ["Node.js", "TypeScript", "Express", "MCP SDK"],
                transport: "Streamable HTTP (moderno)",
                fecha: new Date().toLocaleDateString("es-AR"),
                hora: new Date().toLocaleTimeString("es-AR"),
                mensaje:
                  "¡Este servidor MCP fue construido en vivo durante el workshop!",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Tool 3: calcular
  server.tool(
    "calcular",
    "Realiza una operación matemática simple entre dos números",
    {
      a: z.number().describe("Primer número"),
      b: z.number().describe("Segundo número"),
      operacion: z
        .enum(["sumar", "restar", "multiplicar", "dividir"])
        .describe("Operación a realizar"),
    },
    async ({ a, b, operacion }) => {
      let resultado: number;
      switch (operacion) {
        case "sumar":
          resultado = a + b;
          break;
        case "restar":
          resultado = a - b;
          break;
        case "multiplicar":
          resultado = a * b;
          break;
        case "dividir":
          if (b === 0) {
            return {
              content: [{ type: "text", text: "Error: división por cero" }],
              isError: true,
            };
          }
          resultado = a / b;
          break;
      }
      return {
        content: [
          {
            type: "text",
            text: `${a} ${operacion} ${b} = ${resultado}`,
          },
        ],
      };
    }
  );

  return server;
}

// ─── Servidor Express ─────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// Health check — útil para verificar que el server está vivo
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", server: "workshop-mcp-server", port: PORT });
});

// Endpoint MCP principal — maneja POST (requests del cliente)
app.post("/mcp", async (req: Request, res: Response) => {
  const mcpServer = buildMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless para simplicidad
  });

  res.on("close", () => {
    transport.close();
    mcpServer.close();
  });

  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Endpoint MCP para GET/DELETE (SSE streams si el cliente lo necesita)
app.get("/mcp", async (req: Request, res: Response) => {
  res.status(405).json({
    error: "Método no soportado en modo stateless. Usar POST.",
  });
});

// ─── Iniciar servidor ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Workshop MCP Server corriendo en http://localhost:${PORT}`);
  console.log(`📡 Endpoint MCP: http://localhost:${PORT}/mcp`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`\nTools disponibles:`);
  console.log(`  • saludar        → genera un saludo personalizado`);
  console.log(`  • info_workshop  → info del workshop en tiempo real`);
  console.log(`  • calcular       → operaciones matemáticas básicas`);
  console.log(`\nPresioná Ctrl+C para detener.\n`);
});
```

---

## Paso 5 — Actualizar `package.json`

Agregar los siguientes scripts en la sección `"scripts"`:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "type": "module"
}
```

---

## Paso 6 — Levantar el servidor

```bash
# Modo desarrollo (recomendado para el workshop — hot reload)
npm run dev

# O compilar y correr
npm run build
npm start
```

Verificar que funciona:
```bash
curl http://localhost:3333/health
```
Debería responder: `{"status":"ok","server":"workshop-mcp-server","port":3333}`

---

## Paso 7 — Conectar a Claude Code

En una terminal separada (con el servidor corriendo), ejecutar:

```bash
claude mcp add --transport http workshop-mcp http://localhost:3333/mcp
```

> **Nota Windows:** Si el comando anterior falla, usar la alternativa:
> ```bash
> claude mcp add-json workshop-mcp '{"type":"http","url":"http://localhost:3333/mcp"}'
> ```

Verificar que quedó conectado:
```bash
claude mcp list
```
Debería mostrar: `workshop-mcp: connected (http)`

---

## Paso 8 — Probar los tools en Claude Code

Iniciar Claude Code y probar con prompts como:

```
Usá el tool saludar para darme la bienvenida. Mi nombre es Mariano y soy instructor.
```

```
Usá el tool info_workshop para ver la info del workshop de hoy.
```

```
Usá el tool calcular para multiplicar 12 por 8.
```

---

## Troubleshooting común en Windows

| Problema | Solución |
|---|---|
| `Connection closed` al agregar con stdio | Usar HTTP transport en vez de stdio |
| `EADDRINUSE` port 3333 | Cambiar PORT a 3334 en `src/index.ts` |
| Error de módulos ESM | Verificar que `"type": "module"` está en package.json |
| `tsx` no encontrado | Ejecutar `npx tsx src/index.ts` en vez de `npm run dev` |

---

## Notas para el workshop

- El servidor es **stateless** — cada request es independiente, ideal para demos
- El transport **Streamable HTTP** es el estándar actual (SSE está deprecated desde spec 2025-03-26)
- Cada `tool()` recibe un nombre, descripción y schema Zod — esto es lo que Claude usa para decidir cuándo invocar el tool
- El servidor puede correr en cualquier puerto y conectarse remotamente si se expone con ngrok o devtunnel