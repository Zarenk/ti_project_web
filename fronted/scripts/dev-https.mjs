import { createServer } from "https";
import fs from "fs";
import path from "path";
import { parse } from "url";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.NEXT_DEV_HOST || "localhost";
const port = Number(process.env.PORT) || Number(process.env.NEXT_DEV_PORT) || 3000;

const keyPath =
  process.env.NEXT_DEV_HTTPS_KEY || path.join(process.cwd(), "localhost-key.pem");
const certPath =
  process.env.NEXT_DEV_HTTPS_CERT || path.join(process.cwd(), "localhost.pem");

function readCredential(filePath, label) {
  try {
    return fs.readFileSync(filePath);
  } catch (error) {
    console.error(
      `[dev-https] No se pudo leer ${label} en "${filePath}". ` +
        "Verifica que mkcert haya generado los archivos y vuelve a intentarlo."
    );
    throw error;
  }
}

const httpsOptions = {
  key: readCredential(keyPath, "la clave"),
  cert: readCredential(certPath, "el certificado"),
};

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer(httpsOptions, (req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }).listen(port, () => {
      console.log(
        `[dev-https] Servidor listo en https://${hostname}:${port} (NODE_ENV=${
          dev ? "development" : "production"
        })`
      );
    });
  })
  .catch((error) => {
    console.error("[dev-https] Error iniciando el servidor HTTPS", error);
    process.exit(1);
  });
