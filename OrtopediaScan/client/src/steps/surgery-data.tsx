import * as React from "react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  FileText,
  Loader2,
  Package,
  AlertTriangle,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  PROCEDURE_TYPE_VALUES,
  PROCEDURE_TYPES,
  API_ENDPOINTS,
} from "@shared/constants";
import { apiRequest } from "@/lib/queryClient";

interface CidCode {
  id: number;
  code: string;
  description: string;
  category: string;
}

interface Procedure {
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

// Categorias de CID-10 em ortopedia
const CATEGORIES = [
  "Joelho",
  "Coluna",
  "Ombro",
  "Quadril",
  "Pé e tornozelo",
  "Outros",
];

// Interface para itens OPME
interface OpmeItem {
  id: number;
  anvisaRegistrationNumber?: string;
  technicalName: string;
  commercialName: string;
  manufacturerName: string;
  riskClass?: string;
  registrationHolder?: string;
}

// Interface para materiais OPME selecionados
interface SelectedOpmeItem {
  item: OpmeItem;
  quantity: number;
}

interface SurgeryDataProps {
  // Estados para o CID principal (mantidos para compatibilidade)
  cidCode: string;
  setCidCode: (code: string) => void;
  cidDescription: string;
  setCidDescription: (description: string) => void;
  selectedCidId: number | null;
  setSelectedCidId: (id: number | null) => void;
  // cidLaterality removido conforme solicitado, mas mantemos na interface para compatibilidade
  cidLaterality: string | null;
  setCidLaterality: (laterality: string | null) => void;
  // Novos campos para suportar múltiplos CIDs
  multipleCids?: Array<{
    cid: {
      id: number;
      code: string;
      description: string;
      category?: string;
    };
  }>;
  setMultipleCids?: (
    cids: Array<{
      cid: {
        id: number;
        code: string;
        description: string;
        category?: string;
      };
    }>,
  ) => void;
  // Campo para lateralidade da cirurgia
  procedureLaterality: string | null;
  setProcedureLaterality: (laterality: string | null) => void;
  procedureType: string;
  setProcedureType: (type: string) => void;
  selectedProcedure: Procedure | null;
  setSelectedProcedure: (procedure: Procedure | null) => void;
  procedureQuantity: number;
  setProcedureQuantity: (quantity: number) => void;
  secondaryProcedures: Array<{
    procedure: Procedure;
    quantity: number;
  }>;
  setSecondaryProcedures: (
    procedures: Array<{
      procedure: Procedure;
      quantity: number;
    }>,
  ) => void;
  // Suporte para fornecedores OPME
  suppliers?: {
    supplier1: number | null;
    supplier2: number | null;
    supplier3: number | null;
  };
  setSuppliers?: (suppliers: {
    supplier1: number | null;
    supplier2: number | null;
    supplier3: number | null;
  }) => void;
  // Campo para sugestão de justificativa clínica
  clinicalJustification?: string;
  setClinicalJustification?: (justification: string) => void;
  // Props para itens OPME
  selectedOpmeItems?: Array<{ item: any; quantity: number }>;
  setSelectedOpmeItems?: (
    items: Array<{ item: any; quantity: number }>,
  ) => void;
}

export function SurgeryData({
  cidCode,
  setCidCode,
  cidDescription,
  setCidDescription,
  selectedCidId,
  setSelectedCidId,
  cidLaterality,
  setCidLaterality,
  multipleCids = [],
  setMultipleCids = () => {},
  procedureLaterality,
  setProcedureLaterality,
  procedureType,
  setProcedureType,
  selectedProcedure,
  setSelectedProcedure,
  procedureQuantity,
  setProcedureQuantity,
  secondaryProcedures,
  setSecondaryProcedures,
  suppliers = { supplier1: null, supplier2: null, supplier3: null },
  setSuppliers = () => {},
  // Campo para sugestão de justificativa clínica
  clinicalJustification = "",
  setClinicalJustification = () => {},
  // Props para itens OPME
  selectedOpmeItems = [],
  setSelectedOpmeItems = () => {},
}: SurgeryDataProps) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [procedureSearchOpen, setProcedureSearchOpen] = useState(false);
  const [procedureSearchTerm, setProcedureSearchTerm] = useState("");
  const [procedureResults, setProcedureResults] = useState<Procedure[]>([]);
  const [procedureLoading, setProcedureLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para a adição de múltiplos CIDs
  const [currentCid, setCurrentCid] = useState<CidCode | null>(null);

  // Estados para procedimentos secundários
  const [secondaryProcedureSearchOpen, setSecondaryProcedureSearchOpen] =
    useState(false);
  const [currentSecondaryProcedure, setCurrentSecondaryProcedure] =
    useState<Procedure | null>(null);
  const [currentSecondaryQuantity, setCurrentSecondaryQuantity] = useState(1);
  // Estado de lateralidade do procedimento secundário removido, conforme solicitado

  // Estado local para controlar a lateralidade da cirurgia
  const [cirurgiaLateralidade, setCirurgiaLateralidade] = useState<
    string | null
  >(procedureLaterality);

  // Efeito para sincronizar o estado local com o valor do componente pai
  useEffect(() => {
    setCirurgiaLateralidade(procedureLaterality);
  }, [procedureLaterality]);

  // Vamos mover esse efeito para depois das declarações de estados dos fornecedores

  // Estados para a nova implementação de materiais OPME
  const [opmeSearchOpen, setOpmeSearchOpen] = useState<boolean>(false);
  const [opmeSearchTerm, setOpmeSearchTerm] = useState<string>("");
  const [opmeResults, setOpmeResults] = useState<OpmeItem[]>([]);
  const [opmeLoading, setOpmeLoading] = useState<boolean>(false);
  const [opmeQuantity, setOpmeQuantity] = useState<number>(1);
  const [currentOpmeItem, setCurrentOpmeItem] = useState<OpmeItem | null>(null);
  const [opmeSelectedName, setOpmeSelectedName] = useState<string>("");
  // Usar o estado propagado do componente pai em vez do estado local
  const opmeItems = selectedOpmeItems;
  const setOpmeItems = setSelectedOpmeItems;

  // Estados para fornecedores
  interface Supplier {
    id: number;
    companyName: string;
    tradeName: string | null;
    cnpj: string;
    municipalityId: number;
    address: string | null;
    phone: string | null;
    email: string | null;
    active: boolean;
  }

  const [supplier1Open, setSupplier1Open] = useState<boolean>(false);
  const [supplier2Open, setSupplier2Open] = useState<boolean>(false);
  const [supplier3Open, setSupplier3Open] = useState<boolean>(false);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState<string>("");
  const [supplierResults, setSupplierResults] = useState<Supplier[]>([]);
  const [supplierLoading, setSupplierLoading] = useState<boolean>(false);
  const [selectedSupplier1, setSelectedSupplier1] = useState<Supplier | null>(
    null,
  );
  const [selectedSupplier2, setSelectedSupplier2] = useState<Supplier | null>(
    null,
  );
  const [selectedSupplier3, setSelectedSupplier3] = useState<Supplier | null>(
    null,
  );

  // Atualizar o componente pai quando um fornecedor é selecionado
  useEffect(() => {
    setSuppliers({
      supplier1: selectedSupplier1 ? selectedSupplier1.id : null,
      supplier2: selectedSupplier2 ? selectedSupplier2.id : null,
      supplier3: selectedSupplier3 ? selectedSupplier3.id : null,
    });
  }, [selectedSupplier1, selectedSupplier2, selectedSupplier3, setSuppliers]);

  // Sincronizar com fornecedores vindos do componente pai (quando carrega pedido existente)
  useEffect(() => {
    const loadSuppliersFromParent = async () => {
      if (!suppliers) return;

      try {
        // Carregar fornecedor 1
        if (suppliers.supplier1 && !selectedSupplier1) {
          const response = await fetch(`/api/suppliers/search?id=${suppliers.supplier1}`);
          if (response.ok) {
            const suppliersData = await response.json();
            const supplier = suppliersData.find((s: any) => s.id === suppliers.supplier1);
            if (supplier) {
              setSelectedSupplier1(supplier);
              console.log("Fornecedor 1 carregado da base de dados:", supplier.companyName);
            }
          }
        }

        // Carregar fornecedor 2
        if (suppliers.supplier2 && !selectedSupplier2) {
          const response = await fetch(`/api/suppliers/search?id=${suppliers.supplier2}`);
          if (response.ok) {
            const suppliersData = await response.json();
            const supplier = suppliersData.find((s: any) => s.id === suppliers.supplier2);
            if (supplier) {
              setSelectedSupplier2(supplier);
              console.log("Fornecedor 2 carregado da base de dados:", supplier.companyName);
            }
          }
        }

        // Carregar fornecedor 3
        if (suppliers.supplier3 && !selectedSupplier3) {
          const response = await fetch(`/api/suppliers/search?id=${suppliers.supplier3}`);
          if (response.ok) {
            const suppliersData = await response.json();
            const supplier = suppliersData.find((s: any) => s.id === suppliers.supplier3);
            if (supplier) {
              setSelectedSupplier3(supplier);
              console.log("Fornecedor 3 carregado da base de dados:", supplier.companyName);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar fornecedores da base de dados:", error);
      }
    };

    loadSuppliersFromParent();
  }, [suppliers?.supplier1, suppliers?.supplier2, suppliers?.supplier3]);

  // Estado para armazenar os resultados da busca de CID-10
  const [cidCodes, setCidCodes] = useState<CidCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Função para formatar automaticamente o código CID-10
  const formatCidCode = (value: string): string => {
    // Remove todos os caracteres que não são letras ou números
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Se tem pelo menos 3 caracteres (1 letra + 2 números), adiciona o ponto
    if (cleaned.length >= 4) {
      // Formato: L12.3 (1 letra + 2 números + ponto + 1 número)
      return `${cleaned.substring(0, 3)}.${cleaned.substring(3, 4)}`;
    }
    
    return cleaned;
  };

  // Função para normalizar CID-10 para busca (garante que tenha ponto)
  const normalizeCidForSearch = (value: string): string => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Se tem exatamente 4 caracteres sem ponto, adiciona o ponto
    if (cleaned.length === 4 && /^[A-Z][0-9]{3}$/.test(cleaned)) {
      return `${cleaned.substring(0, 3)}.${cleaned.substring(3)}`;
    }
    
    // Se já tem o formato correto, retorna como está
    if (/^[A-Z][0-9]{2}\.[0-9]$/.test(value.toUpperCase())) {
      return value.toUpperCase();
    }
    
    return cleaned;
  };

  // Função para formatar automaticamente o código CBHPM
  const formatCbhpmCode = (value: string): string => {
    // Remove todos os caracteres que não são números
    const cleaned = value.replace(/[^0-9]/g, '');
    
    // Aplica formatação progressiva baseada no comprimento
    if (cleaned.length >= 9) {
      // Formato completo: X.XX.XX.XX-X
      return `${cleaned.substring(0, 1)}.${cleaned.substring(1, 3)}.${cleaned.substring(3, 5)}.${cleaned.substring(5, 7)}-${cleaned.substring(7, 8)}`;
    } else if (cleaned.length >= 7) {
      // Formato: X.XX.XX.XX
      return `${cleaned.substring(0, 1)}.${cleaned.substring(1, 3)}.${cleaned.substring(3, 5)}.${cleaned.substring(5)}`;
    } else if (cleaned.length >= 5) {
      // Formato: X.XX.XX
      return `${cleaned.substring(0, 1)}.${cleaned.substring(1, 3)}.${cleaned.substring(3)}`;
    } else if (cleaned.length >= 3) {
      // Formato: X.XX
      return `${cleaned.substring(0, 1)}.${cleaned.substring(1)}`;
    }
    
    return cleaned;
  };

  // Função para normalizar CBHPM para busca (garante formato correto)
  const normalizeCbhpmForSearch = (value: string): string => {
    const cleaned = value.replace(/[^0-9]/g, '');
    
    // Se tem exatamente 8 números, formata como CBHPM completo
    if (cleaned.length === 8) {
      return `${cleaned.substring(0, 1)}.${cleaned.substring(1, 3)}.${cleaned.substring(3, 5)}.${cleaned.substring(5, 7)}-${cleaned.substring(7, 8)}`;
    }
    
    // Se já tem o formato correto, retorna como está
    if (/^[0-9]\.[0-9]{2}\.[0-9]{2}\.[0-9]{2}-[0-9]$/.test(value)) {
      return value;
    }
    
    return value;
  };

  // Efeito para buscar códigos CID-10 quando o termo de busca mudar
  useEffect(() => {
    const fetchCidCodes = async () => {
      // Não fazer busca se o termo for muito curto
      if (searchTerm.length < 2) {
        setCidCodes([]);
        return;
      }

      try {
        setIsLoading(true);
        // Normalizar o termo de busca para garantir formato correto
        const normalizedTerm = normalizeCidForSearch(searchTerm);
        console.log(`Termo original: "${searchTerm}" -> Normalizado: "${normalizedTerm}"`);
        
        // Usar fetch diretamente como nos outros componentes
        const response = await fetch(
          `/api/cid-codes/search?q=${encodeURIComponent(normalizedTerm)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error(`Erro ao buscar códigos CID-10: ${response.status}`);
        }

        const data = await response.json();
        console.log(
          `Encontrados ${data.length} códigos CID-10 para a consulta "${searchTerm}":`,
          data,
        );
        setCidCodes(data);
      } catch (error) {
        console.error("Erro ao buscar códigos CID-10:", error);
        toast({
          title: "Erro na busca",
          description:
            "Não foi possível buscar códigos CID-10 da tabela cid_codes",
          variant: "destructive",
        });
        setCidCodes([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce para evitar muitas requisições
    const debounceTimer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        fetchCidCodes();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Efeito para buscar procedimentos quando o termo de busca mudar
  React.useEffect(() => {
    const fetchProcedures = async () => {
      if (procedureSearchTerm.length < 3) {
        setProcedureResults([]);
        return;
      }

      try {
        setProcedureLoading(true);
        // Normalizar o termo de busca para garantir formato correto CBHPM
        const normalizedTerm = normalizeCbhpmForSearch(procedureSearchTerm);
        console.log(`Termo CBHPM original: "${procedureSearchTerm}" -> Normalizado: "${normalizedTerm}"`);
        
        const response = await fetch(
          `/api/procedures/search?q=${encodeURIComponent(normalizedTerm)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error(`Erro ao buscar procedimentos: ${response.status}`);
        }

        const data = await response.json();
        console.log(
          `Encontrados ${data.length} procedimentos para a consulta "${procedureSearchTerm}"`,
        );
        setProcedureResults(data);
      } catch (error) {
        console.error("Erro ao buscar procedimentos:", error);
        toast({
          title: "Erro ao buscar procedimentos",
          description: "Tente novamente ou verifique sua conexão",
          variant: "destructive",
        });
        setProcedureResults([]);
      } finally {
        setProcedureLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchProcedures();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [procedureSearchTerm]);

  // Função para buscar materiais OPME
  const handleOpmeSearch = async () => {
    if (opmeSearchTerm.length < 3) {
      toast({
        title: "Termo muito curto",
        description:
          "Digite pelo menos 3 caracteres para buscar materiais OPME",
        variant: "destructive",
      });
      return;
    }

    try {
      setOpmeLoading(true);

      const response = await fetch(
        `/api/opme-items/search?q=${encodeURIComponent(opmeSearchTerm)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Erro ao buscar materiais OPME: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        `Encontrados ${data.length} materiais OPME para a consulta "${opmeSearchTerm}"`,
      );
      setOpmeResults(data);
    } catch (error) {
      console.error("Erro ao buscar materiais OPME:", error);
      toast({
        title: "Erro na busca",
        description: "Ocorreu um erro ao buscar materiais OPME",
        variant: "destructive",
      });
      setOpmeResults([]);
    } finally {
      setOpmeLoading(false);
    }
  };

  // Função para selecionar um material OPME e adicionar automaticamente
  const handleSelectOpmeItem = (item: OpmeItem) => {
    // Verificar se o material já existe na lista
    const exists = opmeItems?.some((opmeItem) => opmeItem.item.id === item.id);

    if (exists) {
      toast({
        title: "Material já adicionado",
        description: "Este material OPME já foi adicionado à lista.",
        variant: "destructive",
        duration: 3000,
      });
      setOpmeSearchOpen(false);
      return;
    }

    // Adicionar automaticamente à lista com a quantidade atual
    const newOpmeItem = {
      item: item,
      quantity: opmeQuantity,
    };

    const updatedItems = [...(opmeItems || []), newOpmeItem];
    if (setOpmeItems) {
      setOpmeItems(updatedItems);
    }

    // Limpar seleção e fechar popup
    setCurrentOpmeItem(null);
    setOpmeSelectedName("");
    setOpmeQuantity(1);
    setOpmeSearchTerm("");
    setOpmeSearchOpen(false);

    toast({
      title: "Material OPME adicionado",
      description: `${item.technicalName} adicionado com sucesso!`,
      duration: 2000,
    });
  };

  // Função para adicionar material OPME à lista
  const handleAddOpmeItem = () => {
    if (!currentOpmeItem) {
      toast({
        title: "Nenhum material selecionado",
        description: "Selecione um material OPME primeiro",
        variant: "destructive",
      });
      return;
    }

    // Verificar se o item já existe na lista
    const existingItemIndex = opmeItems.findIndex(
      (item) => item.item.id === currentOpmeItem.id,
    );

    if (existingItemIndex >= 0) {
      // Atualizar a quantidade do item existente
      const existingItem = opmeItems[existingItemIndex];
      const newQuantity = existingItem.quantity + opmeQuantity;

      const updatedItems = [...opmeItems];
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
      };

      setOpmeItems(updatedItems);

      toast({
        title: "Quantidade atualizada",
        description: `Quantidade de ${currentOpmeItem.technicalName} atualizada para ${newQuantity}`,
      });
    } else {
      // Adicionar novo item à lista
      setOpmeItems([
        ...opmeItems,
        {
          item: currentOpmeItem,
          quantity: opmeQuantity,
        },
      ]);

      toast({
        title: "Material adicionado",
        description: `${currentOpmeItem.technicalName} adicionado à lista de materiais`,
      });
    }

    // Limpar o campo de busca e o item selecionado
    setOpmeSearchTerm("");
    setOpmeSelectedName("");
    setCurrentOpmeItem(null);
    setOpmeQuantity(1);
  };

  // Função para remover um material OPME da lista
  const handleRemoveOpmeItem = (index: number) => {
    const newItems = [...opmeItems];
    const removedItem = newItems[index];
    newItems.splice(index, 1);

    setOpmeItems(newItems);

    toast({
      title: "Material removido",
      description: `${removedItem.item.technicalName} removido da lista`,
    });
  };

  // Função para atualizar a quantidade de um material OPME específico
  const handleUpdateOpmeQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return; // Não permitir quantidades menores que 1
    
    const updatedItems = [...opmeItems];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: newQuantity
    };
    setOpmeItems(updatedItems);
  };

  // Efeito para buscar materiais OPME quando o termo de busca mudar
  useEffect(() => {
    if (opmeSearchTerm.length >= 3) {
      const debounceTimer = setTimeout(() => {
        handleOpmeSearch();
      }, 500);

      return () => clearTimeout(debounceTimer);
    }
  }, [opmeSearchTerm]);

  // Função para buscar fornecedores
  const handleSupplierSearch = async () => {
    if (supplierSearchTerm.length < 3) {
      toast({
        title: "Termo muito curto",
        description: "Digite pelo menos 3 caracteres para buscar fornecedores",
        variant: "destructive",
      });
      return;
    }

    try {
      setSupplierLoading(true);

      // Usar a API real de fornecedores - corrigido parâmetro para "term" em vez de "search"
      const response = await fetch(
        `/api/suppliers/search?term=${encodeURIComponent(supplierSearchTerm)}`,
      );

      if (!response.ok) {
        throw new Error(`Erro ao buscar fornecedores: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        `Encontrados ${data.length} fornecedores para a consulta "${supplierSearchTerm}"`,
      );
      setSupplierResults(data);
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
      toast({
        title: "Erro na busca",
        description: "Ocorreu um erro ao buscar fornecedores",
        variant: "destructive",
      });

      // Em caso de falha na API, vamos fornecer alguns dados simulados para não bloquear a interface
      const fallbackSuppliers = [
        {
          id: 1,
          companyName: "MedicalSupply LTDA",
          tradeName: "MedSupply",
          cnpj: "12.345.678/0001-90",
          municipalityId: 1,
          phone: "(21) 3333-4444",
          email: "contato@medsupply.com",
          address: null,
          active: true,
        },
        {
          id: 2,
          companyName: "OrthoTech Brasil",
          tradeName: "OrthoTech",
          cnpj: "23.456.789/0001-01",
          municipalityId: 2,
          phone: "(21) 4444-5555",
          email: "vendas@orthotech.com.br",
          address: null,
          active: true,
        },
      ];

      const filteredFallback = fallbackSuppliers.filter(
        (supplier) =>
          supplier.companyName
            .toLowerCase()
            .includes(supplierSearchTerm.toLowerCase()) ||
          (supplier.tradeName &&
            supplier.tradeName
              .toLowerCase()
              .includes(supplierSearchTerm.toLowerCase())) ||
          supplier.cnpj.includes(supplierSearchTerm),
      );

      setSupplierResults(filteredFallback);

      toast({
        title: "Usando dados locais",
        description: "Conectando a dados locais para manter a funcionalidade",
        variant: "warning",
      });
    } finally {
      setSupplierLoading(false);
    }
  };

  // Função para selecionar fornecedor 1
  const handleSelectSupplier1 = (supplier: Supplier) => {
    setSelectedSupplier1(supplier);
    setSupplier1Open(false);

    // Se o mesmo fornecedor já estiver selecionado em outra posição, limpar essa posição
    if (selectedSupplier2?.id === supplier.id) {
      setSelectedSupplier2(null);
    }
    if (selectedSupplier3?.id === supplier.id) {
      setSelectedSupplier3(null);
    }
  };

  // Função para selecionar fornecedor 2
  const handleSelectSupplier2 = (supplier: Supplier) => {
    setSelectedSupplier2(supplier);
    setSupplier2Open(false);

    // Se o mesmo fornecedor já estiver selecionado em outra posição, limpar essa posição
    if (selectedSupplier1?.id === supplier.id) {
      setSelectedSupplier1(null);
    }
    if (selectedSupplier3?.id === supplier.id) {
      setSelectedSupplier3(null);
    }
  };

  // Função para selecionar fornecedor 3
  const handleSelectSupplier3 = (supplier: Supplier) => {
    setSelectedSupplier3(supplier);
    setSupplier3Open(false);

    // Se o mesmo fornecedor já estiver selecionado em outra posição, limpar essa posição
    if (selectedSupplier1?.id === supplier.id) {
      setSelectedSupplier1(null);
    }
    if (selectedSupplier2?.id === supplier.id) {
      setSelectedSupplier2(null);
    }
  };

  // Função para carregar todos os fornecedores ativos
  const loadAllSuppliers = async () => {
    try {
      setSupplierLoading(true);
      const response = await fetch("/api/suppliers/search?term=");

      if (!response.ok) {
        // Se falhar carregar todos os fornecedores, tentar buscar alguns com termo comum
        const fallbackResponse = await fetch("/api/suppliers/search?term=a");
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          setSupplierResults(data);
          return;
        }
        throw new Error(`Erro ao carregar fornecedores: ${response.status}`);
      }

      const data = await response.json();
      setSupplierResults(data);
    } catch (error) {
      console.error("Erro ao carregar lista de fornecedores:", error);
      // Usar dados locais de fallback
      const fallbackSuppliers = [
        {
          id: 1,
          company_name: "MedicalSupply LTDA",
          trade_name: "MedSupply",
          cnpj: "12.345.678/0001-90",
          municipality_id: 1,
          phone: "(21) 3333-4444",
          email: "contato@medsupply.com",
          active: true,
        },
        {
          id: 2,
          company_name: "OrthoTech Brasil",
          trade_name: "OrthoTech",
          cnpj: "23.456.789/0001-01",
          municipality_id: 2,
          phone: "(21) 4444-5555",
          email: "vendas@orthotech.com.br",
          active: true,
        },
      ];
      setSupplierResults(fallbackSuppliers);

      toast({
        title: "Usando dados locais",
        description:
          "Exibindo dados locais enquanto a conexão é reestabelecida",
        variant: "default",
      });
    } finally {
      setSupplierLoading(false);
    }
  };

  // Efeito para buscar fornecedores quando o termo de busca mudar
  useEffect(() => {
    if (supplierSearchTerm.length >= 3) {
      const debounceTimer = setTimeout(() => {
        handleSupplierSearch();
      }, 500);

      return () => clearTimeout(debounceTimer);
    }
  }, [supplierSearchTerm]);

  // Agrupar códigos CID por categoria
  const cidCodesByCategory = React.useMemo<Record<string, CidCode[]>>(() => {
    if (!cidCodes || !Array.isArray(cidCodes)) return {};

    const result: Record<string, CidCode[]> = {};

    for (const cid of cidCodes) {
      if (!result[cid.category]) {
        result[cid.category] = [];
      }
      result[cid.category].push(cid);
    }

    return result;
  }, [cidCodes]);

  // Não precisamos mais do filtro local, pois a busca já é feita diretamente no banco de dados
  // através do endpoint /api/cid-codes/search

  // Função para buscar procedimentos CBHPM associados a um CID
  const fetchAssociatedProcedures = async (cidId: number) => {
    try {
      console.log(`Buscando associações para CID ID: ${cidId}`);
      const response = await fetch(`/api/cid-cbhpm-associations?cidCodeId=${cidId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        console.warn(`Erro ao buscar associações para CID ${cidId}: ${response.status}`);
        return [];
      }

      const associations = await response.json();
      console.log(`Encontradas ${associations.length} associações para CID ${cidId}:`, associations);
      
      // A API já retorna os procedimentos completos dentro das associações
      const procedures = associations
        .map((association: any) => association.procedure)
        .filter((procedure: any) => procedure !== null && procedure !== undefined);
      
      console.log(`Procedimentos associados extraídos:`, procedures);
      return procedures;
    } catch (error) {
      console.warn("Erro ao buscar procedimentos associados:", error);
      return [];
    }
  };

  // Função para selecionar um CID e adicioná-lo automaticamente à lista
  const selectCid = async (cidCodeItem: CidCode) => {
    // Verificar se o CID já existe na lista
    const exists = multipleCids.some((item) => item.cid.id === cidCodeItem.id);

    if (exists) {
      console.log("CID já adicionado, mas vamos buscar procedimentos associados:", cidCodeItem.code);
      // Não retornar aqui - vamos buscar os procedimentos mesmo se o CID já existe
    } else {
      // Adicionar automaticamente à lista de múltiplos CIDs apenas se não existir
      const newCidItem = {
        cid: {
          id: cidCodeItem.id,
          code: cidCodeItem.code,
          description: cidCodeItem.description,
          category: cidCodeItem.category,
        },
      };

      const updatedCids = [...multipleCids, newCidItem];
      setMultipleCids(updatedCids);

      // Manter compatibilidade com CID único (usar o primeiro da lista)
      if (updatedCids.length === 1) {
        setCidCode(cidCodeItem.code);
        setCidDescription(cidCodeItem.description);
        setSelectedCidId(cidCodeItem.id);
      }
    }

    // Buscar procedimentos CBHPM associados e adicioná-los automaticamente
    try {
      const associatedProcedures = await fetchAssociatedProcedures(cidCodeItem.id);
      console.log(`Frontend - Procedimentos associados recebidos:`, associatedProcedures);
      
      if (associatedProcedures.length > 0) {
        // Adicionar procedimentos que não existem na lista atual
        const newProcedures: Array<{ procedure: Procedure; quantity: number }> = [];
        let isFirstProcedure = true;
        
        associatedProcedures.forEach((procedure: Procedure) => {
          console.log(`Frontend - Processando procedimento:`, procedure);
          // Verificar se o procedimento já existe na lista principal ou secundária
          const existsInMain = selectedProcedure?.id === procedure.id;
          const existsInSecondary = secondaryProcedures.some(
            sp => sp.procedure.id === procedure.id
          );
          
          console.log(`Frontend - Verificações para ${procedure.name}:`, {
            existsInMain,
            existsInSecondary,
            selectedProcedureId: selectedProcedure?.id,
            secondaryProceduresCount: secondaryProcedures.length,
            isFirstProcedure
          });
          
          if (!existsInMain && !existsInSecondary) {
            // Se não há procedimento principal selecionado, definir o primeiro como principal
            if (!selectedProcedure && isFirstProcedure) {
              console.log(`Frontend - Definindo como procedimento principal:`, procedure);
              setSelectedProcedure(procedure);
              setProcedureQuantity(1);
              isFirstProcedure = false;
            } else {
              // Adicionar aos procedimentos secundários
              console.log(`Frontend - Adicionando como procedimento secundário:`, procedure);
              newProcedures.push({
                procedure,
                quantity: 1
              });
            }
          } else {
            console.log(`Frontend - Procedimento já existe, pulando:`, procedure.name);
          }
        });
        
        console.log(`Frontend - Novos procedimentos a serem adicionados:`, newProcedures);
        
        // Adicionar novos procedimentos secundários à lista existente
        if (newProcedures.length > 0) {
          const updatedSecondaryProcedures = [...secondaryProcedures, ...newProcedures];
          console.log(`Frontend - Atualizando procedimentos secundários:`, updatedSecondaryProcedures);
          setSecondaryProcedures(updatedSecondaryProcedures);
        }

        toast({
          title: "CID-10 e procedimentos adicionados",
          description: `${cidCodeItem.code} adicionado com ${associatedProcedures.length} procedimento(s) CBHPM associado(s)!`,
          duration: 3000,
        });
        console.log(`CID-10 e procedimentos adicionados: ${cidCodeItem.code} com ${associatedProcedures.length} procedimento(s)`);
      } else {
        toast({
          title: "CID-10 adicionado",
          description: `${cidCodeItem.code} adicionado com sucesso!`,
          duration: 2000,
        });
        console.log(`CID-10 adicionado: ${cidCodeItem.code}`);
      }
    } catch (error) {
      console.warn("Erro ao buscar procedimentos associados:", error);
      toast({
        title: "CID-10 adicionado",
        description: `${cidCodeItem.code} adicionado, mas não foi possível carregar procedimentos associados.`,
        duration: 2000,
      });
      console.log(`CID-10 adicionado com erro: ${cidCodeItem.code}`);
    }

    // Limpar seleção atual e campo de busca para permitir nova seleção
    setCurrentCid(null);
    setSearchTerm("");
    setOpen(false);
  };

  // Função para adicionar o CID atual à lista de múltiplos CIDs
  const handleAddCid = () => {
    if (currentCid) {
      // Verificar se o CID já existe na lista
      const exists = multipleCids.some((item) => item.cid.id === currentCid.id);

      if (exists) {
        toast({
          title: "CID já adicionado",
          description: "Este código CID-10 já foi adicionado à lista.",
          variant: "destructive",
        });
        return;
      }

      // Adicionar o CID à lista
      setMultipleCids([
        ...multipleCids,
        {
          cid: currentCid,
        },
      ]);

      // Feedback para o usuário
      toast({
        title: "CID adicionado",
        description: `${currentCid.code} - ${currentCid.description} adicionado à lista.`,
      });
    }
  };

  // Função para remover um CID da lista
  const handleRemoveCid = async (index: number) => {
    const newCids = [...multipleCids];
    const removedCid = newCids[index];
    newCids.splice(index, 1);
    setMultipleCids(newCids);

    // Buscar procedimentos associados ao CID removido para removê-los também
    try {
      const associatedProcedures = await fetchAssociatedProcedures(removedCid.cid.id);
      
      if (associatedProcedures.length > 0) {
        // Remover procedimentos associados da lista principal e secundária
        let removedMainProcedure = false;
        let removedSecondaryCount = 0;
        
        // Verificar se o procedimento principal está associado ao CID removido
        if (selectedProcedure && associatedProcedures.some(proc => proc.id === selectedProcedure.id)) {
          setSelectedProcedure(null);
          setProcedureQuantity(1);
          removedMainProcedure = true;
        }
        
        // Remover procedimentos secundários associados
        const filteredSecondaryProcedures = secondaryProcedures.filter(sp => {
          const shouldKeep = !associatedProcedures.some(proc => proc.id === sp.procedure.id);
          if (!shouldKeep) removedSecondaryCount++;
          return shouldKeep;
        });
        
        setSecondaryProcedures(filteredSecondaryProcedures);
        
        // Feedback detalhado para o usuário
        const proceduresRemovedMessage = [];
        if (removedMainProcedure) proceduresRemovedMessage.push("1 procedimento principal");
        if (removedSecondaryCount > 0) proceduresRemovedMessage.push(`${removedSecondaryCount} procedimento(s) secundário(s)`);
        
        if (proceduresRemovedMessage.length > 0) {
          toast({
            title: "CID e procedimentos removidos",
            description: `${removedCid.cid.code} removido junto com ${proceduresRemovedMessage.join(" e ")}.`,
            duration: 3000,
          });
        } else {
          toast({
            title: "CID removido",
            description: `${removedCid.cid.code} - ${removedCid.cid.description} removido da lista.`,
          });
        }
      } else {
        toast({
          title: "CID removido",
          description: `${removedCid.cid.code} - ${removedCid.cid.description} removido da lista.`,
        });
      }
    } catch (error) {
      console.warn("Erro ao buscar procedimentos para remoção:", error);
      toast({
        title: "CID removido",
        description: `${removedCid.cid.code} - ${removedCid.cid.description} removido da lista.`,
      });
    }

    // Atualizar compatibilidade com CID único se a lista ficar vazia
    if (newCids.length === 0) {
      setCidCode("");
      setCidDescription("");
      setSelectedCidId(null);
    } else {
      // Manter compatibilidade com CID único (usar o primeiro da lista)
      const firstCid = newCids[0];
      setCidCode(firstCid.cid.code);
      setCidDescription(firstCid.cid.description);
      setSelectedCidId(firstCid.cid.id);
    }
  };

  // Handlers para procedimentos secundários
  const handleAddSecondaryProcedure = () => {
    if (currentSecondaryProcedure) {
      // Verificar se o procedimento já existe na lista
      const exists = secondaryProcedures.some(
        (item) => item.procedure.id === currentSecondaryProcedure.id,
      );

      if (exists) {
        toast({
          title: "Procedimento já adicionado",
          description: "Este procedimento secundário já foi adicionado.",
          variant: "destructive",
        });
        return;
      }

      // Adicionar o procedimento à lista (sem lateralidade conforme solicitado)
      setSecondaryProcedures([
        ...secondaryProcedures,
        {
          procedure: currentSecondaryProcedure,
          quantity: currentSecondaryQuantity,
        },
      ]);

      // Resetar os campos (lateralidade removida)
      setCurrentSecondaryProcedure(null);
      setCurrentSecondaryQuantity(1);
    }
  };

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
    // Isso garante que 11D > 10C > 10B > 9A
    return (numero * 100) + valorLetra;
  };

  const handleRemoveSecondaryProcedure = (index: number) => {
    const newProcedures = [...secondaryProcedures];
    newProcedures.splice(index, 1);
    setSecondaryProcedures(newProcedures);
  };

  // Função para atualizar a quantidade de um procedimento específico
  const handleUpdateProcedureQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return; // Não permitir quantidades menores que 1
    
    const updatedProcedures = [...secondaryProcedures];
    updatedProcedures[index] = {
      ...updatedProcedures[index],
      quantity: newQuantity
    };
    setSecondaryProcedures(updatedProcedures);
  };

  return (
    <Card className="mb-6 bg-[#1a2332] border-blue-800 text-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl font-bold flex items-center text-white">
          <FileText className="mr-2 h-6 w-6 text-blue-400" />
          Dados para Cirurgia
        </CardTitle>
        <CardDescription className="text-blue-300 text-base">
          Informe os dados necessários para a programação cirúrgica
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Seção para Códigos CID-10 */}
          <div className="border rounded-md p-4 bg-blue-900/20 mt-6">
            <h4 className="text-lg font-medium mb-3 text-white flex items-center">
              <FileText className="mr-2 h-5 w-5 text-blue-400" />
              Selecionar Códigos CID-10{" "}
              <span className="text-red-400 ml-1">*</span>
            </h4>
            <div className="space-y-4">
              <div className="w-full">
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between bg-[#1a2332] text-white border-blue-800 hover:bg-blue-900"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Carregando códigos CID-10...
                        </span>
                      ) : (
                        "Pesquise e selecione códigos CID-10"
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                    <PopoverContent
                      className="w-[400px] p-0 max-h-[400px] overflow-auto bg-[#1a2332] border-blue-800"
                      align="start"
                    >
                      <Command className="bg-[#1a2332]" shouldFilter={false}>
                        <CommandInput
                          placeholder="Pesquise por código ou descrição CID-10 na base de dados..."
                          value={searchTerm}
                          onValueChange={(value) => {
                            // Aplicar formatação automática se parecer ser um código CID-10
                            if (/^[A-Za-z][0-9]{3}$/.test(value.replace(/[^A-Za-z0-9]/g, ''))) {
                              const formatted = formatCidCode(value);
                              setSearchTerm(formatted);
                            } else {
                              setSearchTerm(value);
                            }
                          }}
                          className="bg-[#1a2332] text-white placeholder:text-blue-300"
                        />
                        <CommandList className="text-white bg-[#1a2332]">
                          {isLoading ? (
                            <div className="py-6 flex justify-center items-center text-blue-300">
                              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                              <span className="ml-2">
                                Consultando códigos CID-10 na tabela
                                cid_codes...
                              </span>
                            </div>
                          ) : (
                            <>
                              {cidCodes.length === 0 &&
                              searchTerm.length >= 2 ? (
                                <CommandEmpty className="text-blue-300">
                                  Nenhum CID-10 encontrado para "{searchTerm}".
                                </CommandEmpty>
                              ) : null}
                              {searchTerm && cidCodes.length > 0 ? (
                                <CommandGroup className="text-blue-200">
                                  {cidCodes.map((cid: CidCode) => (
                                    <CommandItem
                                      key={cid.code}
                                      value={`${cid.code} ${cid.description}`}
                                      onSelect={() => selectCid(cid)}
                                      className="cursor-pointer hover:bg-blue-900/50"
                                    >
                                      <strong className="text-blue-400">
                                        {cid.code}
                                      </strong>
                                      <span className="ml-2 text-white">
                                        {cid.description}
                                      </span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              ) : (
                                <>
                                  {CATEGORIES.map((category) => {
                                    const categoryCids =
                                      cidCodesByCategory[category] || [];

                                    if (categoryCids.length === 0) return null;

                                    return (
                                      <CommandGroup
                                        key={category}
                                        heading={category}
                                        className="text-blue-200"
                                      >
                                        {categoryCids.map((cid) => (
                                          <CommandItem
                                            key={cid.code}
                                            value={`${cid.code} ${cid.description}`}
                                            onSelect={() => selectCid(cid)}
                                            className="cursor-pointer hover:bg-blue-900/50"
                                          >
                                            <strong className="text-blue-400">
                                              {cid.code}
                                            </strong>
                                            <span className="ml-2 text-white">
                                              {cid.description}
                                            </span>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    );
                                  })}
                                </>
                              )}
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
              </div>

              {/* Lista de CIDs selecionados */}
              <div className="mt-4">
                {multipleCids.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-blue-300">
                      Códigos CID-10 Selecionados:
                    </h4>
                    <div className="space-y-2">
                      {multipleCids.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center rounded-md border border-blue-700 bg-blue-900/20 p-3"
                        >
                          <div>
                            <div className="font-medium text-blue-200">
                              <span className="font-bold">{item.cid.code}</span>{" "}
                              - {item.cid.description}
                            </div>
                            {item.cid.category && (
                              <div className="text-xs text-blue-300 mt-1">
                                Categoria: {item.cid.category}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveCid(index)}
                          >
                            Remover
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <p className="text-xs text-blue-300 mt-2">
                Adicione os códigos CID-10 correspondentes às condições médicas do paciente
              </p>
              {searchTerm &&
              searchTerm.length >= 2 &&
              cidCodes.length === 0 &&
              !isLoading ? (
                <p className="text-xs text-orange-300 mt-1">
                  Nenhum código CID-10 encontrado para "{searchTerm}". Tente
                  outros termos como "ombro", "joelho", etc.
                </p>
              ) : null}
            </div>
          </div>

          {/* Campo de Lateralidade da Cirurgia */}
          <div className="border rounded-md p-4 bg-blue-900/20 mt-6">
            <h4 className="text-lg font-medium mb-3 text-white flex items-center">
              <FileText className="mr-2 h-5 w-5 text-blue-400" />
              Lateralidade da Cirurgia{" "}
              <span className="text-red-400 ml-1">*</span>
            </h4>
            
            {/* Botões de lateralidade alinhados horizontalmente */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCirurgiaLateralidade("bilateral");
                  setProcedureLaterality("bilateral");
                }}
                className={`
                  px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-2
                  ${cirurgiaLateralidade === "bilateral"
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30"
                    : "bg-blue-900/30 border-blue-700 text-blue-200 hover:bg-blue-800/50 hover:border-blue-600"
                  }
                `}
              >
                Bilateral
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setCirurgiaLateralidade("direito");
                  setProcedureLaterality("direito");
                }}
                className={`
                  px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-2
                  ${cirurgiaLateralidade === "direito"
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30"
                    : "bg-blue-900/30 border-blue-700 text-blue-200 hover:bg-blue-800/50 hover:border-blue-600"
                  }
                `}
              >
                Direito
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setCirurgiaLateralidade("esquerdo");
                  setProcedureLaterality("esquerdo");
                }}
                className={`
                  px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-2
                  ${cirurgiaLateralidade === "esquerdo"
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30"
                    : "bg-blue-900/30 border-blue-700 text-blue-200 hover:bg-blue-800/50 hover:border-blue-600"
                  }
                `}
              >
                Esquerdo
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setCirurgiaLateralidade("nao_se_aplica");
                  setProcedureLaterality("nao_se_aplica");
                }}
                className={`
                  px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-2
                  ${cirurgiaLateralidade === "nao_se_aplica"
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30"
                    : "bg-blue-900/30 border-blue-700 text-blue-200 hover:bg-blue-800/50 hover:border-blue-600"
                  }
                `}
              >
                Não se aplica
              </button>
            </div>
            
            <p className="text-xs text-blue-300 mt-2">
              Selecione a lateralidade correspondente ao procedimento cirúrgico
            </p>
          </div>

          {/* Campo de Caráter do Procedimento */}
          <div className="border rounded-md p-4 bg-blue-900/20 mt-6">
            <h4 className="text-lg font-medium mb-3 text-white flex items-center">
              <FileText className="mr-2 h-5 w-5 text-blue-400" />
              Caráter do Procedimento{" "}
              <span className="text-red-400 ml-1">*</span>
            </h4>
            
            {/* Botões de caráter alinhados horizontalmente */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProcedureType(PROCEDURE_TYPE_VALUES.ELETIVA)}
                className={`
                  px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-2
                  ${procedureType === PROCEDURE_TYPE_VALUES.ELETIVA
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30"
                    : "bg-blue-900/30 border-blue-700 text-blue-200 hover:bg-blue-800/50 hover:border-blue-600"
                  }
                `}
              >
                {PROCEDURE_TYPES.ELETIVA}
              </button>
              
              <button
                type="button"
                onClick={() => setProcedureType(PROCEDURE_TYPE_VALUES.URGENCIA)}
                className={`
                  px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-2
                  ${procedureType === PROCEDURE_TYPE_VALUES.URGENCIA
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30"
                    : "bg-blue-900/30 border-blue-700 text-blue-200 hover:bg-blue-800/50 hover:border-blue-600"
                  }
                `}
              >
                {PROCEDURE_TYPES.URGENCIA}
              </button>
            </div>
            
            <p className="text-xs text-blue-300 mt-2">
              Selecione o caráter do procedimento cirúrgico
            </p>
          </div>

          {/* Procedimentos Cirúrgicos Necessários */}
          <div className="border rounded-md p-4 bg-blue-900/20 mt-6">
              <h4 className="text-lg font-medium mb-3 text-white flex items-center">
                <FileText className="mr-2 h-5 w-5 text-blue-400" />
                Procedimentos Cirúrgicos Necessários
              </h4>

              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-end md:space-x-3 space-y-3 md:space-y-0">
                  <div className="flex-grow">
                    <Label
                      htmlFor="secondaryProcedure"
                      className="mb-2 block text-sm text-white"
                    >
                      Procedimento CBHPM
                    </Label>
                    <Popover
                      open={secondaryProcedureSearchOpen}
                      onOpenChange={setSecondaryProcedureSearchOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          id="secondaryProcedure"
                          variant="outline"
                          role="combobox"
                          aria-expanded={secondaryProcedureSearchOpen}
                          className="w-full justify-between"
                        >
                          "Pesquise e selecione procedimentos CBHPM"
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0 bg-[#1a2332] border-blue-800">
                        <Command className="bg-[#1a2332]" shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar procedimento por código ou descrição..."
                            value={procedureSearchTerm}
                            onValueChange={(value) => {
                              // Aplicar formatação automática se parecer ser um código CBHPM
                              const cleaned = value.replace(/[^0-9]/g, '');
                              // Se o valor digitado contém apenas números, aplicar formatação
                              if (cleaned.length >= 3 && value.replace(/[.\-]/g, '') === cleaned) {
                                const formatted = formatCbhpmCode(cleaned);
                                setProcedureSearchTerm(formatted);
                              } else {
                                setProcedureSearchTerm(value);
                              }
                            }}
                            className="bg-[#1a2332] text-white placeholder:text-blue-300"
                          />
                          <CommandList className="text-white bg-[#1a2332]">
                            <CommandEmpty>
                              {procedureSearchTerm.length < 3 ? (
                                <p className="py-3 px-4 text-sm text-center text-blue-300">
                                  Digite pelo menos 3 caracteres para buscar
                                </p>
                              ) : procedureLoading ? (
                                <div className="py-6 flex items-center justify-center">
                                  <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                                </div>
                              ) : (
                                <p className="py-3 px-4 text-sm text-center text-blue-300">
                                  Nenhum procedimento encontrado
                                </p>
                              )}
                            </CommandEmpty>

                            {procedureResults.length > 0 && (
                              <CommandGroup
                                heading="Resultados"
                                className="text-blue-200"
                              >
                                {procedureResults.map((procedure) => (
                                  <CommandItem
                                    key={procedure.id}
                                    value={procedure.code + procedure.name}
                                    onSelect={() => {
                                      // Verificar se o procedimento já existe na lista
                                      const exists = secondaryProcedures.some(
                                        (item) => item.procedure.id === procedure.id
                                      );

                                      if (exists) {
                                        toast({
                                          title: "Procedimento já adicionado",
                                          description: "Este procedimento já foi adicionado à lista.",
                                          variant: "destructive",
                                          duration: 3000,
                                        });
                                        setSecondaryProcedureSearchOpen(false);
                                        return;
                                      }

                                      // Adicionar automaticamente à lista com a quantidade atual
                                      const newProcedure = {
                                        procedure: procedure,
                                        quantity: currentSecondaryQuantity,
                                      };

                                      setSecondaryProcedures([...secondaryProcedures, newProcedure]);

                                      // Limpar seleção e fechar popup
                                      setCurrentSecondaryProcedure(null);
                                      setCurrentSecondaryQuantity(1);
                                      setSecondaryProcedureSearchOpen(false);

                                      toast({
                                        title: "Procedimento adicionado",
                                        description: `${procedure.code} adicionado com sucesso!`,
                                        duration: 2000,
                                      });
                                    }}
                                    className="py-2 hover:bg-blue-900/50"
                                  >
                                    <div className="flex flex-col w-full">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-blue-400">
                                          {procedure.code}
                                        </span>
                                        {procedure.porte && (
                                          <span className="text-xs px-2 py-1 bg-blue-900/50 rounded-full text-blue-300">
                                            Porte: {procedure.porte}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-sm mt-1 text-white">
                                        {procedure.name}
                                      </span>
                                      {procedure.description && (
                                        <span className="text-xs text-blue-300 mt-1 line-clamp-2">
                                          {procedure.description}
                                        </span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="w-24">
                    <Label
                      htmlFor="secondaryQuantity"
                      className="mb-2 block text-sm text-white"
                    >
                      Quantidade
                    </Label>
                    <Input
                      id="secondaryQuantity"
                      type="number"
                      min="1"
                      value={currentSecondaryQuantity}
                      onChange={(e) =>
                        setCurrentSecondaryQuantity(
                          parseInt(e.target.value) || 1,
                        )
                      }
                      className="w-full bg-[#1a2332] text-white border-blue-800"
                    />
                  </div>

                  {/* Componente de lateralidade removido conforme solicitado */}
                </div>
              </div>

              {/* Lista de procedimentos secundários adicionados */}
              <div className="mt-4">
                {secondaryProcedures.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-blue-300">
                      Procedimentos Cirúrgicos Adicionados (
                      {secondaryProcedures.length})
                    </h4>
                    <div className="space-y-2">
                      {secondaryProcedures
                        .sort((a, b) => parsePorteValue(b.procedure.porte) - parsePorteValue(a.procedure.porte))
                        .map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border border-blue-800 rounded-md bg-blue-900/30"
                        >
                          <div className="flex-grow">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-blue-400">
                                {item.procedure.code}
                              </span>
                              {item.procedure.porte && (
                                <span className="text-xs px-2 py-0.5 bg-blue-900/50 rounded-full text-blue-300">
                                  Porte: {item.procedure.porte}
                                </span>
                              )}
                            </div>
                            <div className="text-sm mt-1 text-white">
                              {item.procedure.name}
                            </div>
                            {item.procedure.description && (
                              <div className="text-xs text-blue-300 mt-1">
                                {item.procedure.description}
                              </div>
                            )}
                            <div className="text-xs text-blue-300 mt-1 flex flex-wrap gap-2">
                              {item.procedure.custoOperacional && (
                                <span>
                                  Custo Operacional:{" "}
                                  {item.procedure.custoOperacional}
                                </span>
                              )}
                              {item.procedure.porte && (
                                <span>Porte: {item.procedure.porte}</span>
                              )}
                              {item.procedure.porteAnestesista && (
                                <span>
                                  Porte Anestesista:{" "}
                                  {item.procedure.porteAnestesista}
                                </span>
                              )}
                              {item.procedure.numeroAuxiliares !== null &&
                                item.procedure.numeroAuxiliares !==
                                  undefined && (
                                  <span>
                                    Número de Auxiliares:{" "}
                                    {item.procedure.numeroAuxiliares}
                                  </span>
                                )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-1">
                                <span className="text-xs font-medium text-blue-300">
                                  Qtd:
                                </span>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const newQuantity = parseInt(e.target.value) || 1;
                                    handleUpdateProcedureQuantity(index, newQuantity);
                                  }}
                                  className="w-16 h-8 text-xs bg-[#1a2332] text-white border-blue-800"
                                />
                              </div>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleRemoveSecondaryProcedure(index)
                              }
                            >
                              Remover
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <p className="text-xs text-blue-300 mt-2">
                Adicione os procedimentos necessários para a cirurgia.
              </p>
            </div>

            {/* Seção para Lista de Materiais Necessários para a cirurgia OPME */}
            <div className="border rounded-md p-4 bg-blue-900/20 mt-6">
              <h4 className="text-lg font-medium mb-3 text-white flex items-center">
                <Package className="mr-2 h-5 w-5 text-blue-400" />
                Lista de Materiais Necessários para a cirurgia OPME
              </h4>
              <div className="space-y-4">
                {/* Formulário para busca de materiais OPME */}
                <div className="flex flex-col md:flex-row md:items-end md:space-x-3 space-y-3 md:space-y-0">
                  <div className="flex-grow">
                    <Label
                      htmlFor="opme-search"
                      className="mb-2 block text-sm text-white"
                    >
                      Material OPME
                    </Label>
                    <Popover
                      open={opmeSearchOpen}
                      onOpenChange={setOpmeSearchOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={opmeSearchOpen}
                          className="w-full justify-between bg-[#1a2332] text-white border-blue-800"
                        >
                          {opmeLoading ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Buscando materiais...
                            </span>
                          ) : (
                            "Pesquise e selecione materiais OPME"
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0 bg-[#1a2332] border-blue-800">
                        <Command className="bg-[#1a2332]" shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar nome técnico, comercial ou registro ANVISA..."
                            value={opmeSearchTerm}
                            onValueChange={setOpmeSearchTerm}
                            className="bg-[#1a2332] text-white placeholder:text-blue-300"
                          />
                          <CommandList className="text-white bg-[#1a2332]">
                            <CommandEmpty>
                              {opmeSearchTerm.length < 3 ? (
                                <p className="py-3 px-4 text-sm text-center text-blue-300">
                                  Digite pelo menos 3 caracteres para buscar
                                </p>
                              ) : opmeLoading ? (
                                <div className="py-6 flex items-center justify-center">
                                  <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                                </div>
                              ) : (
                                <p className="py-3 px-4 text-sm text-center text-blue-300">
                                  Nenhum material encontrado
                                </p>
                              )}
                            </CommandEmpty>
                            <CommandGroup className="text-blue-200">
                              {opmeResults.map((item) => (
                                <CommandItem
                                  key={item.id}
                                  value={`${item.technicalName} ${item.commercialName}`}
                                  className="cursor-pointer hover:bg-blue-900/50 flex justify-between"
                                  onSelect={() => handleSelectOpmeItem(item)}
                                >
                                  <div>
                                    <div className="font-medium">
                                      {item.technicalName}
                                    </div>
                                    <div className="text-xs flex flex-col text-blue-300">
                                      <span>
                                        Nome Com.: {item.commercialName}
                                      </span>
                                      {item.anvisaRegistrationNumber && (
                                        <span>
                                          Reg. ANVISA:{" "}
                                          {item.anvisaRegistrationNumber}
                                        </span>
                                      )}
                                      <span>
                                        Fabric.: {item.manufacturerName}
                                      </span>
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="w-24">
                    <Label
                      htmlFor="opmeQuantity"
                      className="mb-2 block text-sm text-white"
                    >
                      Quantidade
                    </Label>
                    <Input
                      id="opmeQuantity"
                      type="number"
                      min="1"
                      value={opmeQuantity}
                      onChange={(e) =>
                        setOpmeQuantity(parseInt(e.target.value) || 1)
                      }
                      className="w-full bg-[#1a2332] text-white border-blue-800"
                    />
                  </div>


                </div>

                {/* Lista de materiais OPME adicionados */}
                <div>
                  <h5 className="text-xs font-medium mb-2 text-blue-300">
                    Materiais selecionados{" "}
                    {opmeItems.length > 0 && `(${opmeItems.length})`}
                  </h5>
                  {opmeItems.length === 0 ? (
                    <div className="text-blue-300 italic text-sm mb-3">
                      Nenhum material OPME adicionado para este procedimento.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {opmeItems.map((opmeItem, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 border border-blue-800 rounded-md bg-blue-900/30"
                        >
                          <div className="flex-grow">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-white">
                                {opmeItem.item.technicalName}
                              </span>
                              {opmeItem.item.anvisaRegistrationNumber && (
                                <span className="ml-2 text-xs px-2 py-0.5 bg-blue-900/50 rounded-full text-blue-300">
                                  Reg: {opmeItem.item.anvisaRegistrationNumber}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-blue-300 mt-1">
                              <span>
                                Nome Comercial: {opmeItem.item.commercialName}
                              </span>
                            </div>
                            <div className="text-xs text-blue-300">
                              <span>
                                Fabricante: {opmeItem.item.manufacturerName}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1">
                              <span className="text-xs font-medium text-blue-300">
                                Qtd:
                              </span>
                              <Input
                                type="number"
                                min="1"
                                value={opmeItem.quantity}
                                onChange={(e) => {
                                  const newQuantity = parseInt(e.target.value) || 1;
                                  handleUpdateOpmeQuantity(index, newQuantity);
                                }}
                                className="w-16 h-8 text-xs bg-[#1a2332] text-white border-blue-800"
                              />
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveOpmeItem(index)}
                            >
                              Remover
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Seção para Seleção de Fornecedores */}
            <div className="border rounded-md p-4 bg-blue-900/20 mt-6">
              <h4 className="text-lg font-medium mb-3 text-white flex items-center">
                <FileText className="mr-2 h-5 w-5 text-blue-400" />
                Fornecedores de Materiais OPME
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Primeiro fornecedor */}
                <div className="space-y-2">
                  <Label className="text-sm text-white">
                    Fornecedor 1
                  </Label>
                  <Popover
                    open={supplier1Open}
                    onOpenChange={(open) => {
                      setSupplier1Open(open);
                      if (open) loadAllSuppliers();
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={supplier1Open}
                        className="w-full justify-between bg-[#1a2332] text-white border-blue-800"
                      >
                        {supplierLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Buscando fornecedores...
                          </span>
                        ) : selectedSupplier1 ? (
                          <span className="flex flex-col text-left truncate">
                            <span className="font-medium">
                              {selectedSupplier1.tradeName ||
                                selectedSupplier1.companyName}
                            </span>
                            <span className="text-xs text-blue-300">
                              CNPJ: {selectedSupplier1.cnpj}
                            </span>
                          </span>
                        ) : (
                          "Selecionar fornecedor"
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-[#1a2332] border-blue-800">
                      <Command className="bg-[#1a2332]">
                        <CommandInput
                          placeholder="Buscar nome da empresa ou CNPJ..."
                          value={supplierSearchTerm}
                          onValueChange={setSupplierSearchTerm}
                          className="bg-[#1a2332] text-white placeholder:text-blue-300"
                        />
                        <CommandList className="text-white bg-[#1a2332]">
                          <CommandEmpty>
                            {supplierSearchTerm.length < 3 ? (
                              <p className="py-3 px-4 text-sm text-center text-blue-300">
                                Digite pelo menos 3 caracteres para buscar
                              </p>
                            ) : supplierLoading ? (
                              <div className="py-6 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                              </div>
                            ) : (
                              <p className="py-3 px-4 text-sm text-center text-blue-300">
                                Nenhum fornecedor encontrado
                              </p>
                            )}
                          </CommandEmpty>
                          <CommandGroup className="text-blue-200">
                            {supplierSearchTerm.length >= 3 &&
                              !supplierLoading && (
                                <div className="p-2">
                                  <Button
                                    className="w-full justify-center bg-blue-700 hover:bg-blue-600"
                                    onClick={handleSupplierSearch}
                                  >
                                    <Search className="mr-2 h-4 w-4" />
                                    Buscar fornecedores
                                  </Button>
                                </div>
                              )}
                            {supplierResults.map((supplier) => (
                              <CommandItem
                                key={supplier.id}
                                value={`${supplier.tradeName} ${supplier.companyName} ${supplier.cnpj}`}
                                className="cursor-pointer hover:bg-blue-900/50 flex justify-between"
                                onSelect={() => handleSelectSupplier1(supplier)}
                              >
                                <div>
                                  <div className="font-medium">
                                    {supplier.tradeName || supplier.companyName}
                                  </div>
                                  {supplier.tradeName !==
                                    supplier.companyName && (
                                    <div className="text-xs text-blue-300">
                                      {supplier.companyName}
                                    </div>
                                  )}
                                  <div className="text-xs text-blue-300">
                                    CNPJ: {supplier.cnpj}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Segundo fornecedor */}
                <div className="space-y-2">
                  <Label className="text-sm text-white">
                    Fornecedor 2
                  </Label>
                  <Popover
                    open={supplier2Open}
                    onOpenChange={(open) => {
                      setSupplier2Open(open);
                      if (open) loadAllSuppliers();
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={supplier2Open}
                        className="w-full justify-between bg-[#1a2332] text-white border-blue-800"
                      >
                        {supplierLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Buscando fornecedores...
                          </span>
                        ) : selectedSupplier2 ? (
                          <span className="flex flex-col text-left truncate">
                            <span className="font-medium">
                              {selectedSupplier2.tradeName ||
                                selectedSupplier2.companyName}
                            </span>
                            <span className="text-xs text-blue-300">
                              CNPJ: {selectedSupplier2.cnpj}
                            </span>
                          </span>
                        ) : (
                          "Selecionar fornecedor"
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-[#1a2332] border-blue-800">
                      <Command className="bg-[#1a2332]">
                        <CommandInput
                          placeholder="Buscar nome da empresa ou CNPJ..."
                          value={supplierSearchTerm}
                          onValueChange={setSupplierSearchTerm}
                          className="bg-[#1a2332] text-white placeholder:text-blue-300"
                        />
                        <CommandList className="text-white bg-[#1a2332]">
                          <CommandEmpty>
                            {supplierSearchTerm.length < 3 ? (
                              <p className="py-3 px-4 text-sm text-center text-blue-300">
                                Digite pelo menos 3 caracteres para buscar
                              </p>
                            ) : supplierLoading ? (
                              <div className="py-6 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                              </div>
                            ) : (
                              <p className="py-3 px-4 text-sm text-center text-blue-300">
                                Nenhum fornecedor encontrado
                              </p>
                            )}
                          </CommandEmpty>
                          <CommandGroup className="text-blue-200">
                            {supplierSearchTerm.length >= 3 &&
                              !supplierLoading && (
                                <div className="p-2">
                                  <Button
                                    className="w-full justify-center bg-blue-700 hover:bg-blue-600"
                                    onClick={handleSupplierSearch}
                                  >
                                    <Search className="mr-2 h-4 w-4" />
                                    Buscar fornecedores
                                  </Button>
                                </div>
                              )}
                            {supplierResults.map((supplier) => (
                              <CommandItem
                                key={supplier.id}
                                value={`${supplier.tradeName} ${supplier.companyName} ${supplier.cnpj}`}
                                className="cursor-pointer hover:bg-blue-900/50 flex justify-between"
                                onSelect={() => handleSelectSupplier2(supplier)}
                              >
                                <div>
                                  <div className="font-medium">
                                    {supplier.tradeName || supplier.companyName}
                                  </div>
                                  {supplier.tradeName !==
                                    supplier.companyName && (
                                    <div className="text-xs text-blue-300">
                                      {supplier.companyName}
                                    </div>
                                  )}
                                  <div className="text-xs text-blue-300">
                                    CNPJ: {supplier.cnpj}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Terceiro fornecedor */}
                <div className="space-y-2">
                  <Label className="text-sm text-white">
                    Fornecedor 3
                  </Label>
                  <Popover
                    open={supplier3Open}
                    onOpenChange={(open) => {
                      setSupplier3Open(open);
                      if (open) loadAllSuppliers();
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={supplier3Open}
                        className="w-full justify-between bg-[#1a2332] text-white border-blue-800"
                      >
                        {supplierLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Buscando fornecedores...
                          </span>
                        ) : selectedSupplier3 ? (
                          <span className="flex flex-col text-left truncate">
                            <span className="font-medium">
                              {selectedSupplier3.tradeName ||
                                selectedSupplier3.companyName}
                            </span>
                            <span className="text-xs text-blue-300">
                              CNPJ: {selectedSupplier3.cnpj}
                            </span>
                          </span>
                        ) : (
                          "Selecionar fornecedor"
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-[#1a2332] border-blue-800">
                      <Command className="bg-[#1a2332]">
                        <CommandInput
                          placeholder="Buscar nome da empresa ou CNPJ..."
                          value={supplierSearchTerm}
                          onValueChange={setSupplierSearchTerm}
                          className="bg-[#1a2332] text-white placeholder:text-blue-300"
                        />
                        <CommandList className="text-white bg-[#1a2332]">
                          <CommandEmpty>
                            {supplierSearchTerm.length < 3 ? (
                              <p className="py-3 px-4 text-sm text-center text-blue-300">
                                Digite pelo menos 3 caracteres para buscar
                              </p>
                            ) : supplierLoading ? (
                              <div className="py-6 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                              </div>
                            ) : (
                              <p className="py-3 px-4 text-sm text-center text-blue-300">
                                Nenhum fornecedor encontrado
                              </p>
                            )}
                          </CommandEmpty>
                          <CommandGroup className="text-blue-200">
                            {supplierSearchTerm.length >= 3 &&
                              !supplierLoading && (
                                <div className="p-2">
                                  <Button
                                    className="w-full justify-center bg-blue-700 hover:bg-blue-600"
                                    onClick={handleSupplierSearch}
                                  >
                                    <Search className="mr-2 h-4 w-4" />
                                    Buscar fornecedores
                                  </Button>
                                </div>
                              )}
                            {supplierResults.map((supplier) => (
                              <CommandItem
                                key={supplier.id}
                                value={`${supplier.tradeName} ${supplier.companyName} ${supplier.cnpj}`}
                                className="cursor-pointer hover:bg-blue-900/50 flex justify-between"
                                onSelect={() => handleSelectSupplier3(supplier)}
                              >
                                <div>
                                  <div className="font-medium">
                                    {supplier.tradeName || supplier.companyName}
                                  </div>
                                  {supplier.tradeName !==
                                    supplier.companyName && (
                                    <div className="text-xs text-blue-300">
                                      {supplier.companyName}
                                    </div>
                                  )}
                                  <div className="text-xs text-blue-300">
                                    CNPJ: {supplier.cnpj}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Seção para Sugestão de Justificativa Clínica */}
            <div className="border rounded-md p-4 bg-blue-900/20 mt-6">
              <h4 className="text-lg font-medium mb-3 text-white flex items-center">
                <FileText className="mr-2 h-5 w-5 text-blue-400" />
                Sugestão de Justificativa Clínica <span className="text-red-500">*</span>
              </h4>
              <div className="space-y-2">
                <Label
                  htmlFor="clinical-justification"
                  className="text-sm text-white"
                >
                  Insira uma sugestão de justificativa clínica para o
                  procedimento
                </Label>
                <Textarea
                  id="clinical-justification"
                  placeholder="Digite a sugestão de justificativa clínica..."
                  value={clinicalJustification}
                  onChange={(e) => setClinicalJustification(e.target.value)}
                  className="min-h-48 bg-[#1a2332] text-white border-blue-800 resize-y"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
}
