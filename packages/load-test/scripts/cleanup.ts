import { loadRootEnv } from "./env";
import { connect, deleteLoadTestRows } from "./load-sale";

loadRootEnv();

export const cleanup = async (): Promise<void> => {
  const { db, pool } = connect();
  try {
    await deleteLoadTestRows(db);
    console.log("Removed the load-test product, sale, and any purchases against it.");
  } finally {
    await pool.end();
  }
};

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  await cleanup();
}
