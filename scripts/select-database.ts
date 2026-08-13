function main(): void {
  const database = process.argv[2];

  if (database === "postgres") {
    // 数据库变体通过 Git 分支维护，不在运行时改写模板。
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
