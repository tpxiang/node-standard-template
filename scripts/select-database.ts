/**
 * 数据库选择提示脚本。
 * 本仓库用分支隔离双库：main=PostgreSQL，mysql=MySQL，不支持同分支热切换。
 */
function main(): void {
  const database = process.argv[2];

  if (database === "postgres") {
    console.log("PostgreSQL is the active database on the main branch.");
    return;
  }

  if (database === "mysql") {
    throw new Error(
      "MySQL is maintained on the mysql branch. Switch branches before selecting the MySQL database."
    );
  }

  throw new Error("Usage: pnpm db:select postgres|mysql");
}

main();
