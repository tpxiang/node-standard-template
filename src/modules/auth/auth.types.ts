/**
 * 认证领域类型。
 * access token 携带角色/权限便于网关鉴权；refresh token 仅含会话标识。
 */
export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
  type: "refresh";
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
