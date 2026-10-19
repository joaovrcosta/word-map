import "reflect-metadata";
import tls from "node:tls";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

// Os tipos do Node 20 não declaram estas funções, mas o runtime 22+ tem.
type SystemTls = typeof tls & {
  getCACertificates?: (type: "default" | "system") => string[];
  setDefaultCACertificates?: (certs: readonly string[]) => void;
};

function trustSystemCertificates() {
  const systemTls = tls as SystemTls;
  if (
    typeof systemTls.getCACertificates !== "function" ||
    typeof systemTls.setDefaultCACertificates !== "function"
  ) {
    return;
  }
  systemTls.setDefaultCACertificates([
    ...systemTls.getCACertificates("default"),
    ...systemTls.getCACertificates("system"),
  ]);
}

function parseEnvAssignments(line: string): Array<[string, string]> {
  const separator = line.indexOf("=");
  if (separator === -1) return [];
  const key = line.slice(0, separator).trim();
  if (!key) return [];
  const rest = line.slice(separator + 1).trim();
  if (rest.startsWith('"') || rest.startsWith("'")) {
    const quote = rest[0];
    const end = rest.indexOf(quote, 1);
    if (end !== -1) {
      const pairs: Array<[string, string]> = [[key, rest.slice(1, end)]];
      const extra = rest.slice(end + 1).trim();
      if (extra.includes("=")) pairs.push(...parseEnvAssignments(extra));
      return pairs;
    }
  }
  return [[key, rest]];
}

function loadLocalEnv() {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    for (const [key, value] of parseEnvAssignments(trimmed)) {
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

async function bootstrap() {
  trustSystemCertificates();
  loadLocalEnv();
  const app = await NestFactory.create(AppModule);
  const origins = (process.env.WEB_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const hubOrigin = process.env.HUB_ORIGIN || "http://localhost:3002";
  if (!origins.includes(hubOrigin)) origins.push(hubOrigin);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || origins.includes(origin)) {
        callback(null, true);
        return;
      }
      // O preview web do Expo sobe numa porta própria, fora do site.
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: false,
    })
  );

  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
}

void bootstrap();
