import { resolve } from "node:path";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import { config } from "dotenv";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { AppModule } from "./app.module";

const DEFAULT_PORT = 3000;
const GLOBAL_PREFIX = "api";
const DOCS_PATH = "docs";

// Must run before AppModule is compiled — DatabaseModule's provider reads
// DATABASE_URL as soon as Nest instantiates it inside NestFactory.create().
config({ path: resolve(process.cwd(), "../../.env") });

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(GLOBAL_PREFIX);

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Flash Sale System API")
    .setDescription(
      "API for a multi-sale flash sale platform. Supports listing sales filtered by phase (active/upcoming/past), sale detail, a user's purchase history, and purchase attempts enforcing a strict one-item-per-user rule under concurrent load.",
    )
    .setVersion("1.0.0")
    .build();
  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, swaggerConfig));

  app.use(`/${DOCS_PATH}`, apiReference({ content: document }));

  await app.listen(process.env.API_PORT ?? DEFAULT_PORT);

  Logger.log(`API ready at ${await app.getUrl()}/${GLOBAL_PREFIX}`, "Bootstrap");
  Logger.log(`Docs ready at ${await app.getUrl()}/${DOCS_PATH}`, "Bootstrap");
};

void bootstrap();
