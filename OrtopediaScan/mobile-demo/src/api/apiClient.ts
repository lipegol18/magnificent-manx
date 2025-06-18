import { QueryClient, QueryFunction } from '@tanstack/react-query';

// Importe as constantes - em produção, copie os conteúdos do arquivo shared/constants.ts
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet e tente novamente.',
  SERVER_ERROR: 'Erro no servidor. Por favor, tente novamente mais tarde.',
  NOT_FOUND: 'Recurso não encontrado.',
  INVALID_DATA: 'Dados inválidos. Verifique os campos e tente novamente.',
  UNAUTHORIZED: 'Não autorizado. Faça login para continuar.',
  CONFLICT: 'Conflito. Este registro já existe.'
};

// URL base da API - Substitua pelo endereço real do seu servidor em produção
export const API_BASE_URL = 'http://ENDERECO_DO_SERVIDOR:5000';

// Endpoints da API - Copie do arquivo shared/constants.ts em produção
export const API_ENDPOINTS = {
  STATUS: '/api/status',
  PATIENTS: '/api/patients',
  PATIENT_BY_ID: (id: number) => `/api/patients/${id}`,
  HOSPITALS: '/api/hospitals',
  HOSPITAL_BY_ID: (id: number) => `/api/hospitals/${id}`,
  PROCEDURES: '/api/procedures',
  OPME_ITEMS: '/api/opme-items',
  OPME_ITEM_BY_ID: (id: number) => `/api/opme-items/${id}`,
  OPME_ITEMS_SEARCH: (term: string) => `/api/opme-items?search=${encodeURIComponent(term)}`,
  MEDICAL_ORDERS: '/api/medical-orders',
  MEDICAL_ORDERS_BY_PATIENT: (patientId: number) => `/api/medical-orders?patientId=${patientId}`,
  ORDER_ITEMS: (orderId: number) => `/api/medical-orders/${orderId}/items`,
  ORDER_ITEM_BY_ID: (id: number) => `/api/order-items/${id}`,
  SCANNED_DOCUMENTS: '/api/scanned-documents',
  PATIENT_SCANNED_DOCUMENTS: (patientId: number) => `/api/patients/${patientId}/scanned-documents`,
};

/**
 * Função que verifica se a resposta da API é válida
 * Se não for, lança um erro com mensagem adequada
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = '';
    
    try {
      // Tentativa de obter mensagem de erro no formato JSON
      const errorData = await res.json();
      errorMessage = errorData.message || res.statusText;
    } catch (e) {
      // Falha ao obter JSON, então usamos o texto da resposta
      errorMessage = await res.text() || res.statusText;
    }
    
    const errorStatus = res.status;
    
    // Mapeamento de códigos de erro para mensagens amigáveis
    let userFriendlyMessage;
    switch (errorStatus) {
      case 400: userFriendlyMessage = ERROR_MESSAGES.INVALID_DATA; break;
      case 401: userFriendlyMessage = ERROR_MESSAGES.UNAUTHORIZED; break;
      case 404: userFriendlyMessage = ERROR_MESSAGES.NOT_FOUND; break;
      case 409: userFriendlyMessage = ERROR_MESSAGES.CONFLICT; break;
      case 500: userFriendlyMessage = ERROR_MESSAGES.SERVER_ERROR; break;
      default: userFriendlyMessage = `Erro: ${errorMessage}`;
    }
    
    throw new Error(userFriendlyMessage);
  }
}

/**
 * Função genérica para fazer requisições à API
 */
export async function apiRequest<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  // Garantir que a URL completa seja usada
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      },
    });

    await throwIfResNotOk(res);
    
    // Return null for 204 No Content responses
    if (res.status === 204) {
      return null as unknown as T;
    }
    
    return res.json();
  } catch (error) {
    // Erros de rede são tratados diferentemente
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
    throw error;
  }
}

/**
 * Função de query para o React Query
 */
export const getQueryFn: <T>(options: {
  on401: "returnNull" | "throw";
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    // Garantir que a URL completa seja usada
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    
    try {
      const res = await fetch(fullUrl);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      
      // Return null for 204 No Content responses
      if (res.status === 204) {
        return null;
      }
      
      return await res.json();
    } catch (error) {
      // Erros de rede são tratados diferentemente
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
      }
      throw error;
    }
  };

/**
 * Cliente de query configurado para aplicação mobile
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});