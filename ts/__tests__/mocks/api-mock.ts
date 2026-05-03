import { ApiResponse } from '../../types/api';

export const mockApiResponse = <T = any>(data: T, success: boolean = true): ApiResponse<T> => ({
  success,
  data,
});

export const mockErrorResponse = (error: string = 'Network error'): ApiResponse => ({
  success: false,
  error,
});

export const mockFetch = (response: any, ok: boolean = true): void => {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
};
