import { apiClient } from './client'
import type { Payment } from '@/types/template'

export const paymentsApi = {
  createInvoice: (template_id: string) =>
    apiClient.post<{ status: string }>('/payments/create-invoice', { template_id }),

  myPayments: () => apiClient.get<Payment[]>('/payments/my'),

  refund: (charge_id: string) =>
    apiClient.post<{ status: string; charge_id: string }>(`/payments/refund/${charge_id}`),
}
