import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { StepProgress } from "@/components/layout/step-progress";
import { formatDateBR } from "@/lib/utils";
import { HospitalSelection } from "@/steps/hospital-selection";
import { PatientSelection } from "@/steps/patient-selection";
import { ExamInfo } from "@/steps/exam-info";
import { SurgeryData } from "@/steps/surgery-data";
import { OpmeSelection } from "@/steps/opme-selection";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import MedSyncLogo from "../assets/medsync-logo.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Save,
  FileText,
  AlertTriangle,
  Download,
  Mail,
  MessageCircle,
} from "lucide-react";
import {
  type Hospital,
  type Patient,
  type MedicalOrder,
  type OpmeItem,
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Interface local para procedimento compatível com o componente OpmeSelection
interface LocalProcedure {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean | null;
  porte?: string;
  custoOperacional?: string;
  porteAnestesista?: string;
  numeroAuxiliares?: number;
}

// Interface para procedimentos secundários, estendendo LocalProcedure
// Campo de lateralidade removido conforme solicitado
interface SecondaryProcedure {
  procedure: LocalProcedure;
  quantity: number;
}

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  API_ENDPOINTS,
  ORDER_STATUS_VALUES,
  PROCEDURE_TYPE_VALUES,
} from "@shared/constants";
import { useAuth } from "@/hooks/use-auth";
import {
  uploadExamImage,
  uploadMedicalReport,
  getFileUrl,
} from "@/lib/file-upload";
import { FileManager } from "@/lib/file-manager";
import { SupplierDisplay } from "@/components/supplier-display";

const steps = [
  { number: 1, label: "Paciente e Hospital" },
  { number: 2, label: "Exame e Laudo" },
  { number: 3, label: "Dados da Cirurgia" },
  { number: 4, label: "Visualização" },
  { number: 5, label: "Confirmação" },
];

