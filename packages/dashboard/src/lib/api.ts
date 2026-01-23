/**
 * API 请求封装
 */
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  CreateProjectRequest,
  Project,
} from '@monitor/types';

const API_BASE = '';

/**
 * 获取认证 token
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * 保存认证 token
 */
function saveAuthToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

/**
 * 移除认证 token
 */
function removeAuthToken(): void {
  localStorage.removeItem('auth_token');
}

/**
 * API 请求封装
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));

    // 处理认证错误：清空本地数据并跳转到登录页
    if (
      response.status === 401 ||
      error.error?.includes('令牌') ||
      error.error?.includes('token')
    ) {
      removeAuthToken();
      window.location.href = '/login';
      throw new Error(error.error || '认证已过期，请重新登录');
    }

    throw new Error(error.error || '请求失败');
  }

  return response.json();
}

// ========== 认证相关 ==========

export const authApi = {
  /**
   * 用户登录
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    saveAuthToken(response.accessToken);
    return response;
  },

  /**
   * 用户注册
   */
  register: async (data: RegisterRequest): Promise<LoginResponse> => {
    const response = await request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    saveAuthToken(response.accessToken);
    return response;
  },

  /**
   * 登出
   */
  logout: async (): Promise<void> => {
    await request('/auth/logout', { method: 'POST' });
    removeAuthToken();
  },
};

// ========== 项目管理 ==========

export const projectApi = {
  /**
   * 获取项目列表
   */
  list: (): Promise<Project[]> => {
    return request<Project[]>('/api/projects');
  },

  /**
   * 创建项目
   */
  create: (data: CreateProjectRequest): Promise<Project> => {
    return request<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 获取项目详情
   */
  get: (id: string): Promise<Project> => {
    return request<Project>(`/api/projects/${id}`);
  },

  /**
   * 更新项目
   */
  update: (id: string, data: { name: string }): Promise<Project> => {
    return request<Project>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * 删除项目
   */
  delete: (id: string): Promise<void> => {
    return request<void>(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * 重新生成 API Key
   */
  regenerateKey: (id: string): Promise<{ apiKey: string }> => {
    return request<{ apiKey: string }>(`/api/projects/${id}/regenerate-key`, {
      method: 'POST',
    });
  },
};

// ========== 错误监控 ==========

export const errorApi = {
  /**
   * 获取错误列表
   */
  list: (projectId: string, params?: { page?: number; limit?: number }): Promise<any> => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/api/errors/${projectId}?${query}`);
  },

  /**
   * 获取错误详情（包含解析后的堆栈、源代码片段等）
   */
  get: (projectId: string, errorId: string): Promise<any> => {
    return request(`/api/errors/${projectId}/${errorId}`);
  },

  /**
   * 获取错误统计
   */
  stats: (
    projectId: string
  ): Promise<{
    total: number;
    last24h: number;
    resolved: number;
  }> => {
    return request(`/api/errors/${projectId}/stats`);
  },
};

// ========== 性能监控 ==========

export const performanceApi = {
  /**
   * 获取性能数据列表
   */
  list: (projectId: string, params?: { page?: number; limit?: number }): Promise<any> => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/api/performance/${projectId}?${query}`);
  },

  /**
   * 获取性能数据详情
   */
  get: (projectId: string, metricId: string): Promise<any> => {
    return request(`/api/performance/${projectId}/${metricId}`);
  },

  /**
   * 获取性能统计
   */
  stats: (projectId: string): Promise<any> => {
    return request(`/api/performance/${projectId}/stats`);
  },
};

// ========== Session Replay ==========

export const sessionApi = {
  /**
   * 获取 Session 列表
   */
  list: (projectId: string, params?: { page?: number; limit?: number }): Promise<any> => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/api/sessions/${projectId}?${query}`);
  },

  /**
   * 获取 Session 详情
   */
  get: (projectId: string, sessionId: string): Promise<any> => {
    return request(`/api/sessions/${projectId}/${sessionId}`);
  },

  /**
   * 获取 Session 统计
   */
  stats: (
    projectId: string
  ): Promise<{
    total: number;
    last24h: number;
  }> => {
    return request(`/api/sessions/${projectId}/stats`);
  },
};

// ========== 统计概览 ==========

export const statsApi = {
  /**
   * 获取项目整体统计
   */
  overview: (
    projectId: string
  ): Promise<{
    errors: {
      total: number;
      last24h: number;
    };
    performance: {
      avgLCP: number;
      avgFID: number;
      avgCLS: number;
    };
    sessions: {
      total: number;
      last24h: number;
    };
  }> => {
    return request(`/api/stats/${projectId}/overview`);
  },
};

export { getAuthToken, removeAuthToken };
