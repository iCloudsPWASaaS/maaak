import { Pool, types } from "pg";

// Configure pg type parsers so returned row values match PostgREST / JSON semantics
// 1082 = DATE -> "YYYY-MM-DD"
types.setTypeParser(1082, (val: string) => val);
// 1114 = TIMESTAMP WITHOUT TIME ZONE -> ISO string
types.setTypeParser(1114, (val: string) =>
  val ? new Date(`${val.replace(" ", "T")}Z`).toISOString() : null,
);
// 1184 = TIMESTAMPTZ -> ISO string
types.setTypeParser(1184, (val: string) =>
  val ? new Date(val).toISOString() : null,
);
// 1700 = NUMERIC -> number
types.setTypeParser(1700, (val: string) => (val === null ? null : Number(val)));
// 20 = INT8 / BIGINT -> number
types.setTypeParser(20, (val: string) => (val === null ? null : Number(val)));

declare global {
  var __maaakPgPool: Pool | undefined;
  var __maaakPgPoolUrl: string | undefined;
}

export function parsePgConnectionConfig(rawUrl: string) {
  const urlObj = new URL(rawUrl);
  const sslMode = urlObj.searchParams.get("sslmode");
  urlObj.searchParams.delete("sslmode");
  urlObj.searchParams.delete("ssl");

  const wantsSsl =
    sslMode === "require" ||
    sslMode === "verify-ca" ||
    sslMode === "verify-full" ||
    sslMode === "no-verify" ||
    process.env.PGSSLMODE === "require";

  return {
    connectionString: urlObj.toString(),
    ssl: wantsSsl ? { rejectUnauthorized: false } : undefined,
  };
}

export function getPgPool(): Pool {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (global.__maaakPgPool && global.__maaakPgPoolUrl === rawUrl) {
    return global.__maaakPgPool;
  }

  const cfg = parsePgConnectionConfig(rawUrl);
  const pool = new Pool({
    connectionString: cfg.connectionString,
    ssl: cfg.ssl,
    max: 15,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  global.__maaakPgPool = pool;
  global.__maaakPgPoolUrl = rawUrl;
  return pool;
}

function quoteIdent(ident: string): string {
  const cleaned = ident.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(cleaned)) {
    throw new Error(`Invalid SQL identifier: ${ident}`);
  }
  return `"${cleaned}"`;
}

const JSONB_SCALAR_COLUMNS = new Set(["required_value", "setting_value"]);

function serializeParamValue(val: unknown, columnName?: string): unknown {
  if (val === undefined) return null;
  if (val === null) return null;
  if (val instanceof Date) return val.toISOString();
  if (columnName && JSONB_SCALAR_COLUMNS.has(columnName)) {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) return JSON.stringify(val);
  if (typeof val === "object" && !Buffer.isBuffer(val)) {
    return JSON.stringify(val);
  }
  return val;
}

type QueryError = {
  message: string;
  code?: string;
  details?: string;
} | null;

type QueryResult<T = any[]> = {
  data: T;
  error: QueryError;
  count?: number | null;
};

type OrderSpec = {
  column: string;
  ascending: boolean;
};

type FilterFn = (params: unknown[]) => string;

/**
 * Splits a PostgREST select string by top-level commas (ignoring commas inside parentheses).
 */
function splitSelectTokens(selectStr: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let depth = 0;
  for (const ch of selectStr) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      if (current.trim()) tokens.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) tokens.push(current.trim());
  return tokens;
}

/**
 * Splits top-level comma-separated items in a PostgREST `.or(...)` expression.
 */