export default function CreateOrder() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Detectar se estamos em modo de edição
  const urlParams = new URLSearchParams(window.location.search);
  const editOrderId = urlParams.get('edit');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(
    null,
  );
  const [additionalNotes, setAdditionalNotes] = useState("");
  // Usamos apenas examImages para gerenciar todas as imagens, seguindo a estrutura do banco (exam_images_url)
  const [examImages, setExamImages] = useState<File[]>([]);
  const [medicalReport, setMedicalReport] = useState<File | null>(null);
  const [clinicalIndication, setClinicalIndication] = useState("");

  // Dados brutos do pedido atual em edição (para persistir URLs entre etapas)
  const [currentOrderData, setCurrentOrderData] = useState<{
    // Nomes de campos atualizados para corresponder exatamente ao banco de dados
    exam_images_url?: string[] | null;
    exam_image_count?: number | null;
    medical_report_url?: string | null;
  } | null>(null);
  // Estados para o CID principal (mantido para compatibilidade)
  const [cidCode, setCidCode] = useState("");
  const [cidDescription, setCidDescription] = useState("");
  const [selectedCidId, setSelectedCidId] = useState<number | null>(null);
  // Estado para cidLaterality removido, mas mantendo referências para compatibilidade
  const [cidLaterality, setCidLaterality] = useState<string | null>(null);

  // Novo estado para múltiplos CIDs (similar aos procedimentos secundários)
  const [multipleCids, setMultipleCids] = useState<
    Array<{
      cid: {
        id: number;
        code: string;
        description: string;
        category?: string;
      };
    }>
  >([]);
  // Estado de lateralidade da cirurgia (adicionado como um campo independente)
  const [procedureLaterality, setProcedureLaterality] = useState<string | null>(
    null,
  );
  const [procedureType, setProcedureType] = useState(
    PROCEDURE_TYPE_VALUES.ELETIVA,
  );
  const [procedureQuantity, setProcedureQuantity] = useState(1);
  const [selectedProcedure, setSelectedProcedure] =
    useState<LocalProcedure | null>(null);
  // Estados para procedimentos secundários
  const [secondaryProcedures, setSecondaryProcedures] = useState<
    SecondaryProcedure[]
  >([]);
  const [orderId, setOrderId] = useState<number | null>(null);
  // Estados para os itens OPME e fornecedores
  const [selectedOpmeItems, setSelectedOpmeItems] = useState<
    Array<{ item: any; quantity: number }>
  >([]);
  // Estados para fornecedores - usando formato compatível com SurgeryData
  const [suppliers, setSuppliers] = useState<{
    supplier1: number | null;
    supplier2: number | null;
    supplier3: number | null;
  }>({ supplier1: null, supplier2: null, supplier3: null });

  // Estado para armazenar dados dos fornecedores carregados
  const [supplierData, setSupplierData] = useState<any[]>([]);

  // Função para buscar dados dos fornecedores
  // COMENTADO: Esta função carregava todos os fornecedores desnecessariamente ao abrir a página
  // TODO: Implementar carregamento sob demanda apenas quando necessário para o preview/PDF
  const fetchSupplierData = async () => {
    try {
      const response = await fetch("/api/suppliers/search?term=", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setSupplierData(data);
        console.log("Dados dos fornecedores carregados:", data);
      }
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
    }
  };

  // COMENTADO: Carregar dados dos fornecedores quando o componente monta
  // Esta chamada automática estava causando carregamento desnecessário de todos os fornecedores
  // useEffect(() => {
  //   fetchSupplierData();
  // }, []);

  // Estado para a sugestão de justificativa clínica
  const [clinicalJustification, setClinicalJustification] =
    useState<string>("");

  // Estado para evitar chamadas duplicadas
  const [isLoadingPatientOrder, setIsLoadingPatientOrder] = useState(false);

  // Estados para o diálogo de pedido existente
  const [showExistingOrderDialog, setShowExistingOrderDialog] = useState(false);
  const [existingOrderData, setExistingOrderData] = useState<any>(null);
  const [pendingPatient, setPendingPatient] = useState<Patient | null>(null);

  // Usando um valor temporário para procedureId (em produção isso seria uma seleção real)
  const [procedureId] = useState<number>(1);
  const { toast } = useToast();
  const { user } = useAuth();

  // Invalidar cache de hospitais quando a página é carregada
  // Isso garante que os hospitais atualizados no perfil sejam carregados
  useEffect(() => {
    // Invalidar cache de hospitais para garantir dados atualizados
    queryClient.invalidateQueries({ 
      queryKey: ['/api/hospitals'] 
    });
  }, []);

  // Efeito para carregar pedido em modo de edição
  useEffect(() => {
    const loadOrderForEdit = async () => {
      if (editOrderId && user?.id) {
        console.log('Carregando pedido para edição:', editOrderId);
        
        try {
          const response = await fetch(`/api/medical-orders/${editOrderId}`);
          if (response.ok) {
            const orderData = await response.json();
            console.log('Dados do pedido carregados para edição:', orderData);
            
            // Carregar os dados do pedido existente
            await _loadExistingOrder(orderData);
            
            toast({
              title: "Modo de edição",
              description: `Editando pedido #${orderData.id}`,
              duration: 3000,
            });
          } else {
            toast({
              title: "Erro",
              description: "Pedido não encontrado ou sem permissão para editar",
              variant: "destructive",
            });
            navigate('/orders');
          }
        } catch (error) {
          console.error('Erro ao carregar pedido:', error);
          toast({
            title: "Erro",
            description: "Erro ao carregar dados do pedido",
            variant: "destructive",
          });
          navigate('/orders');
        }
      }
    };

    loadOrderForEdit();
  }, [editOrderId, user?.id, navigate, toast]);

  // Efeito para verificar e carregar pedido em andamento ou limpar o formulário
  useEffect(() => {
    // Função para verificar se existe um pedido em preenchimento
    const checkExistingOrder = async () => {
      try {
        if (user?.id) {
          console.log(
            `Verificando pedido em andamento para usuário ID: ${user.id}`,
          );

          // Buscar se há um pedido em andamento para o usuário atual
          const res = await apiRequest(
            "GET",
            API_ENDPOINTS.MEDICAL_ORDER_IN_PROGRESS,
          );
          console.log("Resposta da API:", res.status);

          if (res.status === 200) {
            const orderData = await res.json();
            // Se encontramos um pedido em andamento, carregamos seus dados
            console.log("Pedido em andamento encontrado:", orderData);
            await _loadExistingOrder(orderData);

            toast({
              title: "Pedido em andamento recuperado",
              description: "Você pode continuar de onde parou.",
              duration: 4000,
            });
          } else if (res.status === 404) {
            // Não encontramos um pedido em andamento, limpar o formulário
            console.log("Nenhum pedido em andamento encontrado");
            resetForm();
          } else {
            console.error(`Resposta inesperada da API: ${res.status}`);
            const errorData = await res.json().catch(() => ({}));
            console.error("Detalhes do erro:", errorData);
            resetForm();
          }
        }
      } catch (error) {
        console.error("Erro ao verificar pedido em andamento:", error);
        // Se houver erro, iniciamos com formulário limpo
        resetForm();
      }
    };

    // Função para limpar o formulário
    const resetForm = () => {
      setSelectedPatient(null);
      setSelectedHospital(null);
      setAdditionalNotes("");
      // Usando apenas setExamImages para gerenciar todas as imagens de exame
      setExamImages([]);
      setMedicalReport(null);
      setClinicalIndication("");
      setCidCode("");
      setCidDescription("");
      setSelectedCidId(null);
      setProcedureType(PROCEDURE_TYPE_VALUES.ELETIVA);
      setSelectedProcedure(null);
      setProcedureQuantity(1);
      setSecondaryProcedures([]);
      setOrderId(null);
      setCurrentOrderData(null);
    };

    // DESABILITADO: Só deve verificar DEPOIS de selecionar paciente
    // checkExistingOrder();
  }, [user?.id]);

  // Função para tratar a seleção do paciente e verificar se há pedidos em andamento
  const handlePatientSelected = async (patient: Patient) => {
    // Evitar chamadas duplicadas
    if (isLoadingPatientOrder) {
      console.log(
        "Já está carregando pedido para outro paciente, ignorando chamada duplicada",
      );
      return;
    }

    // Primeiro, definimos o paciente selecionado
    setSelectedPatient(patient);
    console.log(
      `Paciente selecionado: ${patient.fullName} (ID: ${patient.id})`,
    );

    // Verificar se existe um pedido em preenchimento para este paciente
    try {
      setIsLoadingPatientOrder(true);
      console.log(
        `Verificando pedidos em preenchimento para o paciente ID: ${patient.id}`,
      );

      // Buscar se há um pedido em andamento para este paciente
      const url = API_ENDPOINTS.MEDICAL_ORDER_IN_PROGRESS_BY_PATIENT(patient.id);
      console.log("URL construída para verificação:", url);
      
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      console.log("Status da resposta:", res.status);
      console.log("Headers da resposta:", Object.fromEntries(res.headers.entries()));

      if (res.status === 200) {
        const ordersData = await res.json();
        console.log(
          "Pedidos em andamento encontrados para o paciente:",
          ordersData,
        );

        // Se encontramos pelo menos um pedido em andamento, mostrar diálogo
        if (ordersData && ordersData.length > 0) {
          const orderData = ordersData[0]; // Pegar o primeiro pedido encontrado
          console.log(
            "Pedido existente encontrado, mostrando diálogo:",
            orderData,
          );

          // Armazenar os dados para o diálogo
          setExistingOrderData(orderData);
          setPendingPatient(patient);
          setShowExistingOrderDialog(true);

          // Não carregamos automaticamente - deixamos o usuário escolher
          return;
        }
      } else if (res.status === 404) {
        console.log("Nenhum pedido em andamento encontrado para este paciente");
        // Resetar alguns campos quando não há pedido existente
        setOrderId(null);
        setCurrentOrderData(null);
      } else {
        console.log("Status inesperado:", res.status);
        const responseText = await res.text();
        console.log("Resposta completa:", responseText);
      }
    } catch (error) {
      console.error(
        "Erro ao verificar pedido em andamento para o paciente:",
        error,
      );
    } finally {
      setIsLoadingPatientOrder(false);
    }
  };

  // Função para continuar com o pedido existente
  const handleContinueExistingOrder = async () => {
    if (existingOrderData && pendingPatient) {
      console.log(
        "Usuário escolheu continuar o pedido existente:",
        existingOrderData,
      );

      // Carregar os dados do pedido existente
      await _loadExistingOrder(existingOrderData);

      // Definir o paciente selecionado
      setSelectedPatient(pendingPatient);

      toast({
        title: "Pedido em andamento carregado",
        description: `Continuando o pedido existente para ${pendingPatient.fullName}`,
        duration: 4000,
      });
    }

    // Fechar o diálogo
    setShowExistingOrderDialog(false);
    setExistingOrderData(null);
    setPendingPatient(null);
  };

  // Função para iniciar um novo pedido
  const handleStartNewOrder = () => {
    if (pendingPatient) {
      console.log(
        "Usuário escolheu iniciar um novo pedido para:",
        pendingPatient,
      );

      // Resetar os campos do formulário
      setOrderId(null);
      setCurrentOrderData(null);
      setClinicalIndication("");
      setCidCode("");
      setCidDescription("");
      setSelectedCidId(null);
      setAdditionalNotes("");
      setExamImages([]);
      setMedicalReport(null);
      setSelectedHospital(null);
      setSelectedProcedure(null);
      setProcedureQuantity(1);
      setSecondaryProcedures([]);
      setMultipleCids([]);

      // Definir o paciente selecionado
      setSelectedPatient(pendingPatient);

      toast({
        title: "Novo pedido iniciado",
        description: `Iniciando um novo pedido para ${pendingPatient.fullName}`,
        duration: 2000,
      });
    }

    // Fechar o diálogo
    setShowExistingOrderDialog(false);
    setExistingOrderData(null);
    setPendingPatient(null);
  };

  // Efeito para verificar e carregar pedido em andamento ou limpar o formulário
  useEffect(() => {
    // Função para verificar se existe um pedido em preenchimento
    const checkExistingOrder = async () => {
      try {
        if (user?.id) {
          console.log(
            `Verificando pedido em andamento para usuário ID: ${user.id}`,
          );

          // Buscar se há um pedido em andamento para o usuário atual
          const res = await apiRequest(
            "GET",
            API_ENDPOINTS.MEDICAL_ORDER_IN_PROGRESS,
          );
          console.log("Resposta da API:", res.status);

          if (res.status === 200) {
            const orderData = await res.json();
            // Se encontramos um pedido em andamento, carregamos seus dados
            console.log("Pedido em andamento encontrado:", orderData);
            await _loadExistingOrder(orderData);

            toast({
              title: "Pedido em andamento recuperado",
              description: "Você pode continuar de onde parou.",
              duration: 4000,
            });
          } else if (res.status === 404) {
            // Não encontramos um pedido em andamento, limpar o formulário
            console.log("Nenhum pedido em andamento encontrado");
            resetForm();
          } else {
            console.error(`Resposta inesperada da API: ${res.status}`);
            const errorData = await res.json().catch(() => ({}));
            console.error("Detalhes do erro:", errorData);
            resetForm();
          }
        }
      } catch (error) {
        console.error("Erro ao verificar pedido em andamento:", error);
        // Se houver erro, iniciamos com formulário limpo
        resetForm();
      }
    };

    // Função para limpar o formulário
    const resetForm = () => {
      setSelectedPatient(null);
      setSelectedHospital(null);
      setAdditionalNotes("");
      // Usando apenas setExamImages para gerenciar todas as imagens de exame
      setExamImages([]);
      setMedicalReport(null);
      setClinicalIndication("");
      setCidCode("");
      setCidDescription("");
      setSelectedCidId(null);
      setProcedureType(PROCEDURE_TYPE_VALUES.ELETIVA);
      setSelectedProcedure(null);
      setProcedureQuantity(1);
      setSecondaryProcedures([]);
      setOrderId(null);
      setCurrentOrderData(null);
    };

    // DESABILITADO: Só deve verificar DEPOIS de selecionar paciente
    // checkExistingOrder();
  }, [user?.id]);

  // Função removida - não usamos mais a continuação de pedidos
  const _loadExistingOrder = async (order: MedicalOrder) => {
    console.log("Carregando pedido existente:", order);
    setOrderId(order.id);

    // Recuperar dados do paciente
    if (order.patientId) {
      try {
        console.log(`Buscando paciente com ID ${order.patientId}`);
        const patient = await apiRequest(
          API_ENDPOINTS.PATIENT_BY_ID(order.patientId),
          "GET",
        );
        console.log("Paciente encontrado:", patient);
        setSelectedPatient(patient);
      } catch (error) {
        console.error("Erro ao buscar dados do paciente:", error);
      }
    }

    // Recuperar dados do hospital de forma robusta
    if (order.hospitalId) {
      try {
        console.log(`Buscando hospital com ID ${order.hospitalId}`);

        // Primeiro tenta com a API dedicada
        const res = await apiRequest(
          API_ENDPOINTS.HOSPITAL_BY_ID(order.hospitalId),
          "GET",
        );

        const hospital = res;
        console.log("Hospital encontrado via API específica:", hospital);
        if (hospital && hospital.id) {
          setSelectedHospital(hospital);
        } else {
          console.warn("Hospital retornado sem ID:", hospital);
          await buscarHospitalAlternativo(order.hospitalId);
        }
      } catch (error) {
        console.error("Erro ao buscar dados do hospital:", error);
        await buscarHospitalAlternativo(order.hospitalId);
      }
    }

    // Função auxiliar para buscar hospital por método alternativo
    async function buscarHospitalAlternativo(hospitalId: number) {
      try {
        console.log("Buscando hospital via API de lista...");
        // Buscar todos os hospitais e encontrar o correto por ID
        const allHospitalsRes = await apiRequest(
          "GET",
          API_ENDPOINTS.HOSPITALS,
        );

        if (allHospitalsRes.ok) {
          const hospitals = await allHospitalsRes.json();
          const matchingHospital = hospitals.find(
            (h: any) => h.id === hospitalId,
          );

          if (matchingHospital) {
            console.log("Hospital encontrado via lista:", matchingHospital);
            setSelectedHospital(matchingHospital);
          } else {
            console.error(
              `Hospital com ID ${hospitalId} não encontrado na lista de hospitais`,
            );
          }
        } else {
          console.error(
            "Erro ao buscar lista de hospitais, status:",
            allHospitalsRes.status,
          );
        }
      } catch (error) {
        console.error("Erro ao buscar lista de hospitais:", error);
      }
    }

    // Recuperar outros dados do pedido
    setClinicalIndication(order.clinicalIndication || "");
    setAdditionalNotes(order.additional_notes || "");
    setProcedureType(order.procedureType || PROCEDURE_TYPE_VALUES.ELETIVA);
    setProcedureQuantity(order.procedureCbhpmQuantity || 1);

    // Recuperar dados de lateralidade
    console.log("Carregando lateralidade do procedimento do banco de dados:", {
      procedureLaterality: order.procedureLaterality,
      procedureLateralityType: typeof order.procedureLaterality,
    });

    // Garantir que valores nulos ou undefined sejam tratados corretamente
    // O PostgreSQL retorna null para valores nulos, então precisamos fazer essa verificação
    // Campo cidLaterality foi removido conforme solicitado
    setCidLaterality(null);

    if (
      order.procedureLaterality !== null &&
      order.procedureLaterality !== undefined
    ) {
      setProcedureLaterality(order.procedureLaterality);
    } else {
      setProcedureLaterality(null);
    }

    // Armazenar informações de imagens e documentos
    const orderMediaData = {
      // Usando nomes das colunas exatamente iguais ao banco de dados
      exam_images_url: Array.isArray(order.exam_images_url)
        ? order.exam_images_url
        : [],
      exam_image_count: order.exam_image_count || 0,
      medical_report_url: order.medical_report_url || null,
    };

    console.log("Dados de mídia do pedido carregados:", orderMediaData);
    setCurrentOrderData(orderMediaData);

    // Recuperar dados dos CIDs (suporte para múltiplos CIDs)
    const loadCidData = async () => {
      // Primeiro, tentar carregar CIDs múltiplos se existirem
      if (
        order.multiple_cid_ids &&
        Array.isArray(order.multiple_cid_ids) &&
        order.multiple_cid_ids.length > 0
      ) {
        console.log("Carregando múltiplos CIDs:", order.multiple_cid_ids);
        const cidPromises = order.multiple_cid_ids.map(
          async (cidId: number) => {
            try {
              const cidData = await apiRequest(`/api/cid-codes/${cidId}`, "GET");
              return cidData;
            } catch (error) {
              console.error(`Erro ao carregar CID ${cidId}:`, error);
              return null;
            }
          },
        );

        const cidResults = await Promise.all(cidPromises);
        const validCids = cidResults.filter((cid) => cid !== null);

        if (validCids.length > 0) {
          // Configurar múltiplos CIDs no estado
          setMultipleCids(validCids.map((cid) => ({ cid })));

          // Manter compatibilidade com CID único (usar o primeiro da lista)
          const firstCid = validCids[0];
          setCidCode(firstCid.code || "");
          setCidDescription(firstCid.description || "");
          setSelectedCidId(firstCid.id);
        }
      }
      // Fallback para CID único (compatibilidade com sistema antigo)
      else if (order.cidCodeId) {
        try {
          const cidData = await apiRequest(
            `/api/cid-codes/${order.cidCodeId}`,
            "GET",
          );
          setCidCode(cidData.code || "");
          setCidDescription(cidData.description || "");
          setSelectedCidId(cidData.id);

          // Configurar também como múltiplos CIDs para compatibilidade
          setMultipleCids([{ cid: cidData }]);
        } catch (error) {
          console.error("Erro ao buscar CID:", error);
          setSelectedCidId(order.cidCodeId);
        }
      }
    };

    loadCidData();

    // Removido carregamento da lateralidade do CID conforme solicitado
    // Valor padrão será null

    // Carregar a lateralidade do procedimento principal
    if (order.procedureLaterality) {
      setProcedureLaterality(order.procedureLaterality);
    }

    // Recuperar dados do procedimento CBHPM
    if (order.procedureCbhpmId) {
      try {
        const procedureData = await apiRequest(
          API_ENDPOINTS.PROCEDURE_BY_ID(order.procedureCbhpmId),
          "GET",
        );
        setSelectedProcedure({
            id: procedureData.id,
            code: procedureData.code,
            name: procedureData.name,
            description: procedureData.description,
            active: procedureData.active,
            porte: procedureData.porte,
            custoOperacional: procedureData.custoOperacional,
            porteAnestesista: procedureData.porteAnestesista,
          });
      } catch (error) {
        console.error("Erro ao buscar procedimento CBHPM:", error);
      }
    }

    // Carregar TODOS os procedimentos (principal + secundários) para exibir em "Procedimentos Cirúrgicos Necessários"
    const allProcedures: SecondaryProcedure[] = [];

    // Primeiro, adicionar o procedimento principal se existir
    if (order.procedureCbhpmId) {
      try {
        console.log("Adicionando procedimento principal à lista:", order.procedureCbhpmId);
        const procedureData = await apiRequest(
          API_ENDPOINTS.PROCEDURE_BY_ID(order.procedureCbhpmId),
          "GET",
        );
        allProcedures.push({
            procedure: {
              id: procedureData.id,
              code: procedureData.code,
              name: procedureData.name,
              description: procedureData.description,
              active: procedureData.active,
              porte: procedureData.porte,
              custoOperacional: procedureData.custoOperacional,
              porteAnestesista: procedureData.porteAnestesista,
              numeroAuxiliares: procedureData.numeroAuxiliares,
            },
            quantity: order.procedureCbhpmQuantity || 1,
          });
          console.log(`✅ Procedimento principal adicionado: ${procedureData.name} (Porte: ${procedureData.porte})`);
      } catch (error) {
        console.error("Erro ao carregar procedimento principal:", error);
      }
    }

    // Depois, adicionar os procedimentos secundários se existirem
    if (
      order.secondaryProcedureIds &&
      Array.isArray(order.secondaryProcedureIds) &&
      order.secondaryProcedureQuantities &&
      Array.isArray(order.secondaryProcedureQuantities) &&
      order.secondaryProcedureIds.length ===
        order.secondaryProcedureQuantities.length
    ) {
      console.log(
        "Adicionando procedimentos secundários à lista:",
        order.secondaryProcedureIds,
      );

      // Processar todos os procedimentos secundários
      for (let i = 0; i < order.secondaryProcedureIds.length; i++) {
        try {
          const procedureId = order.secondaryProcedureIds[i];
          const quantity = order.secondaryProcedureQuantities[i];

          // Buscar os dados do procedimento CBHPM
          const procedureData = await apiRequest(
            API_ENDPOINTS.PROCEDURE_BY_ID(procedureId),
            "GET",
          );
            allProcedures.push({
              procedure: {
                id: procedureData.id,
                code: procedureData.code,
                name: procedureData.name,
                description: procedureData.description,
                active: procedureData.active,
                porte: procedureData.porte,
                custoOperacional: procedureData.custoOperacional,
                porteAnestesista: procedureData.porteAnestesista,
                numeroAuxiliares: procedureData.numeroAuxiliares,
              },
              quantity: quantity || 1,
            });
            console.log(`✅ Procedimento secundário adicionado: ${procedureData.name} (Porte: ${procedureData.porte})`);
        } catch (error) {
          console.error(`Erro ao processar procedimento secundário:`, error);
        }
      }
    }

    // Função para calcular o valor numérico do porte para ordenação
    const parsePorteValue = (porte: string | null | undefined): number => {
      if (!porte) return 0;
      
      // Extrair número e letra do porte (ex: "10C" -> número: 10, letra: "C")
      const match = porte.match(/^(\d+)([A-Za-z]?)$/);
      if (!match) return 0;
      
      const numero = parseInt(match[1], 10);
      const letra = match[2]?.toUpperCase() || 'A';
      
      // Converter letra para valor numérico (A=1, B=2, C=3, etc.)
      const valorLetra = letra.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
      
      // Retornar valor combinado: (número * 100) + valor da letra
      return (numero * 100) + valorLetra;
    };

    // Ordenar todos os procedimentos por porte (maior para menor)
    allProcedures.sort(
      (a, b) => parsePorteValue(b.procedure.porte) - parsePorteValue(a.procedure.porte)
    );

    // Atualizar o estado com TODOS os procedimentos ordenados
    if (allProcedures.length > 0) {
      console.log(`📋 Total de ${allProcedures.length} procedimentos carregados e ordenados por porte:`);
      allProcedures.forEach((proc, index) => {
        console.log(`  ${index + 1}. ${proc.procedure.name} (Porte: ${proc.procedure.porte})`);
      });
      setSecondaryProcedures(allProcedures);
    } else {
      console.log("Nenhum procedimento encontrado para o pedido");
      setSecondaryProcedures([]);
    }

    // Carregar itens OPME seguindo o mesmo padrão dos procedimentos secundários
    if (
      order.opmeItemIds &&
      Array.isArray(order.opmeItemIds) &&
      order.opmeItemQuantities &&
      Array.isArray(order.opmeItemQuantities) &&
      order.opmeItemIds.length === order.opmeItemQuantities.length
    ) {
      console.log("Itens OPME encontrados:", order.opmeItemIds);

      // Processar itens OPME
      const opmeItemsList: Array<{ item: any; quantity: number }> = [];

      // Processar todos os itens OPME
      for (let i = 0; i < order.opmeItemIds.length; i++) {
        try {
          const itemId = order.opmeItemIds[i];
          const quantity = order.opmeItemQuantities[i];

          // Buscar os dados do item OPME
          const opmeData = await apiRequest(
            API_ENDPOINTS.OPME_ITEM_BY_ID(itemId),
            "GET",
          );
            opmeItemsList.push({
              item: {
                id: opmeData.id,
                technicalName: opmeData.technicalName,
                commercialName: opmeData.commercialName,
                manufacturerName: opmeData.manufacturerName,
                anvisaRegistrationNumber: opmeData.anvisaRegistrationNumber,
                active: opmeData.active,
              },
              quantity: quantity || 1,
            });
        } catch (error) {
          console.error(`Erro ao processar item OPME:`, error);
        }
      }

      // Atualizar o estado com os itens OPME recuperados
      if (opmeItemsList.length > 0) {
        console.log("Itens OPME carregados:", opmeItemsList);
        setSelectedOpmeItems(opmeItemsList);
      }
    } else {
      console.log("Nenhum item OPME encontrado para o pedido");
    }

    // Carregar fornecedores selecionados
    if (
      order.supplierIds &&
      Array.isArray(order.supplierIds) &&
      order.supplierIds.length > 0
    ) {
      console.log("Fornecedores encontrados no pedido:", order.supplierIds);

      // Definir os fornecedores com os IDs - o componente surgery-data se encarrega de carregar os dados
      const loadedSuppliers = {
        supplier1: order.supplierIds[0] || null,
        supplier2: order.supplierIds[1] || null,
        supplier3: order.supplierIds[2] || null,
      };

      console.log("Carregando fornecedores no estado:", loadedSuppliers);
      setSuppliers(loadedSuppliers);
    } else {
      console.log("Nenhum fornecedor encontrado para o pedido");
      // Limpar fornecedores se não houver nenhum
      setSuppliers({ supplier1: null, supplier2: null, supplier3: null });
    }

    // Carregar justificativa clínica
    if (order.clinical_justification) {
      console.log(
        "Justificativa clínica encontrada no pedido:",
        order.clinical_justification,
      );
      setClinicalJustification(order.clinical_justification);
    } else {
      console.log("Nenhuma justificativa clínica encontrada para o pedido");
      setClinicalJustification("");
    }

    // Armazenar as URLs das imagens e documentos no estado para exibição
    setCurrentOrderData({
      // Usando nomes das colunas exatamente iguais ao banco de dados
      exam_images_url: Array.isArray(order.exam_images_url)
        ? order.exam_images_url
        : [],
      exam_image_count: order.exam_image_count || 0,
      medical_report_url: order.medical_report_url || null,
    });
  };

  // Função para salvar o progresso atual
  const saveProgress = async () => {
    // Só tentamos salvar se pelo menos o paciente for selecionado
    if (!selectedPatient) {
      return;
    }

    try {
      // Função para calcular o valor numérico do porte para ordenação
      const parsePorteValue = (porte: string | null | undefined): number => {
        if (!porte) return 0;
        
        // Extrair número e letra do porte (ex: "10C" -> número: 10, letra: "C")
        const match = porte.match(/^(\d+)([A-Za-z]?)$/);
        if (!match) return 0;
        
        const numero = parseInt(match[1], 10);
        const letra = match[2]?.toUpperCase() || 'A';
        
        // Converter letra para valor numérico (A=1, B=2, C=3, etc.)
        const valorLetra = letra.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
        
        // Retornar valor combinado: (número * 100) + valor da letra
        return (numero * 100) + valorLetra;
      };

      // Ordenar procedimentos secundários por valor do porte (maior para menor)
      const sortedSecondaryProcedures = [...secondaryProcedures].sort(
        (a, b) => parsePorteValue(b.procedure.porte) - parsePorteValue(a.procedure.porte)
      );

      // Definir procedimento principal e secundários baseado na quantidade
      let mainProcedure = null;
      let mainProcedureQuantity = 1;
      let remainingSecondaryProcedures = [];

      if (sortedSecondaryProcedures.length === 1) {
        // Se há apenas 1 procedimento, ele é o principal
        mainProcedure = sortedSecondaryProcedures[0];
        mainProcedureQuantity = mainProcedure.quantity;
        remainingSecondaryProcedures = []; // Nenhum secundário
        
        console.log(`🏆 Único procedimento definido como principal: ${mainProcedure.procedure.code} - ${mainProcedure.procedure.name} (Porte: ${mainProcedure.procedure.porte})`);
      } else if (sortedSecondaryProcedures.length > 1) {
        // Se há mais de 1, o de maior porte é principal, os demais são secundários
        mainProcedure = sortedSecondaryProcedures[0];
        mainProcedureQuantity = mainProcedure.quantity;
        remainingSecondaryProcedures = sortedSecondaryProcedures.slice(1); // Remove o primeiro (que agora é principal)
        
        console.log(`🏆 Procedimento de maior porte definido como principal: ${mainProcedure.procedure.code} - ${mainProcedure.procedure.name} (Porte: ${mainProcedure.procedure.porte})`);
        console.log(`📋 ${remainingSecondaryProcedures.length} procedimentos definidos como secundários`);
      }

      // Preparar arrays dos procedimentos secundários restantes (sem o principal)
      const secondaryProcedureIds = remainingSecondaryProcedures.map(
        (item) => item.procedure.id,
      );
      const secondaryProcedureQuantities = remainingSecondaryProcedures.map(
        (item) => item.quantity,
      );
      // Lateralidade dos procedimentos secundários removida conforme solicitado

      // Extrair IDs e quantidades dos itens OPME
      const opmeItemIds: number[] = selectedOpmeItems.map(
        (item) => item.item.id,
      );
      const opmeItemQuantities: number[] = selectedOpmeItems.map(
        (item) => item.quantity,
      );
      console.log(
        "Itens OPME a serem enviados:",
        opmeItemIds,
        opmeItemQuantities,
      );

      // Extrair os IDs dos CIDs múltiplos para enviar ao backend
      const multipleCidIds = multipleCids.map((item) => item.cid.id);
      console.log("Múltiplos CIDs a serem enviados:", multipleCidIds);

      // Objeto para armazenar os dados do pedido
      let orderData: any = {
        patientId: selectedPatient.id,
        userId: user?.id,
        hospitalId: selectedHospital?.id,
        procedureId: procedureId,
        clinicalIndication: clinicalIndication,
        additionalNotes: additionalNotes,
        cidCodeId: selectedCidId,
        // Campo cidLaterality removido completamente
        clinicalJustification: clinicalJustification,
        procedureType: procedureType,
        procedureCbhpmId: mainProcedure?.procedure?.id || selectedProcedure?.id || null,
        procedureCbhpmQuantity: mainProcedureQuantity || procedureQuantity,
        // Tratamento aprimorado para procedureLaterality
        procedureLaterality:
          procedureLaterality === "null" || procedureLaterality === ""
            ? null
            : procedureLaterality,
        secondaryProcedureIds: secondaryProcedureIds,
        secondaryProcedureQuantities: secondaryProcedureQuantities,
        // Lateralidade dos procedimentos secundários removida conforme solicitado
        opmeItemIds: opmeItemIds,
        opmeItemQuantities: opmeItemQuantities,
        // Adicionar múltiplos CIDs como array de IDs
        multiple_cid_ids: multipleCidIds,
        // Adicionar fornecedores selecionados
        supplierIds: (() => {
          const collectedSuppliers: number[] = [];

          // Coletar fornecedores dos estados do componente surgery-data
          if (suppliers?.supplier1)
            collectedSuppliers.push(suppliers.supplier1);
          if (suppliers?.supplier2)
            collectedSuppliers.push(suppliers.supplier2);
          if (suppliers?.supplier3)
            collectedSuppliers.push(suppliers.supplier3);

          console.log("🏭 FORNECEDORES DEBUG:", {
            suppliersObject: suppliers,
            collectedSuppliers,
            hasSuppliers: collectedSuppliers.length > 0,
          });

          return collectedSuppliers.length > 0 ? collectedSuppliers : null;
        })(),
      };

      // Se o pedido já existir, adicionar ID
      if (orderId) {
        orderData.id = orderId;
      }

      // Log detalhado dos dados sendo enviados
      console.log("Dados de lateralidade sendo enviados ao backend:", {
        // cidLaterality removido conforme solicitado
        // Apenas mantemos a lateralidade do procedimento principal
        procedureLaterality,
      });

      // 1. Upload das imagens de exame (se houver)
      // COMENTADO: Imagens já são enviadas automaticamente quando selecionadas
      // Aqui apenas preservamos as URLs já existentes no banco de dados
      /*
      // Agora apenas gerenciamos um único array de imagens, não há mais imagem "principal"
      let newExamImagesUrls: string[] = [];
      
      // Se há imagens existentes no pedido atual, mantemos suas URLs
      if (currentOrderData?.exam_images_url && currentOrderData.exam_images_url.length > 0) {
        newExamImagesUrls = [...currentOrderData.exam_images_url];
      }
      
      // Processar novas imagens se houver
      if (examImages && examImages.length > 0) {
        try {
          console.log(`Enviando ${examImages.length} imagens para o servidor...`);
          
          // Fazer upload de cada imagem
          for (const image of examImages) {
            const uploadResult = await uploadExamImage(
              image, 
              selectedPatient.id, 
              orderId || undefined
            );
            
            // Adicionar URL da nova imagem ao array
            newExamImagesUrls.push(uploadResult.url);
            console.log("Imagem do exame enviada com sucesso:", uploadResult.url);
          }
          
          orderData.exam_images_url = newExamImagesUrls;
          orderData.exam_image_count = newExamImagesUrls.length;
        } catch (error) {
          console.error("Erro ao fazer upload da imagem do exame:", error);
        }
      } else if (currentOrderData?.exam_images_url?.length) {
        // Manter URLs das imagens existentes
        orderData.exam_images_url = currentOrderData.exam_images_url;
        orderData.exam_image_count = currentOrderData.exam_images_url.length;
      }
      */

      // Preservar URLs das imagens existentes (já enviadas automaticamente)
      if (currentOrderData?.exam_images_url?.length) {
        orderData.exam_images_url = currentOrderData.exam_images_url;
        orderData.exam_image_count = currentOrderData.exam_images_url.length;
        console.log(
          "🖼️ Preservando URLs de imagens existentes:",
          currentOrderData.exam_images_url,
        );
      } else {
        // IMPORTANTE: Não sobrescrever se não temos dados locais - deixar o backend preservar
        console.log(
          "🖼️ Sem dados locais de imagens - deixando backend preservar URLs existentes",
        );
      }

      // 2. Upload do laudo médico (se houver)
      // COMENTADO: Laudo já é enviado automaticamente quando selecionado
      // Aqui apenas preservamos a URL já existente no banco de dados
      /*
      if (medicalReport) {
        try {
          console.log("Enviando laudo médico para o servidor...");
          const uploadResult = await uploadMedicalReport(
            medicalReport, 
            selectedPatient.id, 
            orderId || undefined,
            currentOrderData?.medical_report_url
          );
          
          // Adicionar URL do laudo aos dados do pedido
          orderData.medical_report_url = uploadResult.url;
          console.log("Laudo médico enviado com sucesso:", uploadResult.url);
        } catch (error) {
          console.error("Erro ao fazer upload do laudo médico:", error);
        }
      } else if (currentOrderData?.medical_report_url) {
        // Manter URL do laudo existente se não houver novo laudo
        orderData.medical_report_url = currentOrderData.medical_report_url;
      }
      */

      // Preservar URL do laudo existente (já enviado automaticamente)
      if (currentOrderData?.medical_report_url) {
        orderData.medical_report_url = currentOrderData.medical_report_url;
      }

      // 3. Upload de imagens de exame (se houver)
      // COMENTADO: Código duplicado - imagens já são tratadas acima
      /*
      if (examImages && examImages.length > 0) {
        try {
          console.log(`Enviando ${examImages.length} imagens para o servidor...`);
          
          // Obter as URLs existentes, se houver
          const existingUrls = currentOrderData?.exam_images_url || [];
          
          // Atualizar directamente com imagens existentes por enquanto (upload será implementado depois)
          orderData.exam_images_url = existingUrls;
          orderData.exam_image_count = existingUrls.length;
          console.log("URLs de imagens:", existingUrls);
          
          // Limpar o array de arquivos após o upload
          setExamImages([]);
        } catch (error) {
          console.error("Erro ao processar imagens:", error);
        }
      } else if (currentOrderData?.exam_images_url?.length) {
        // Manter URLs das imagens existentes se não houver novas
        orderData.exam_images_url = currentOrderData.exam_images_url;
        orderData.exam_image_count = currentOrderData.exam_images_url.length;
        console.log("Preservando URLs de imagens existentes:", currentOrderData.exam_images_url);
      } else {
        // Inicialize como array vazio para evitar erros de null/undefined
        orderData.exam_images_url = [];
        orderData.exam_image_count = 0;
      }
      */

      // Atualizar o pedido no banco de dados
      saveProgressMutation.mutate(orderData);
    } catch (error) {
      console.error("Erro ao salvar progresso:", error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar o pedido. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Mutação para salvar/atualizar o pedido em preenchimento
  const saveProgressMutation = useMutation({
    mutationFn: async (orderData: any) => {
      // Se já temos um ID, atualizamos o pedido existente
      if (orderId) {
        // Log detalhado para rastrear valores de lateralidade
        console.log("saveProgressMutation - Enviando dados de lateralidade:", {
          // Apenas procedureLaterality é mantido - lateralidade de CID e procedimentos secundários foi removida
          procedureLaterality: orderData.procedureLaterality,
        });

        const updatedData = await apiRequest(
          API_ENDPOINTS.MEDICAL_ORDER_BY_ID(orderId),
          "PUT",
          {
            ...orderData,
            statusCode: ORDER_STATUS_VALUES.EM_PREENCHIMENTO,
          },
        );

        // Verificar se a lateralidade foi salva corretamente
        console.log(
          "saveProgressMutation - Dados retornados após salvamento:",
          {
            cidLateralitySalvo: updatedData.cidLaterality,
            procedureLateralitySalvo: updatedData.procedureLaterality,
          },
        );

        return updatedData;
      }
      // Senão criamos um novo pedido em preenchimento
      else {
        // Usar um endpoint totalmente diferente para evitar o problema com exam_image_url
        return await apiRequest("/api/medical-orders-direct", "POST", {
          ...orderData,
          statusCode: ORDER_STATUS_VALUES.EM_PREENCHIMENTO,
        });
      }
    },
    onSuccess: (data) => {
      setOrderId(data.id);

      // CRÍTICO: Atualizar currentOrderData com as URLs das imagens retornadas do servidor
      if (data.exam_images_url || data.medical_report_url) {
        setCurrentOrderData({
          exam_images_url: data.exam_images_url || [],
          exam_image_count: data.exam_image_count || 0,
          medical_report_url: data.medical_report_url || null,
        });
        console.log("🖼️ currentOrderData atualizado com URLs do servidor:", {
          exam_images_url: data.exam_images_url,
          medical_report_url: data.medical_report_url,
        });
      }

      // Toast de progresso desabilitado para evitar interferir com o scroll automático durante navegação
      // toast({
      //   title: "Progresso salvo automaticamente",
      //   description: "Dados preenchidos até o momento foram salvos.",
      //   duration: 2000,
      // });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar progresso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Função para atualizar campos específicos do pedido no banco de dados
  const updateOrderField = async (fieldName: string, value: any) => {
    if (!orderId) {
      console.error("Não há pedido para atualizar");
      return false;
    }

    try {
      // Criamos um objeto com apenas o campo a ser atualizado
      const updateData = {
        [fieldName]: value,
      };

      // Logar campos de lateralidade se estiverem sendo atualizados
      if (
        fieldName === "cidLaterality" ||
        fieldName === "procedureLaterality"
      ) {
        console.log(
          `updateOrderField - Atualizando campo de lateralidade: ${fieldName}`,
          value,
        );
      }

      const updatedOrder = await apiRequest(
        API_ENDPOINTS.MEDICAL_ORDER_BY_ID(orderId),
        "PUT",
        {
          ...updateData,
          statusCode: ORDER_STATUS_VALUES.EM_PREENCHIMENTO,
        },
      );
      console.log(`Campo ${fieldName} atualizado com sucesso:`, updatedOrder);

      // Verificar se as lateralidades foram preservadas na resposta
      if (
        fieldName === "cidLaterality" ||
        fieldName === "procedureLaterality"
      ) {
        console.log("updateOrderField - Lateralidades após atualização:", {
          cidLaterality: updatedOrder.cidLaterality,
          procedureLaterality: updatedOrder.procedureLaterality,
        });
      }

      // Atualizar o estado local currentOrderData para refletir a mudança no banco de dados
      if (currentOrderData) {
        setCurrentOrderData({
          ...currentOrderData,
          [fieldName]: value,
        });
      }

      return true;
    } catch (error) {
      console.error(`Erro ao atualizar campo ${fieldName}:`, error);
      return false;
    }
  };

  // Função para baixar PDF já gerado
  const downloadExistingPDF = async () => {
    try {
      // Buscar os dados atualizados do pedido para obter o order_pdf_url
      const response = await fetch(`/api/medical-orders/${orderId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Erro ao buscar dados do pedido');
      }
      
      const orderData = await response.json();
      
      if (!orderData.order_pdf_url) {
        toast({
          title: "PDF não encontrado",
          description: "Nenhum PDF foi gerado para este pedido",
          variant: "destructive",
        });
        return;
      }
      
      // Fazer download do PDF existente
      const pdfResponse = await fetch(orderData.order_pdf_url);
      if (!pdfResponse.ok) {
        throw new Error('Erro ao acessar o PDF');
      }
      
      const blob = await pdfResponse.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pedido_${orderId}_${selectedPatient?.fullName?.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download concluído",
        description: "PDF baixado com sucesso!",
      });
      
    } catch (error) {
      console.error("Erro ao baixar PDF:", error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o PDF",
        variant: "destructive",
      });
    }
  };

  // Função para gerar PDF vetorial de alta qualidade
  const generateHighQualityPDF = async () => {
    try {
      console.log("🔄 INÍCIO - Geração de PDF vetorial");
      console.log("OrderID:", orderId);
      console.log("Paciente:", selectedPatient?.fullName);

      if (!orderId || !selectedPatient || !selectedHospital) {
        toast({
          title: "Erro ao gerar PDF",
          description: "Dados insuficientes para gerar o documento",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Gerando PDF",
        description: "Criando documento de alta qualidade...",
      });

      // Importar dinamicamente o react-pdf
      const { pdf } = await import('@react-pdf/renderer');
      const { OrderPDFDocument } = await import('@/components/order-pdf-document');

      // Preparar fornecedores como array
      const suppliersArray: any[] = [];
      if (suppliers.supplier1) suppliersArray.push({ id: suppliers.supplier1 });
      if (suppliers.supplier2) suppliersArray.push({ id: suppliers.supplier2 });
      if (suppliers.supplier3) suppliersArray.push({ id: suppliers.supplier3 });

      // Preparar dados para o PDF
      const pdfData = {
        orderData: currentOrderData,
        patientData: selectedPatient,
        hospitalData: selectedHospital,
        procedureData: selectedProcedure,
        cidData: { code: cidCode, description: cidDescription },
        secondaryProcedures: secondaryProcedures || [],
        opmeItems: selectedOpmeItems || [],
        suppliers: suppliersArray,
      };

      console.log("📄 Gerando PDF com react-pdf/renderer...");

      // Gerar PDF usando react-pdf
      const pdfBlob = await pdf(<OrderPDFDocument {...pdfData} />).toBlob();

      console.log("✅ PDF vetorial gerado! Tamanho:", pdfBlob.size, "bytes");

      // Gerar nome do arquivo
      const fileName = `pedido_${orderId}_${selectedPatient?.fullName?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      console.log("📁 Nome do arquivo gerado:", fileName);
      
      // Criar FormData para enviar o arquivo
      const formData = new FormData();
      formData.append('pdf', pdfBlob, fileName);
      formData.append('orderId', orderId.toString());
      formData.append('patientName', selectedPatient?.fullName || 'Paciente');
      
      console.log("📤 Enviando PDF vetorial para servidor...");
      
      // Enviar PDF para o servidor
      const uploadResponse = await fetch('/api/uploads/order-pdf', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Erro no upload: ${uploadResponse.status}`);
      }
      
      const uploadResult = await uploadResponse.json();
      console.log("✅ Upload concluído:", uploadResult);
      
      // Atualizar status do pedido para "aguardando_envio"
      await updateOrderField('statusCode', 'aguardando_envio');
      
      toast({
        title: "PDF gerado com sucesso!",
        description: "Documento de alta qualidade criado",
      });
      
      // Avançar para o próximo passo
      setCurrentStep(5);
      
    } catch (error) {
      console.error("❌ Erro na geração do PDF vetorial:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Tentando método alternativo...",
        variant: "destructive",
      });
      
      // Fallback para o método original
      generatePDF();
    }
  };

  // Função para gerar PDF da prévia do pedido (método original como backup)
  const generatePDF = async () => {
    try {
      console.log("🔄 INÍCIO - Geração de PDF");
      console.log("OrderID:", orderId);
      console.log("Paciente:", selectedPatient?.fullName);
      
      if (!orderId) {
        console.error("❌ OrderID é obrigatório para gerar PDF");
        toast({
          title: "Erro ao gerar PDF",
          description: "ID do pedido não encontrado. Salve o pedido primeiro.",
          variant: "destructive",
        });
        return;
      }
      
      const element = document.getElementById('documento-completo');
      if (!element) {
        console.log("❌ ERRO: Elemento documento-completo não encontrado");
        toast({
          title: "Erro ao gerar PDF",
          description: "Elemento do documento não encontrado",
          variant: "destructive",
        });
        return;
      }

      console.log("✅ Elemento encontrado, iniciando captura...");
      toast({
        title: "Gerando PDF",
        description: "Processando documento...",
      });

      // Capturar a div como canvas com configurações de alta qualidade
      const canvas = await html2canvas(element, {
        scale: 2.0, // Aumentar escala para melhor qualidade de texto
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        height: element.offsetHeight,
        width: element.offsetWidth,
        removeContainer: true,
        logging: false,
        pixelRatio: window.devicePixelRatio || 2, // Usar pixel ratio do dispositivo
        imageTimeout: 0,
        ignoreElements: (element) => {
          return element.tagName === 'IMG' && (element as HTMLImageElement).src?.includes('attached_assets');
        },
      });
      
      console.log("🖼️ Canvas criado - Dimensões:", canvas.width, "x", canvas.height);

      // Criar PDF com alta qualidade
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/jpeg', 0.95); // JPEG com 95% de qualidade para melhor texto
      console.log("📊 Tamanho da imagem base64:", Math.round(imgData.length / 1024), "KB");
      
      // Dimensões A4: 210 x 297 mm - forçar uma única página
      const imgWidth = 210;
      const pageHeight = 297;
      
      // Calcular altura proporcional, mas limitar à página A4
      let imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Se a altura exceder a página A4, ajustar para caber
      if (imgHeight > pageHeight) {
        imgHeight = pageHeight;
      }

      // Adicionar apenas uma página (igual à prévia)
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

      // Gerar nome do arquivo
      const fileName = `pedido_${orderId}_${selectedPatient?.fullName?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      console.log("📁 Nome do arquivo gerado:", fileName);
      
      // Converter PDF para blob para enviar ao servidor
      const pdfBlob = pdf.output('blob');
      console.log("📄 PDF blob criado, tamanho:", pdfBlob.size, "bytes");
      
      // Criar FormData para enviar o arquivo
      const formData = new FormData();
      formData.append('pdf', pdfBlob, fileName);
      formData.append('orderId', orderId.toString());
      formData.append('patientName', selectedPatient?.fullName || 'Paciente');
      
      console.log("📤 Enviando dados para servidor:");
      console.log("- OrderID:", orderId);
      console.log("- Nome do arquivo:", fileName);
      console.log("- Tamanho do PDF:", pdfBlob.size);
      
      // Enviar PDF para o servidor (seguindo padrão do laudo médico)
      const uploadResponse = await fetch('/api/uploads/order-pdf', {
        method: 'POST',
        credentials: 'include', // Incluir cookies de sessão
        body: formData,
      });
      
      console.log("📡 Resposta do servidor:", uploadResponse.status, uploadResponse.statusText);
      
      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        console.log("✅ Sucesso! Resultado do servidor:", result);
        
        // PDF salvo apenas no servidor (sem download automático)
        
        toast({
          title: "PDF gerado com sucesso",
          description: `Arquivo salvo no servidor`,
        });
        
        return result.pdfUrl; // Retornar URL do PDF salvo
      } else {
        const errorText = await uploadResponse.text();
        console.log("❌ Erro do servidor:", errorText);
        
        // Se falhar no servidor, ainda assim baixar localmente
        pdf.save(fileName);
        
        toast({
          title: "PDF gerado",
          description: "Arquivo baixado localmente (erro ao salvar no servidor)",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o documento",
        variant: "destructive",
      });
    }
  };

  // Função para finalizar o pedido
  const handleComplete = async () => {
    try {
      // Primeiro, gerar o PDF com qualidade melhorada
      const pdfUrl = await generatePDF();
      
      // Preparar o objeto base de dados do pedido
      let orderData: any = {
        id: orderId,
        patientId: selectedPatient.id,
        userId: user?.id,
        hospitalId: selectedHospital.id,
        procedureId: procedureId,
        clinicalIndication: clinicalIndication,
        additionalNotes: additionalNotes,
        // Mantemos os campos do CID principal para compatibilidade, mas usamos o primeiro CID da lista múltipla
        cidCodeId:
          multipleCids.length > 0 ? multipleCids[0].cid.id : selectedCidId,
        cidCode: multipleCids.length > 0 ? multipleCids[0].cid.code : cidCode,
        cidDescription:
          multipleCids.length > 0
            ? multipleCids[0].cid.description
            : cidDescription,
        cidLaterality: cidLaterality,
        // Adicionando múltiplos CIDs
        multipleCidIds: multipleCids.map((item) => item.cid.id),
        multipleCidCodes: multipleCids.map((item) => item.cid.code),
        multipleCidDescriptions: multipleCids.map(
          (item) => item.cid.description,
        ),
        // Campo procedureLaterality removido conforme solicitado
        procedureType: procedureType,
        procedureCbhpmId: selectedProcedure?.id,
        clinicalJustification: clinicalJustification,
        statusCode: ORDER_STATUS_VALUES.AGUARDANDO_ENVIO, // Status atualizado para aguardando envio
        // Incluir URL do PDF gerado
        ...(pdfUrl && { order_pdf_url: pdfUrl }),
      };

      // Incluir dados dos procedimentos secundários
      if (secondaryProcedures.length > 0) {
        orderData.secondaryProcedureIds = secondaryProcedures.map(
          (item) => item.procedure.id,
        );
        orderData.secondaryProcedureQuantities = secondaryProcedures.map(
          (item) => item.quantity,
        );
        // Campo secondaryProcedureLateralities removido conforme solicitado
      }

      // Incluir dados dos itens OPME
      if (selectedOpmeItems.length > 0) {
        orderData.opmeItemIds = selectedOpmeItems.map((item) => item.item.id);
        orderData.opmeItemQuantities = selectedOpmeItems.map(
          (item) => item.quantity,
        );
      }

      // Incluir fornecedores selecionados
      const supplierIds: number[] = [];
      // Coletar fornecedores dos estados do componente surgery-data
      if (suppliers.supplier1) supplierIds.push(suppliers.supplier1);
      if (suppliers.supplier2) supplierIds.push(suppliers.supplier2);
      if (suppliers.supplier3) supplierIds.push(suppliers.supplier3);

      if (supplierIds.length > 0) {
        orderData.supplierIds = supplierIds;
        console.log("Fornecedores incluídos no pedido:", supplierIds);
      }

      // Manter URLs de imagens existentes
      // Este trecho foi removido porque o campo examImageUrl foi substituído por exam_images_url
      // Não é necessário tratar uma única imagem separadamente, pois usamos um array agora

      if (currentOrderData?.medical_report_url) {
        orderData.medical_report_url = currentOrderData.medical_report_url;
      }

      if (currentOrderData?.exam_images_url?.length) {
        orderData.exam_images_url = currentOrderData.exam_images_url;
        orderData.exam_image_count = currentOrderData.exam_images_url.length;
      }

      console.log("Enviando pedido para avaliação:", orderData);

      // Utilizar o endpoint de update com o ID do pedido
      const data = await apiRequest(
        API_ENDPOINTS.MEDICAL_ORDER_BY_ID(orderId),
        "PUT",
        orderData,
      );

      toast({
        title: "Pedido enviado com sucesso",
        description: `Pedido para ${selectedPatient?.fullName} no hospital ${selectedHospital?.name} foi enviado para avaliação.`,
        duration: 3000,
      });

      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.MEDICAL_ORDERS],
      });

      // Avançar para o último passo (confirmação)
      setCurrentStep(5);
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      toast({
        title: "Erro ao finalizar pedido",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Função para validar um passo específico
  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return !!(selectedPatient?.id && selectedHospital?.id);
      
      case 2:
        return validateStep(1) && 
               !!(clinicalIndication && 
                  clinicalIndication.trim() !== "" && 
                  clinicalIndication !== "A ser preenchido");
      
      case 3:
        return validateStep(2) && 
               !!(selectedProcedure?.id && 
                  cidCode && 
                  cidCode.trim() !== "" && 
                  clinicalJustification && 
                  clinicalJustification.trim() !== "");
      
      case 4:
        return validateStep(3);
      
      case 5:
        return validateStep(4);
      
      default:
        return false;
    }
  };

  // Função para verificar se um passo pode ser acessado
  const canAccessStep = (stepNumber: number) => {
    // Sempre pode acessar o passo 1
    if (stepNumber === 1) return true;
    
    // Para passos anteriores ao atual, sempre pode acessar
    if (stepNumber < currentStep) return true;
    
    // Para o passo atual, sempre pode acessar
    if (stepNumber === currentStep) return true;
    
    // REGRA ESPECIAL: O passo 5 (visualização) só pode ser acessado via botão "Próximo"
    // Nunca via clique direto no breadcrumb, exceto se já estiver no passo 5 ou posterior
    if (stepNumber === 5 && currentStep < 5) {
      return false;
    }
    
    // Para outros passos futuros (2, 3, 4), verificar se todos os passos intermediários estão válidos
    for (let i = 1; i < stepNumber; i++) {
      if (!validateStep(i)) {
        return false;
      }
    }
    
    return true;
  };

  // Função para navegar diretamente para um passo específico
  const goToStep = async (stepNumber: number) => {
    // Verificar se o passo pode ser acessado
    if (!canAccessStep(stepNumber)) {
      // Determinar qual requisito está faltando para dar feedback específico
      if (stepNumber === 2 && !validateStep(1)) {
        toast({
          title: "Complete o Passo 1",
          description: "Selecione um paciente e hospital antes de continuar",
          variant: "destructive",
          duration: 5000,
        });
      } else if (stepNumber === 3 && !validateStep(2)) {
        toast({
          title: "Complete o Passo 2",
          description: "Preencha a indicação clínica antes de continuar",
          variant: "destructive",
          duration: 5000,
        });
      } else if (stepNumber === 4 && !validateStep(3)) {
        toast({
          title: "Complete o Passo 3",
          description: "Selecione procedimento, CID e preencha a justificativa clínica",
          variant: "destructive",
          duration: 5000,
        });
      } else if (stepNumber === 5 && currentStep < 5) {
        toast({
          title: "Use o botão Próximo",
          description: "Para acessar a visualização, use o botão 'Próximo' do passo 4",
          variant: "destructive",
          duration: 5000,
        });
      } else {
        toast({
          title: "Passo não disponível",
          description: "Complete os passos anteriores para acessar este passo",
          variant: "destructive",
          duration: 5000,
        });
      }
      return;
    }
    
    // Se estamos avançando para um passo futuro, salvar progresso atual primeiro
    if (stepNumber > currentStep) {
      try {
        await saveProgress();
      } catch (error) {
        console.error("Erro ao salvar progresso:", error);
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar o progresso atual",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }
    }
    
    // Navegar para o passo selecionado
    setCurrentStep(stepNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Função para navegar para o próximo passo
  const goToNextStep = async () => {
    if (currentStep < 5) {
      // Se estamos no passo 4 (Visualização), então finalizamos o pedido
      if (currentStep === 4) {
        await handleComplete();
        // Voltar ao topo da página após finalizar
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (currentStep === 1) {
        // Se estamos no passo 1 (paciente e hospital), garantir que um pedido seja criado no banco
        try {
          // Verificar se temos paciente e hospital selecionados
          if (!selectedPatient?.id) {
            toast({
              title: "Paciente não selecionado",
              description: "Por favor, selecione um paciente para continuar",
              variant: "destructive",
              duration: 5000,
            });
            return;
          }

          if (!selectedHospital?.id) {
            toast({
              title: "Hospital não selecionado",
              description: "Por favor, selecione um hospital para continuar",
              variant: "destructive",
              duration: 5000,
            });
            return;
          }

          // Preparar objeto base com dados mínimos necessários
          // Somente incluindo campos que realmente existem na tabela do banco de dados
          const initialOrderData = {
            patientId: selectedPatient.id,
            userId: user?.id,
            hospitalId: selectedHospital.id,
            statusCode: ORDER_STATUS_VALUES.EM_PREENCHIMENTO, // Alterado de 'status' para 'statusCode'
            procedureType: PROCEDURE_TYPE_VALUES.ELETIVA, // Valor padrão
            procedureId: 1, // Valor temporário, será atualizado posteriormente
            clinicalIndication: "A ser preenchido", // Campo obrigatório deve ter valor não vazio
            // Valor de lateralidade do procedimento (possivelmente null neste ponto, será atualizado depois)
            procedureLaterality: procedureLaterality || null,
            // Arrays vazios inicializados corretamente para PostgreSQL
            secondaryProcedureIds: [] as number[],
            secondaryProcedureQuantities: [] as number[],
            opmeItemIds: [] as number[],
            opmeItemQuantities: [] as number[],
            // Usar nomes exatos das colunas do banco de dados
            exam_images_url: [] as string[],
            exam_image_count: 0,
          };

          console.log(
            "Dados do pedido sendo enviados:",
            JSON.stringify(initialOrderData, null, 2),
          );

          // Se não temos um ID de pedido ainda, criar um novo
          if (!orderId) {
            console.log(
              "Criando novo pedido cirúrgico com paciente:",
              selectedPatient.fullName,
            );

            const data = await apiRequest(
              API_ENDPOINTS.MEDICAL_ORDERS,
              "POST",
              initialOrderData,
            );

            setOrderId(data.id);

            console.log("Pedido criado com sucesso, ID:", data.id);

            toast({
              title: "Pedido iniciado",
              description: `Pedido cirúrgico #${data.id} foi iniciado com sucesso`,
              duration: 2000,
            });
          } else {
            // Se já temos um ID, apenas atualizar os dados básicos
            await saveProgress();
          }

          // Avançar para o próximo passo após a criação bem-sucedida
          setCurrentStep(currentStep + 1);
          // Voltar ao topo da página
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
          console.error("Erro ao criar pedido:", error);
          toast({
            title: "Erro ao iniciar pedido",
            description:
              "Não foi possível iniciar o pedido cirúrgico. Tente novamente.",
            variant: "destructive",
            duration: 5000,
          });
        }
      } else if (currentStep === 2) {
        // Validação do passo 2 (Exame e Laudo)
        if (!clinicalIndication || clinicalIndication.trim() === "" || clinicalIndication === "A ser preenchido") {
          toast({
            title: "Indicação Clínica obrigatória",
            description: "Por favor, preencha a indicação clínica para continuar",
            variant: "destructive",
            duration: 5000,
          });
          return;
        }

        await saveProgress();
        setCurrentStep(currentStep + 1);
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
      } else if (currentStep === 3) {
        // Validação do passo 3 (Dados da Cirurgia)
        if (!selectedProcedure?.id) {
          toast({
            title: "Procedimento obrigatório",
            description: "Por favor, selecione um procedimento para continuar",
            variant: "destructive",
            duration: 5000,
          });
          return;
        }

        if (!cidCode || cidCode.trim() === "") {
          toast({
            title: "Código CID obrigatório",
            description: "Por favor, selecione um código CID para continuar",
            variant: "destructive",
            duration: 5000,
          });
          return;
        }

        if (!clinicalJustification || clinicalJustification.trim() === "") {
          toast({
            title: "Justificativa Clínica obrigatória",
            description: "Por favor, preencha a justificativa clínica para continuar",
            variant: "destructive",
            duration: 5000,
          });
          return;
        }

        await saveProgress();
        setCurrentStep(currentStep + 1);
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
      } else {
        // Para outros passos, salvar o progresso e avançar
        // Lateralidade dos procedimentos secundários removida conforme solicitado
        console.log("Dados de lateralidade ANTES de salvar (próximo passo):", {
          cidLaterality,
          procedureLaterality,
          // Não incluir mais as lateralidades dos procedimentos secundários
        });

        await saveProgress();

        console.log(
          "Próximo passo: Valores de lateralidade salvos com sucesso",
        );
        
        // Avançar para o próximo passo imediatamente e depois fazer scroll
        setCurrentStep(currentStep + 1);
        
        // Fazer scroll após a mudança de passo para evitar conflito com toast
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
      }
    }
  };

  // Função para navegar para o passo anterior
  const goToPreviousStep = async () => {
    if (currentStep > 1) {
      console.log("Dados de lateralidade ANTES de salvar (passo anterior):", {
        cidLaterality,
        procedureLaterality,
        // Lateralidade dos procedimentos secundários removida conforme solicitado
      });

      // Salvar progresso antes de voltar para a etapa anterior
      await saveProgress();

      console.log("Passo anterior: Valores de lateralidade salvos com sucesso");
      setCurrentStep(currentStep - 1);
      // Voltar ao topo da página
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Função para voltar para a home e salvar o progresso
  const saveAndExit = async () => {
    await saveProgress();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#1a2332]">
      <main className="flex-grow overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white">
              Novo Pedido Cirúrgico
            </h2>
            <p className="text-blue-200 text-sm mt-2">
              Selecione o paciente e o hospital para o pedido cirúrgico
            </p>
          </div>

          <div className="mb-8 overflow-x-auto pb-2">
            <div className="flex items-center justify-center space-x-8 md:space-x-10 lg:space-x-12">
              {steps.map((step) => {
                const isActive = currentStep === step.number;
                const isCompleted = validateStep(step.number) && currentStep > step.number;
                const isAccessible = canAccessStep(step.number);
                const isClickable = isAccessible;
                
                // Determinar o status visual do passo
                let stepStatus = '';
                let textColor = '';
                
                if (isActive) {
                  stepStatus = "bg-blue-600 border border-blue-400 shadow-lg scale-110";
                  textColor = "text-white";
                } else if (isCompleted) {
                  stepStatus = "bg-green-600 border border-green-400 shadow-md hover:bg-green-500";
                  textColor = "text-white";
                } else if (isAccessible && step.number > currentStep) {
                  stepStatus = "bg-blue-500/70 border border-blue-400 shadow-md hover:bg-blue-500";
                  textColor = "text-blue-100";
                } else if (isAccessible) {
                  stepStatus = "bg-blue-700 border border-blue-500 shadow-md hover:bg-blue-600";
                  textColor = "text-white";
                } else {
                  stepStatus = "bg-gray-600/50 border border-gray-500/50";
                  textColor = "text-gray-400";
                }
                
                return (
                  <div
                    key={step.number}
                    className={`flex items-center ${textColor} ${
                      isClickable ? "cursor-pointer hover:text-blue-100" : "cursor-not-allowed"
                    } transition-all duration-200`}
                    onClick={() => isClickable && goToStep(step.number)}
                    title={
                      isClickable 
                        ? `Ir para ${step.label}` 
                        : "Complete os passos anteriores para acessar"
                    }
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${stepStatus}`}
                    >
                      {isCompleted ? '✓' : step.number}
                    </div>
                    <span className="ml-2 text-sm whitespace-nowrap font-medium">
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Container principal com estilo do formulário de login */}
          <div className="w-full bg-[#1a2332] border border-blue-800 shadow-lg rounded-lg mb-8">
            {currentStep === 1 && (
              <div className="p-6">
                <PatientSelection
                  selectedPatient={selectedPatient}
                  setSelectedPatient={(patient) => {
                    if (patient) {
                      handlePatientSelected(patient);
                    } else {
                      setSelectedPatient(null);
                    }
                  }}
                />

                {/* Dialog de pedido existente removido */}

                <HospitalSelection
                  selectedHospital={selectedHospital}
                  setSelectedHospital={setSelectedHospital}
                />
              </div>
            )}

            {currentStep === 2 && (
              <div className="p-6">
                <ExamInfo
                  clinicalIndication={clinicalIndication}
                  setClinicalIndication={setClinicalIndication}
                  examImages={examImages}
                  setExamImages={(files) => {
                    setExamImages(files);
                    // Se o array for vazio e tínhamos URLs de imagens, resetamos no currentOrderData
                    if (
                      files.length === 0 &&
                      currentOrderData?.exam_images_url?.length
                    ) {
                      setCurrentOrderData({
                        ...currentOrderData,
                        exam_images_url: [],
                        exam_image_count: 0,
                      });
                    }
                  }}
                  medicalReport={medicalReport}
                  setMedicalReport={(file) => {
                    setMedicalReport(file);
                    // Se o arquivo for null e tínhamos um URL de laudo, também atualizamos o currentOrderData
                    if (file === null && currentOrderData?.medical_report_url) {
                      setCurrentOrderData({
                        ...currentOrderData,
                        medical_report_url: null,
                      });
                    }
                  }}
                  additionalNotes={additionalNotes}
                  setAdditionalNotes={setAdditionalNotes}
                  updateOrderField={updateOrderField}
                  orderId={orderId}
                  // Agora usamos apenas exam_images_url para todas as imagens
                  imageUrls={currentOrderData?.exam_images_url || []}
                  medicalReportUrl={currentOrderData?.medical_report_url}
                />
              </div>
            )}

            {currentStep === 3 && (
              <div className="p-6">
                <SurgeryData
                  cidCode={cidCode}
                  setCidCode={setCidCode}
                  cidDescription={cidDescription}
                  setCidDescription={setCidDescription}
                  selectedCidId={selectedCidId}
                  setSelectedCidId={setSelectedCidId}
                  cidLaterality={cidLaterality}
                  setCidLaterality={setCidLaterality}
                  multipleCids={multipleCids}
                  setMultipleCids={setMultipleCids}
                  procedureLaterality={procedureLaterality}
                  setProcedureLaterality={setProcedureLaterality}
                  procedureType={procedureType}
                  setProcedureType={setProcedureType}
                  procedureQuantity={procedureQuantity}
                  setProcedureQuantity={setProcedureQuantity}
                  selectedProcedure={selectedProcedure}
                  setSelectedProcedure={setSelectedProcedure}
                  secondaryProcedures={secondaryProcedures}
                  setSecondaryProcedures={setSecondaryProcedures}
                  clinicalJustification={clinicalJustification}
                  setClinicalJustification={setClinicalJustification}
                  selectedOpmeItems={selectedOpmeItems}
                  setSelectedOpmeItems={setSelectedOpmeItems}
                  suppliers={suppliers}
                  setSuppliers={setSuppliers}
                />
              </div>
            )}

            {currentStep === 4 && (
              <div className="p-6">
                <div className="mb-6 text-white">
                  <h3 className="text-lg font-medium text-white">
                    Visualização do Pedido
                  </h3>
                  <p className="text-sm text-blue-200">
                    Revise os dados do pedido antes de finalizar
                  </p>
                  <p className="text-xs text-blue-300 mt-1">
                    Prévia A4 (210 x 297 mm)
                  </p>

                  {/* Div principal que conterá o documento para exportação futura em PDF */}
                  <div className="flex justify-center mb-10">
                    <div id="documento-completo" className="relative bg-white shadow-xl" style={{ width: '210mm', height: '297mm' }}>
                      
                      {/* Área de conteúdo com margens A4 */}
                      <div className="absolute inset-0" style={{ marginTop: '20px', marginBottom: '20px', marginLeft: '30px', marginRight: '30px' }}>
                        <div id="documento-pedido" className="w-full h-full bg-white text-black overflow-auto p-2">
                          {/* Cabeçalho com logos do hospital e médico */}
                          <div className="mb-2">
                            <div className="flex items-start justify-between">
                              {/* Logo do hospital - lado esquerdo */}
                              <div className="w-40 h-16 flex items-center justify-center overflow-hidden">
                                {selectedHospital?.logoUrl ? (
                                  <img 
                                    src={selectedHospital.logoUrl} 
                                    alt={`Logo do ${selectedHospital.name}`} 
                                    className="max-h-full object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="text-xs text-gray-500 text-center">
                                    {selectedHospital?.name || 'Hospital'}
                                  </div>
                                )}
                              </div>

                              {/* Logo do médico - lado direito */}
                              <div className="w-48 h-20 flex items-center justify-center overflow-hidden">
                                {user?.logoUrl && (
                                  <img 
                                    src={user.logoUrl} 
                                    alt="Logo do Médico" 
                                    className="max-h-full object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Dados do Paciente */}
                          {selectedPatient && (
                            <div className="mb-5 p-2 bg-white rounded-lg">
                              <h3 className="text-sm font-semibold mb-1 border-b pb-1">Dados do Paciente</h3>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="text-xs">
                                  <p><span className="font-medium">Nome:</span> {selectedPatient.fullName}</p>
                                  <p><span className="font-medium">Data de Nascimento:</span> {formatDateBR(selectedPatient.birthDate)}</p>
                                  <p><span className="font-medium">Idade:</span> {new Date().getFullYear() - new Date(selectedPatient.birthDate).getFullYear()} anos</p>
                                </div>
                                <div className="text-xs">
                                  <p><span className="font-medium">Plano de Saúde:</span> {selectedPatient.insurance || 'Não informado'}</p>
                                  <p><span className="font-medium">Número da Carteirinha:</span> {selectedPatient.insuranceNumber || 'Não informado'}</p>
                                  <p><span className="font-medium">Tipo do Plano:</span> {selectedPatient.plan || 'Não informado'}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Título do documento */}
                          <div className="pb-1 mb-4">
                            <h2 className="text-base font-bold text-center text-blue-900">
                              SOLICITAÇÃO DE PROCEDIMENTO CIRÚRGICO
                            </h2>
                            
                            {/* Justificativa clínica */}
                            <div className="mt-2 text-xs text-justify bg-white p-2 rounded-md overflow-y-auto" style={{ 
                              minHeight: '72px',  // Altura mínima (equivale a ~3 linhas)
                              maxHeight: '220px', // Altura máxima (equivale a ~10 linhas)
                              height: 'auto'      // Altura automática baseada no conteúdo
                            }}>
                              <p>{clinicalJustification || 'Justificativa clínica será exibida aqui'}</p>
                            </div>
                          </div>

                          {/* Procedimentos e dados clínicos */}
                          <div className="space-y-4 mt-10">
                            <div className="pb-2">
                              <div className="space-y-2">
                                
                                {/* Códigos CID-10 */}
                                <div>
                                  <p className="font-bold text-xs text-gray-700">Códigos CID-10:</p>
                                  <div className="text-xs text-gray-900 pl-4 space-y-0.5">
                                    {multipleCids && multipleCids.length > 0 ? (
                                      multipleCids.map((cidItem, index) => (
                                        <p key={cidItem.cid.id}>
                                          {cidItem.cid.code} - {cidItem.cid.description}
                                        </p>
                                      ))
                                    ) : (
                                      <p>Nenhum código CID selecionado</p>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Procedimentos principais e secundários unificados */}
                                {secondaryProcedures.length > 0 && (
                                  <div>
                                    <p className="font-bold text-xs text-gray-700">Procedimentos Cirúrgicos Necessários:</p>
                                    <div className="text-xs text-gray-900 pl-4 space-y-0.5">
                                      {(() => {
                                        // Aplicar a mesma lógica de ordenação do salvamento
                                        const parsePorteValue = (porte: string | null | undefined): number => {
                                          if (!porte) return 0;
                                          const match = porte.match(/^(\d+)([A-Za-z]?)$/);
                                          if (!match) return 0;
                                          const numero = parseInt(match[1], 10);
                                          const letra = match[2]?.toUpperCase() || 'A';
                                          const valorLetra = letra.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
                                          return (numero * 100) + valorLetra;
                                        };

                                        const sortedProcedures = [...secondaryProcedures].sort(
                                          (a, b) => parsePorteValue(b.procedure.porte) - parsePorteValue(a.procedure.porte)
                                        );

                                        if (sortedProcedures.length === 1) {
                                          // Se há apenas 1 procedimento, ele é o principal
                                          const mainProc = sortedProcedures[0];
                                          return (
                                            <p>
                                              {mainProc.quantity} x {mainProc.procedure.code} - {mainProc.procedure.name} (Procedimento Principal)
                                            </p>
                                          );
                                        } else if (sortedProcedures.length > 1) {
                                          // Se há mais de 1, o de maior porte é principal, os demais são secundários
                                          const mainProc = sortedProcedures[0];
                                          const secondaryProcs = sortedProcedures.slice(1);
                                          return (
                                            <>
                                              <p>
                                                {mainProc.quantity} x {mainProc.procedure.code} - {mainProc.procedure.name} (Procedimento Principal)
                                              </p>
                                              {secondaryProcs.map((proc, index) => (
                                                <p key={index}>
                                                  {proc.quantity} x {proc.procedure.code} - {proc.procedure.name}
                                                </p>
                                              ))}
                                            </>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>
                                  </div>
                                )}

                                {/* Informações do procedimento */}
                                <div className="flex text-xs">
                                  <div className="w-1/2">
                                    <p className="font-bold text-gray-700">Caráter do Procedimento:</p>
                                    <p className="text-gray-900 pl-4">
                                      {procedureType === 'eletiva' ? 'Eletivo' : 
                                       procedureType === 'urgencia' ? 'Urgência' : 
                                       procedureType === 'emergencia' ? 'Emergência' : 'Não especificado'}
                                    </p>
                                  </div>
                                  <div className="w-1/2">
                                    <p className="font-bold text-gray-700">Lateralidade do Procedimento:</p>
                                    <p className="text-gray-900 pl-4">
                                      {procedureLaterality === 'direito' ? 'Direito' :
                                       procedureLaterality === 'esquerdo' ? 'Esquerdo' :
                                       procedureLaterality === 'bilateral' ? 'Bilateral' : 'Não especificado'}
                                    </p>
                                  </div>
                                </div>

                                {/* Materiais OPME */}
                                {selectedOpmeItems && selectedOpmeItems.length > 0 && (
                                  <div>
                                    <p className="font-bold text-xs text-gray-700">Lista de Materiais Necessários:</p>
                                    <div className="flex flex-col text-xs text-gray-900 pl-4 gap-0.5">
                                      {selectedOpmeItems.map((item, index) => (
                                        <p key={index}>
                                          {item.quantity} x {item.technicalName || item.item?.technicalName || 'Material não especificado'}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Fornecedores */}
                                <SupplierDisplay 
                                  supplierIds={[
                                    suppliers.supplier1,
                                    suppliers.supplier2,
                                    suppliers.supplier3
                                  ].filter(Boolean) as number[]}
                                />

                                {/* Data e assinatura - posição fixa */}
                                <div className="absolute text-right" style={{ top: '730px', right: '50px' }}>
                                  <p className="text-xs text-gray-900">
                                    {selectedHospital?.name?.includes('Niterói') ? 'Niterói' : 'Rio de Janeiro'}, {new Date().toLocaleDateString('pt-BR')}
                                  </p>
                                </div>

                                {/* Assinatura do médico - posição fixa */}
                                <div className="absolute flex justify-center" style={{ top: '780px', left: '50%', transform: 'translateX(-50%)' }}>
                                  {user?.signatureUrl ? (
                                    <img 
                                      src={user.signatureUrl} 
                                      alt="Assinatura do Médico" 
                                      className="h-36 object-contain"
                                      onError={(e) => {
                                        // Fallback para área vazia se a imagem falhar ao carregar
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="h-36 w-48 border border-gray-300 flex items-center justify-center bg-gray-50">
                                      <span className="text-xs text-gray-500">Assinatura não cadastrada</span>
                                    </div>
                                  )}
                                </div>

                                {/* Dados do médico - posição fixa */}
                                {user && (
                                  <div className="absolute flex flex-col items-center" style={{ top: '900px', left: '50%', transform: 'translateX(-50%)' }}>
                                    <div className="border-t border-gray-400 w-48 mb-1"></div>
                                    <p className="text-xs font-bold text-gray-900">{user.name?.toUpperCase()}</p>
                                    <div className="text-xs text-gray-900 text-center">
                                      {user.signatureNote ? (
                                        user.signatureNote.split('\n').map((line, index) => (
                                          <p key={index}>{line}</p>
                                        ))
                                      ) : (
                                        <p>ORTOPEDIA E TRAUMATOLOGIA</p>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-900">CRM {user.crm}</p>
                                  </div>
                                )}

                                {/* Rodapé */}
                                <div className="absolute bottom-0 left-0 right-0 pt-1 border-t border-gray-300 flex flex-row items-center justify-center">
                                  <img 
                                    src={MedSyncLogo} 
                                    alt="Logo MedSync" 
                                    className="h-5 mr-2"
                                  />
                                  <p className="text-xs text-gray-500">Documento gerado por MedSync v2.5.3</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="p-6">
                <div className="text-center mt-4 mb-8">
                  <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white">
                    Pedido Criado com Sucesso!
                  </h3>
                  <p className="text-blue-200 mt-2">
                    Seu pedido cirúrgico foi criado e está pronto para ser enviado.
                  </p>
                </div>

                <div className="flex justify-center gap-4 mt-6">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={downloadExistingPDF}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      toast({
                        title: "Funcionalidade em desenvolvimento",
                        description: "Envio por email será implementado em breve",
                        duration: 3000,
                      });
                    }}
                  >
                    📧 Enviar por Email
                  </Button>
                  <Button
                    className="bg-gray-500 cursor-not-allowed"
                    disabled
                  >
                    💬 Enviar pelo WhatsApp
                  </Button>
                </div>
              </div>
            )}

            {/* Botões de navegação */}
            {currentStep < 5 && (
              <div className="px-6 py-4 border-t border-blue-800 grid grid-cols-3 items-center">
                {/* Área esquerda - Botão Voltar */}
                <div className="flex items-center">
                  {currentStep > 1 && (
                    <Button
                      variant="outline"
                      onClick={goToPreviousStep}
                      className="border-blue-600 text-white hover:bg-blue-900 h-10"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar
                    </Button>
                  )}
                </div>

                {/* Área central - Botão Salvar e Sair ou Gerar PDF */}
                <div className="flex items-center justify-center">
                  {currentStep === 4 ? (
                    <Button
                      variant="outline"
                      onClick={generatePDF}
                      className="border-blue-600 text-white hover:bg-blue-900 h-10"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Baixar PDF
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={saveAndExit}
                      className="border-blue-600 text-white hover:bg-blue-900 h-10"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Salvar e Sair
                    </Button>
                  )}
                </div>

                {/* Área direita - Botão Próximo/Finalizar */}
                <div className="flex items-center justify-end">
                  <Button
                    onClick={goToNextStep}
                    className="bg-blue-600 hover:bg-blue-700 h-10"
                    disabled={
                      (currentStep === 1 &&
                        (!selectedPatient || !selectedHospital)) ||
                      (currentStep === 2 && !clinicalIndication) // Apenas indicação clínica é obrigatória no passo 2
                      // (currentStep === 3 && !selectedProcedure) // COMENTADO TEMPORARIAMENTE PARA TESTE
                    }
                  >
                    {currentStep < 4 ? (
                      <>
                        Próximo
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Finalizar
                        <Check className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Diálogo de pedido existente */}
      <Dialog
        open={showExistingOrderDialog}
        onOpenChange={setShowExistingOrderDialog}
      >
        <DialogContent className="bg-[#1a2332] border-blue-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              Pedido em Andamento Encontrado
            </DialogTitle>
            <DialogDescription className="text-blue-200">
              Encontramos um pedido em preenchimento para{" "}
              <strong>{pendingPatient?.fullName}</strong>.
              <br />
              <br />O que você gostaria de fazer?
            </DialogDescription>
          </DialogHeader>

          <div className="text-sm text-blue-300 bg-blue-900/30 p-3 rounded border border-blue-700">
            <p>
              <strong>Pedido ID:</strong> {existingOrderData?.id}
            </p>
            <p>
              <strong>Status:</strong> Em preenchimento
            </p>
            {existingOrderData?.clinicalIndication && (
              <p>
                <strong>Indicação:</strong>{" "}
                {existingOrderData.clinicalIndication.substring(0, 50)}...
              </p>
            )}
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={handleStartNewOrder}
              className="border-blue-600 text-white hover:bg-blue-900"
            >
              Iniciar Novo Pedido
            </Button>
            <Button
              onClick={handleContinueExistingOrder}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Continuar Pedido Existente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
