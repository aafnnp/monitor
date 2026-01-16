/**
 * 服务端类型定义
 */

/**
 * 认证上下文
 */
export interface AuthContext {
  userId: string;
  email: string;
}

/**
 * Hono 上下文变量类型
 */
export type Variables = {
  auth: AuthContext;
  apiKey: string;
};
