import { Global, Module } from "@nestjs/common";
import { DATABASE_CONNECTION } from "./database.constants";
import { databaseProvider } from "./database.provider";

@Global()
@Module({
  providers: [databaseProvider],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
