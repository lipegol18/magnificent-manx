import { useState, useEffect } from "react";
import { useLocation, useRoute, useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { 
  ChevronLeft, 
  User, 
  Building, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Package,
  ShieldAlert,
  Clock,
  AlertCircle,
  Image,
  Pencil
} from "lucide-react";
import { addOrderDetailsTranslations } from "@/lib/translations/order-details";
import { useToast } from "@/hooks/use-toast";

// Adicionar traduções
addOrderDetailsTranslations();

// Status dos pedidos com cores
const orderStatus = {
  "em_preenchimento": { label: "Em preenchimento", color: "bg-yellow-700/70 text-yellow-200" },
  "em_avaliacao": { label: "Em avaliação", color: "bg-blue-700/70 text-blue-200" },
  "aceito": { label: "Aceito", color: "bg-green-700/70 text-green-200" },
  "recusado": { label: "Recusado", color: "bg-red-700/70 text-red-200" },
  "realizado": { label: "Realizado", color: "bg-purple-700/70 text-purple-200" },
  "cancelado": { label: "Cancelado", color: "bg-gray-700/70 text-gray-200" }
};

// Formatação de data
const formatDate = (dateString: string) => {
  if (!dateString || dateString === "Data não agendada") return "Data não agendada";
  try {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  } catch (error) {
    return "Data inválida";
  }
};

export default function OrderDetails() {
  const [, navigate] = useLocation();
  const params = useParams();
  const orderId = params?.id ? parseInt(params.id, 10) : 0;
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const { data: order, isLoading, isError } = useQuery({
    queryKey: [`/api/medical-orders/${orderId}`],
    queryFn: async () => {
      const response = await fetch(`/api/medical-orders/${orderId}`);
      if (!response.ok) {
        throw new Error("Falha ao carregar dados do pedido médico");
      }
      return response.json();
    },
    enabled: !!orderId,
  });
  
  // Voltar para a página anterior
  const handleGoBack = () => {
    navigate("/orders");
  };

  // Função para verificar status e navegar para edição
  const handleEditOrder = () => {
    if (!order) return;

    // Verificar se o pedido está concluído/finalizado
    const finalizedStatuses = ["realizado", "cancelado", "concluido"];
    
    if (finalizedStatuses.includes(order.statusCode)) {
      toast({
        title: "Edição não permitida",
        description: "Este pedido já foi concluído e não pode mais ser editado.",
        variant: "destructive",
      });
      return;
    }

    // Se o pedido pode ser editado, navegar para create-order com o ID do pedido
    console.log('Navegando para edição do pedido:', order.id);
    navigate(`/create-order?edit=${order.id}`);
  };

  
  // Renderizar o status do pedido
  const renderStatus = (status: string) => {
    const statusInfo = (orderStatus as any)[status] || { 
      label: status, 
      color: "bg-gray-700/70 text-gray-200" 
    };

    return (
      <Badge className={`${statusInfo.color} px-3 py-1 rounded-full`}>
        {statusInfo.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-12">
        <div className="flex justify-center items-center py-20">
          <Spinner size="lg" />
          <span className="ml-3 text-lg text-blue-300">{t('orderDetails.loading')}</span>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="container max-w-5xl mx-auto py-12">
        <div className="text-center py-16">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl text-red-400 mb-2">{t('orderDetails.error.title')}</h2>
          <p className="text-red-300/70 mb-6">{t('orderDetails.error.description')}</p>
          <Button onClick={handleGoBack}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t('orderDetails.backButton')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-8">
      {/* Botão voltar e título */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={handleGoBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          {t('orderDetails.backButton')}
        </Button>
        <h1 className="text-2xl font-bold text-blue-200">
          {t('orderDetails.title')} #{order.id}
        </h1>
      </div>

      {/* Informações principais */}
      <Card className="mb-6 border border-blue-900/30 bg-blue-950/30">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl text-blue-100">
                {order.procedureName || `Pedido #${order.id}`}
              </CardTitle>
              <CardDescription>
                Criado em {formatDate(order.createdAt)}
              </CardDescription>
            </div>
            <div>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-blue-900/30 border-blue-600 text-blue-200 hover:bg-blue-800/50 hover:text-blue-100"
                onClick={handleEditOrder}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar Pedido
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <User className="text-blue-400 mr-2 h-5 w-5" />
                <div>
                  <p className="text-sm text-blue-400">{t('orderDetails.patient')}</p>
                  <p className="text-base text-white">{order.patientName || 'Não informado'}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Building className="text-blue-400 mr-2 h-5 w-5" />
                <div>
                  <p className="text-sm text-blue-400">{t('orderDetails.hospital')}</p>
                  <p className="text-base text-white">{order.hospitalName || 'Não informado'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <Calendar className="text-blue-400 mr-2 h-5 w-5" />
                <div>
                  <p className="text-sm text-blue-400">{t('orderDetails.procedureDate')}</p>
                  <p className="text-base text-white">
                    {order.procedureDate ? formatDate(order.procedureDate) : t('orderDetails.notScheduled')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <FileText className="text-blue-400 mr-2 h-5 w-5" />
                <div>
                  <p className="text-sm text-blue-400">{t('orderDetails.complexity')}</p>
                  <p className="text-base text-white capitalize">
                    {order.complexity?.replace(/_/g, ' ') || 'Não especificada'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abas de detalhes */}
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-5 mb-6">
          <TabsTrigger value="geral">{t('orderDetails.tabs.general')}</TabsTrigger>
          <TabsTrigger value="diagnosticos">{t('orderDetails.tabs.diagnostics')}</TabsTrigger>
          <TabsTrigger value="procedimentos">{t('orderDetails.tabs.procedures')}</TabsTrigger>
          <TabsTrigger value="materiais">{t('orderDetails.tabs.materials')}</TabsTrigger>
          <TabsTrigger value="exames">{t('orderDetails.tabs.exams')}</TabsTrigger>
        </TabsList>
        
        {/* Aba Geral */}
        <TabsContent value="geral">
          <Card className="border border-blue-900/30 bg-blue-950/30">
            <CardHeader>
              <CardTitle className="text-lg text-blue-100">{t('orderDetails.generalInfo.title')}</CardTitle>
              <CardDescription>{t('orderDetails.generalInfo.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium text-blue-300 mb-2">{t('orderDetails.generalInfo.procedureData')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-blue-400/80">{t('orderDetails.generalInfo.doctorResponsible')}:</span>{' '}
                      <span className="text-white">{order.doctorName || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="text-blue-400/80">{t('orderDetails.generalInfo.procedureType')}:</span>{' '}
                      <span className="text-white">{order.procedureType || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="text-blue-400/80">{t('orderDetails.generalInfo.surgeryCharacter')}:</span>{' '}
                      <span className="text-white capitalize">
                        {order.surgeryCharacter?.replace(/_/g, ' ') || 'Não informado'}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-400/80">{t('orderDetails.generalInfo.hospitalizationRegime')}:</span>{' '}
                      <span className="text-white capitalize">
                        {order.hospitalizationRegime?.replace(/_/g, ' ') || 'Não informado'}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="bg-blue-900/30" />

                <div>
                  <h3 className="text-md font-medium text-blue-300 mb-2">{t('orderDetails.generalInfo.observations')}</h3>
                  <div className="bg-blue-900/20 p-4 rounded-md">
                    {order.observations ? (
                      <p className="text-blue-100 whitespace-pre-line">{order.observations}</p>
                    ) : (
                      <p className="text-blue-300/60 italic">{t('orderDetails.generalInfo.noObservations')}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba Diagnósticos */}
        <TabsContent value="diagnosticos">
          <Card className="border border-blue-900/30 bg-blue-950/30">
            <CardHeader>
              <CardTitle className="text-lg text-blue-100">{t('orderDetails.diagnostics.title')}</CardTitle>
              <CardDescription>{t('orderDetails.diagnostics.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {order.cidCodes && order.cidCodes.length > 0 ? (
                <div className="space-y-4">
                  {order.cidCodes.map((code: string, index: number) => (
                    <div key={index} className="bg-blue-900/20 p-4 rounded-md">
                      <div className="flex items-start">
                        <Badge variant="outline" className="mr-3 bg-blue-900/50">
                          CID-10: {code}
                        </Badge>
                        <div>
                          <p className="text-blue-100">
                            {order.cidDescriptions && order.cidDescriptions[index] 
                              ? order.cidDescriptions[index] 
                              : t('orderDetails.diagnostics.descriptionNotAvailable')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-10 w-10 text-yellow-500/70 mx-auto mb-4" />
                  <p className="text-yellow-400">{t('orderDetails.diagnostics.noDiagnostics')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba Procedimentos */}
        <TabsContent value="procedimentos">
          <Card className="border border-blue-900/30 bg-blue-950/30">
            <CardHeader>
              <CardTitle className="text-lg text-blue-100">{t('orderDetails.procedures.title')}</CardTitle>
              <CardDescription>{t('orderDetails.procedures.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {order.procedureIds && order.procedureIds.length > 0 ? (
                <div className="space-y-4">
                  {order.procedureIds.map((procedureId: number, index: number) => (
                    <div key={index} className="bg-blue-900/20 p-4 rounded-md">
                      <h3 className="font-medium text-blue-200 mb-2">
                        {order.procedureNames && order.procedureNames[index] 
                          ? order.procedureNames[index] 
                          : `Procedimento ${index + 1}`}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-blue-400/80">{t('orderDetails.procedures.code')}:</span>{' '}
                          <span className="text-white">
                            {order.procedureCodes && order.procedureCodes[index] 
                              ? order.procedureCodes[index] 
                              : 'Não informado'}
                          </span>
                        </div>
                        <div>
                          <span className="text-blue-400/80">{t('orderDetails.procedures.side')}:</span>{' '}
                          <span className="text-white capitalize">
                            {order.procedureSides && order.procedureSides[index]
                              ? order.procedureSides[index].replace(/_/g, ' ')
                              : 'Não informado'}
                          </span>
                        </div>
                        <div>
                          <span className="text-blue-400/80">{t('orderDetails.procedures.accessRoute')}:</span>{' '}
                          <span className="text-white capitalize">
                            {order.accessRoutes && order.accessRoutes[index]
                              ? order.accessRoutes[index].replace(/_/g, ' ')
                              : 'Não informado'}
                          </span>
                        </div>
                        <div>
                          <span className="text-blue-400/80">{t('orderDetails.procedures.technique')}:</span>{' '}
                          <span className="text-white capitalize">
                            {order.techniques && order.techniques[index]
                              ? order.techniques[index].replace(/_/g, ' ')
                              : 'Não informado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-10 w-10 text-yellow-500/70 mx-auto mb-4" />
                  <p className="text-yellow-400">{t('orderDetails.procedures.noProcedures')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba Materiais OPME */}
        <TabsContent value="materiais">
          <Card className="border border-blue-900/30 bg-blue-950/30">
            <CardHeader>
              <CardTitle className="text-lg text-blue-100">{t('orderDetails.materials.title')}</CardTitle>
              <CardDescription>{t('orderDetails.materials.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {order.opmeItemIds && order.opmeItemIds.length > 0 ? (
                <div className="space-y-4">
                  {order.opmeItemIds.map((itemId: number, index: number) => {
                    const quantity = order.opmeItemQuantities && order.opmeItemQuantities[index] 
                      ? order.opmeItemQuantities[index] 
                      : 1;
                      
                    return (
                      <div key={index} className="bg-blue-900/20 p-4 rounded-md">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-blue-200 mb-2">
                            {order.opmeItemNames && order.opmeItemNames[index] 
                              ? order.opmeItemNames[index] 
                              : `Material ${index + 1}`}
                          </h3>
                          <Badge variant="secondary">
                            {t('orderDetails.materials.quantity')}: {quantity}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-2">
                          <div>
                            <span className="text-blue-400/80">{t('orderDetails.materials.code')}:</span>{' '}
                            <span className="text-white">
                              {order.opmeItemCodes && order.opmeItemCodes[index]
                                ? order.opmeItemCodes[index]
                                : 'Não informado'}
                            </span>
                          </div>
                          <div>
                            <span className="text-blue-400/80">{t('orderDetails.materials.preferredSupplier')}:</span>{' '}
                            <span className="text-white">
                              {order.preferredSuppliers && order.preferredSuppliers[index]
                                ? order.preferredSuppliers[index]
                                : 'Não especificado'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-10 w-10 text-yellow-500/70 mx-auto mb-4" />
                  <p className="text-yellow-400">{t('orderDetails.materials.noMaterials')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba Exames */}
        <TabsContent value="exames">
          <Card className="border border-blue-900/30 bg-blue-950/30">
            <CardHeader>
              <CardTitle className="text-lg text-blue-100">{t('orderDetails.exams.title')}</CardTitle>
              <CardDescription>{t('orderDetails.exams.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {order.examImages && order.examImages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {order.examImages.map((imageUrl: string, index: number) => (
                    <div key={index} className="relative group">
                      <img 
                        src={imageUrl} 
                        alt={`Exame ${index + 1}`} 
                        className="w-full h-48 object-cover rounded-md border border-blue-800/50"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-end justify-center">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mb-4 bg-blue-900/70 border-blue-700 text-blue-100"
                          onClick={() => window.open(imageUrl, '_blank')}
                        >
                          <Image className="mr-2 h-4 w-4" />
                          {t('orderDetails.exams.viewLarge')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-10 w-10 text-yellow-500/70 mx-auto mb-4" />
                  <p className="text-yellow-400">{t('orderDetails.exams.noExams')}</p>
                </div>
              )}
              
              {order.reportContent && (
                <div className="mt-6">
                  <h3 className="text-md font-medium text-blue-300 mb-3">{t('orderDetails.exams.medicalReport')}</h3>
                  <div className="bg-blue-900/20 p-4 rounded-md">
                    <p className="text-blue-100 whitespace-pre-line mb-3">{order.reportContent}</p>
                    {order.reportDocumentUrl && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => window.open(order.reportDocumentUrl, '_blank')}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {t('orderDetails.exams.viewReport')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}