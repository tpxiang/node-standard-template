/** 权限码装饰器：配合 PermissionsGuard 做接口级鉴权。 */
import { SetMetadata } from "@nestjs/common";

export const PERMISSIONS_KEY = "permissions";

export const Permissions = (...permissions: string[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(PERMISSIONS_KEY, permissions);
