import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileImage, FileText, Upload, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getFileUrl, deleteFile, uploadExamImage as uploadImage, uploadMedicalReport as uploadReport } from "@/lib/file-upload";
import { DragDropZone } from "@/components/ui/drag-drop-zone";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";

interface ExamInfoProps {
  additionalNotes: string;
  setAdditionalNotes: (notes: string) => void;
  medicalReport: File | null;
  setMedicalReport: (file: File | null) => void;
  clinicalIndication: string;
  setClinicalIndication: (text: string) => void;
  // Array unificado de imagens de exame (novo modelo)
  examImages: File[];
  setExamImages: (files: File[]) => void;
  // Adicionar URLs de arquivos do servidor
  imageUrls?: string[]; // Array unificado de URLs de imagens no banco de dados
  medicalReportUrl?: string | null;
  // Função para atualizar campos do pedido no banco de dados
  updateOrderField?: (fieldName: string, value: any) => Promise<boolean>;
  // ID do pedido atual
  orderId?: number | null;
}

export function ExamInfo({
  additionalNotes,
  setAdditionalNotes,
  medicalReport, 
  setMedicalReport,
  clinicalIndication,
  setClinicalIndication,
  examImages = [],
  setExamImages,
  imageUrls = [],
  medicalReportUrl = null,
  updateOrderField,
  orderId
}: ExamInfoProps) {
  const [processingImage, setProcessingImage] = useState(false);
  const [processingReport, setProcessingReport] = useState(false);
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);
  
  // Lista de todas as imagens com preview (tanto arquivos quanto URLs)
  const [imagePreviews, setImagePreviews] = useState<{file?: File, preview: string, url?: string}[]>([]);
  
  // Carregar previews de imagens do servidor (se houver)
  useEffect(() => {
    console.log("🖼️ ExamInfo: Atualizando previews com imageUrls:", imageUrls);
    
    if (imageUrls && imageUrls.length > 0) {
      // Converter URLs em objetos de preview
      const previews = imageUrls.map(url => ({
        preview: getFileUrl(url),
        url: url
      }));
      
      // Atualizar o estado com os previews das imagens do servidor
      setImagePreviews(previews);
      console.log(`✅ Carregados ${previews.length} previews de imagens do servidor`);
    } else {
      // Se não há URLs, limpar os previews apenas se não temos arquivos locais
      if (examImages.length === 0) {
        setImagePreviews([]);
        console.log("🧹 Previews limpos - nenhuma imagem encontrada");
      }
    }
  }, [imageUrls, examImages.length]);

  // Estado para armazenar informações do laudo do servidor
  const [reportFromUrl, setReportFromUrl] = useState<{name: string, url: string} | null>(null);
  
  // Estado para gerenciar a remoção de imagens específicas
  const [removalInProgress, setRemovalInProgress] = useState<boolean>(false);
  
  // Estados para visualização ampliada da imagem
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  
  // Processar informações do laudo do servidor
  useEffect(() => {
    if (medicalReportUrl) {
      // Extrair nome do arquivo da URL
      const parts = medicalReportUrl.split('/');
      const filename = parts[parts.length - 1];
      // Decodificar o nome do arquivo se necessário
      const decodedName = decodeURIComponent(filename);
      
      setReportFromUrl({
        name: decodedName,
        url: medicalReportUrl
      });
    }
  }, [medicalReportUrl]);

  // Função local para upload de imagem
  const uploadExamImage = async (file: File, patientId?: number, orderId?: number) => {
    console.log(`Enviando upload de imagem com patientId=${patientId}, orderId=${orderId}`);
    
    try {
      // Usando a função importada da biblioteca para garantir consistência
      const result = await uploadImage(file, patientId, orderId);
      console.log("Upload de imagem concluído com sucesso:", result);
      return result;
    } catch (error) {
      console.error("Erro no upload da imagem:", error);
      throw error;
    }
  };

  // Quando o usuário seleciona arquivos de imagem
  const handleExamImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      
      console.log(`Selecionadas ${newFiles.length} imagens:`, 
        newFiles.map(f => f.name).join(", "));
      
      // Adicionar todas as novas imagens com prévia
      const promises = newFiles.map(file => 
        new Promise<{file: File, preview: string}>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target) {
              resolve({
                file,
                preview: event.target.result as string
              });
            }
          };
          reader.readAsDataURL(file);
        })
      );
      
      setProcessingImage(true);
      
      // Criar previews das imagens
      const newImages = await Promise.all(promises);
      
      // Atualizar o estado com as novas imagens
      setImagePreviews([...imagePreviews, ...newImages]);
      
      // Atualizar o array de arquivos para o componente pai
      const allFileImages = [...examImages];
      newFiles.forEach(file => {
        // Verificar se o arquivo já existe no array para evitar duplicações
        const exists = allFileImages.some(
          existingFile => existingFile.name === file.name && existingFile.size === file.size
        );
        if (!exists) {
          allFileImages.push(file);
        }
      });
      
      setExamImages(allFileImages);
      
      // Iniciar o upload imediato das imagens
      if (orderId) {
        try {
          console.log(`Iniciando upload imediato de ${newFiles.length} imagens...`);
          
          // Obter URLs existentes
          const existingUrls = imageUrls || [];
          let newUploadedUrls = [...existingUrls];
          
          // Upload das imagens diretamente para o servidor
          for (const file of newFiles) {
            try {
              const formData = new FormData();
              formData.append('image', file);
              formData.append('patientId', orderId.toString()); // Usamos orderId como pacienteId temporariamente
              formData.append('orderId', orderId.toString());
              
              console.log(`Enviando imagem ${file.name} para o servidor...`);
              
              const response = await fetch('/api/uploads/exam-image', {
                method: 'POST',
                body: formData,
                credentials: 'include'
              });
              
              if (response.ok) {
                const result = await response.json();
                newUploadedUrls.push(result.url);
                console.log(`Imagem ${file.name} enviada com sucesso:`, result.url);
              } else {
                console.error(`Erro ao enviar imagem ${file.name}: Status ${response.status}`);
              }
            } catch (error) {
              console.error(`Erro ao processar upload da imagem ${file.name}:`, error);
            }
          }
          
          // Atualizar o banco de dados com as novas URLs
          if (updateOrderField && newUploadedUrls.length > existingUrls.length) {
            console.log("Atualizando banco de dados com novas URLs:", newUploadedUrls);
            const updated = await updateOrderField("exam_images_url", newUploadedUrls);
            if (updated) {
              console.log("URLs de imagens atualizadas no banco de dados:", newUploadedUrls);
            } else {
              console.error("Falha ao atualizar URLs de imagens no banco de dados");
            }
          }
        } catch (error) {
          console.error("Erro ao processar upload imediato:", error);
        }
      } else {
        console.log("Upload imediato não realizado pois não há ID do pedido disponível");
      }
      
      setProcessingImage(false);
      console.log(`Total de ${allFileImages.length} imagens após seleção`);
    }
  };

  // Quando o usuário seleciona um arquivo de laudo
  const handleMedicalReportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Resetar qualquer estado anterior
      if (medicalReportUrl) {
        setReportFromUrl(null);
      }
      
      setMedicalReport(file);
      setProcessingReport(true);
      
      console.log("Novo laudo selecionado:", file.name);
      
      // Fazer upload imediato do laudo se tivermos o ID do pedido
      if (orderId && updateOrderField) {
        try {
          console.log(`Iniciando upload imediato do laudo ${file.name}...`);
          
          // Preparar o FormData para upload
          const formData = new FormData();
          formData.append('report', file);
          formData.append('patientId', orderId.toString()); // Usamos orderId como patientId temporariamente
          formData.append('orderId', orderId.toString());
          
          console.log(`Enviando laudo ${file.name} para o servidor...`);
          
          // Fazer a requisição POST para o endpoint do servidor
          const response = await fetch('/api/uploads/medical-report', {
            method: 'POST',
            body: formData,
            credentials: 'include'
          });
          
          // Verificar se a resposta foi bem-sucedida
          if (response.ok) {
            const result = await response.json();
            console.log(`Laudo enviado com sucesso:`, result.url);
            
            // Atualizar o banco de dados com a nova URL
            const updated = await updateOrderField("medical_report_url", result.url);
            if (updated) {
              console.log("URL do laudo atualizada no banco de dados:", result.url);
            } else {
              console.error("Falha ao atualizar URL do laudo no banco de dados");
            }
          } else {
            console.error(`Erro ao enviar laudo ${file.name}: Status ${response.status}`);
          }
        } catch (error) {
          console.error("Erro ao processar upload imediato do laudo:", error);
        }
      } else {
        console.log("Upload imediato do laudo não realizado pois não há ID do pedido disponível");
      }
      
      setTimeout(() => {
        setProcessingReport(false);
      }, 500);
    }
  };

  // Função para adicionar imagens foi removida, usando apenas o upload de imagens principal

  // Referência para o input de imagem principal
  const examImageInputRef = useRef<HTMLInputElement>(null);
  
  // Remover todas as imagens
  const removeAllImages = async () => {
    // Limpar completamente o estado local relacionado às imagens
    setImagePreviews([]);
    setExamImages([]);
    
    // Resetar o valor do input para permitir a seleção do mesmo arquivo novamente
    if (examImageInputRef.current) {
      examImageInputRef.current.value = "";
    }
    
    // Verificar se há URLs de imagens para remover do servidor
    if (imageUrls && imageUrls.length > 0) {
      console.log("Removendo imagens do servidor:", imageUrls);
      
      try {
        // Remover cada uma das imagens do servidor
        for (const url of imageUrls) {
          // Chamar a API para excluir o arquivo do servidor
          const deleted = await deleteFile(url);
          
          if (deleted) {
            console.log(`Imagem ${url} excluída com sucesso do servidor`);
          } else {
            console.error(`Falha ao excluir imagem ${url} do servidor`);
          }
        }
        
        // Se temos uma função para atualizar o banco de dados, removemos a referência das imagens
        if (updateOrderField && orderId) {
          const updated = await updateOrderField("exam_images_url", []);
          if (updated) {
            console.log("Referências das imagens removidas do banco de dados");
          } else {
            console.error("Falha ao remover referências das imagens do banco de dados");
          }
        }
      } catch (error) {
        console.error("Erro ao excluir imagens do servidor:", error);
      }
    }
    
    // Garantir que o estado é completamente resetado para permitir nova seleção
    // Usar um timeout para garantir que o React tenha tempo de atualizar o DOM
    setTimeout(() => {
      if (examImageInputRef.current) {
        examImageInputRef.current.value = "";
      }
      
      // Avisar ao console que a limpeza foi concluída
      console.log("Campo de upload de imagem resetado e pronto para nova seleção");
    }, 200);
  };

  // Referência para o input de laudo médico
  const medicalReportInputRef = useRef<HTMLInputElement>(null);

  // Remover laudo
  const removeMedicalReport = async () => {
    // Limpar estados
    setMedicalReport(null);
    setReportFromUrl(null);
    setProcessingReport(false);
    
    // Resetar o valor do input para permitir a seleção do mesmo arquivo novamente
    if (medicalReportInputRef.current) {
      medicalReportInputRef.current.value = "";
    }
    
    if (medicalReportUrl) {
      console.log("Removendo laudo médico do servidor:", medicalReportUrl);
      
      try {
        // Chamar a API para excluir o arquivo do servidor
        const deleted = await deleteFile(medicalReportUrl);
        
        if (deleted) {
          console.log("Laudo excluído com sucesso do servidor");
          
          // Se temos uma função para atualizar o banco de dados, removemos a referência do arquivo
          if (updateOrderField && orderId) {
            const updated = await updateOrderField("medical_report_url", null);
            if (updated) {
              console.log("Referência do laudo removida do banco de dados");
            } else {
              console.error("Falha ao remover referência do laudo do banco de dados");
            }
          }
        } else {
          console.error("Falha ao excluir laudo do servidor");
        }
      } catch (error) {
        console.error("Erro ao excluir laudo do servidor:", error);
      }
    }
    
    // Garantir que o estado é completamente resetado para permitir nova seleção
    // Usar um timeout para garantir que o React tenha tempo de atualizar o DOM
    setTimeout(() => {
      if (medicalReportInputRef.current) {
        medicalReportInputRef.current.value = "";
      }
      console.log("Campo de upload de laudo resetado e pronto para nova seleção");
    }, 200);
  };

  // Apenas imagens principais são utilizadas

  // Remover uma imagem específica
  const removeImage = async (index: number) => {
    setRemovalInProgress(true);
    const imageToRemove = imagePreviews[index];
    
    // Remover do estado local de previews
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
    
    // Se for uma imagem de arquivo, remover do array de arquivos
    if (imageToRemove.file) {
      setExamImages(examImages.filter(file => {
        // Comparar nome e tamanho para identificar o arquivo
        return file.name !== imageToRemove.file?.name || 
               file.size !== imageToRemove.file?.size;
      }));
    }
    
    // Se for uma imagem do servidor
    if (imageToRemove.url) {
      console.log("Removendo imagem do servidor:", imageToRemove.url);
      
      try {
        // Chamar a API para excluir o arquivo do servidor
        const deleted = await deleteFile(imageToRemove.url);
        
        if (deleted) {
          console.log("Imagem excluída com sucesso do servidor");
          
          // Se temos uma função para atualizar o banco de dados, atualizamos o array de imagens
          if (updateOrderField && orderId) {
            // Atualizar o banco de dados com a nova lista de URLs (sem a URL removida)
            const updatedUrls = imageUrls.filter(url => url !== imageToRemove.url);
            
            // Usar o nome correto da coluna: exam_images_url em vez de examImageUrl ou additionalImageUrls
            const updated = await updateOrderField("exam_images_url", updatedUrls);
            if (updated) {
              console.log("Referência da imagem removida do banco de dados");
            } else {
              console.error("Falha ao remover referência da imagem do banco de dados");
            }
          }
        } else {
          console.error("Falha ao excluir imagem do servidor");
        }
      } catch (error) {
        console.error("Erro ao excluir imagem do servidor:", error);
      }
    }
    
    // Sempre resetar o input para permitir selecionar novos arquivos
    if (examImageInputRef.current) {
      examImageInputRef.current.value = "";
    }
    
    setRemovalInProgress(false);
  };

  return (
    <div>
      {/* Modal de visualização da imagem ampliada */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-5xl bg-[#1a2332] border-blue-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Visualização da Imagem</DialogTitle>
            <DialogDescription className="text-blue-300">
              Imagem do exame em tamanho completo
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 mb-4">
            {selectedImage && (
              <div className="w-full h-[70vh] flex items-center justify-center p-2">
                {selectedImage.toLowerCase().includes('.pdf') ? (
                  <div className="w-full h-full border border-blue-700 rounded-md overflow-hidden">
                    <iframe 
                      src={selectedImage}
                      className="w-full h-full" 
                      title="Visualização do documento"
                    />
                  </div>
                ) : (
                  <img 
                    src={selectedImage}
                    alt="Imagem do exame"
                    className="max-w-full max-h-full object-contain"
                  />
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              className="border-blue-600 text-white hover:bg-blue-900"
              onClick={() => setImageDialogOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de visualização do laudo */}
      <Dialog open={reportPreviewOpen} onOpenChange={setReportPreviewOpen}>
        <DialogContent className="max-w-4xl bg-[#1a2332] border-blue-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Visualização do Laudo</DialogTitle>
            <DialogDescription className="text-blue-300">
              {reportFromUrl ? reportFromUrl.name : "Laudo do exame"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 mb-4">
            {medicalReportUrl && (
              <div className="w-full h-96 flex items-center justify-center">
                {medicalReportUrl.toLowerCase().endsWith('.pdf') ? (
                  <div className="w-full h-full border border-blue-700 rounded-md overflow-hidden">
                    <iframe 
                      src={getFileUrl(medicalReportUrl)}
                      className="w-full h-full" 
                      title="Laudo do exame"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-4 border border-blue-700 rounded-md">
                    <img 
                      src={getFileUrl(medicalReportUrl)}
                      alt="Laudo do exame"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              className="border-blue-600 text-white hover:bg-blue-900"
              onClick={() => setReportPreviewOpen(false)}
            >
              Fechar
            </Button>
            <Button 
              className="bg-blue-700 hover:bg-blue-600"
              onClick={() => {
                if (medicalReportUrl) {
                  window.open(getFileUrl(medicalReportUrl), '_blank');
                }
              }}
            >
              Abrir em Nova Aba
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Card className="mb-6 bg-[#1a2332] border-blue-800 text-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center text-white">
            <FileText className="mr-2 h-5 w-5 text-blue-400" />
            Informações, Imagens do Exame e Laudo
          </CardTitle>
          <CardDescription className="text-blue-300">
            Forneça informações, imagens e laudo do exame para o pedido cirúrgico. Apenas a indicação clínica é obrigatória.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Upload da imagem do exame (opcional) */}
            <div>
              <Label htmlFor="examImage" className="flex items-center text-white text-lg font-medium">
                Imagens do Exame
              </Label>
              
              <DragDropZone
                onFileDrop={async (file) => {
                  // Simular evento de input para reutilizar a lógica existente
                  const event = { target: { files: [file] } } as any;
                  await handleExamImageChange(event);
                }}
                accept="image/*"
                disabled={processingImage}
                className="w-full"
              >
                <div 
                  className={cn(
                    "border-2 border-dashed border-blue-700 rounded-lg p-4 mt-1",
                    "transition-all duration-200 hover:border-blue-500",
                    imagePreviews.length > 0 ? "bg-blue-900/20" : "bg-blue-950/30 cursor-pointer"
                  )}
                  onClick={() => {
                    if (examImageInputRef.current) {
                      examImageInputRef.current.click();
                    }
                  }}
                >
                  <div className="flex flex-col items-center justify-center gap-2 py-6">
                    <input
                      id="examImage"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleExamImageChange}
                      ref={examImageInputRef}
                      key={`exam-image-upload-${Date.now()}`}
                    />
                    
                    {imagePreviews.length === 0 ? (
                      <>
                        <Upload className="h-8 w-8 text-blue-400" />
                        <span className="text-sm text-blue-300 text-center block">
                          Clique ou arraste para fazer upload de imagens de exame
                        </span>
                      </>
                    ) : (
                      <>
                        <FileImage className="h-8 w-8 text-blue-400" />
                        <span className="text-sm text-blue-300 text-center block">
                          Clique ou arraste para adicionar mais imagens
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </DragDropZone>
              <p className="text-xs text-blue-300 mt-1">
                Faça upload de radiografias, ressonâncias ou outros exames de imagem relevantes
              </p>
            </div>

            {/* Mostra as miniaturas das imagens do exame */}
            {imagePreviews.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-blue-300 mb-2">Imagens selecionadas ({imagePreviews.length}):</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {imagePreviews.map((image, index) => (
                    <div key={index} className="relative group border border-blue-700 rounded-md p-1 bg-blue-950/30 hover:border-blue-500 transition-colors">
                      <div className="relative pt-[75%] overflow-hidden">
                        <img 
                          src={image.preview} 
                          alt={`Imagem de exame ${index + 1}`}
                          className="absolute inset-0 w-full h-full object-contain bg-black/5 rounded shadow-inner cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation(); // Evita que acione o input de arquivo
                            setSelectedImage(image.preview);
                            setImageDialogOpen(true);
                          }}
                        />
                        <div className="absolute top-1 right-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-5 w-5 rounded-full p-0 opacity-80 hover:opacity-100"
                            onClick={() => removeImage(index)}
                            disabled={removalInProgress}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload do laudo do exame (opcional) - Movido para depois das imagens adicionais */}
            <div>
              <Label htmlFor="medicalReport" className="text-white text-lg font-medium">Laudo do Exame</Label>

              {!medicalReport && !reportFromUrl ? (
                <DragDropZone
                  onFileDrop={async (file) => {
                    // Simular evento de input para reutilizar a lógica existente
                    const event = { target: { files: [file] } } as any;
                    await handleMedicalReportChange(event);
                  }}
                  accept=".pdf,image/*"
                  disabled={processingReport}
                  className="w-full"
                >
                  <div 
                    className={cn(
                      "border-2 border-dashed border-blue-700 rounded-lg p-4 mt-1",
                      "transition-all duration-200 hover:border-blue-500 cursor-pointer",
                      "bg-blue-950/30"
                    )}
                    onClick={() => {
                      if (medicalReportInputRef.current) {
                        medicalReportInputRef.current.click();
                      }
                    }}
                  >
                    <div className="flex flex-col items-center justify-center gap-2 py-6">
                      <input
                        id="medicalReport"
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={handleMedicalReportChange}
                        ref={medicalReportInputRef}
                        key={`medical-report-upload-${Date.now()}`}
                      />
                      <FileText className="h-8 w-8 text-blue-400" />
                      <span className="text-sm text-blue-300 text-center block">
                        Clique ou arraste para fazer upload do laudo do exame
                      </span>
                    </div>
                  </div>
                </DragDropZone>
              ) : (
                <div className="bg-blue-900/20 border-2 border-blue-700 rounded-lg p-4 mt-1 relative">
                  {processingReport ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-pulse text-blue-300">Processando...</div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <FileText className="h-6 w-6 text-blue-400 mr-2" />
                        <p className="text-sm text-white">
                          {medicalReport ? medicalReport.name : 'Laudo carregado'}
                        </p>
                        {medicalReport && (
                          <p className="text-xs text-blue-300 ml-2">
                            ({(medicalReport.size / 1024).toFixed(1)} KB)
                          </p>
                        )}
                      </div>
                      {/* Botões removidos - usando apenas o conjunto principal abaixo */}
                    </div>
                  )}
                  
                  {/* Botões unificados para laudos locais e do servidor */}
                  {(medicalReport || reportFromUrl) && (
                    <div className="mt-2 flex justify-between">
                      <div className="text-sm text-blue-300">
                        {medicalReport ? 'Arquivo selecionado' : (reportFromUrl?.name || 'Laudo do Exame')}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs text-blue-300 border-blue-700"
                          onClick={() => {
                            if (medicalReport) {
                              // Para arquivos locais
                              const url = URL.createObjectURL(medicalReport);
                              if (medicalReport.type === 'application/pdf' || 
                                  medicalReport.name.toLowerCase().endsWith('.pdf')) {
                                setSelectedImage(url + '#.pdf');
                              } else {
                                setSelectedImage(url);
                              }
                              setImageDialogOpen(true);
                            } else if (medicalReportUrl) {
                              // Para arquivos do servidor
                              const fileUrl = getFileUrl(medicalReportUrl);
                              setSelectedImage(fileUrl);
                              setImageDialogOpen(true);
                            }
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Visualizar
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={removeMedicalReport}
                        >
                          <X className="h-4 w-4" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-blue-300 mt-1">
                Laudo do exame que será anexado ao pedido
              </p>
            </div>

            {/* Campo de indicação clínica (obrigatório) */}
            <div>
              <Label htmlFor="clinicalIndication" className="text-white text-lg font-medium">
                Indicação Clínica <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="clinicalIndication"
                className="mt-1 bg-blue-950/30 border-blue-700 placeholder:text-blue-500/50"
                placeholder="Descreva a indicação clínica para o procedimento..."
                value={clinicalIndication}
                onChange={(e) => setClinicalIndication(e.target.value)}
              />
              <p className="text-xs text-blue-300 mt-1">
                Descreva a razão médica para a solicitação do procedimento
              </p>
            </div>

            {/* Campo de observações adicionais (opcional) */}
            <div>
              <Label htmlFor="additionalNotes" className="text-white text-lg font-medium">
                Observações Adicionais
              </Label>
              <Textarea
                id="additionalNotes"
                className="mt-1 bg-blue-950/30 border-blue-700 placeholder:text-blue-500/50"
                placeholder="Adicione informações importantes para o procedimento..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
              />
              <p className="text-xs text-blue-300 mt-1">
                Informações adicionais que possam ser relevantes para o procedimento
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}