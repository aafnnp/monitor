/**
 * API Key 生成工具
 */
import { nanoid } from 'nanoid';

/**
 * 生成项目 API Key
 * @returns API Key
 */
export function generateApiKey(): string {
  return `mk_${nanoid(32)}`;
}
