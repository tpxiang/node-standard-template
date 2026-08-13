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
