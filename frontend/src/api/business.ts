import { apiClient } from './client';

export interface BusinessConnection {
  id: string;
  connection_id: string;
  user_id: number;
  user_chat_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  can_reply: boolean;
  is_enabled: boolean;
  connected_at: string;
}

export const businessApi = {
  listConnections: (bot_id: string) =>
    apiClient.get<BusinessConnection[]>('/business/connections', { params: { bot_id } }),
  deleteConnection: (id: string) =>
    apiClient.delete(`/business/connections/${id}`),
};
