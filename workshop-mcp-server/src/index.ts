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
  server.registerTool(
    "saludar",
    {
      description: "Genera un saludo personalizado para el workshop",
      inputSchema: {
        nombre: z.string().describe("Nombre de la persona a saludar"),
        rol: z
          .enum(["estudiante", "instructor", "Invitado"])
          .default("Invitado")
          .describe("Rol en el workshop"),
      },
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
            text: `¡Hola, ${nombre}! ${emoji} Bienvenido/a al workshop de Claude Code de Henry como ${rol}. Este mensaje fue generado por un tool MCP real.`,
          },
        ],
      };
    },
  );

  // Tool 2: info del workshop
  server.registerTool(
    "info_workshop",
    {
      description: "Devuelve información sobre el workshop actual",
    },
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
              2,
            ),
          },
        ],
      };
    },
  );

  // Tool 3: calcular
  server.registerTool(
    "calcular",
    {
      description: "Realiza una operación matemática simple entre dos números",
      inputSchema: {
        a: z.number().describe("Primer número"),
        b: z.number().describe("Segundo número"),
        operacion: z
          .enum(["sumar", "restar", "multiplicar", "dividir"])
          .describe("Operación a realizar"),
      },
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
    },
  );

  return server;
}

// ─── Servidor Express ─────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// OAuth Protected Resource Metadata — indica que no se requiere auth
app.get("/.well-known/oauth-protected-resource", (_req: Request, res: Response) => {
  res.json({
    resource: `http://localhost:${PORT}`,
    authorization_servers: [],
  });
});

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
