import { Router, Request, Response } from 'express';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Middleware de autenticação
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.user) {
    next();
  } else {
    res.status(401).json({ error: 'Usuário não autenticado' });
  }
}

// Função para criar nomes de arquivo padronizados
function createStandardizedFileName(patientId: number, orderId: number, fileType: string, ext: string): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let counter = 1;
  
  try {
    counter = Math.floor(Math.random() * 100) + 1;
  } catch (error) {
    counter = Date.now() % 100;
  }
  
  const paddedCounter = counter.toString().padStart(2, '0');
  const fileName = `${fileType}_${paddedCounter}_${dateStr}${ext}`;
  
  console.log(`📁 ARQUIVO CRIADO: pedido_${orderId}/${fileType}/${fileName}`);
  
  return fileName;
}

// Configuração do storage temporário
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const type = file.fieldname === 'report' ? 'laudos' : 'exames';
    const uploadPath = path.join(process.cwd(), 'uploads', 'temp', type);
    
    console.log(`📁 Upload temporário para: temp/${type}`);
    
    if (!fs.existsSync(uploadPath)) {
      try {
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log(`📁 Diretório temporário criado: ${uploadPath}`);
      } catch (error) {
        console.error(`❌ Erro ao criar diretório temporário ${uploadPath}:`, error);
      }
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// Configuração do multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

export function setupUploadRoutes(app: any) {
  
  // Rota para upload de imagem de exame
  app.post('/api/uploads/exam-image', isAuthenticated, (req: Request, res: Response) => {
    console.log('🔍 INÍCIO DO UPLOAD DE IMAGEM DE EXAME');
    
    try {
      upload.single('image')(req, res, function(err) {
        if (err) {
          console.error('Erro ao fazer upload de imagem:', err);
          return res.status(500).json({ error: 'Falha ao processar upload: ' + err.message });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        
        // Extrair orderId após processamento do multer
        const orderIdRaw = req.body.orderId;
        const orderId = orderIdRaw && orderIdRaw !== '' ? parseInt(orderIdRaw, 10) : null;
        
        console.log('🔍 Dados processados pelo multer:', {
          orderIdRaw,
          orderId: orderId || 'inválido',
          tempFilePath: req.file.path,
          userAuthenticated: !!req.user,
          userId: req.user?.id
        });
        
        // Mover arquivo para estrutura final
        const fileName = path.basename(req.file.path);
        const tempPath = req.file.path;
        
        let finalPath;
        let filePath;
        
        if (orderId && orderId > 0) {
          // Estrutura final: /uploads/orders/pedido_[ID]/exames/
          const finalDir = path.join(process.cwd(), 'uploads', 'orders', `pedido_${orderId}`, 'exames');
          finalPath = path.join(finalDir, fileName);
          filePath = `/uploads/orders/pedido_${orderId}/exames/${fileName}`;
          
          // Criar diretório final se não existe
          if (!fs.existsSync(finalDir)) {
            fs.mkdirSync(finalDir, { recursive: true });
            console.log(`📁 Diretório final criado: ${finalDir}`);
          }
          
          // Mover arquivo da pasta temporária para final
          try {
            fs.renameSync(tempPath, finalPath);
            console.log(`📦 Arquivo movido: ${tempPath} → ${finalPath}`);
          } catch (error) {
            console.error(`❌ Erro ao mover arquivo:`, error);
            fs.copyFileSync(tempPath, finalPath);
            fs.unlinkSync(tempPath);
            console.log(`📦 Arquivo copiado e removido: ${tempPath} → ${finalPath}`);
          }
        } else {
          console.error('❌ orderId inválido, não é possível organizar arquivo');
          return res.status(400).json({ error: 'ID do pedido é obrigatório para upload' });
        }
        
        console.log(`Upload de imagem bem sucedido: ${fileName}`);
        console.log(`Local físico final: ${finalPath}`);
        console.log(`URL: ${filePath}`);
        
        res.status(200).json({ 
          url: filePath,
          originalName: req.file.originalname,
          size: req.file.size
        });
      });
    } catch (error) {
      console.error('Erro ao processar upload de imagem:', error);
      res.status(500).json({ error: 'Falha ao processar upload' });
    }
  });
  
  // Rota para upload de laudo médico
  app.post('/api/uploads/medical-report', isAuthenticated, (req: Request, res: Response) => {
    try {
      upload.single('report')(req, res, function(err) {
        if (err) {
          console.error('Erro ao fazer upload de laudo:', err);
          return res.status(500).json({ error: 'Falha ao processar upload: ' + err.message });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        
        // Extrair orderId após processamento do multer
        const orderIdRaw = req.body.orderId;
        const orderId = orderIdRaw && orderIdRaw !== '' ? parseInt(orderIdRaw, 10) : null;
        
        console.log('🔍 Upload de laudo - dados processados:', {
          orderIdRaw,
          orderId: orderId || 'inválido',
          tempFilePath: req.file.path
        });
        
        // Mover arquivo para estrutura final
        const fileName = req.file.filename;
        const tempPath = req.file.path;
        
        let finalPath;
        let filePath;
        
        if (orderId && orderId > 0) {
          // Estrutura final: /uploads/orders/pedido_[ID]/laudos/
          const finalDir = path.join(process.cwd(), 'uploads', 'orders', `pedido_${orderId}`, 'laudos');
          finalPath = path.join(finalDir, fileName);
          filePath = `/uploads/orders/pedido_${orderId}/laudos/${fileName}`;
          
          // Criar diretório final se não existe
          if (!fs.existsSync(finalDir)) {
            fs.mkdirSync(finalDir, { recursive: true });
            console.log(`📁 Diretório final criado para laudo: ${finalDir}`);
          }
          
          // Mover arquivo da pasta temporária para final
          try {
            fs.renameSync(tempPath, finalPath);
            console.log(`📦 Laudo movido: ${tempPath} → ${finalPath}`);
          } catch (error) {
            console.error(`❌ Erro ao mover laudo:`, error);
            fs.copyFileSync(tempPath, finalPath);
            fs.unlinkSync(tempPath);
            console.log(`📦 Laudo copiado e removido: ${tempPath} → ${finalPath}`);
          }
        } else {
          console.error('❌ orderId inválido para laudo');
          return res.status(400).json({ error: 'ID do pedido é obrigatório para upload' });
        }
        
        console.log(`Upload de laudo bem sucedido: ${fileName}`);
        console.log(`Local físico final: ${finalPath}`);
        console.log(`URL: ${filePath}`);
        
        res.status(200).json({ 
          url: filePath,
          originalName: req.file.originalname,
          size: req.file.size
        });
      });
    } catch (error) {
      console.error('Erro ao processar upload de laudo:', error);
      res.status(500).json({ error: 'Falha ao processar upload' });
    }
  });

  // Rota para upload de PDF do pedido médico (seguindo padrão das imagens de exame)
  app.post('/api/uploads/order-pdf', isAuthenticated, (req: Request, res: Response) => {
    console.log('📄 INÍCIO DO UPLOAD DE PDF DO PEDIDO');
    
    try {
      upload.single('pdf')(req, res, function(err) {
        if (err) {
          console.error('Erro ao fazer upload de PDF:', err);
          return res.status(500).json({ error: 'Falha ao processar upload: ' + err.message });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: 'Nenhum arquivo PDF enviado' });
        }
        
        // Extrair orderId após processamento do multer
        const orderIdRaw = req.body.orderId;
        const orderId = orderIdRaw && orderIdRaw !== '' ? parseInt(orderIdRaw, 10) : null;
        
        console.log('📄 Dados processados pelo multer:', {
          orderIdRaw,
          orderId: orderId || 'inválido',
          tempFilePath: req.file.path,
          userAuthenticated: !!req.user,
          userId: req.user?.id
        });
        
        // Mover arquivo para estrutura final
        const fileName = path.basename(req.file.path);
        const tempPath = req.file.path;
        
        let finalPath;
        let filePath;
        
        if (orderId && orderId > 0) {
          // Estrutura final: /uploads/orders/pedido_[ID]/documentos/
          const finalDir = path.join(process.cwd(), 'uploads', 'orders', `pedido_${orderId}`, 'documentos');
          finalPath = path.join(finalDir, fileName);
          filePath = `/uploads/orders/pedido_${orderId}/documentos/${fileName}`;
          
          // Criar diretório final se não existe
          if (!fs.existsSync(finalDir)) {
            fs.mkdirSync(finalDir, { recursive: true });
            console.log(`📁 Diretório final criado: ${finalDir}`);
          }
          
          // Mover arquivo da pasta temporária para final
          try {
            fs.renameSync(tempPath, finalPath);
            console.log(`📦 Arquivo movido: ${tempPath} → ${finalPath}`);
          } catch (error) {
            console.error(`❌ Erro ao mover arquivo:`, error);
            fs.copyFileSync(tempPath, finalPath);
            fs.unlinkSync(tempPath);
            console.log(`📦 Arquivo copiado e removido: ${tempPath} → ${finalPath}`);
          }
        } else {
          console.error('❌ orderId inválido, não é possível organizar arquivo PDF');
          return res.status(400).json({ error: 'ID do pedido é obrigatório para upload de PDF' });
        }
        
        console.log(`Upload de PDF bem sucedido: ${fileName}`);
        console.log(`Local físico final: ${finalPath}`);
        console.log(`URL: ${filePath}`);
        
        // Atualizar o pedido médico com a URL do PDF (usando async/await para melhor controle)
        (async () => {
          try {
            console.log(`🔄 Atualizando pedido ${orderId} com PDF URL: ${filePath}`);
            
            const { db } = await import('./db');
            const { medicalOrders } = await import('../shared/schema');
            const { eq } = await import('drizzle-orm');
            
            const updateResult = await db.update(medicalOrders)
              .set({ 
                order_pdf_url: filePath,
                updatedAt: new Date()
              })
              .where(eq(medicalOrders.id, orderId))
              .returning();
              
            console.log(`✅ Pedido ${orderId} atualizado com sucesso no banco de dados`);
            console.log(`📊 Resultado da atualização:`, updateResult);
          } catch (dbError) {
            console.error(`❌ Erro ao atualizar pedido ${orderId} no banco:`, dbError);
          }
        })();
        
        res.status(200).json({ 
          url: filePath,
          originalName: req.file.originalname,
          size: req.file.size
        });
      });
    } catch (error) {
      console.error('Erro ao processar upload de PDF:', error);
      res.status(500).json({ error: 'Falha ao processar upload' });
    }
  });

  // Rota para servir os arquivos de upload (estáticos)
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
}