import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
// Importar o logo
import MedSyncLogo from "../assets/medsync-logo.png";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TranslatedText } from "@/components/ui/translated-text";
import { insertUserSchema } from "@shared/schema";
import { validations } from "@/lib/validations";
import { ArrowLeft, AlertCircle, CheckCircle2, Check, Loader2, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Esquemas de validação de formulário
const loginSchema = z.object({
  username: z.string().min(1, "Nome de usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
  remember: z.boolean().optional().default(false),
});

const registerSchema = insertUserSchema
  .pick({
    username: true,
    email: true,
    password: true,
    name: true,
    roleId: true,
    active: true,
    crm: true,
  })
  .extend({
    // Validações robustas usando o utilitário criado
    username: z.string()
      .min(3, "Nome de usuário deve ter pelo menos 3 caracteres")
      .max(50, "Nome de usuário muito longo")
      .regex(/^[a-zA-Z0-9_]+$/, "Nome de usuário deve conter apenas letras, números e underscore")
      .refine((username) => !username.startsWith("_") && !username.endsWith("_"), 
        "Nome de usuário não pode começar ou terminar com underscore"),
    
    email: validations.email,
    password: validations.password,
    confirmPassword: z.string().min(1, "Confirme sua senha"),
    
    name: z.string()
      .min(2, "Nome deve ter pelo menos 2 caracteres")
      .max(100, "Nome muito longo")
      .refine((name) => {
        // Verifica se tem pelo menos nome e sobrenome
        const parts = name.trim().split(/\s+/);
        return parts.length >= 2 && parts.every(part => part.length >= 1);
      }, "Informe nome e sobrenome completos"),
    
    crm: validations.crm.optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Senhas não correspondem",
    path: ["confirmPassword"],
  });

// Schema aprimorado para recuperação de senha
const forgotPasswordSchema = z.object({
  email: validations.email,
});

// Schema aprimorado para redefinição de senha com token
const resetPasswordSchema = z.object({
  token: z.string()
    .min(1, "Token é obrigatório")
    .min(32, "Token inválido - muito curto")
    .max(200, "Token inválido - muito longo"),
  password: validations.password,
  confirmPassword: z.string().min(1, "Confirme sua nova senha"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não correspondem",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [emailSent, setEmailSent] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isValidatingCrm, setIsValidatingCrm] = useState(false);
  const [validatedDoctorName, setValidatedDoctorName] = useState("");
  const [showCrmField, setShowCrmField] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  // Buscar funções (roles) para o dropdown usando a rota pública
  const { data: roles } = useQuery({
    queryKey: ['/api/public/roles'],
    queryFn: async () => {
      const res = await fetch('/api/public/roles');
      if (!res.ok) {
        throw new Error('Falha ao buscar papéis');
      }
      const allRoles = await res.json();
      
      // Filtrar para remover a função de Administrador
      return allRoles.filter(
        (role: { id: number, name: string }) => 
          role.id !== 1 && role.name !== "Administrador"
      );
    },
  });

  // Se o usuário já estiver autenticado, redirecione para a página inicial
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);
  
  // Configuração do formulário de redefinição de senha com token pré-preenchido
  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get('reset');
  
  // Verificar se há um token de redefinição de senha na URL
  useEffect(() => {
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setActiveTab('reset-password');
    }
  }, []);

  // Configuração do formulário de login
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      remember: false,
    },
  });

  // Configuração do formulário de registro
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
      roleId: 2, // ID do papel padrão (Médico)
      active: false, // Inativo por padrão
      crm: undefined,
    },
  });
  
  // Efeito para mostrar o campo CRM apenas se o papel selecionado for médico
  useEffect(() => {
    const roleId = registerForm.watch("roleId");
    // Assumindo que o ID 2 é o papel de médico, assim como na tela de usuários
    setShowCrmField(roleId === 2);
  }, [registerForm.watch("roleId")]);

  // Configuração do formulário de recuperação de senha
  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Configuração do formulário de redefinição de senha
  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: tokenFromUrl || "",
      password: "",
      confirmPassword: "",
    },
  });

  // Mutação para requisição de recuperação de senha
  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormValues) => {
      console.log(`[Frontend] 🔄 Iniciando recuperação de senha para email: ${data.email}`);
      console.log(`[Frontend] 🔄 Enviando solicitação para /api/forgot-password`);
      
      const response = await apiRequest("POST", "/api/forgot-password", data);
      console.log(`[Frontend] 🔄 Resposta recebida: status ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log(`[Frontend] ❌ Erro na recuperação: ${errorData.message || "Erro desconhecido"}`);
        throw new Error(errorData.message || "Erro ao enviar email de recuperação");
      }
      
      const result = await response.json();
      console.log(`[Frontend] ✅ Recuperação de senha processada com sucesso`);
      return result;
    },
    onSuccess: (data) => {
      console.log(`[Frontend] ✅ Email de recuperação processado para: ${forgotPasswordForm.getValues().email}`);
      setEmailSent(true);
      
      // Se em desenvolvimento e tiver token (mock), exibi-lo
      if (data.token) {
        console.log(`[Frontend] ℹ️ Token de recuperação (dev): ${data.token}`);
        console.log(`[Frontend] ℹ️ URL para redefinir: ${window.location.origin}/auth?reset=${data.token}`);
      }
      
      toast({
        title: "Email enviado",
        description: "Verifique sua caixa de entrada para instruções de recuperação de senha",
        variant: "default",
        className: "bg-slate-950 text-white border border-emerald-600",
      });
    },
    onError: (error: Error) => {
      console.log(`[Frontend] ❌ Erro na recuperação de senha: ${error.message}`);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para redefinição de senha
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormValues) => {
      const { confirmPassword, ...resetData } = data;
      const response = await apiRequest("/api/reset-password", "POST", resetData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao redefinir senha");
      }
      return await response.json();
    },
    onSuccess: () => {
      setResetSuccess(true);
      toast({
        title: "Senha redefinida",
        description: "Sua senha foi redefinida com sucesso. Faça login com sua nova senha.",
        variant: "default",
        className: "bg-slate-950 text-white border border-emerald-600",
      });
      
      // Limpar formulário e redirecionar para login após 3 segundos
      resetPasswordForm.reset();
      setTimeout(() => {
        setActiveTab("login");
        setResetSuccess(false);
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Manipuladores de envio de formulário
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  // Função simplificada para aceitar qualquer CRM sem validação
  const validateCRM = async (crm: number | string) => {
    console.log(`CRM informado: ${crm}`);
    
    // Considera qualquer CRM como válido
    setValidatedDoctorName('CRM aceito');
    return true;
  };
  
  const onRegisterSubmit = async (data: RegisterFormValues) => {
    try {
      // Remove o campo confirmPassword pois não faz parte do schema do servidor
      const { confirmPassword, ...userData } = data;
      
      console.log("Enviando dados de registro:", userData);
      
      // Não podemos modificar isSubmitting diretamente
      // Ele é controlado pelo React Hook Form
      
      // Fazer requisição direta usando apiRequest ao invés de registerMutation
      const result = await apiRequest("/api/register", "POST", userData);
      console.log("Resposta do registro:", result);
      
      // Se for médico (roleId === 2) e tiver CRM, enviar para validação
      if (userData.roleId === 2 && userData.crm) {
        try {
          await fetch("https://lipegol18.app.n8n.cloud/webhook/validar-crm", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              crm: userData.crm,
              name: userData.name,
              email: userData.email,
              username: userData.username
            }),
          });
          console.log("Dados enviados para validação de CRM");
        } catch (error) {
          console.error("Erro ao enviar dados para validação de CRM:", error);
        }
      }
      
      // Mostrar mensagem de sucesso
      toast({
        title: "Registro realizado com sucesso",
        description: result.message || "Sua conta foi criada, mas ainda precisa ser ativada por um administrador para acessar o sistema.",
      });
      
      // Limpar formulário
      registerForm.reset();
      
      // Redirecionar para a página de login
      setTimeout(() => {
        setActiveTab("login");
      }, 1500);
      
    } catch (error: any) {
      console.error("Erro ao registrar:", error);
      toast({
        title: "Falha no registro",
        description: error.message || "Erro ao criar conta",
        variant: "destructive",
      });
    } finally {
      // O estado de submissão é gerenciado pelo hook form
    }
  };

  const onForgotPasswordSubmit = (data: ForgotPasswordFormValues) => {
    forgotPasswordMutation.mutate(data);
  };

  const onResetPasswordSubmit = (data: ResetPasswordFormValues) => {
    resetPasswordMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-start justify-center bg-[#1a2332] auth-page-container p-4 pt-8">
      <div className="w-full max-w-6xl grid gap-x-6 md:grid-cols-2 items-start">
        {/* Hero Section */}
        <div className="hidden md:flex flex-col space-y-6 p-8 text-white pt-0">
          <div className="mb-6 flex flex-col items-center text-center">
            <img 
              src={MedSyncLogo} 
              alt="MedSync Logo" 
              className="h-24 mb-4" 
            />
            <p className="text-lg italic mt-3 mb-4">
              <span className="text-white">"A Revolução nas</span> <span className="text-blue-400 font-semibold">Autorizações Cirúrgicas.</span><br />
              <span className="text-blue-400 font-semibold">Menos papel. Mais cirurgia.</span><span className="text-white">"</span>
            </p>
          </div>
          
          {/* O que é o MedSync */}
          <div className="bg-[#1a2332] border border-blue-800 shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-bold mb-3 text-center flex justify-center items-center text-white">
              <span className="mr-2">🚀</span> O que é o MedSync?
            </h2>
            <p className="text-sm text-white/90 mb-4 text-center">
              O MedSync é um sistema inteligente que automatiza pedidos cirúrgicos, organiza toda a documentação, 
              integra convênios e hospitais, e acelera a aprovação de cirurgias com tecnologia de ponta.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="mr-2 text-green-400 mt-0.5">✔️</span>
                <p className="text-sm text-white/90">
                  Ideal para médicos cirurgiões que desejam ganhar tempo, evitar glosas e aumentar sua produtividade.
                </p>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-green-400 mt-0.5">✔️</span>
                <p className="text-sm text-white/90">
                  Indicado para cirurgiões e clínicas que buscam eficiência e rastreabilidade nos processos cirúrgicos.
                </p>
              </li>
            </ul>
          </div>
          
          {/* Por que usar */}
          <div className="bg-[#1a2332] border border-blue-800 shadow-lg rounded-lg p-6 mt-4">
            <h2 className="text-xl font-bold mb-3 text-center flex justify-center items-center text-white">
              <span className="mr-2">🚀</span> Por que usar o MedSync?
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="mr-2 text-green-400 mt-0.5">✔️</span>
                <p className="text-sm text-white/90">
                  Economia de tempo: fluxos guiados e preenchimento automático.
                </p>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-green-400 mt-0.5">✔️</span>
                <p className="text-sm text-white/90">
                  Redução de glosas e negativas: preenchimento técnico, testado previamente e baseado em normas da tabela CBHPM.
                </p>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-green-400 mt-0.5">✔️</span>
                <p className="text-sm text-white/90">
                  Produção otimizada: mais cirurgias realizadas, mais receita para você e sua equipe.
                </p>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-green-400 mt-0.5">✔️</span>
                <p className="text-sm text-white/90">
                  Segurança e rastreabilidade: cada pedido com histórico completo e backup.
                </p>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-green-400 mt-0.5">✔️</span>
                <p className="text-sm text-white/90">
                  Organização centralizada: exames, laudos, documentos e pedidos em um só lugar.
                </p>
              </li>
            </ul>
          </div>
          

        </div>

        {/* Authentication Section */}
        <div className="w-full flex flex-col pt-52">
          <Card className="w-full shadow-lg bg-[#1a2332] border border-blue-800 auth-card">
            <CardHeader className="rounded-t-lg p-6 pb-3 bg-[#1a2332] text-white border-b border-blue-800">
              <CardTitle className="text-2xl font-bold mb-2 flex justify-center items-center">
                <TranslatedText id="auth.welcomeTitle">
                  Bem-vindo ao MedSync
                </TranslatedText>
              </CardTitle>
              <CardDescription className="text-blue-200 text-center">
                <TranslatedText id="auth.welcomeDescription">
                  Faça login para acessar o sistema ou crie uma nova conta.
                </TranslatedText>
              </CardDescription>
            </CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 pb-4 pt-2">
                <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-blue-900/30 border border-blue-800">
                  <TabsTrigger
                    value="login"
                    className="py-2 data-[state=active]:bg-blue-800 data-[state=active]:text-white text-blue-200 font-medium"
                  >
                    <TranslatedText id="auth.login">Login</TranslatedText>
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="py-2 data-[state=active]:bg-blue-800 data-[state=active]:text-white text-blue-200 font-medium"
                  >
                    <TranslatedText id="auth.register">Cadastro</TranslatedText>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Login Form */}
              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
                  <CardContent className="space-y-4 p-6 bg-[#1a2332]/90 border border-blue-800 rounded-b-lg text-white">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-blue-200 font-medium">
                        <TranslatedText id="auth.username">Nome de usuário</TranslatedText>
                      </Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="nome.sobrenome"
                        {...loginForm.register("username")}
                        className="bg-blue-900/30 border-blue-700 text-white placeholder:text-blue-400/50"
                      />
                      {loginForm.formState.errors.username && (
                        <p className="text-sm text-red-500">
                          {loginForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="password" className="text-blue-200 font-medium">
                          <TranslatedText id="auth.password">Senha</TranslatedText>
                        </Label>
                        <button
                          type="button"
                          className="text-xs text-blue-300 hover:text-blue-100"
                          onClick={() => setActiveTab("forgot-password")}
                        >
                          <TranslatedText id="auth.forgotPassword">
                            Esqueceu a senha?
                          </TranslatedText>
                        </button>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        placeholder="********"
                        {...loginForm.register("password")}
                        className="bg-blue-900/30 border-blue-700 text-white placeholder:text-blue-400/50"
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-red-500">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="remember" 
                          className="border-blue-300 text-blue-500 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white"
                          checked={loginForm.watch("remember")}
                          onCheckedChange={(checked) => 
                            loginForm.setValue("remember", checked === true)
                          }
                        />
                        <label
                          htmlFor="remember"
                          className="text-sm text-blue-200 cursor-pointer"
                          onClick={() => loginForm.setValue("remember", !loginForm.watch("remember"))}
                        >
                          <TranslatedText id="auth.rememberMe">
                            Lembrar de mim
                          </TranslatedText>
                        </label>
                      </div>
                      
                      <a 
                        href="/contact" 
                        className="text-sm text-blue-300 hover:text-blue-100 hover:underline transition-colors"
                      >
                        <TranslatedText id="auth.contactUs">
                          Fale Conosco
                        </TranslatedText>
                      </a>
                    </div>
                  </CardContent>
                  <CardFooter className="px-6 pb-6 pt-4 bg-[#1a2332]/90 border-t border-blue-800 rounded-b-lg">
                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      <TranslatedText id="auth.loginButton">
                        Entrar
                      </TranslatedText>
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>

              {/* Register Form */}
              <TabsContent value="register">
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
                  <CardContent className="space-y-4 p-6 bg-[#1a2332]/90 border border-blue-800 rounded-b-lg text-white">
                    <div className="space-y-2">
                      <Label htmlFor="register-name" className="text-blue-200 font-medium">
                        <TranslatedText id="auth.fullName">Nome completo</TranslatedText>
                      </Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="João da Silva"
                        className="bg-white border-blue-200 text-blue-700 placeholder:text-blue-300"
                        {...registerForm.register("name")}
                      />
                      {registerForm.formState.errors.name && (
                        <p className="text-sm text-red-500">
                          {registerForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-username" className="text-blue-600 font-medium">
                        <TranslatedText id="auth.username">Usuário</TranslatedText>
                      </Label>
                      <Input
                        id="reg-username"
                        type="text"
                        placeholder="seu.usuario"
                        className="bg-white border-blue-200 text-blue-700 placeholder:text-blue-300"
                        {...registerForm.register("username")}
                      />
                      {registerForm.formState.errors.username && (
                        <p className="text-sm text-red-500">
                          {registerForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-blue-600 font-medium">
                        <TranslatedText id="auth.email">E-mail</TranslatedText>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu.email@exemplo.com"
                        className="bg-white border-blue-200 text-blue-700 placeholder:text-blue-300"
                        {...registerForm.register("email")}
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-sm text-red-500">
                          {registerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="text-blue-600 font-medium">
                        <TranslatedText id="auth.password">Senha</TranslatedText>
                      </Label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="********"
                        className="bg-white border-blue-200 text-blue-700 placeholder:text-blue-300"
                        {...registerForm.register("password")}
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-red-500">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-blue-600 font-medium">
                        <TranslatedText id="auth.confirmPassword">Confirmar Senha</TranslatedText>
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="********"
                        className="bg-white border-blue-200 text-blue-700 placeholder:text-blue-300"
                        {...registerForm.register("confirmPassword")}
                      />
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-500">
                          {registerForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                    
                    {/* Campo de Função (role) */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-1">
                        <Label htmlFor="roleId" className="text-blue-600 font-medium">
                          <TranslatedText id="auth.role">Função</TranslatedText>
                        </Label>
                        <TooltipProvider>
                          <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-blue-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-950 text-white p-4 border border-blue-800 max-w-sm">
                              <div className="space-y-2">
                                <h4 className="font-bold border-b border-blue-600 pb-1 mb-2">Descrição das Funções:</h4>
                                <div className="space-y-1.5">
                                  <p><span className="font-semibold text-blue-400">Médico:</span> Acesso a pacientes e pedidos médicos</p>
                                  <p><span className="font-semibold text-blue-400">Assistente Básico:</span> Assistente administrativo para tarefas básicas</p>
                                  <p><span className="font-semibold text-blue-400">Assistente Administrativo:</span> Funções administrativas avançadas</p>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Select 
                        value={registerForm.watch("roleId").toString()}
                        onValueChange={(value) => registerForm.setValue("roleId", parseInt(value))}
                      >
                        <SelectTrigger className="bg-white border-blue-200 text-blue-700">
                          <SelectValue placeholder="Selecione uma função" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>
                              <TranslatedText id="auth.selectRole">Selecione uma função</TranslatedText>
                            </SelectLabel>
                            {roles && roles
                              .filter((role: { id: number, name: string }) => 
                                // Filtrar para remover a função de Administrador (assumindo que id=1 é Admin)
                                role.id !== 1 && role.name !== "Administrador"
                              )
                              .map((role: { id: number, name: string }) => (
                                <SelectItem key={role.id} value={role.id.toString()}>
                                  {role.name}
                                </SelectItem>
                              ))
                            }
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {registerForm.formState.errors.roleId && (
                        <p className="text-sm text-red-500">
                          {registerForm.formState.errors.roleId.message}
                        </p>
                      )}
                    </div>
                    
                    {/* Campo CRM - exibido apenas para médicos */}
                    {showCrmField && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="crm" className="text-blue-600 font-medium">
                            <TranslatedText id="auth.crm">CRM</TranslatedText>
                          </Label>
                          <TooltipProvider>
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-blue-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-950 text-white p-4 border border-blue-800 max-w-sm">
                                <div className="space-y-2">
                                  <h4 className="font-bold border-b border-blue-600 pb-1 mb-2">Informações sobre CRM:</h4>
                                  <div className="space-y-1.5">
                                    <p>Seu CRM será validado pela API da CREMERJ.</p>
                                    <p>Insira na mesma formatação encontrada em <span className="text-blue-400 font-medium">https://portal.cremerj.org.br/busca-medicos</span>.</p>
                                    <p><span className="font-semibold text-blue-400">Use somente números</span></p>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <span className="text-xs text-white font-bold">
                            # Não incluir os caracteres 52 do CRM no campo abaixo
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            id="crm"
                            type="number"
                            className="bg-white border-blue-200 text-blue-700 placeholder:text-blue-300"
                            {...registerForm.register("crm", {
                              onChange: (e) => {
                                // Aceitar qualquer valor sem validação
                                if (e.target.value) {
                                  validateCRM(e.target.value);
                                } else {
                                  setValidatedDoctorName("");
                                }
                              }
                            })}
                            placeholder="Digite o número do CRM"
                          />
                          {/* Botão de validação removido */}
                        </div>
                        {registerForm.formState.errors.crm && (
                          <p className="text-sm text-red-500">
                            {registerForm.formState.errors.crm.message}
                          </p>
                        )}
                        {/* Exibir o nome do médico se o CRM for validado */}
                        {validatedDoctorName && (
                          <div className="text-sm font-medium text-green-600 mt-1">
                            <span className="flex items-center">
                              <Check className="h-4 w-4 mr-1" />
                              {validatedDoctorName}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="px-6 pb-6 pt-4 bg-white border-t border-blue-100 rounded-b-lg">
                    <Button 
                      type="submit" 
                      className="w-full bg-[#1a2332] hover:bg-blue-900 text-white font-semibold"
                      disabled={registerForm.formState.isSubmitting}
                    >
                      {registerForm.formState.isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <TranslatedText id="auth.createAccount">Criar Conta</TranslatedText>
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>

              {/* Formulário Esqueci Minha Senha */}
              <TabsContent value="forgot-password">
                {emailSent ? (
                  <CardContent className="space-y-4 p-6 bg-[#1a2332]/90 border border-blue-800 rounded-b-lg text-white">
                    <Alert className="border-green-600 bg-green-900/30 text-green-300">
                      <CheckCircle2 className="h-5 w-5" />
                      <AlertTitle>Email enviado</AlertTitle>
                      <AlertDescription>
                        Enviamos instruções para recuperação de senha para o seu email.
                        Por favor, verifique sua caixa de entrada.
                      </AlertDescription>
                    </Alert>
                    <div className="pt-4">
                      <Button 
                        type="button" 
                        variant="outline"
                        className="border-blue-700 text-blue-200 hover:bg-blue-900/30"
                        onClick={() => {
                          setActiveTab("login");
                          setEmailSent(false);
                        }}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        <TranslatedText id="auth.backToLogin">
                          Voltar para login
                        </TranslatedText>
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)}>
                    <CardContent className="space-y-4 p-6 bg-[#1a2332]/90 border border-blue-800 rounded-b-lg text-white">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-blue-200 font-medium">
                          <TranslatedText id="auth.email">E-mail</TranslatedText>
                        </Label>
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="seu.email@exemplo.com"
                          className="bg-blue-900/30 border-blue-700 text-white placeholder:text-blue-400/50"
                          {...forgotPasswordForm.register("email")}
                        />
                        {forgotPasswordForm.formState.errors.email && (
                          <p className="text-sm text-red-300">
                            {forgotPasswordForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                      <div className="text-sm text-blue-200/80">
                        <TranslatedText id="auth.forgotPasswordInstructions">
                          Digite seu e-mail cadastrado. Enviaremos instruções para redefinir sua senha.
                        </TranslatedText>
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 px-6 pb-6 pt-0 bg-[#1a2332]/90 border-t border-blue-800 rounded-b-lg">
                      <Button 
                        type="submit" 
                        className="w-full bg-[#1a2332] hover:bg-blue-900 text-white font-semibold"
                        disabled={forgotPasswordMutation.isPending}
                      >
                        {forgotPasswordMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        <TranslatedText id="auth.sendResetInstructions">
                          Enviar instruções
                        </TranslatedText>
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        className="border-blue-700 text-blue-200 hover:bg-blue-900/30"
                        onClick={() => setActiveTab("login")}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        <TranslatedText id="auth.backToLogin">
                          Voltar para login
                        </TranslatedText>
                      </Button>
                    </CardFooter>
                  </form>
                )}
              </TabsContent>

              {/* Formulário Redefinir Senha */}
              <TabsContent value="reset-password">
                {resetSuccess ? (
                  <CardContent className="space-y-4 p-6 bg-[#1a2332]/90 border border-blue-800 rounded-b-lg text-white">
                    <Alert className="border-green-600 bg-green-900/30 text-green-300">
                      <CheckCircle2 className="h-5 w-5" />
                      <AlertTitle>Senha redefinida</AlertTitle>
                      <AlertDescription>
                        Sua senha foi redefinida com sucesso. Você será redirecionado para o login em instantes.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                ) : (
                  <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)}>
                    <CardContent className="space-y-4 p-6 bg-[#1a2332]/90 border border-blue-800 rounded-b-lg text-white">
                      {!tokenFromUrl && (
                        <div className="space-y-2">
                          <Label htmlFor="token" className="text-blue-200 font-medium">
                            <TranslatedText id="auth.resetToken">Código de Recuperação</TranslatedText>
                          </Label>
                          <Input
                            id="token"
                            type="text"
                            placeholder="Código recebido por e-mail"
                            className="bg-blue-900/30 border-blue-700 text-white placeholder:text-blue-400/50"
                            {...resetPasswordForm.register("token")}
                          />
                          {resetPasswordForm.formState.errors.token && (
                            <p className="text-sm text-red-300">
                              {resetPasswordForm.formState.errors.token.message}
                            </p>
                          )}
                        </div>
                      )}
                      {tokenFromUrl && (
                        <div className="mb-4">
                          <Alert className="bg-blue-900/30 border-blue-700 text-blue-200">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Redefinição de senha</AlertTitle>
                            <AlertDescription>
                              Por favor, defina sua nova senha abaixo.
                            </AlertDescription>
                          </Alert>
                          <Input 
                            type="hidden"
                            {...resetPasswordForm.register("token")}
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="reset-password" className="text-blue-200 font-medium">
                          <TranslatedText id="auth.newPassword">Nova Senha</TranslatedText>
                        </Label>
                        <Input
                          id="reset-password"
                          type="password"
                          placeholder="Digite sua nova senha"
                          className="bg-blue-900/30 border-blue-700 text-white placeholder:text-blue-400/50"
                          {...resetPasswordForm.register("password")}
                        />
                        {resetPasswordForm.formState.errors.password && (
                          <p className="text-sm text-red-300">
                            {resetPasswordForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-reset-password" className="text-blue-200 font-medium">
                          <TranslatedText id="auth.confirmPassword">Confirmar Senha</TranslatedText>
                        </Label>
                        <Input
                          id="confirm-reset-password"
                          type="password"
                          placeholder="Confirme sua nova senha"
                          className="bg-blue-900/30 border-blue-700 text-white placeholder:text-blue-400/50"
                          {...resetPasswordForm.register("confirmPassword")}
                        />
                        {resetPasswordForm.formState.errors.confirmPassword && (
                          <p className="text-sm text-red-300">
                            {resetPasswordForm.formState.errors.confirmPassword.message}
                          </p>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 p-6 pt-2 bg-[#1a2332]/90 border-t border-blue-800 rounded-b-lg">
                      <Button 
                        type="submit" 
                        className="w-full bg-[#1a2332] hover:bg-blue-900 text-white font-semibold"
                        disabled={resetPasswordMutation.isPending}
                      >
                        {resetPasswordMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        <TranslatedText id="auth.resetPassword">
                          Redefinir Senha
                        </TranslatedText>
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setActiveTab("login")}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        <TranslatedText id="auth.backToLogin">
                          Voltar para login
                        </TranslatedText>
                      </Button>
                    </CardFooter>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </Card>
          
          {/* Inteligência Médica Integrada */}
          <div className="bg-[#1a2332] border border-blue-800 shadow-lg rounded-lg p-6 mt-6">
            <h2 className="text-xl font-bold mb-3 text-center flex justify-center items-center text-white">
              <span className="mr-2">🧠</span> Inteligência Médica Integrada
            </h2>
            <p className="text-sm text-white/90 text-center">
              O MedSync utiliza algoritmos treinados com base em milhares de protocolos ortopédicos e cirúrgicos para sugerir os procedimentos mais adequados — tudo de forma segura e editável.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}