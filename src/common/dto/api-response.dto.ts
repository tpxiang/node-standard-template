import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
export class ApiSuccessResponseDto {
  @ApiProperty({ example: true }) success!: true;
  @ApiProperty({ description: "Endpoint response payload", type: Object }) data!: unknown;
  @ApiPropertyOptional() requestId?: string;
  @ApiProperty({ format: "date-time" }) timestamp!: string;
}
export class ApiErrorResponseDto {
  @ApiProperty({ example: false }) success!: false;
  @ApiProperty({ example: "VALIDATION_ERROR" }) code!: string;
  @ApiProperty({ oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] })
  message!: string | string[];
  @ApiPropertyOptional() requestId?: string;
  @ApiProperty({ format: "date-time" }) timestamp!: string;
}
