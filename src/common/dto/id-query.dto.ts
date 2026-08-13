import { IsString, MinLength } from "class-validator";

/** GET 详情类接口的 query：只允许 id，禁止 path 传参。 */
export class IdQueryDto {
  @IsString()
  @MinLength(1)
  id!: string;
}
