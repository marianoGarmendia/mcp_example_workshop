# Workshop MCP Server

Servidor MCP minimalista construido con Node.js + TypeScript + Express. Expone tres tools de ejemplo via **Streamable HTTP transport**.

## Tools disponibles

| Tool | Descripción |
|---|---|
| `saludar` | Genera un saludo personalizado con nombre y rol |
| `info_workshop` | Devuelve info del workshop en tiempo real |
| `calcular` | Operaciones matemáticas: sumar, restar, multiplicar, dividir |

---

## Levantar el servidor

### Modo desarrollo (recomendado — hot reload)

```bash
npm run dev
```

### Modo producción

```bash
npm run build
npm start
```

El servidor queda corriendo en `http://localhost:3333`.

### Verificar que está vivo

```bash
curl http://localhost:3333/health
```

Respuesta esperada:
```json
{"status":"ok","server":"workshop-mcp-server","port":3333}
```

---

## Conectar a Claude Code

Con el servidor corriendo, ejecutar en otra terminal:

```bash
claude mcp add --transport http workshop-mcp http://localhost:3333/mcp
```

> **Windows:** Si el comando anterior falla, usar:
> ```bash
> claude mcp add-json workshop-mcp '{"type":"http","url":"http://localhost:3333/mcp"}'
> ```

### Verificar la conexión

```bash
claude mcp list
```

Debería mostrar: `workshop-mcp: connected (http)`

---

## Probar los tools

Una vez conectado, abrir Claude Code y usar prompts como:

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

## Troubleshooting

| Problema | Solución |
|---|---|
| `EADDRINUSE` port 3333 | Cambiar `PORT` a `3334` en `src/index.ts` |
| Error de módulos ESM | Verificar que `"type": "module"` está en `package.json` |
| `tsx` no encontrado | Usar `npx tsx src/index.ts` en vez de `npm run dev` |
| `Connection closed` con stdio | Este server usa HTTP transport, no stdio |