function splitTopLevelOr(expr: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  for (const ch of expr) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function compileSimpleCondition(cond: string, params: unknown[]): string {
  const trimmed = cond.trim();
  const andMatch = trimmed.match(/^and\((.+)\)$/i);
  if (andMatch) {
    const innerParts = splitTopLevelOr(andMatch[1]);
    const compiled = innerParts.map((p) => compileSimpleCondition(p, params));
    return `(${compiled.join(" AND ")})`;
  }

  const orMatch = trimmed.match(/^or\((.+)\)$/i);
  if (orMatch) {
    const innerParts = splitTopLevelOr(orMatch[1]);
    const compiled = innerParts.map((p) => compileSimpleCondition(p, params));
    return `(${compiled.join(" OR ")})`;
  }

  // Format: column.op.value
  const firstDot = trimmed.indexOf(".");
  const secondDot = trimmed.indexOf(".", firstDot + 1);
  if (firstDot === -1 || secondDot === -1) {
    throw new Error(`Unsupported .or() filter segment: ${trimmed}`);
  }

  const col = quoteIdent(trimmed.slice(0, firstDot));
  const op = trimmed.slice(firstDot + 1, secondDot).toLowerCase();
  const rawVal = trimmed.slice(secondDot + 1);

  switch (op) {
    case "eq": {
      params.push(rawVal);
      return `${col} = $${params.length}`;
    }
    case "neq": {
      params.push(rawVal);
      return `${col} <> $${params.length}`;
    }
    case "ilike": {
      params.push(rawVal);
      return `${col} ILIKE $${params.length}`;
    }
    case "like": {
      params.push(rawVal);
      return `${col} LIKE $${params.length}`;
    }
    case "gt": {
      params.push(rawVal);
      return `${col} > $${params.length}`;
    }
    case "gte": {
      params.push(rawVal);
      return `${col} >= $${params.length}`;
    }
    case "lt": {
      params.push(rawVal);
      return `${col} < $${params.length}`;
    }
    case "lte": {
      params.push(rawVal);
      return `${col} <= $${params.length}`;
    }
    case "is": {
      if (rawVal.toLowerCase() === "null") return `${col} IS NULL`;
      if (rawVal.toLowerCase() === "true") return `${col} IS TRUE`;
      if (rawVal.toLowerCase() === "false") return `${col} IS FALSE`;
      throw new Error(`Unsupported .is() value in .or(): ${rawVal}`);
    }
    default:
      throw new Error(`Unsupported operator "${op}" in .or(): ${trimmed}`);
  }
}

export class PgQueryBuilder<T = any[]>
  implements PromiseLike<QueryResult<T>>
{
  private schema: string;
  private table: string;
  private operation: "select" | "insert" | "update" | "upsert" | "delete" =
    "select";
  private selectColumns = "*";
  private selectCountExact = false;
  private selectHeadOnly = false;
  private returnSelect = false;
  private payload: Record<string, unknown> | Record<string, unknown>[] | null =
    null;
  private conflictTarget: string | null = null;
  private ignoreDuplicates = false;
  private filters: FilterFn[] = [];
  private orders: OrderSpec[] = [];
  private limitCount: number | null = null;
  private offsetCount: number | null = null;
  private singleMode: "none" | "single" | "maybeSingle" = "none";

  constructor(schema: string, table: string) {
    this.schema = schema;
    this.table = table;
  }

  select(
    columns = "*",
    options?: { count?: "exact" | "planned" | "estimated"; head?: boolean },
  ): this {
    if (this.operation === "select") {
      this.selectColumns = columns || "*";
      if (options?.count) this.selectCountExact = true;
      if (options?.head) this.selectHeadOnly = true;
    } else {
      this.returnSelect = true;
      this.selectColumns = columns || "*";
    }
    return this;
  }

  insert(
    values: Record<string, unknown> | Record<string, unknown>[],
  ): this {
    this.operation = "insert";
    this.payload = values;
    return this;
  }

  update(values: Record<string, unknown>): this {
    this.operation = "update";
    this.payload = values;
    return this;
  }

  upsert(
    values: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ): this {
    this.operation = "upsert";
    this.payload = values;
    this.conflictTarget = options?.onConflict || "id";
    this.ignoreDuplicates = Boolean(options?.ignoreDuplicates);
    return this;
  }

  delete(): this {
    this.operation = "delete";
    return this;
  }

  eq(column: string, value: unknown): this {
    const col = quoteIdent(column);
    this.filters.push((params) => {
      params.push(serializeParamValue(value));
      return `${col} = $${params.length}`;
    });
    return this;
  }

  neq(column: string, value: unknown): this {
    const col = quoteIdent(column);
    this.filters.push((params) => {
      params.push(serializeParamValue(value));
      return `${col} <> $${params.length}`;
    });
    return this;
  }

  gt(column: string, value: unknown): this {
    const col = quoteIdent(column);
    this.filters.push((params) => {
      params.push(serializeParamValue(value));
      return `${col} > $${params.length}`;
    });
    return this;
  }

  gte(column: string, value: unknown): this {
    const col = quoteIdent(column);
    this.filters.push((params) => {
      params.push(serializeParamValue(value));
      return `${col} >= $${params.length}`;
    });
    return this;
  }

  lt(column: string, value: unknown): this {
    const col = quoteIdent(column);
    this.filters.push((params) => {
      params.push(serializeParamValue(value));
      return `${col} < $${params.length}`;
    });
    return this;
  }

  lte(column: string, value: unknown): this {
    const col = quoteIdent(column);
    this.filters.push((params) => {
      params.push(serializeParamValue(value));
      return `${col} <= $${params.length}`;
    });
    return this;
  }

  like(column: string, pattern: string): this {
    const col = quoteIdent(column);
    this.filters.push((params) => {
      params.push(pattern);
      return `${col} LIKE $${params.length}`;
    });
    return this;
  }

  ilike(column: string, pattern: string): this {
    const col = quoteIdent(column);
    this.filters.push((params) => {
      params.push(pattern);
      return `${col} ILIKE $${params.length}`;
    });
    return this;
  }

  is(column: string, value: null | boolean): this {
    const col = quoteIdent(column);
    this.filters.push(() => {
      if (value === null) return `${col} IS NULL`;
      return value ? `${col} IS TRUE` : `${col} IS FALSE`;
    });
    return this;
  }

  in(column: string, values: unknown[]): this {
    const col = quoteIdent(column);
    this.filters.push((params) => {
      if (!Array.isArray(values) || values.length === 0) {
        return "FALSE";
      }
      const placeholders = values.map((v) => {
        params.push(serializeParamValue(v));
        return `$${params.length}`;
      });
      return `${col} IN (${placeholders.join(", ")})`;
    });
    return this;
  }

  not(column: string, operator: string, value: unknown): this {
    const col = quoteIdent(column);
    const op = operator.toLowerCase();
    this.filters.push((params) => {
      if (op === "is") {
        if (value === null) return `${col} IS NOT NULL`;
        return value ? `${col} IS NOT TRUE` : `${col} IS NOT FALSE`;
      }
      if (op === "eq") {
        params.push(serializeParamValue(value));
        return `${col} <> $${params.length}`;
      }
      if (op === "in" && Array.isArray(value)) {
        if (value.length === 0) return "TRUE";
        const placeholders = value.map((v) => {
          params.push(serializeParamValue(v));
          return `$${params.length}`;
        });
        return `${col} NOT IN (${placeholders.join(", ")})`;
      }
      throw new Error(`Unsupported .not() operator: ${operator}`);
    });
    return this;
  }

  or(expr: string): this {
    this.filters.push((params) => {
      const parts = splitTopLevelOr(expr);
      const compiled = parts.map((p) => compileSimpleCondition(p, params));
      return `(${compiled.join(" OR ")})`;
    });
    return this;
  }

  order(
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean },
  ): this {
    this.orders.push({
      column,
      ascending: options?.ascending !== false,
    });
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number): this {
    this.offsetCount = from;
    this.limitCount = Math.max(0, to - from + 1);
    return this;
  }

  single(): PgQueryBuilder<any> {
    this.singleMode = "single";
    return this as unknown as PgQueryBuilder<any>;
  }

  maybeSingle(): PgQueryBuilder<any> {
    this.singleMode = "maybeSingle";
    return this as unknown as PgQueryBuilder<any>;
  }

  private buildSelectList(tableIdent: string): string {
    const tokens = splitSelectTokens(this.selectColumns);
    const schemaIdent = quoteIdent(this.schema);
    const selectParts: string[] = [];

    for (const token of tokens) {
      if (token === "*") {
        selectParts.push(`${tableIdent}.*`);
        continue;
      }

      const relMatch = token.match(/^([A-Za-z_][A-Za-z0-9_]*)\(([^)]+)\)$/);
      if (relMatch) {
        const relTable = relMatch[1];
        const relColsRaw = relMatch[2].trim();
        const relTableIdent = `${schemaIdent}.${quoteIdent(relTable)}`;

        const buildRelSubselect = (alias: string) => {
          if (relColsRaw === "*") return `${alias}.*`;
          return relColsRaw
            .split(",")
            .map((c) => `${alias}.${quoteIdent(c.trim())}`)
            .join(", ");
        };

        if (relTable === "subscription_plans") {
          selectParts.push(
            `(SELECT row_to_json(sp_sub) FROM (SELECT ${buildRelSubselect("sp")} FROM ${relTableIdent} sp WHERE sp."id" = ${tableIdent}."plan_id" LIMIT 1) sp_sub) AS "subscription_plans"`,
          );
          continue;
        }

        if (relTable === "users") {
          selectParts.push(
            `(SELECT row_to_json(u_sub) FROM (SELECT ${buildRelSubselect("u")} FROM ${relTableIdent} u WHERE u."id" = ${tableIdent}."user_id" LIMIT 1) u_sub) AS "users"`,
          );
          continue;
        }

        if (relTable === "question_options") {
          selectParts.push(
            `COALESCE((SELECT json_agg(row_to_json(qo_sub) ORDER BY qo_sub."sort_order" ASC) FROM (SELECT ${buildRelSubselect("qo")} FROM ${relTableIdent} qo WHERE qo."question_id" = ${tableIdent}."id" ORDER BY qo."sort_order" ASC) qo_sub), '[]'::json) AS "question_options"`,
          );
          continue;
        }
      }

      selectParts.push(`${tableIdent}.${quoteIdent(token)}`);
    }

    return selectParts.join(", ");
  }

  private buildWhereClause(params: unknown[]): string {
    if (this.filters.length === 0) return "";
    const parts = this.filters.map((fn) => fn(params));
    return ` WHERE ${parts.join(" AND ")}`;
  }

  private buildOrderLimitClause(): string {
    let sql = "";
    if (this.orders.length > 0) {
      const orderStr = this.orders
        .map((o) => `${quoteIdent(o.column)} ${o.ascending ? "ASC" : "DESC"}`)
        .join(", ");
      sql += ` ORDER BY ${orderStr}`;
    }
    if (this.limitCount !== null) {
      sql += ` LIMIT ${Number(this.limitCount)}`;
    }
    if (this.offsetCount !== null) {
      sql += ` OFFSET ${Number(this.offsetCount)}`;
    }
    return sql;
  }

  async execute(): Promise<QueryResult<T>> {
    const pool = getPgPool();
    const schemaIdent = quoteIdent(this.schema);
    const tableOnlyIdent = quoteIdent(this.table);
    const fullTableIdent = `${schemaIdent}.${tableOnlyIdent}`;
    const params: unknown[] = [];

    try {
      if (this.operation === "select") {
        const whereSql = this.buildWhereClause(params);

        if (this.selectHeadOnly && this.selectCountExact) {
          const countSql = `SELECT COUNT(*)::int AS total FROM ${fullTableIdent}${whereSql}`;
          const countRes = await pool.query(countSql, params);
          const total = countRes.rows[0]?.total ?? 0;
          return { data: null as unknown as T, count: total, error: null };
        }

        const selectList = this.buildSelectList(tableOnlyIdent);
        const orderLimitSql = this.buildOrderLimitClause();
        const sql = `SELECT ${selectList} FROM ${fullTableIdent}${whereSql}${orderLimitSql}`;
        const res = await pool.query(sql, params);

        let totalCount: number | null = null;
        if (this.selectCountExact) {
          const countParams: unknown[] = [];
          const countWhere = this.buildWhereClause(countParams);
          const countSql = `SELECT COUNT(*)::int AS total FROM ${fullTableIdent}${countWhere}`;
          const countRes = await pool.query(countSql, countParams);
          totalCount = countRes.rows[0]?.total ?? res.rows.length;
        }

        return this.formatResult(res.rows, totalCount);
      }

      if (this.operation === "insert" || this.operation === "upsert") {
        const rows = Array.isArray(this.payload)
          ? this.payload
          : this.payload
            ? [this.payload]
            : [];

        if (rows.length === 0) {
          return this.formatResult([], null);
        }

        const colSet = new Set<string>();
        for (const r of rows) {
          for (const [k, v] of Object.entries(r)) {
            if (v !== undefined) colSet.add(k);
          }
        }
        const columns = Array.from(colSet);
        const colIdents = columns.map(quoteIdent).join(", ");

        const valueGroups: string[] = [];
        for (const r of rows) {
          const placeholders: string[] = [];
          for (const col of columns) {
            params.push(serializeParamValue(r[col], col));
            placeholders.push(`$${params.length}`);
          }
          valueGroups.push(`(${placeholders.join(", ")})`);
        }

        let sql = `INSERT INTO ${fullTableIdent} (${colIdents}) VALUES ${valueGroups.join(", ")}`;

        if (this.operation === "upsert") {
          const conflictCols = (this.conflictTarget || "id")
            .split(",")
            .map((c) => quoteIdent(c.trim()))
            .join(", ");

          if (this.ignoreDuplicates) {
            sql += ` ON CONFLICT (${conflictCols}) DO NOTHING`;
          } else {
            const conflictSet = new Set(
              (this.conflictTarget || "id").split(",").map((c) => c.trim()),
            );
            const updateCols = columns.filter((c) => !conflictSet.has(c));
            if (updateCols.length === 0) {
              sql += ` ON CONFLICT (${conflictCols}) DO NOTHING`;
            } else {
              const updates = updateCols
                .map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`)
                .join(", ");
              sql += ` ON CONFLICT (${conflictCols}) DO UPDATE SET ${updates}`;
            }
          }
        }

        sql += ` RETURNING ${this.returnSelect ? this.buildSelectList(tableOnlyIdent) : "*"}`;
        const res = await pool.query(sql, params);
        return this.formatResult(res.rows, res.rowCount);
      }

      if (this.operation === "update") {
        const values = (this.payload || {}) as Record<string, unknown>;
        const entries = Object.entries(values).filter(
          ([, v]) => v !== undefined,
        );
        if (entries.length === 0) {
          return this.formatResult([], 0);
        }

        const setClauses = entries.map(([col, val]) => {
          params.push(serializeParamValue(val, col));
          return `${quoteIdent(col)} = $${params.length}`;
        });

        const whereSql = this.buildWhereClause(params);
        const sql = `UPDATE ${fullTableIdent} SET ${setClauses.join(", ")}${whereSql} RETURNING ${this.returnSelect ? this.buildSelectList(tableOnlyIdent) : "*"}`;
        const res = await pool.query(sql, params);
        return this.formatResult(res.rows, res.rowCount);
      }

      if (this.operation === "delete") {
        const whereSql = this.buildWhereClause(params);
        const sql = `DELETE FROM ${fullTableIdent}${whereSql} RETURNING *`;
        const res = await pool.query(sql, params);
        return this.formatResult(res.rows, res.rowCount);
      }

      return { data: null as unknown as T, error: null };
    } catch (err) {
      const pgErr = err as Error & { code?: string; detail?: string };
      return {
        data: null as unknown as T,
        error: {
          message: pgErr.message,
          code: pgErr.code,
          details: pgErr.detail,
        },
      };
    }
  }

  private formatResult(
    rows: any[],
    totalCount: number | null,
  ): QueryResult<T> {
    if (this.singleMode === "single") {
      if (rows.length === 0) {
        return {
          data: null as unknown as T,
          count: totalCount,
          error: {
            message: "JSON object requested, multiple (or no) rows returned",
            code: "PGRST116",
          },
        };
      }
      return { data: rows[0] as T, count: totalCount, error: null };
    }

    if (this.singleMode === "maybeSingle") {
      return {
        data: (rows[0] ?? null) as T,
        count: totalCount,
        error: null,
      };
    }

    return { data: rows as unknown as T, count: totalCount, error: null };
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export function createDirectPgClient(schema = "matrimony") {
  return {
    from<T = any[]>(table: string) {
      return new PgQueryBuilder<T>(schema, table);
    },
  };
}
