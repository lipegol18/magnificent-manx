import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, type InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  acceptConsentMutation: UseMutationResult<{message: string, consentAccepted: Date}, Error, void>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/user");
        if (res.status === 401) {
          return null;
        }
        if (!res.ok) {
          throw new Error("Falha ao obter dados do usuário");
        }
        return await res.json();
      } catch (err) {
        console.error("Erro ao buscar usuário:", err);
        return null;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      return await apiRequest("/api/login", "POST", credentials);
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no login",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      return await apiRequest("/api/register", "POST", userData);
    },
    onSuccess: (response: any) => {
      // Não defina os dados do usuário no cache, pois ele não está ativo
      // e não deve ser considerado como logado
      toast({
        title: "Registro realizado com sucesso",
        description: response.message || "Sua conta foi criada, mas ainda precisa ser ativada por um administrador para acessar o sistema.",
      });
      
      // Garantir que o usuário não esteja logado após o registro
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no registro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/logout", "POST");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logout realizado com sucesso",
        description: "Você saiu do sistema.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha ao sair",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const acceptConsentMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/user/accept-consent", "POST");
    },
    onSuccess: (data) => {
      // Atualizar o usuário com a data de consentimento
      if (user) {
        const updatedUser = { ...user, consentAccepted: data.consentAccepted };
        queryClient.setQueryData(["/api/user"], updatedUser);
      }
      toast({
        title: "Termo aceito com sucesso",
        description: "Obrigado por aceitar os termos de uso de dados pessoais.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha ao aceitar termo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        acceptConsentMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}