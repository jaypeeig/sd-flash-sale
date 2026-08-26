import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

const DEFAULT_PORT = 3000;
const GLOBAL_PREFIX = "api";

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(GLOBAL_PREFIX);

  await app.listen(process.env.API_PORT ?? DEFAULT_PORT);

  Logger.log(`API ready at ${await app.getUrl()}/${GLOBAL_PREFIX}`, "Bootstrap");
};

void bootstrap();
