/**
 * 通用分页 / 排序 / 关键字查询约定（GET Query）。
 * - page / pageSize：分页
 * - keyword：业务自行解释搜索字段
 * - sortBy / sortOrder：白名单排序，防任意字段注入
 */
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { ErrorCode } from "../constants/error-codes";
import { BusinessException } from "../exceptions/business.exception";

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  /** 关键字搜索（具体字段由各业务 service 解释） */
  @IsOptional()
  @IsString()
  keyword?: string;

  /** 排序字段名；service 侧应用白名单映射到 Prisma orderBy */
  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder: "asc" | "desc" = "desc";
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function toPageResult<T>(
  items: T[],
  total: number,
  query: Pick<PaginationDto, "page" | "pageSize">
): PageResult<T> {
  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize
  };
}

/** Prisma skip/take 计算。 */
export function pageOffset(query: Pick<PaginationDto, "page" | "pageSize">): {
  skip: number;
  take: number;
} {
  return {
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize
  };
}

export function resolveSortField(
  requested: string | undefined,
  allowed: ReadonlySet<string>,
  fallback: string
): string {
  if (!requested) return fallback;
  if (!allowed.has(requested)) {
    throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Unsupported sort field", 400);
  }
  return requested;
}
