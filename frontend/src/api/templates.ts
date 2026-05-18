import { apiClient } from './client'
import type { Template, TemplateDetail, UseTemplateResult } from '@/types/template'

export const templatesApi = {
  list: (params?: { category?: string; search?: string; page?: number }) =>
    apiClient.get<Template[]>('/templates/', { params }),

  get: (id: string) => apiClient.get<TemplateDetail>(`/templates/${id}`),

  my: () => apiClient.get<Template[]>('/templates/my'),

  categories: () => apiClient.get<string[]>('/templates/categories'),

  preview: (id: string) => apiClient.get<TemplateDetail>(`/templates/${id}/preview`),

  use: (id: string, bot_id: string) =>
    apiClient.post<UseTemplateResult>(`/templates/${id}/use`, { bot_id }),

  review: (id: string, data: { rating: number; comment?: string }) =>
    apiClient.post(`/templates/${id}/review`, data),

  create: (data: {
    title: string
    description?: string
    category?: string
    complexity?: string
    price_stars?: number
    flow_data?: object
    preview_url?: string
  }) => apiClient.post<Template>('/templates/', data),

  publishFromFlow: (data: {
    bot_id: string
    flow_id: string
    title: string
    description?: string
    category?: string
    complexity?: string
    price_stars?: number
  }) => apiClient.post<Template>('/templates/publish-from-flow', data),

  update: (
    id: string,
    data: Partial<{
      title: string
      description: string
      category: string
      complexity: string
      price_stars: number
      preview_url: string
    }>
  ) => apiClient.patch<Template>(`/templates/${id}`, data),

  publish: (id: string) => apiClient.post<Template>(`/templates/${id}/publish`),
  unpublish: (id: string) => apiClient.post<Template>(`/templates/${id}/unpublish`),
  delete: (id: string) => apiClient.delete(`/templates/${id}`),
}
