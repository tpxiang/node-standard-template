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
