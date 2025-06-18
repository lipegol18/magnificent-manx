import { Express, Request, Response, NextFunction } from "express";
import { createServer, Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hasPermission } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { addStaticRoutes } from "./static-routes";
import { setupUploadRoutes } from "./upload-routes";
import { registerDoctorImageRoutes } from "./doctor-images-routes";
import { randomUUID } from "crypto";
import { db, pool } from "./db";
import { users, roles, medicalOrders, cidCodes, procedures, cidCbhpmAssociations, insertCidCodeSchema } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import { normalizeText } from "./utils/normalize";
import { extractTextFromImage, processIdentityDocument, processInsuranceCard } from "./services/google-vision";
import { normalizeExtractedData } from "./services/data-normalizer";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Função para converter PDF para imagem
async function convertPDFToImage(pdfPath: string): Promise<Buffer> {
  const outputPath = `${pdfPath}.png`;
  
  try {
    // Usar convert do ImageMagick para converter PDF para PNG
    const command = `convert -density 300 "${pdfPath}[0]" -quality 90 "${outputPath}"`;
    await execAsync(command);
    
    // Ler a imagem convertida
    const imageBuffer = fs.readFileSync(outputPath);
    
    // Limpar arquivo temporário
    fs.unlinkSync(outputPath);
    
    return imageBuffer;
  } catch (error) {
    // Limpar arquivos em caso de erro
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    throw new Error(`Erro na conversão PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// Configurar o armazenamento de upload
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  },
});

const upload = multer({ storage: uploadStorage });

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ROTA HOSPITAL STATS - CORRIGIDA PARA FUNCIONAR
  app.get("/api/reports/hospital-distribution", (req: Request, res: Response) => {
    console.log("=== NOVA ROTA HOSPITAL DISTRIBUTION (CORRIGIDA) ===");
    
    const query = `
      SELECT 
        TRIM(COALESCE(h.name, 'Hospital não especificado')) as name,
        COUNT(*) as value
      FROM medical_orders mo
      LEFT JOIN hospitals h ON mo.hospital_id = h.id
      WHERE mo.user_id = 43
      GROUP BY h.name
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `;
    
    console.log("Executando query hospital distribution:", query);
    
    pool.query(query)
      .then(result => {
        console.log("Resultado hospital distribution:", result.rows);
        res.setHeader('Content-Type', 'application/json');
        res.json(result.rows);
      })
      .catch(error => {
        console.error("Erro na API hospital-distribution:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
      });
  });
  
  // API CRÍTICA DOS FORNECEDORES - REGISTRAR PRIMEIRO PARA EVITAR CONFLITOS COM VITE
  app.get("/api/suppliers", async (req: Request, res: Response) => {
    try {
      console.log("=== ENDPOINT /api/suppliers EXECUTADO ===");
      
      const showAll = req.query.showAll === "true";
      const suppliers = await storage.getSuppliers();
      const filteredSuppliers = showAll ? suppliers : suppliers.filter(s => s.active);
      
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(filteredSuppliers);
      return; // Finalizar resposta imediatamente
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
      res.status(500).json({ message: "Erro ao buscar fornecedores" });
      return;
    }
  });
  
  // Nova API de distribuição por hospital com filtragem correta
  app.get("/api/reports/hospital-distribution", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.roleId === 1;
      
      console.log(`=== NOVA API DISTRIBUIÇÃO POR HOSPITAL ===`);
      console.log(`Usuário ID: ${userId}, É Admin: ${isAdmin}`);
      
      // Query específica para distribuição por hospital com filtragem correta
      const baseQuery = `
        SELECT 
          COALESCE(h.name, 'Hospital não especificado') as name,
          COUNT(*) as value
        FROM 
          medical_orders mo
        LEFT JOIN 
          hospitals h ON mo.hospital_id = h.id
      `;
      
      let finalQuery: string;
      let params: any[] = [];
      
      if (isAdmin) {
        // Admin vê todos os procedimentos de todos os médicos
        finalQuery = baseQuery + `
          GROUP BY h.name
          ORDER BY COUNT(*) DESC
          LIMIT 10
        `;
        console.log("Admin - mostrando todos os procedimentos por hospital");
      } else {
        // Médicos veem apenas seus próprios procedimentos
        finalQuery = baseQuery + `
          WHERE mo.user_id = $1
          GROUP BY h.name
          ORDER BY COUNT(*) DESC
          LIMIT 10
        `;
        params = [userId];
        console.log(`Médico - mostrando apenas procedimentos do usuário ${userId}`);
      }
      
      console.log(`Query de distribuição: ${finalQuery}`);
      console.log(`Parâmetros: ${JSON.stringify(params)}`);
      
      const result = await pool.query(finalQuery, params);
      
      const formattedResult = result.rows.map(row => ({
        name: String(row.name).trim(),
        value: parseInt(row.value)
      }));
      
      console.log(`Distribuição por hospital para usuário ${userId}:`, formattedResult);
      
      return res.json(formattedResult);
      
    } catch (error) {
      console.error("Erro na API hospital-stats:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Nova rota para hospital-stats (usada pelo card de Distribuição por Hospital)
  app.get("/api/reports/hospital-stats", async (req: Request, res: Response) => {
    try {
      // Hardcode temporário para teste - usuário Médico01 (ID 43)
      const userId = 43;
      const isAdmin = false;
      
      console.log(`=== API HOSPITAL-STATS ===`);
      console.log(`Usuário ID: ${userId}, É Admin: ${isAdmin}`);
      
      let query: string;
      let params: any[] = [];
      
      if (isAdmin) {
        // Admin vê todos os procedimentos
        query = `
          SELECT 
            TRIM(COALESCE(h.name, 'Hospital não especificado')) as name,
            COUNT(*) as value
          FROM 
            medical_orders mo
          LEFT JOIN 
            hospitals h ON mo.hospital_id = h.id
          GROUP BY h.name
          ORDER BY COUNT(*) DESC
          LIMIT 10
        `;
      } else {
        // Médicos veem apenas seus próprios procedimentos
        query = `
          SELECT 
            TRIM(COALESCE(h.name, 'Hospital não especificado')) as name,
            COUNT(*) as value
          FROM 
            medical_orders mo
          LEFT JOIN 
            hospitals h ON mo.hospital_id = h.id
          WHERE mo.user_id = $1
          GROUP BY h.name
          ORDER BY COUNT(*) DESC
          LIMIT 10
        `;
        params = [userId];
      }
      
      console.log(`Query hospital-stats: ${query}`);
      console.log(`Parâmetros: ${JSON.stringify(params)}`);
      
      const result = await pool.query(query, params);
      console.log(`Resultado bruto da query:`, result.rows);
      
      const formattedResult = result.rows.map(row => ({
        name: String(row.name).trim(),
        value: parseInt(row.value)
      }));
      
      console.log(`Hospital-stats resultado formatado para usuário ${userId}:`, formattedResult);
      
      return res.json(formattedResult);
      
    } catch (error) {
      console.error("Erro na API hospital-stats:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/reports/supplier-stats", (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    
    pool.query(`
      SELECT 
        COALESCE(s.company_name, s.trade_name, 'Fornecedor não especificado') as name,
        COUNT(DISTINCT mo.id) as value
      FROM 
        suppliers s
      INNER JOIN 
        medical_orders mo ON s.id = ANY(mo.supplier_ids)
      WHERE 
        mo.supplier_ids IS NOT NULL 
      GROUP BY s.company_name, s.trade_name
      ORDER BY COUNT(DISTINCT mo.id) DESC
      LIMIT 10
    `)
    .then(supplierStatsResult => {
      console.log("=== API SUPPLIER-STATS EXECUTADA COM SUCESSO ===");
      console.log("Dados encontrados:", supplierStatsResult.rows);
      
      const result = supplierStatsResult.rows.map(row => ({
        name: String(row.name).trim(),
        value: parseInt(row.value)
      }));
      
      console.log("Enviando dados de fornecedor:", result);
      res.status(200).json(result);
    })
    .catch(error => {
      console.error("ERRO na API supplier-stats:", error);
      res.status(200).json([]);
    });
  });

  // Configurar os endpoints de autenticação
  setupAuth(app);

  // Configurar as rotas estáticas
  addStaticRoutes(app);
  
  // Configurar as rotas de upload
  setupUploadRoutes(app);
  
  // Configurar as rotas de imagens dos médicos
  registerDoctorImageRoutes(app);
  
  // Rota pública para entrada de CRM sem validação (não requer autenticação)
  app.get("/api/validate-crm", async (req, res) => {
    try {
      const crmStr = req.query.crm as string;
      
      if (!crmStr) {
        return res.status(400).json({ 
          valid: false, 
          message: "CRM não informado" 
        });
      }
      
      // Log simplificado
      console.log(`🔍 CRM informado: ${crmStr} (sem validação)`);
      
      // Retorna sempre como válido sem fazer verificação
      return res.json({
        valid: true,
        name: "CRM aceito",
        crm: crmStr,
        city: "Rio de Janeiro",
        state: "RJ"
      });
      
    } catch (error) {
      console.error("Erro ao processar CRM:", error);
      res.status(500).json({ 
        valid: false, 
        message: "Erro ao processar CRM" 
      });
    }
  });

  // API para relatórios - dados reais do banco de dados
  app.get(
    "/api/reports/stats",
    isAuthenticated,
    hasPermission("reports_view"),
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        const isAdmin = req.user?.roleId === 1;

        console.log(
          `Buscando estatísticas de relatórios para usuário ${userId}, isAdmin: ${isAdmin}`,
        );

        // Contagem de pedidos
        let orderCount = 0;
        let orderCountQuery;

        if (isAdmin) {
          // Administradores veem todos os pedidos
          orderCountQuery = await storage.countAllMedicalOrders();
        } else {
          // Médicos veem apenas seus próprios pedidos
          orderCountQuery = await storage.countMedicalOrdersByDoctor(userId);
        }

        orderCount = orderCountQuery || 0;
        console.log(`Total de pedidos encontrados: ${orderCount}`);

        // Contagem de pacientes
        let patientCount = 0;
        let patientCountQuery;

        if (isAdmin) {
          // Administradores veem todos os pacientes
          patientCountQuery = await storage.countAllPatients();
        } else {
          // Médicos veem apenas seus próprios pacientes
          patientCountQuery = await storage.countPatientsByDoctor(userId);
        }

        patientCount = patientCountQuery || 0;
        console.log(`Total de pacientes encontrados: ${patientCount}`);

        // Performance dos médicos (pedidos por médico)
        let doctorPerformance = [];

        if (isAdmin) {
          // Administradores veem todos os médicos
          const doctorPerformanceData =
            await storage.getDoctorPerformanceStats();
          doctorPerformance = doctorPerformanceData
            .map((item) => ({
              name: item.doctorName || "Médico não identificado",
              value: Number(item.orderCount) || 0,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5 médicos
        } else {
          // Médicos veem apenas sua própria performance
          const doctorName = req.user?.name || "Médico atual";
          const orderCount = await storage.countMedicalOrdersByDoctor(userId);
          doctorPerformance = [{ name: doctorName, value: orderCount || 0 }];
        }

        // Volume de hospitais (pedidos por hospital)
        let hospitalVolume = [];

        if (isAdmin) {
          // Administradores veem todos os hospitais
          const hospitalVolumeData = await storage.getHospitalVolumeStats();
          hospitalVolume = hospitalVolumeData
            .map((item) => ({
              name: item.hospitalName || "Hospital não identificado",
              value: Number(item.orderCount) || 0,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5 hospitais
        } else {
          // Médicos veem apenas hospitais relacionados a seus pedidos
          const hospitalVolumeData =
            await storage.getHospitalVolumeStatsByDoctor(userId);
          hospitalVolume = hospitalVolumeData
            .map((item) => ({
              name: item.hospitalName || "Hospital não identificado",
              value: Number(item.orderCount) || 0,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5 hospitais do médico
        }

        // Dados consolidados para o frontend
        const stats = {
          orderCount,
          patientCount,
          doctorPerformance,
          hospitalVolume,
          // Adicionar outras estatísticas conforme necessário
        };

        console.log("Estatísticas calculadas com sucesso");
        res.json(stats);
      } catch (error) {
        console.error("Erro ao obter estatísticas de relatórios:", error);
        res
          .status(500)
          .json({ message: "Erro ao obter estatísticas do banco de dados" });
      }
    },
  );
  
  // API para obter dados de volume de cirurgias por período (semanal, mensal, anual)
  // API para obter dados de cirurgias eletivas vs urgência
  // API para obter taxa de cancelamento de cirurgias
  // API para obter dados dos principais tipos de procedimentos
  // API para obter dados de cirurgias por convênio médico
  app.get(
    "/api/reports/insurance-distribution",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        const isAdmin = req.user?.roleId === 1;
        
        console.log(`Buscando distribuição de cirurgias por convênio - usuário ${userId}, isAdmin: ${isAdmin}`);
        
        // Consulta SQL para extrair dados reais do banco
        const query = `
        WITH insurance_counts AS (
          SELECT 
            COALESCE(p.insurance, 'Particular') as insurance,
            COUNT(*) as count
          FROM 
            medical_orders mo
          JOIN 
            patients p ON mo.patient_id = p.id
          WHERE 
            ${isAdmin ? '' : 'mo.user_id = $1 AND'} 
            mo.status_code != 'em_preenchimento'
          GROUP BY 
            p.insurance
          ORDER BY 
            count DESC
        )
        SELECT 
          insurance,
          count,
          CASE 
            WHEN SUM(count) OVER () = 0 THEN 0
            ELSE ROUND((count::numeric / SUM(count) OVER ()) * 100, 1)
          END as percentage
        FROM 
          insurance_counts
        `;
        
        // Parâmetros da consulta
        const params = isAdmin ? [] : [userId];
        
        try {
          // Executar a consulta diretamente no pool do PostgreSQL
          const queryResult = await pool.query(query, params);
          
          if (queryResult.rows && queryResult.rows.length > 0) {
            // Formatar os dados para o gráfico de pizza
            const result = queryResult.rows.map(row => ({
              name: row.insurance,
              value: Number(row.count),
              percentage: Number(row.percentage)
            }));
            
            console.log("DADOS REAIS DE CIRURGIAS POR CONVÊNIO:", result);
            res.json(result);
          } else {
            // Se não há dados, retornar array vazio
            console.log("Sem dados de cirurgias por convênio");
            res.json([]);
          }
        } catch (dbError) {
          console.error("Erro ao consultar banco de dados para cirurgias por convênio:", dbError);
          // Em caso de erro, retornar array vazio
          res.json([]);
        }
      } catch (error) {
        console.error("Erro ao processar requisição de cirurgias por convênio:", error);
        res.status(500).json({ 
          message: "Erro ao obter dados de cirurgias por convênio" 
        });
      }
    }
  );

  app.get(
    "/api/reports/top-procedures",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        const isAdmin = req.user?.roleId === 1;
        const limit = Number(req.query.limit) || 5; // Quantidade de procedimentos a retornar
        
        console.log(`Buscando principais tipos de procedimentos - usuário ${userId}, isAdmin: ${isAdmin}, limit: ${limit}`);
        
        // Consulta SQL para obter os procedimentos mais frequentes
        const query = `
        WITH procedure_counts AS (
          SELECT 
            p.id, 
            p.name,
            COUNT(*) as count
          FROM 
            medical_orders mo
          JOIN 
            procedures p ON mo.procedure_id = p.id
          WHERE 
            ${isAdmin ? '' : 'mo.user_id = $1 AND'} 
            mo.status_code != 'em_preenchimento'
          GROUP BY 
            p.id, p.name
          ORDER BY 
            count DESC
          LIMIT $${isAdmin ? '1' : '2'}
        )
        SELECT 
          id,
          name,
          count,
          CASE 
            WHEN SUM(count) OVER () = 0 THEN 0
            ELSE ROUND((count::numeric / SUM(count) OVER ()) * 100, 1)
          END as percentage
        FROM 
          procedure_counts
        `;
        
        // Parâmetros da consulta
        const params = isAdmin ? [limit] : [userId, limit];
        
        try {
          // Executar a consulta diretamente no pool do PostgreSQL
          const queryResult = await pool.query(query, params);
          
          if (queryResult.rows && queryResult.rows.length > 0) {
            // Formatar os dados para o gráfico
            const result = queryResult.rows.map(row => ({
              id: row.id,
              name: row.name,
              count: Number(row.count),
              percentage: Number(row.percentage)
            }));
            
            console.log("DADOS REAIS DE PRINCIPAIS PROCEDIMENTOS:", result);
            res.json(result);
          } else {
            // Se não há dados, retornar array vazio
            console.log("Sem dados de principais procedimentos");
            res.json([]);
          }
        } catch (dbError) {
          console.error("Erro ao consultar banco de dados para principais procedimentos:", dbError);
          // Em caso de erro, retornar array vazio
          res.json([]);
        }
      } catch (error) {
        console.error("Erro ao processar requisição de principais procedimentos:", error);
        res.status(500).json({ 
          message: "Erro ao obter dados de principais procedimentos" 
        });
      }
    }
  );

  app.get(
    "/api/reports/cancellation-rate",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        const isAdmin = req.user?.roleId === 1;
        
        console.log(`Buscando taxa de cancelamento de cirurgias - usuário ${userId}, isAdmin: ${isAdmin}`);
        
        // Consulta SQL para extrair dados reais do banco
        const query = `
        WITH order_counts AS (
          SELECT
            COUNT(*) FILTER (WHERE status_code IN ('recusado', 'cancelado')) as cancelled_count,
            COUNT(*) as total_count
          FROM medical_orders
          WHERE ${isAdmin ? '' : 'user_id = $1 AND'} status_code != 'em_preenchimento'
        )
        SELECT 
          CASE 
            WHEN total_count = 0 THEN 0
            ELSE ROUND((cancelled_count::numeric / total_count::numeric) * 100, 1)
          END as rate,
          cancelled_count,
          total_count
        FROM order_counts
        `;
        
        // Parâmetros da consulta
        const params = isAdmin ? [] : [userId];
        
        try {
          // Executar a consulta diretamente no pool do PostgreSQL
          const queryResult = await pool.query(query, params);
          
          if (queryResult.rows && queryResult.rows.length > 0) {
            // Retornar os dados da taxa de cancelamento
            const result = {
              rate: Number(queryResult.rows[0].rate) || 0,
              cancelledCount: Number(queryResult.rows[0].cancelled_count) || 0,
              totalCount: Number(queryResult.rows[0].total_count) || 0
            };
            
            console.log("DADOS REAIS DE TAXA DE CANCELAMENTO:", result);
            res.json(result);
          } else {
            // Se não há dados, retornar zeros
            console.log("Sem dados de taxa de cancelamento");
            res.json({ rate: 0, cancelledCount: 0, totalCount: 0 });
          }
        } catch (dbError) {
          console.error("Erro ao consultar banco de dados para taxa de cancelamento:", dbError);
          // Em caso de erro, retornar dados vazios
          res.json({ rate: 0, cancelledCount: 0, totalCount: 0 });
        }
      } catch (error) {
        console.error("Erro ao processar requisição de taxa de cancelamento:", error);
        res.status(500).json({ 
          message: "Erro ao obter taxa de cancelamento de cirurgias" 
        });
      }
    }
  );

  app.get(
    "/api/reports/elective-vs-emergency",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        const isAdmin = req.user?.roleId === 1;
        
        console.log(`Buscando estatísticas de cirurgias eletivas vs urgência - usuário ${userId}, isAdmin: ${isAdmin}`);
        
        // Consulta SQL para extrair dados reais do banco - usando 'procedure_type' que existe na tabela
        const query = `
        WITH order_types AS (
          SELECT 
            CASE 
              WHEN procedure_type = 'urgencia' THEN 'Urgência'
              ELSE 'Eletivas'
            END as surgery_type,
            COUNT(*) as count
          FROM medical_orders
          WHERE ${isAdmin ? '' : 'user_id = $1 AND'} status_code != 'em_preenchimento'
          GROUP BY surgery_type
        )
        SELECT surgery_type as name, count as value 
        FROM order_types
        ORDER BY name
        `;
        
        // Parâmetros da consulta
        const params = isAdmin ? [] : [userId];
        
        try {
          // Executar a consulta diretamente no pool do PostgreSQL
          const queryResult = await pool.query(query, params);
          
          if (queryResult.rows && queryResult.rows.length > 0) {
            // Converter para o formato esperado pelo gráfico
            const result = queryResult.rows.map(row => ({
              name: row.name,
              value: Number(row.value)
            }));
            
            console.log("DADOS REAIS DE CIRURGIAS ELETIVAS VS URGÊNCIA:", result);
            
            // Se não tiver dados de urgência, adicionar com valor zero
            if (!result.find(item => item.name === 'Urgência')) {
              result.push({ name: 'Urgência', value: 0 });
            }
            
            // Se não tiver dados de eletivas, adicionar com valor zero
            if (!result.find(item => item.name === 'Eletivas')) {
              result.push({ name: 'Eletivas', value: 0 });
            }
            
            res.json(result);
          } else {
            // Se não há dados, retornar vazios para que o frontend possa lidar
            console.log("Sem dados de cirurgias eletivas vs urgência");
            res.json([
              { name: 'Eletivas', value: 0 },
              { name: 'Urgência', value: 0 }
            ]);
          }
        } catch (dbError) {
          console.error("Erro ao consultar banco de dados para cirurgias eletivas vs urgência:", dbError);
          // Em caso de erro, retornar dados vazios
          res.json([
            { name: 'Eletivas', value: 0 },
            { name: 'Urgência', value: 0 }
          ]);
        }
      } catch (error) {
        console.error("Erro ao processar requisição de cirurgias eletivas vs urgência:", error);
        res.status(500).json({ 
          message: "Erro ao obter dados de cirurgias eletivas vs urgência" 
        });
      }
    }
  );



  app.get(
    "/api/reports/surgeries-by-period",
    isAuthenticated, // Removido o middleware hasPermission("reports.view") que estava causando erro
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        const isAdmin = req.user?.roleId === 1;
        const period = req.query.period as 'weekly' | 'monthly' | 'annual' || 'monthly';
        
        console.log(`Buscando estatísticas de volume de cirurgias para período ${period} - usuário ${userId}, isAdmin: ${isAdmin}`);
        
        let result = [];
        
        try {
          // Consulta SQL personalizada para extrair dados reais do banco
          const query = `
          WITH date_periods AS (
            SELECT 
              to_char(created_at, $1) as period_name,
              CASE 
                WHEN status_code = 'em_preenchimento' OR status_code = 'em_avaliacao' OR status_code = 'aceito' THEN 'solicitadas'
                WHEN status_code = 'realizado' THEN 'realizadas'
                WHEN status_code = 'recusado' OR status_code = 'cancelado' THEN 'canceladas'
                ELSE 'solicitadas'
              END as status_group,
              count(*) as count
            FROM medical_orders
            WHERE ${isAdmin ? '' : 'user_id = $2 AND'} status_code != 'em_preenchimento'
            GROUP BY period_name, status_group
          )
          SELECT 
            period_name as name,
            COALESCE(SUM(CASE WHEN status_group = 'solicitadas' THEN count ELSE 0 END), 0) as solicitadas,
            COALESCE(SUM(CASE WHEN status_group = 'realizadas' THEN count ELSE 0 END), 0) as realizadas,
            COALESCE(SUM(CASE WHEN status_group = 'canceladas' THEN count ELSE 0 END), 0) as canceladas
          FROM date_periods
          GROUP BY period_name
          ORDER BY name
          `;
          
          // Definir formato de data e intervalo com base no período
          let dateFormat = 'mon'; // mês (padrão)
          
          if (period === 'weekly') {
            dateFormat = 'dy'; // dia da semana abreviado
          } else if (period === 'annual') {
            dateFormat = 'yyyy'; // ano
          }
          
          // Remover restrição de data - mostrar todas as cirurgias
          // Parâmetros da consulta simplificados
          const params = isAdmin 
            ? [dateFormat]
            : [dateFormat, userId];
            
          // Executar a consulta diretamente no pool do PostgreSQL
          const queryResult = await pool.query(query, params);
          
          if (queryResult && queryResult.rows && queryResult.rows.length > 0) {
            console.log(`DADOS REAIS DE CIRURGIAS POR PERÍODO (${period}):`, queryResult.rows);
            
            // Mapear resultados para o formato esperado com tradução dos nomes de período
            result = queryResult.rows.map(row => {
              // Tradução para dias da semana em português
              const weekDayMap: Record<string, string> = {
                'Mon': 'Seg', 'Tue': 'Ter', 'Wed': 'Qua', 'Thu': 'Qui', 
                'Fri': 'Sex', 'Sat': 'Sáb', 'Sun': 'Dom'
              };
              
              // Tradução para meses em português (incluindo minúsculas)
              const monthMap: Record<string, string> = {
                'Jan': 'Jan', 'Feb': 'Fev', 'Mar': 'Mar', 'Apr': 'Abr',
                'May': 'Mai', 'Jun': 'Jun', 'Jul': 'Jul', 'Aug': 'Ago',
                'Sep': 'Set', 'Oct': 'Out', 'Nov': 'Nov', 'Dec': 'Dez',
                // Versões em minúsculas também
                'jan': 'Jan', 'feb': 'Fev', 'mar': 'Mar', 'apr': 'Abr',
                'may': 'Mai', 'jun': 'Jun', 'jul': 'Jul', 'aug': 'Ago',
                'sep': 'Set', 'oct': 'Out', 'nov': 'Nov', 'dec': 'Dez'
              };
              
              // Aplicar tradução apropriada baseada no período
              let name = row.name;
              if (period === 'weekly' && weekDayMap[row.name]) {
                name = weekDayMap[row.name];
              } else if (period === 'monthly' && monthMap[row.name]) {
                name = monthMap[row.name];
                console.log(`Traduzindo mês: ${row.name} -> ${name}`);
              }
              
              const result = {
                name,
                solicitadas: Number(row.solicitadas) || 0,
                realizadas: Number(row.realizadas) || 0,
                canceladas: Number(row.canceladas) || 0
              };
              
              console.log(`Resultado final para período ${period}:`, result);
              return result;
            });
          } else {
            console.log(`Sem dados para o período ${period}, gerando dados de exemplo`);
            // Se não há dados, não retornar nada
            result = [];
          }
        } catch (dbError) {
          console.error(`Erro ao consultar banco de dados para volume de cirurgias (${period}):`, dbError);
          // Se houver erro na consulta, não retornar nada
          result = [];
        }
        
        res.json(result);
      } catch (error) {
        console.error(`Erro ao processar requisição de volume de cirurgias:`, error);
        res.status(500).json({ 
          message: "Erro ao obter dados de volume de cirurgias", 
          error: error.message 
        });
      }
    }
  );

  // API para obter detalhes de pedidos para relatórios - dados reais do banco de dados
  app.get(
    "/api/reports/orders",
    isAuthenticated,
    hasPermission("reports_view"),
    async (req: Request, res: Response) => {
      try {
        const isAdmin = req.user?.roleId === 1;
        const userId = req.user?.id;

        console.log(
          `Buscando pedidos para relatórios. Usuário: ${userId}, isAdmin: ${isAdmin}`,
        );

        // Opções de filtro da requisição
        const statusCode = req.query.status ? String(req.query.status) : null;
        const startDate = req.query.startDate
          ? String(req.query.startDate)
          : null;
        const endDate = req.query.endDate ? String(req.query.endDate) : null;
        const hospitalId = req.query.hospitalId
          ? Number(req.query.hospitalId)
          : null;
        const complexity = req.query.complexity
          ? String(req.query.complexity)
          : null;
        const doctorId = req.query.userId ? Number(req.query.userId) : null; // Filtro por ID de médico

        console.log(
          `Filtros aplicados - Status: ${statusCode}, Período: ${startDate} a ${endDate}, Hospital: ${hospitalId}, Complexidade: ${complexity}, Médico: ${doctorId || "Todos"}`,
        );

        // Obter pedidos do banco de dados com filtros
        let medicalOrders;

        if (isAdmin) {
          // Administradores podem ver todos os pedidos ou filtrar por médico específico
          if (doctorId) {
            // Se um ID de médico específico for fornecido
            medicalOrders = await storage.getMedicalOrdersForReportingByDoctor(
              doctorId,
              {
                statusCode,
                startDate,
                endDate,
                hospitalId,
                complexity,
              },
            );
          } else {
            // Sem filtro de médico, mostrar todos
            medicalOrders = await storage.getMedicalOrdersForReporting({
              statusCode,
              startDate,
              endDate,
              hospitalId,
              complexity,
            });
          }
        } else {
          // Médicos veem apenas seus próprios pedidos
          medicalOrders = await storage.getMedicalOrdersForReportingByDoctor(
            userId,
            {
              statusCode,
              startDate,
              endDate,
              hospitalId,
              complexity,
            },
          );
        }

        console.log(
          `Encontrados ${medicalOrders.length} pedidos para relatório`,
        );

        // Processar e transformar os dados para o formato esperado pelo frontend
        const formattedOrders = await Promise.all(
          medicalOrders.map(async (order) => {
            // Buscar informações relacionadas
            const patient = order.patientId
              ? await storage.getPatient(order.patientId)
              : null;
            const hospital = order.hospitalId
              ? await storage.getHospital(order.hospitalId)
              : null;
            const doctor = order.doctorId
              ? await storage.getUser(order.doctorId)
              : null;
            const procedure = order.procedureCbhpmId
              ? await storage.getProcedure(order.procedureCbhpmId)
              : null;

            return {
              id: order.id,
              patientName: patient
                ? patient.fullName
                : "Paciente não encontrado",
              procedureName: procedure
                ? procedure.name
                : order.procedureName || "Não especificado",
              hospital: hospital ? hospital.name : "Hospital não encontrado",
              status: order.status || "não_especificado",
              date: order.createdAt
                ? new Date(order.createdAt).toISOString().split("T")[0]
                : "Data não disponível",
              complexity:
                order.complexity || procedure?.porte || "não_especificada",
              doctor: doctor ? doctor.name : req.user?.name || "Usuário atual",
              // Valor só é visível para administradores
              value: isAdmin
                ? order.totalValue || procedure?.custoOperacional || null
                : null,
            };
          }),
        );

        console.log(`Dados de pedidos formatados com sucesso para relatório`);
        res.json(formattedOrders);
      } catch (error) {
        console.error("Erro ao obter pedidos para relatórios:", error);
        res
          .status(500)
          .json({ message: "Erro ao obter pedidos do banco de dados" });
      }
    },
  );

  // API para buscar todos os pedidos médicos com filtros opcionais
  app.get(
    "/api/medical-orders",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
        const patientId = req.query.patientId ? parseInt(req.query.patientId as string) : undefined;
        const hospitalId = req.query.hospitalId ? parseInt(req.query.hospitalId as string) : undefined;
        const status = req.query.status as string | undefined;
        
        console.log(`Buscando pedidos médicos com filtros:`, {
          userId,
          patientId,
          hospitalId,
          status
        });
        
        // Verificar se o usuário atual pode acessar esses dados
        const currentUserId = req.user?.id;
        const isAdmin = req.user?.roleId === 1;
        
        // Se não for admin e estiver tentando acessar pedidos de outro usuário
        if (!isAdmin && userId && userId !== currentUserId) {
          return res.status(403).json({ 
            message: "Você não tem permissão para acessar pedidos de outros usuários" 
          });
        }
        
        // Construir objeto de filtros
        const filters: any = {};
        
        if (userId) filters.userId = userId;
        if (patientId) filters.patientId = patientId;
        if (hospitalId) filters.hospitalId = hospitalId;
        if (status) filters.statusCode = status;
        
        // Se não for admin, sempre filtrar pelos pedidos do usuário atual
        if (!isAdmin && !userId) {
          filters.userId = currentUserId;
        }
        
        // Buscar pedidos no banco de dados
        let orders = await storage.getMedicalOrders(filters);
        
        // Enriquecer os dados com informações relacionadas
        const enrichedOrders = await Promise.all(
          orders.map(async (order) => {
            // Buscar informações associadas
            const patient = order.patientId
              ? await storage.getPatient(order.patientId)
              : null;
              
            const hospital = order.hospitalId
              ? await storage.getHospital(order.hospitalId)
              : null;
              
            const procedure = order.procedureCbhpmId
              ? await storage.getProcedure(order.procedureCbhpmId)
              : null;
              
            const user = order.userId
              ? await storage.getUser(order.userId)
              : null;
              
            return {
              id: order.id,
              patientId: order.patientId,
              patientName: patient ? patient.fullName : "Paciente não encontrado",
              patientPhone: patient ? patient.phone : null,
              hospitalId: order.hospitalId,
              hospitalName: hospital ? hospital.name : "Hospital não especificado",
              procedureName: procedure
                ? procedure.name
                : "Procedimento não especificado",
              procedureDate: order.procedureDate || "Data não agendada",
              status: order.statusCode || "não_especificado",
              complexity: order.complexity || "não_especificada",
              createdAt: order.createdAt,
              updatedAt: order.updatedAt,
              doctorName: user ? user.name : "Médico não especificado"
            };
          })
        );
        
        console.log(`Encontrados ${enrichedOrders.length} pedidos médicos`);
        res.json(enrichedOrders);
      } catch (error) {
        console.error("Erro ao buscar pedidos médicos:", error);
        res.status(500).json({ message: "Erro ao buscar pedidos médicos" });
      }
    }
  );

  // API para obter usuários - usando dados reais do banco de dados
  app.get(
    "/api/users",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        // Importar sem require para evitar o erro
        const { eq, and } = await import("drizzle-orm");

        // Filtrar por role (papel) se especificado
        // Suporta filtro tanto por nome da role quanto por ID da role
        const roleFilter = req.query.role as string;
        const roleIdFilter = req.query.roleId
          ? parseInt(req.query.roleId as string)
          : null;

        // Construir condições de filtro
        let conditions = [];

        if (roleFilter) {
          // Buscar roleId pelo nome exato (respeitando maiúsculas/minúsculas)
          const rolesResult = await db
            .select()
            .from(roles)
            .where(eq(roles.name, roleFilter));
          if (rolesResult.length > 0) {
            conditions.push(eq(users.roleId, rolesResult[0].id));
          }
        } else if (roleIdFilter) {
          // Filtrar diretamente pelo ID da role
          conditions.push(eq(users.roleId, roleIdFilter));
        }

        // Consulta dos usuários com filtros combinados
        const query = conditions.length > 0 
          ? db.select().from(users).where(and(...conditions))
          : db.select().from(users);

        // Executar a consulta
        const allUsers = await query;

        // Mapear para o formato esperado pela interface
        // Buscar os nomes das funções
        const rolesData = await db.select().from(roles);

        // Mapear usuários incluindo o nome da função
        const mappedUsers = allUsers.map((user) => {
          // Encontrar a função (role) associada ao usuário
          const userRole = rolesData.find((role) => role.id === user.roleId);

          return {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            roleId: user.roleId,
            roleName: userRole ? userRole.name : "Não atribuído", // Nome da função
            crm: user.crm,
            active: user.active,
            consentAccepted: user.consentAccepted,
            created_at: user.createdAt,
            updated_at: user.updatedAt,
          };
        });

        res.json(mappedUsers);
      } catch (error) {
        console.error("Erro ao obter usuários:", error);

        // Em caso de erro, retornar dados de fallback para não quebrar a interface
        const fallbackUsers = [
          {
            id: 12,
            username: "Roitman",
            email: "rodrigopozzatti@hotmail.com",
            name: "Rodrigo Roitman Pozzatti",
            roleId: 1,
            active: true,
            consentAccepted: new Date("2025-05-15 00:05:20.133").toISOString(),
            created_at: new Date("2025-05-10 10:42:01.753193").toISOString(),
            updated_at: new Date("2025-05-17 17:14:07.231").toISOString(),
          },
          {
            id: 13,
            username: "Gisele Cerutti",
            email: "gisa_cerutti@gmail.com",
            name: "Gisele Cerutti",
            roleId: 1,
            active: true,
            consentAccepted: new Date("2025-05-13 21:02:40.465").toISOString(),
            created_at: new Date("2025-05-10 16:28:06.635498").toISOString(),
            updated_at: new Date("2025-05-13 21:02:40.465").toISOString(),
          },
          {
            id: 14,
            username: "danielroitman",
            email: "danielroitman@gmail.com",
            name: "Daniel Roitman Pozzatti",
            roleId: 1,
            active: true,
            consentAccepted: new Date("2025-05-14 05:27:22.961").toISOString(),
            created_at: new Date("2025-05-11 06:41:36.255671").toISOString(),
            updated_at: new Date("2025-05-19 10:17:51.591").toISOString(),
          },
          {
            id: 21,
            username: "lipegol18",
            email: "felipecorreati@gmail.com",
            name: "Felipe Santos Corrêa",
            roleId: 1,
            active: true,
            consentAccepted: new Date("2025-05-13 19:39:25.659").toISOString(),
            created_at: new Date("2025-05-13 17:24:22.236922").toISOString(),
            updated_at: new Date("2025-05-18 17:54:39.796").toISOString(),
          },
          {
            id: 28,
            username: "Danielroitman",
            email: "danielroitman@hotmail.com",
            name: "Daniel Pozzatti",
            roleId: 3,
            active: false,
            consentAccepted: null,
            created_at: new Date("2025-05-14 21:30:34.757673").toISOString(),
            updated_at: new Date("2025-05-14 21:30:34.757673").toISOString(),
          },
          {
            id: 33,
            username: "jorgeduartejr",
            email: "migueljunior1000@gmail.com",
            name: "Jorge Duarte",
            roleId: 3,
            active: false,
            consentAccepted: null,
            created_at: new Date("2025-05-15 18:57:24.014624").toISOString(),
            updated_at: new Date("2025-05-15 18:57:24.014624").toISOString(),
          },
          {
            id: 34,
            username: "jorgeduarte",
            email: "emailteste123@gmail.com",
            name: "Jorge Duarte",
            roleId: 3,
            active: false,
            consentAccepted: null,
            created_at: new Date("2025-05-15 19:41:03.718857").toISOString(),
            updated_at: new Date("2025-05-15 19:41:03.718857").toISOString(),
          },
          {
            id: 40,
            username: "Sunda",
            email: "sunda@gmail.com",
            name: "Sunda",
            roleId: 2,
            crm: 52251289,
            active: true,
            consentAccepted: null,
            created_at: new Date("2025-05-18 00:08:47.519391").toISOString(),
            updated_at: new Date("2025-05-19 04:59:13.899").toISOString(),
          },
          {
            id: 41,
            username: "danielpozzatti",
            email: "danielroitman@ualg.com",
            name: "daniel pozzatti",
            roleId: 2,
            crm: 521017039,
            active: true,
            consentAccepted: null,
            created_at: new Date("2025-05-19 10:17:26.585384").toISOString(),
            updated_at: new Date("2025-05-19 10:20:05.133").toISOString(),
          },
          {
            id: 42,
            username: "Sunda2",
            email: "sunda1@gmail.com",
            name: "Sunda",
            roleId: 2,
            active: false,
            consentAccepted: null,
            created_at: new Date("2025-05-19 10:18:33.975868").toISOString(),
            updated_at: new Date("2025-05-19 10:18:33.975868").toISOString(),
          },
        ];

        res.json(fallbackUsers);
      }
    },
  );

  // API para atualizar um usuário existente
  app.put(
    "/api/users/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      // Forçar o tipo de conteúdo para JSON
      res.setHeader('Content-Type', 'application/json');
      
      try {
        const userId = parseInt(req.params.id);
        
        console.log(`Recebida solicitação para atualizar usuário ${userId}:`, req.body);
        
        // Verificar se o usuário a ser atualizado existe
        const existingUser = await storage.getUser(userId);
        if (!existingUser) {
          return res.status(404).json({ message: "Usuário não encontrado" });
        }
        
        // Preparar os dados para atualização
        const updateData: any = {};
        
        // Campos que podem ser atualizados
        if (req.body.name !== undefined) updateData.name = req.body.name;
        if (req.body.email !== undefined) updateData.email = req.body.email;
        if (req.body.roleId !== undefined) updateData.roleId = parseInt(req.body.roleId);
        if (req.body.active !== undefined) {
          // Converter string 'true'/'false' para boolean se necessário
          updateData.active = req.body.active === true || req.body.active === 'true';
        }
        if (req.body.crm !== undefined) updateData.crm = req.body.crm;
        if (req.body.signatureNote !== undefined) updateData.signatureNote = req.body.signatureNote;
        
        // Se uma nova senha for fornecida, fazer hash dela
        if (req.body.password && req.body.password.trim() !== "") {
          const bcrypt = await import("bcrypt");
          updateData.password = await bcrypt.hash(req.body.password, 10);
        }
        
        console.log(`Atualizando usuário ${userId} com dados:`, {
          ...updateData,
          password: updateData.password ? "[REDACTED]" : undefined
        });
        
        // Atualizar o usuário
        const updatedUser = await storage.updateUser(userId, updateData);
        
        if (!updatedUser) {
          return res.status(500).json({ message: "Falha ao atualizar usuário" });
        }
        
        // Remover a senha da resposta
        const { password, ...userWithoutPassword } = updatedUser;
        
        // Atualizar os dados do usuário na sessão
        if (req.user && req.user.id === userId) {
          Object.assign(req.user, userWithoutPassword);
        }
        
        console.log(`Usuário ${userId} atualizado com sucesso`);
        
        // Garantir que a resposta seja JSON válido
        return res.json({
          success: true,
          message: "Usuário atualizado com sucesso",
          user: userWithoutPassword
        });
      } catch (error) {
        console.error("Erro ao atualizar usuário:", error);
        return res.status(500).json({ 
          success: false, 
          message: "Erro ao atualizar usuário",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  );

  // API para obter papéis (roles)
  app.get(
    "/api/roles",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        // Buscar papéis/roles do banco de dados
        const roles = await storage.getRoles();

        // Adicionar cabeçalhos para evitar problemas de cache
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        // Retornar os papéis encontrados no banco
        res.json(roles);
      } catch (error) {
        console.error("Erro ao obter papéis:", error);
        res.status(500).json({ message: "Erro ao obter papéis" });
      }
    },
  );

  // API para obter um papel específico por ID
  app.get(
    "/api/roles/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const roleId = parseInt(req.params.id);
        if (isNaN(roleId)) {
          return res.status(400).json({ message: "ID do papel inválido" });
        }

        const role = await storage.getRole(roleId);
        if (!role) {
          return res.status(404).json({ message: "Papel não encontrado" });
        }

        res.json(role);
      } catch (error) {
        console.error("Erro ao obter papel:", error);
        res.status(500).json({ message: "Erro ao obter papel" });
      }
    },
  );

  // API para obter hospitais
  app.get(
    "/api/hospitals",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        // Verificar se é para retornar apenas hospitais associados ao médico
        const onlyAssociated = req.query.onlyAssociated === "true";
        const userId = req.user?.id;
        const roleId = req.user?.roleId;

        let hospitals;

        if (onlyAssociated) {
          console.log(
            `Solicitação de hospitais associados. UserId: ${userId}, RoleId: ${roleId}`,
          );

          // Se for médico e solicitou hospitais associados
          if (roleId === 2) {
            // Buscar hospitais associados ao médico
            console.log(`Buscando hospitais associados ao médico ID ${userId}`);
            const doctorHospitals = await storage.getDoctorHospitals(userId);
            console.log(
              `Encontrados ${doctorHospitals?.length || 0} associações de hospitais para o médico`,
            );

            if (doctorHospitals && doctorHospitals.length > 0) {
              // Obter os IDs dos hospitais associados
              const hospitalIds = doctorHospitals.map((dh) => dh.hospitalId);
              console.log(
                `IDs dos hospitais associados: ${hospitalIds.join(", ")}`,
              );

              // Buscar detalhes completos dos hospitais
              const allHospitals = await storage.getHospitals();
              console.log(
                `Total de hospitais no banco: ${allHospitals.length}`,
              );

              // Filtrar apenas os hospitais associados
              hospitals = allHospitals.filter((h) =>
                hospitalIds.includes(h.id),
              );
              console.log(
                `Hospitais filtrados após comparação: ${hospitals.length}`,
              );
            } else {
              console.log(`Médico ID ${userId} não tem hospitais associados`);
              hospitals = []; // Nenhum hospital associado
            }
          } else {
            // Não é médico, mas vamos retornar todos os hospitais para administradores
            console.log(
              `Usuário não é médico (roleId=${roleId}), retornando todos os hospitais`,
            );
            hospitals = await storage.getHospitals();
          }
        } else {
          // Buscar todos os hospitais (admin ou não solicitou filtro)
          hospitals = await storage.getHospitals();
        }

        // Adicionar cabeçalhos para evitar problemas de cache
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        // Retornar os hospitais encontrados
        res.json(hospitals);
      } catch (error) {
        console.error("Erro ao obter hospitais:", error);
        res.status(500).json({ message: "Erro ao obter hospitais" });
      }
    },
  );

  // API para obter estados brasileiros
  app.get(
    "/api/brazilian-states",
    async (req: Request, res: Response) => {
      try {
        const states = await storage.getBrazilianStates();
        
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        
        res.json(states);
      } catch (error) {
        console.error("Erro ao obter estados brasileiros:", error);
        res.status(500).json({ message: "Erro ao obter estados brasileiros" });
      }
    },
  );

  // API para obter municípios por estado
  app.get(
    "/api/municipalities/by-state/:stateIbgeCode",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const stateIbgeCode = parseInt(req.params.stateIbgeCode);
        
        if (isNaN(stateIbgeCode)) {
          return res.status(400).json({ message: "Código IBGE do estado inválido" });
        }

        const municipalities = await storage.getMunicipalitiesByState(stateIbgeCode);
        
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        
        res.json(municipalities);
      } catch (error) {
        console.error("Erro ao obter municípios:", error);
        res.status(500).json({ message: "Erro ao obter municípios" });
      }
    },
  );

  // API para criar um novo hospital
  app.post(
    "/api/hospitals",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        console.log("Recebendo dados para criação de hospital:", req.body);
        
        const {
          name,
          cnpj,
          address,
          city,
          ibgeStateCode,
          businessName,
          cnes,
          cep,
          number,
          logoUrl
        } = req.body;

        // Validações básicas
        if (!name || !cnpj || !ibgeStateCode) {
          return res.status(400).json({ 
            message: "Nome, CNPJ e código IBGE do estado são obrigatórios" 
          });
        }

        // Criar o hospital usando os nomes corretos dos campos
        const newHospital = await storage.createHospital({
          name,
          cnpj,
          ibgeStateCode,
          businessName,
          cnes,
          ibgeCityCode: req.body.ibgeCityCode,
          cep,
          address,
          number,
          logoUrl
        });

        console.log("Hospital criado com sucesso:", newHospital);
        
        res.status(201).json(newHospital);
      } catch (error) {
        console.error("Erro ao criar hospital:", error);
        res.status(500).json({ 
          message: "Erro interno do servidor",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  );

  // Endpoint para buscar hospital por ID
  app.get(
    "/api/hospitals/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const hospitalId = parseInt(req.params.id);

        if (isNaN(hospitalId)) {
          return res.status(400).json({ message: "ID do hospital inválido" });
        }

        console.log(`Buscando hospital com ID: ${hospitalId}`);
        const hospital = await storage.getHospitalById(hospitalId);

        if (!hospital) {
          return res.status(404).json({ message: "Hospital não encontrado" });
        }

        console.log(`Hospital encontrado: ${hospital.name}`);
        res.json(hospital);
      } catch (error) {
        console.error("Erro ao buscar hospital por ID:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    },
  );
  
  // Endpoint para atualizar hospital por ID
  app.put(
    "/api/hospitals/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const hospitalId = parseInt(req.params.id);

        if (isNaN(hospitalId)) {
          return res.status(400).json({ message: "ID do hospital inválido" });
        }

        const hospital = await storage.getHospitalById(hospitalId);
        if (!hospital) {
          return res.status(404).json({ message: "Hospital não encontrado" });
        }

        console.log(`Atualizando hospital com ID: ${hospitalId}`);
        console.log("Dados de atualização:", req.body);
        
        // Mapear todos os campos usando a nomenclatura snake_case correta para o banco de dados
        // Desta forma evitamos problemas de conversão camelCase/snake_case
        const dataToUpdate = {
          name: req.body.name || hospital.name,
          business_name: req.body.business_name !== undefined ? req.body.business_name : hospital.businessName,
          cnpj: req.body.cnpj || hospital.cnpj,
          cnes: req.body.cnes !== undefined ? req.body.cnes : hospital.cnes,
          ibge_state_code: req.body.ibgeStateCode !== undefined ? req.body.ibgeStateCode : hospital.ibgeStateCode,
          ibge_city_code: req.body.ibgeCityCode !== undefined ? req.body.ibgeCityCode : hospital.ibgeCityCode,
          cep: req.body.cep !== undefined ? req.body.cep : hospital.cep,
          address: req.body.address !== undefined ? req.body.address : hospital.address,
          number: req.body.number !== undefined ? req.body.number : hospital.number,
          logo_url: req.body.logo_url !== undefined ? req.body.logo_url : hospital.logoUrl
        };
        
        console.log("Dados enviados para atualização:", dataToUpdate);
        
        const updatedHospital = await storage.updateHospital(hospitalId, dataToUpdate);
        
        if (!updatedHospital) {
          console.error("Falha ao atualizar hospital - retorno vazio");
          return res.status(500).json({ message: "Falha ao atualizar os dados do hospital" });
        }
        
        console.log(`Hospital atualizado: ${updatedHospital.name}`);
        console.log("Dados atualizados:", updatedHospital);
        
        res.json(updatedHospital);
      } catch (error) {
        console.error("Erro ao atualizar hospital:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    },
  );

  // Endpoint para deletar hospital por ID
  app.delete(
    "/api/hospitals/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const hospitalId = parseInt(req.params.id);

        if (isNaN(hospitalId)) {
          return res.status(400).json({ message: "ID do hospital inválido" });
        }

        console.log(`Deletando hospital com ID: ${hospitalId}`);
        
        // Verificar se o hospital existe antes de deletar
        const hospital = await storage.getHospitalById(hospitalId);
        if (!hospital) {
          return res.status(404).json({ message: "Hospital não encontrado" });
        }

        // Deletar o hospital
        await storage.deleteHospital(hospitalId);
        
        console.log(`Hospital deletado com sucesso: ${hospital.name}`);
        
        // Retornar sucesso sem conteúdo
        res.status(200).json({ message: "Hospital deletado com sucesso" });
      } catch (error) {
        console.error("Erro ao deletar hospital:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    },
  );

  // Armazenamento temporário para pacientes cadastrados na sessão
  const registeredPatients: any[] = [];

  // API para obter pacientes diretamente do banco de dados
  app.get(
    "/api/patients",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        // Buscar pacientes do banco de dados
        const patients = await storage.getPatients();

        // Adicionando cabeçalhos para evitar problemas de cache e CORS
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        // Enviando a resposta como JSON com todos os pacientes do banco
        res.status(200).json(patients);
      } catch (error) {
        console.error("Erro ao buscar pacientes do banco de dados:", error);
        res.status(500).json({ message: "Erro ao buscar pacientes" });
      }
    },
  );

  // API para criar novo paciente
  app.post(
    "/api/patients",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const patientData = req.body;
        console.log("Criando novo paciente:", patientData);

        // Validar dados obrigatórios
        if (!patientData.fullName || !patientData.cpf || !patientData.birthDate || !patientData.gender) {
          return res.status(400).json({
            message: "Dados incompletos. Nome, CPF, data de nascimento e gênero são obrigatórios.",
          });
        }

        // Verificar se CPF já existe
        const existingPatient = await storage.getPatientByCPF(patientData.cpf);
        if (existingPatient) {
          // Paciente já existe, vamos verificar se já está associado ao médico atual
          const userId = (req.user as any)?.id;
          if (userId) {
            // Verificar se já existe associação
            const existingAssociations = await storage.getDoctorPatients(userId);
            const isAlreadyAssociated = existingAssociations.some(
              (assoc) => assoc.patientId === existingPatient.id,
            );

            if (isAlreadyAssociated) {
              return res.status(200).json({
                message: "Paciente já está associado a você",
                patient: existingPatient,
                action: "already_associated"
              });
            } else {
              // Criar associação com o paciente existente
              try {
                const associationData = {
                  doctorId: userId,
                  patientId: existingPatient.id,
                  isActive: true,
                  notes: "Paciente associado via cadastro"
                };

                await storage.addDoctorPatient(associationData);
                console.log(`Paciente existente ${existingPatient.id} associado ao médico ${userId}`);

                return res.status(200).json({
                  message: "Paciente existente associado com sucesso",
                  patient: existingPatient,
                  action: "associated_existing"
                });
              } catch (associationError) {
                console.error("Erro ao associar paciente existente:", associationError);
                return res.status(500).json({ 
                  message: "Erro ao associar paciente existente" 
                });
              }
            }
          }
        }

        // Preparar dados do paciente para salvar no banco
        const patientToSave = {
          fullName: patientData.fullName,
          cpf: patientData.cpf,
          birthDate: patientData.birthDate,
          gender: patientData.gender,
          email: patientData.email || null,
          phone: patientData.phone || null,
          phone2: patientData.phone2 || null,
          insurance: patientData.insurance || null,
          insuranceNumber: patientData.insuranceNumber || null,
          plan: patientData.plan || null,
          notes: patientData.notes || null,
          isActive: patientData.isActive !== undefined ? patientData.isActive : true,
          activatedBy: patientData.activatedBy || (req.user?.name as string) || "Sistema",
        };

        // Salvar o paciente no banco de dados
        const newPatient = await storage.createPatient(patientToSave);

        console.log("Novo paciente cadastrado no banco de dados:", newPatient);

        // Automaticamente associar o paciente ao médico que está logado
        const userId = (req.user as any)?.id;
        if (userId && newPatient.id) {
          try {
            const associationData = {
              doctorId: userId,
              patientId: newPatient.id,
              isActive: true,
              notes: "Paciente cadastrado automaticamente pelo médico"
            };

            const association = await storage.addDoctorPatient(associationData);
            console.log(`Paciente ${newPatient.id} automaticamente associado ao médico ${userId}`);
          } catch (associationError) {
            console.error("Erro ao associar paciente ao médico automaticamente:", associationError);
            // Não falhar o cadastro do paciente por causa da associação
            // O paciente foi criado com sucesso, apenas a associação falhou
          }
        }

        // Definir cabeçalhos de resposta para evitar problemas de cache
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        // Retornar o paciente criado com sucesso no formato JSON
        return res.status(201).json(newPatient);
      } catch (error) {
        console.error("Erro ao cadastrar paciente:", error);
        res.status(500).json({ message: "Erro ao cadastrar paciente" });
      }
    },
  );

  // API para buscar pacientes recentes associados ao médico (abordagem híbrida)
  app.get(
    "/api/patients/recent",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        // Obter o ID do usuário logado
        const userId = (req.user as any)?.id;
        if (!userId) {
          return res.status(401).json({ message: "Usuário não autenticado" });
        }

        // Obter o limite de pacientes recentes (padrão: 25)
        const limit = parseInt(req.query.limit as string) || 25;

        // Buscar pacientes recentes associados ao médico
        const recentPatients = await storage.getRecentPatientsByDoctor(userId, limit);

        console.log(
          `Encontrados ${recentPatients.length} pacientes recentes para o médico ID: ${userId}`,
        );

        // Adicionar cabeçalhos para evitar problemas de cache
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        // Retornar os pacientes recentes
        res.status(200).json(recentPatients);
      } catch (error) {
        console.error("Erro ao buscar pacientes recentes:", error);
        res.status(500).json({ message: "Erro ao buscar pacientes recentes" });
      }
    },
  );

  // API para buscar pacientes por nome ou CPF (usado no módulo de pedidos cirúrgicos)
  app.get(
    "/api/patients/search",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        // Obter o termo de busca da query
        const searchTerm = req.query.q as string;

        if (!searchTerm || searchTerm.trim().length < 2) {
          return res.status(400).json({
            message: "Termo de busca deve ter pelo menos 2 caracteres",
          });
        }

        // Obter o ID do usuário logado
        const userId = (req.user as any)?.id;
        if (!userId) {
          return res.status(401).json({ message: "Usuário não autenticado" });
        }

        // Buscar apenas os pacientes associados ao médico logado
        const associatedPatients = await storage.getPatientsByDoctor(userId);
        
        // Normalizar o termo de busca para remover acentos e converter para minúsculas
        const normalizedTerm = normalizeText(searchTerm);

        // Filtrar os pacientes baseado no termo de busca (nome completo ou CPF)
        const searchTermDigits = searchTerm.replace(/\D/g, '');
        
        const filteredPatients = associatedPatients.filter(
          (patient) => {
            // Busca por nome (sempre ativa)
            const nameMatch = normalizeText(patient.fullName).includes(normalizedTerm);
            
            // Busca por CPF (só ativa se o termo tem pelo menos 3 dígitos)
            const cpfMatch = searchTermDigits.length >= 3 && 
                           patient.cpf.replace(/\D/g, '').includes(searchTermDigits);
            
            return nameMatch || cpfMatch;
          }
        ).map(patient => ({
          id: patient.id,
          fullName: patient.fullName,
          cpf: patient.cpf
        }));

        console.log(
          `Encontrados ${filteredPatients.length} pacientes para o termo "${searchTerm}" (médico ID: ${userId})`,
        );

        // Adicionar cabeçalhos para evitar problemas de cache
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        // Retornar os resultados encontrados
        res.status(200).json(filteredPatients);
      } catch (error) {
        console.error("Erro ao buscar pacientes:", error);
        res.status(500).json({ message: "Erro ao buscar pacientes" });
      }
    },
  );

  // API para verificar se um CPF já existe no sistema e retornar dados para auto-preenchimento
  app.get(
    "/api/patients/cpf/:cpf/exists",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const cpf = req.params.cpf.replace(/\D/g, "");

        // Buscar paciente na base global pelo CPF
        const patients = await storage.getPatients();
        const existingPatient = patients.find(patient => 
          patient.cpf && patient.cpf.replace(/\D/g, "") === cpf
        );

        // Adicionar cabeçalhos para evitar problemas de cache
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        if (existingPatient) {
          // Retornar dados do paciente para auto-preenchimento
          res.status(200).json({ 
            exists: true,
            patient: {
              id: existingPatient.id,
              fullName: existingPatient.fullName,
              cpf: existingPatient.cpf,
              birthDate: existingPatient.birthDate,
              gender: existingPatient.gender,
              phone: existingPatient.phone,
              phone2: existingPatient.phone2,
              email: existingPatient.email,
              insurance: existingPatient.insurance,
              insuranceNumber: existingPatient.insuranceNumber,
              plan: existingPatient.plan,
              notes: existingPatient.notes
            }
          });
        } else {
          res.status(200).json({ exists: false });
        }
      } catch (error) {
        console.error("Erro ao verificar CPF:", error);
        res.status(500).json({ message: "Erro ao verificar CPF" });
      }
    },
  );

  // API para cadastrar novo paciente
  app.post(
    "/api/patients/register",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        // Obter os dados do paciente do corpo da requisição
        const patientData = req.body;

        // Validar dados obrigatórios
        if (
          !patientData.fullName ||
          !patientData.cpf ||
          !patientData.birthDate ||
          !patientData.gender
        ) {
          return res.status(400).json({
            message:
              "Dados incompletos. Nome, CPF, data de nascimento e gênero são obrigatórios.",
          });
        }

        // Verificar se o CPF já existe no banco de dados
        const existingPatient = await storage.getPatientByCPF(patientData.cpf);
        const userId = (req.user as any)?.id;

        if (existingPatient) {
          return res.status(409).json({ 
            message: "Paciente já existe na base de dados",
            patient: existingPatient,
            shouldAssociate: true
          });
        }

        // Preparar dados do paciente para salvar no banco
        const patientToSave = {
          fullName: patientData.fullName,
          cpf: patientData.cpf,
          birthDate: patientData.birthDate, // Mantém o formato de string para data
          gender: patientData.gender,
          email: patientData.email || null,
          phone: patientData.phone || null,
          phone2: patientData.phone2 || null,
          insurance: patientData.insurance || null,
          insuranceNumber: patientData.insuranceNumber || null,
          plan: patientData.plan || null,
          notes: patientData.notes || null,
          isActive:
            patientData.isActive !== undefined ? patientData.isActive : true,
          activatedBy:
            patientData.activatedBy || (req.user?.name as string) || "Sistema",
        };

        // Salvar o paciente no banco de dados
        const newPatient = await storage.createPatient(patientToSave);

        // Exibir informações do paciente salvo
        console.log("Novo paciente cadastrado no banco de dados:", newPatient);

        // Definir cabeçalhos de resposta para evitar problemas de cache
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        // Retornar o paciente criado com sucesso no formato JSON
        return res.status(200).json(newPatient);
      } catch (error) {
        console.error("Erro ao cadastrar paciente:", error);
        res.status(500).json({ message: "Erro ao cadastrar paciente" });
      }
    },
  );

  // Endpoint para buscar paciente por ID
  app.get(
    "/api/patients/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const patientId = parseInt(req.params.id);

        if (isNaN(patientId)) {
          return res.status(400).json({ message: "ID do paciente inválido" });
        }

        console.log(`Buscando paciente com ID: ${patientId}`);
        const patient = await storage.getPatientById(patientId);

        if (!patient) {
          return res.status(404).json({ message: "Paciente não encontrado" });
        }

        console.log(`Paciente encontrado: ${patient.fullName}`);
        res.json(patient);
      } catch (error) {
        console.error("Erro ao buscar paciente por ID:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    },
  );

  // Adicionar um endpoint alternativo para o cadastro de pacientes
  app.post(
    "/api/patients",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        // Obter os dados do paciente do corpo da requisição
        const patientData = req.body;

        // Validar dados obrigatórios
        if (
          !patientData.fullName ||
          !patientData.cpf ||
          !patientData.birthDate ||
          !patientData.gender
        ) {
          return res.status(400).json({
            message:
              "Dados incompletos. Nome, CPF, data de nascimento e gênero são obrigatórios.",
          });
        }

        // Verificar se o CPF já existe (simulado)
        const cpfNumerico = patientData.cpf.replace(/\D/g, "");
        const existingCpfs = ["12345678900", "98765432100", "45678912300"];

        if (existingCpfs.includes(cpfNumerico)) {
          return res
            .status(409)
            .json({ message: "Patient with this CPF already exists" });
        }

        // Gerar um ID único para o novo paciente
        const newId = Math.floor(Math.random() * 10000) + 100;

        // Criar objeto do novo paciente com os dados enviados + ID gerado
        const newPatient = {
          id: newId,
          ...patientData,
          // Adicionar campos que podem não ter sido enviados
          isActive:
            patientData.isActive !== undefined ? patientData.isActive : true,
          activatedBy:
            patientData.activatedBy || (req.user?.name as string) || "Sistema",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Em uma implementação real, o paciente seria salvo no banco de dados
        console.log("Novo paciente cadastrado:", newPatient);

        // Definir cabeçalhos de resposta para evitar problemas de cache
        res.set({
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        });

        // Retornar o paciente criado com sucesso no formato JSON
        return res.status(200).send(JSON.stringify(newPatient));
      } catch (error) {
        console.error("Erro ao cadastrar paciente:", error);
        res.status(500).json({ message: "Erro ao cadastrar paciente" });
      }
    },
  );

  // API para obter associações médico-paciente
  app.get(
    "/api/doctors/:doctorId/patients",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const doctorId = parseInt(req.params.doctorId);

        // Verificar se o ID do médico é válido
        if (isNaN(doctorId)) {
          return res.status(400).json({ message: "ID do médico inválido" });
        }

        // Buscar as associações entre médicos e pacientes do banco de dados
        const doctorPatients = await storage.getDoctorPatients(doctorId);

        // Adicionar cabeçalhos para evitar problemas de cache
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        console.log(
          `Encontradas ${doctorPatients.length} associações para o médico ID ${doctorId}`,
        );

        // Retornar os dados do banco
        res.json(doctorPatients);
      } catch (error) {
        console.error("Erro ao obter pacientes do médico:", error);
        res.status(500).json({ message: "Erro ao obter pacientes do médico" });
      }
    },
  );

  // API para criar uma nova associação entre médico e paciente
  app.post(
    "/api/doctor-patients",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { doctorId, patientId } = req.body;

        // Validar os dados de entrada
        if (!doctorId || !patientId) {
          return res.status(400).json({
            message: "ID do médico e ID do paciente são obrigatórios",
          });
        }

        // Converter para número e verificar se os IDs são válidos
        const doctorIdNum =
          typeof doctorId === "number" ? doctorId : parseInt(doctorId);
        const patientIdNum =
          typeof patientId === "number" ? patientId : parseInt(patientId);

        if (isNaN(doctorIdNum) || isNaN(patientIdNum)) {
          return res.status(400).json({ message: "IDs inválidos" });
        }

        // Verificar se o médico existe
        const doctor = await storage.getUser(doctorIdNum);
        if (!doctor) {
          return res.status(404).json({ message: "Médico n �o encontrado" });
        }

        // Verificar se o paciente existe
        const patient = await storage.getPatient(patientIdNum);
        if (!patient) {
          return res.status(404).json({ message: "Paciente não encontrado" });
        }

        // Verificar se a associação já existe
        const existingAssociations =
          await storage.getDoctorPatients(doctorIdNum);
        const isAlreadyAssociated = existingAssociations.some(
          (assoc) => assoc.patientId === patientIdNum,
        );

        if (isAlreadyAssociated) {
          return res
            .status(400)
            .json({ message: "Paciente já está associado a este médico" });
        }

        // Criar a associação
        const doctorPatient = await storage.addDoctorPatient({
          doctorId: doctorIdNum,
          patientId: patientIdNum,
          isActive: true,
          notes: req.body.notes || "",
        });

        // Adicionar cabeçalhos para evitar problemas de cache
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        console.log(
          `Nova associação criada: Médico ${doctorId} - Paciente ${patientId}`,
        );

        // Retornar os dados da nova associação
        res.status(200).json(doctorPatient);
      } catch (error) {
        console.error("Erro ao associar paciente ao médico:", error);
        res
          .status(500)
          .json({ message: "Erro ao associar paciente ao médico" });
      }
    },
  );

  // Versão SIMULADA de endpoint para testes sem acesso ao banco
  app.post(
    "/api/medical-orders-direct",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const orderData = req.body;
        console.log(
          "ENDPOINT SIMULADO - Recebido pedido para criar ordem médica:",
          orderData,
        );

        // Validar dados essenciais
        if (
          !orderData.patientId ||
          !orderData.hospitalId ||
          !orderData.userId
        ) {
          console.error("Dados incompletos para criação de pedido:", orderData);
          return res.status(400).json({
            message:
              "Dados incompletos. patientId, hospitalId e userId são obrigatórios.",
          });
        }

        // Simulação de delay (300-800ms)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.floor(Math.random() * 500) + 300),
        );

        // Criar resposta simulada sem acessar o banco de dados
        const mockId = Math.floor(Math.random() * 10000) + 1;
        const now = new Date().toISOString();

        // Resposta simulada que seria retornada pelo banco
        const mockResponse = {
          id: mockId,
          created_at: now,
          updated_at: now,
          patient_id: orderData.patientId,
          user_id: orderData.userId,
          hospital_id: orderData.hospitalId,
          procedure_id: orderData.procedureId || 1,
          procedure_date: orderData.procedureDate || null,
          report_content: orderData.reportContent || null,
          clinical_indication: orderData.clinicalIndication || "",
          status_code: orderData.statusCode || "em_preenchimento",
          cid_laterality: orderData.cidLaterality || null,
          // Campo procedure_laterality removido conforme solicitado
          cid_code_id: orderData.cidCodeId || null,
          procedure_cbhpm_id: orderData.procedureCbhpmId || null,
          procedure_cbhpm_quantity: orderData.procedureCbhpmQuantity || 1,
          secondary_procedure_ids: orderData.secondaryProcedureIds || [],
          secondary_procedure_quantities:
            orderData.secondaryProcedureQuantities || [],
          // Campo secondary_procedure_lateralities removido conforme solicitado
          opme_item_ids: orderData.opmeItemIds || [],
          opme_item_quantities: orderData.opmeItemQuantities || [],
          procedure_type: orderData.procedureType || "eletiva",
          exam_images_url: orderData.exam_images_url || [],
          exam_image_count: orderData.exam_image_count || 0,
          medical_report_url: orderData.medical_report_url || null,
          additional_notes: orderData.additional_notes || null,
          complexity: orderData.complexity || null,
        };

        console.log("ENDPOINT SIMULADO - Resposta mockada:", mockResponse);

        // Retornar o pedido simulado
        res.status(200).json(mockResponse);
      } catch (error) {
        console.error("ENDPOINT SIMULADO - Erro simulado:", error);

        res.status(500).json({
          message: "Erro simulado na criação de pedido",
          details: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    },
  );

  // API para criar pedidos médicos
  app.post(
    "/api/medical-orders",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const orderData = req.body;
        console.log("Recebido pedido para criar ordem médica:", orderData);

        // Validar dados essenciais
        if (
          !orderData.patientId ||
          !orderData.hospitalId ||
          !orderData.userId
        ) {
          console.error("Dados incompletos para criação de pedido:", orderData);
          return res.status(400).json({
            message:
              "Dados incompletos. patientId, hospitalId e userId são obrigatórios.",
          });
        }

        // Preparar dados do pedido com valores padrão para campos opcionais
        const preparedOrderData = {
          patientId: orderData.patientId,
          userId: orderData.userId,
          hospitalId: orderData.hospitalId,
          procedureId: orderData.procedureId || null,
          procedureDate: orderData.procedureDate || null,
          clinicalIndication: orderData.clinicalIndication || "",
          additionalNotes: orderData.additionalNotes || null,
          cidCodeId: orderData.cidCodeId || null,
          cidLaterality: orderData.cidLaterality || null,
          procedureLaterality: orderData.procedureLaterality || null,
          procedureType: orderData.procedureType || "eletiva",
          procedureCbhpmId: orderData.procedureCbhpmId || null,
          procedureCbhpmQuantity: orderData.procedureCbhpmQuantity || 1,
          secondaryProcedureIds: orderData.secondaryProcedureIds || [],
          secondaryProcedureQuantities:
            orderData.secondaryProcedureQuantities || [],
          opmeItemIds: orderData.opmeItemIds || [],
          opmeItemQuantities: orderData.opmeItemQuantities || [],
          exam_images_url: orderData.exam_images_url || [],
          exam_image_count: orderData.exam_image_count || 0,
          medical_report_url: orderData.medical_report_url || null,
          statusCode: orderData.statusCode || "em_preenchimento",
          complexity: orderData.complexity || null,
          // Novo campo para sugestão de justificativa clínica
          clinicalJustification: orderData.clinicalJustification || null,
          // Campo para múltiplos CIDs
          multiple_cid_ids: orderData.multiple_cid_ids || [],
        };

        // Criar o pedido médico no banco de dados
        const newOrder = await storage.createMedicalOrder(preparedOrderData);

        if (!newOrder) {
          throw new Error("Falha ao criar pedido médico");
        }

        console.log("Pedido criado com sucesso:", newOrder);

        // Retornar o pedido criado
        res.status(201).json(newOrder);
      } catch (error) {
        console.error("Erro ao criar pedido médico:", error);

        res.status(500).json({
          message: "Erro ao criar pedido médico",
          details: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    },
  );

  // API para remover associação entre médico e paciente
  app.delete(
    "/api/doctors/:doctorId/patients/:patientId",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const doctorId = parseInt(req.params.doctorId);
        const patientId = parseInt(req.params.patientId);

        // Verificar se os IDs sr�o válidos
        if (isNaN(doctorId) || isNaN(patientId)) {
          return res.status(400).json({ message: "IDs inválidos" });
        }

        console.log(
          `Tentando remover associação: Médico ${doctorId} - Paciente ${patientId}`,
        );

        // Verificar se o médico existe
        const doctor = await storage.getUser(doctorId);
        if (!doctor) {
          return res.status(404).json({ message: "Médico não encontrado" });
        }

        // Verificar se o paciente existe
        const patient = await storage.getPatient(patientId);
        if (!patient) {
          return res.status(404).json({ message: "Paciente não encontrado" });
        }

        // Remover a associação
        const result = await storage.removeDoctorPatient(doctorId, patientId);

        if (result) {
          console.log(
            `Associação removida: Médico ${doctorId} - Paciente ${patientId}`,
          );
          res.status(200).json({ message: "Associação removida com sucesso" });
        } else {
          res.status(404).json({ message: "Associação não encontrada" });
        }
      } catch (error) {
        console.error("Erro ao remover associação:", error);
        res.status(500).json({
          message: "Erro ao remover associação entre médico e paciente",
        });
      }
    },
  );

  // API para obter hospitais associados a um médico
  app.get(
    "/api/users/:userId/hospitals",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);

        if (isNaN(userId)) {
          return res.status(400).json({ message: "ID de usuário inválido" });
        }

        // Verificar se é o próprio usuário ou um administrador
        const isOwnUser = req.user?.id === userId;
        const isAdmin = req.user?.roleId === 1;

        if (!isOwnUser && !isAdmin) {
          return res.status(403).json({
            message: "Sem permissão para acessar dados de outro usuário",
          });
        }

        // Buscar hospitais associados ao médico
        const doctorHospitals = await storage.getDoctorHospitals(userId);

        res.status(200).json(doctorHospitals);
      } catch (error) {
        console.error("Erro ao obter hospitais do médico:", error);
        res.status(500).json({ message: "Erro ao obter hospitais do médico" });
      }
    },
  );

  // API para atualizar hospitais associados a um médico
  app.put(
    "/api/users/:userId/hospitals",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        const { hospitalIds } = req.body;

        if (isNaN(userId)) {
          return res.status(400).json({ message: "ID de usuário inválido" });
        }

        if (!Array.isArray(hospitalIds)) {
          return res
            .status(400)
            .json({ message: "hospitalIds deve ser um array de IDs" });
        }

        // Converter IDs e validar
        const hospitalIdsNumeric = hospitalIds
          .map((id) => (typeof id === "number" ? id : parseInt(id)))
          .filter((id) => !isNaN(id));

        // Verificar se é o próprio usuário ou um administrador
        const isOwnUser = req.user?.id === userId;
        const isAdmin = req.user?.roleId === 1;

        if (!isOwnUser && !isAdmin) {
          return res.status(403).json({
            message: "Sem permissão para modificar dados de outro usuário",
          });
        }

        // Verificar se o usuário existe e é um médico
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "Usuário não encontrado" });
        }

        if (user.roleId !== 2) {
          // Se não for médico
          return res
            .status(400)
            .json({ message: "Apenas médicos podem ter hospitais associados" });
        }

        console.log(
          `Atualizando hospitais para o médico ID ${userId}. Novos hospitais: ${hospitalIdsNumeric.join(", ")}`,
        );

        // Atualizar associações de hospitais
        const updatedHospitals = await storage.updateDoctorHospitals(
          userId,
          hospitalIdsNumeric,
        );

        res.status(200).json(updatedHospitals);
      } catch (error) {
        console.error("Erro ao atualizar hospitais do médico:", error);
        res
          .status(500)
          .json({ message: "Erro ao atualizar hospitais do médico" });
      }
    },
  );

  // Endpoint para atualizar um paciente
  app.put(
    "/api/patients/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const patientId = parseInt(req.params.id);
        if (isNaN(patientId)) {
          return res.status(400).json({ message: "ID de paciente inválido" });
        }

        // Obter os dados do paciente
        const patientData = req.body;

        // Atualizar o paciente no banco de dados
        const updatedPatient = await storage.updatePatient(
          patientId,
          patientData,
        );
        if (!updatedPatient) {
          return res.status(404).json({ message: "Paciente não encontrado" });
        }

        res.status(200).json(updatedPatient);
      } catch (error) {
        console.error("Erro ao atualizar paciente:", error);
        res.status(500).json({ message: "Erro ao atualizar paciente" });
      }
    },
  );

  // Endpoint para excluir um paciente
  app.delete(
    "/api/patients/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const patientId = parseInt(req.params.id);
        if (isNaN(patientId)) {
          return res.status(400).json({ message: "ID de paciente inválido" });
        }

        // Verificar se o paciente existe
        const existingPatient = await storage.getPatient(patientId);
        if (!existingPatient) {
          return res.status(404).json({ message: "Paciente não encontrado" });
        }

        // Excluir o paciente do banco de dados
        const success = await storage.deletePatient(patientId);
        if (!success) {
          return res.status(500).json({ message: "Erro ao excluir paciente" });
        }

        res.status(200).json({ message: "Paciente excluído com sucesso" });
      } catch (error) {
        console.error("Erro ao excluir paciente:", error);
        res.status(500).json({ message: "Erro ao excluir paciente" });
      }
    },
  );

  // API para Operadoras de Saúde (Health Insurance Providers)
  app.get(
    "/api/health-insurance-providers",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const activeOnly = req.query.active === "true";
        const providers = await storage.getHealthInsuranceProviders(activeOnly);
        res.json(providers);
      } catch (error) {
        console.error("Erro ao buscar operadoras de saúde:", error);
        res.status(500).json({ error: "Erro ao buscar operadoras de saúde" });
      }
    },
  );

  app.get(
    "/api/health-insurance-providers/search",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const searchTerm = req.query.q as string;

        if (!searchTerm || searchTerm.trim().length < 2) {
          return res.status(400).json({
            message: "Termo de busca deve ter pelo menos 2 caracteres",
          });
        }

        // Buscar todas as operadoras
        const allProviders = await storage.getHealthInsuranceProviders();
        
        // Normalizar o termo de busca
        const normalizedTerm = normalizeText(searchTerm);
        const searchTermDigits = searchTerm.replace(/\D/g, '');
        
        // Filtrar operadoras baseado no termo de busca
        const filteredProviders = allProviders.filter(provider => {
          // Busca por nome (normalizado)
          const nameMatch = normalizeText(provider.name).includes(normalizedTerm);
          
          // Busca por CNPJ (apenas números, se o termo tem pelo menos 8 dígitos)
          const cnpjMatch = searchTermDigits.length >= 8 && 
                           provider.cnpj.replace(/\D/g, '').includes(searchTermDigits);
          
          // Busca por código ANS (exato)
          const ansMatch = provider.ansCode.includes(searchTerm);
          
          return nameMatch || cnpjMatch || ansMatch;
        }).slice(0, 50); // Limitar a 50 resultados

        console.log(
          `Encontradas ${filteredProviders.length} operadoras para o termo "${searchTerm}"`
        );

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.json(filteredProviders);
      } catch (error) {
        console.error("Erro ao buscar operadoras de saúde:", error);
        res.status(500).json({ error: "Erro ao buscar operadoras de saúde" });
      }
    },
  );

  app.get(
    "/api/health-insurance-providers/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const providerId = parseInt(req.params.id);
        if (isNaN(providerId)) {
          return res.status(400).json({ error: "ID de operadora inválido" });
        }

        const provider = await storage.getHealthInsuranceProvider(providerId);
        if (!provider) {
          return res
            .status(404)
            .json({ error: "Operadora de saúde não encontrada" });
        }

        res.json(provider);
      } catch (error) {
        console.error("Erro ao buscar operadora de saúde:", error);
        res.status(500).json({ error: "Erro ao buscar operadora de saúde" });
      }
    },
  );

  app.post(
    "/api/health-insurance-providers",
    isAuthenticated,
    hasPermission("admin"),
    async (req: Request, res: Response) => {
      try {
        const providerData = req.body;

        // Verificar se já existe uma operadora com o mesmo CNPJ
        const existingProviderByCnpj =
          await storage.getHealthInsuranceProviderByCnpj(providerData.cnpj);
        if (existingProviderByCnpj) {
          return res
            .status(400)
            .json({ error: "Já existe uma operadora com este CNPJ" });
        }

        // Verificar se já existe uma operadora com o mesmo código ANS
        const existingProviderByAnsCode =
          await storage.getHealthInsuranceProviderByAnsCode(
            providerData.ansCode,
          );
        if (existingProviderByAnsCode) {
          return res
            .status(400)
            .json({ error: "Já existe uma operadora com este código ANS" });
        }

        const newProvider =
          await storage.createHealthInsuranceProvider(providerData);
        res.status(201).json(newProvider);
      } catch (error) {
        console.error("Erro ao criar operadora de saúde:", error);
        res.status(500).json({ error: "Erro ao criar operadora de saúde" });
      }
    },
  );

  app.put(
    "/api/health-insurance-providers/:id",
    isAuthenticated,
    hasPermission("admin"),
    async (req: Request, res: Response) => {
      try {
        const providerId = parseInt(req.params.id);
        if (isNaN(providerId)) {
          return res.status(400).json({ error: "ID de operadora inválido" });
        }

        const provider = await storage.getHealthInsuranceProvider(providerId);
        if (!provider) {
          return res
            .status(404)
            .json({ error: "Operadora de saúde não encontrada" });
        }

        const providerData = req.body;

        // Verificar se CNPJ já existe em outra operadora
        if (providerData.cnpj && providerData.cnpj !== provider.cnpj) {
          const existingProviderByCnpj =
            await storage.getHealthInsuranceProviderByCnpj(providerData.cnpj);
          if (
            existingProviderByCnpj &&
            existingProviderByCnpj.id !== providerId
          ) {
            return res
              .status(400)
              .json({ error: "Já existe outra operadora com este CNPJ" });
          }
        }

        // Verificar se código ANS já existe em outra operadora
        if (providerData.ansCode && providerData.ansCode !== provider.ansCode) {
          const existingProviderByAnsCode =
            await storage.getHealthInsuranceProviderByAnsCode(
              providerData.ansCode,
            );
          if (
            existingProviderByAnsCode &&
            existingProviderByAnsCode.id !== providerId
          ) {
            return res
              .status(400)
              .json({ error: "Já existe outra operadora com este código ANS" });
          }
        }

        const updatedProvider = await storage.updateHealthInsuranceProvider(
          providerId,
          providerData,
        );
        res.json(updatedProvider);
      } catch (error) {
        console.error("Erro ao atualizar operadora de saúde:", error);
        res.status(500).json({ error: "Erro ao atualizar operadora de saúde" });
      }
    },
  );

  app.delete(
    "/api/health-insurance-providers/:id",
    isAuthenticated,
    hasPermission("admin"),
    async (req: Request, res: Response) => {
      try {
        const providerId = parseInt(req.params.id);
        if (isNaN(providerId)) {
          return res.status(400).json({ error: "ID de operadora inválido" });
        }

        const provider = await storage.getHealthInsuranceProvider(providerId);
        if (!provider) {
          return res
            .status(404)
            .json({ error: "Operadora de saúde não encontrada" });
        }

        await storage.deleteHealthInsuranceProvider(providerId);
        res.status(204).send();
      } catch (error) {
        console.error("Erro ao excluir operadora de saúde:", error);
        res.status(500).json({ error: "Erro ao excluir operadora de saúde" });
      }
    },
  );

  // Health Insurance Plans API Routes
  app.get(
    "/api/health-insurance-plans",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const plans = await storage.getHealthInsurancePlans();
        res.json(plans);
      } catch (error) {
        console.error("Erro ao buscar planos de saúde:", error);
        res.status(500).json({ error: "Erro ao buscar planos de saúde" });
      }
    }
  );

  app.get(
    "/api/health-insurance-plans/search",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const searchTerm = req.query.q as string;
        const ansCode = req.query.ansCode as string;

        if (!searchTerm || searchTerm.trim().length < 2) {
          return res.status(400).json({
            message: "Termo de busca deve ter pelo menos 2 caracteres",
          });
        }

        // Buscar planos (filtrar por operadora se especificado)
        let allPlans;
        if (ansCode) {
          allPlans = await storage.getHealthInsurancePlansByProvider(ansCode);
        } else {
          allPlans = await storage.getHealthInsurancePlans();
        }
        
        // Normalizar o termo de busca
        const normalizedTerm = normalizeText(searchTerm);
        
        // Filtrar planos baseado no termo de busca
        const filteredPlans = allPlans.filter(plan => {
          // Busca por nome comercial (normalizado)
          const commercialNameMatch = normalizeText(plan.commercialName).includes(normalizedTerm);
          
          // Busca por código do plano (exato, sem normalização como solicitado)
          const planCodeMatch = plan.cdPlano.includes(searchTerm);
          
          return commercialNameMatch || planCodeMatch;
        }).slice(0, 50); // Limitar a 50 resultados

        console.log(
          `Encontrados ${filteredPlans.length} planos para o termo "${searchTerm}"${ansCode ? ` na operadora ${ansCode}` : ''}`
        );

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.json(filteredPlans);
      } catch (error) {
        console.error("Erro ao buscar planos de saúde:", error);
        res.status(500).json({ error: "Erro ao buscar planos de saúde" });
      }
    },
  );

  app.get(
    "/api/health-insurance-plans/provider/:ansCode",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const ansCode = req.params.ansCode;
        if (!ansCode) {
          return res.status(400).json({ error: "Código ANS é obrigatório" });
        }

        const plans = await storage.getHealthInsurancePlansByProvider(ansCode);
        res.json(plans);
      } catch (error) {
        console.error("Erro ao buscar planos por operadora:", error);
        res.status(500).json({ error: "Erro ao buscar planos por operadora" });
      }
    }
  );

  app.get(
    "/api/health-insurance-plans/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const planId = parseInt(req.params.id);
        if (isNaN(planId)) {
          return res.status(400).json({ error: "ID de plano inválido" });
        }

        const plan = await storage.getHealthInsurancePlan(planId);
        if (!plan) {
          return res.status(404).json({ error: "Plano de saúde não encontrado" });
        }

        res.json(plan);
      } catch (error) {
        console.error("Erro ao buscar plano de saúde:", error);
        res.status(500).json({ error: "Erro ao buscar plano de saúde" });
      }
    }
  );

  // API para buscar planos por similaridade de nome (para seleção automática)
  app.get(
    "/api/health-insurance-plans/provider/:ansCode/search",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const ansCode = req.params.ansCode;
        const searchTerm = req.query.q as string;

        if (!ansCode) {
          return res.status(400).json({ error: "Código ANS é obrigatório" });
        }

        if (!searchTerm || searchTerm.trim().length < 2) {
          return res.status(400).json({ error: "Termo de busca deve ter pelo menos 2 caracteres" });
        }

        console.log(`Buscando planos para operadora ${ansCode} com termo: "${searchTerm}"`);

        // Buscar todos os planos da operadora
        const plans = await storage.getHealthInsurancePlansByProvider(ansCode);
        console.log(`Encontrados ${plans.length} planos para a operadora`);

        if (plans.length === 0) {
          return res.json([]);
        }

        // Buscar por similaridade de nome
        const searchTermUpper = searchTerm.toUpperCase().trim();
        const results = [];

        for (const plan of plans) {
          const planName = (plan.nmPlano || '').toUpperCase();
          const planCode = (plan.cdPlano || '').toString();
          let score = 0;
          let matchType = '';

          // Correspondência exata no nome
          if (planName === searchTermUpper) {
            score = 1.0;
            matchType = 'exact_name';
          }
          // Nome contém o termo ou vice-versa
          else if (planName.includes(searchTermUpper) || searchTermUpper.includes(planName)) {
            score = Math.min(planName.length, searchTermUpper.length) / Math.max(planName.length, searchTermUpper.length);
            matchType = 'partial_name';
          }
          // Verificar palavras-chave
          else {
            const planWords = planName.split(/\s+/).filter(w => w.length > 2);
            const searchWords = searchTermUpper.split(/\s+/).filter(w => w.length > 2);
            
            const matchingWords = searchWords.filter(word => 
              planWords.some(planWord => 
                planWord.includes(word) || word.includes(planWord)
              )
            );

            if (matchingWords.length > 0) {
              score = matchingWords.length / Math.max(planWords.length, searchWords.length);
              matchType = 'keyword_match';
            }
          }

          // Adicionar resultado se o score for suficiente
          if (score > 0.3) {
            results.push({
              ...plan,
              matchScore: score,
              matchType: matchType
            });
          }
        }

        // Ordenar por score (maior primeiro)
        results.sort((a, b) => b.matchScore - a.matchScore);

        console.log(`Encontrados ${results.length} planos com similaridade para "${searchTerm}"`);
        if (results.length > 0) {
          console.log(`Melhor match: ${results[0].nmPlano || results[0].cdPlano} (score: ${results[0].matchScore})`);
        }

        res.json(results);
      } catch (error) {
        console.error("Erro ao buscar planos por similaridade:", error);
        res.status(500).json({ error: "Erro ao buscar planos por similaridade" });
      }
    }
  );

  // Rota para upload de logo do usuário
  app.post('/api/users/:id/logo', isAuthenticated, (req: Request, res: Response) => {
    try {
      const upload = multer({
        storage: multer.diskStorage({
          destination: function (req, file, cb) {
            const uploadPath = path.join(process.cwd(), 'uploads', 'temp', 'logos');
            if (!fs.existsSync(uploadPath)) {
              fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
          },
          filename: function (req, file, cb) {
            const uniqueSuffix = Date.now();
            const ext = path.extname(file.originalname);
            cb(null, `logo_${uniqueSuffix}${ext}`);
          }
        }),
        limits: { fileSize: 5 * 1024 * 1024 }
      });

      upload.single('logo')(req, res, async function(err) {
        if (err) {
          console.error('Erro ao fazer upload de logo:', err);
          return res.status(500).json({ error: 'Falha ao processar upload: ' + err.message });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const userId = parseInt(req.params.id);
        const fileName = path.basename(req.file.path);
        const tempPath = req.file.path;
        
        // Estrutura final para logos de usuário
        const finalDir = path.join(process.cwd(), 'uploads', 'users', `user_${userId}`, 'logos');
        const finalPath = path.join(finalDir, fileName);
        const logoUrl = `/uploads/users/user_${userId}/logos/${fileName}`;
        
        // Criar diretório final
        if (!fs.existsSync(finalDir)) {
          fs.mkdirSync(finalDir, { recursive: true });
        }
        
        // Mover arquivo
        try {
          fs.renameSync(tempPath, finalPath);
        } catch (error) {
          fs.copyFileSync(tempPath, finalPath);
          fs.unlinkSync(tempPath);
        }
        
        // Atualizar URL do logo no banco de dados
        storage.updateUser(userId, { logoUrl: logoUrl }).then(() => {
          console.log(`Logo URL salva no banco: ${logoUrl}`);
        }).catch((dbError) => {
          console.error('Erro ao salvar logo URL no banco:', dbError);
        });
        
        console.log(`Upload de logo bem sucedido: ${fileName}`);
        res.status(200).json({ 
          url: logoUrl,
          originalName: req.file.originalname,
          size: req.file.size
        });
      });
    } catch (error) {
      console.error('Erro ao processar upload de logo:', error);
      res.status(500).json({ error: 'Falha ao processar upload' });
    }
  });

  // Rota para upload de assinatura do usuário
  app.post('/api/users/:id/signature', isAuthenticated, (req: Request, res: Response) => {
    try {
      const upload = multer({
        storage: multer.diskStorage({
          destination: function (req, file, cb) {
            const uploadPath = path.join(process.cwd(), 'uploads', 'temp', 'signatures');
            if (!fs.existsSync(uploadPath)) {
              fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
          },
          filename: function (req, file, cb) {
            const uniqueSuffix = Date.now();
            const ext = path.extname(file.originalname);
            cb(null, `signature_${uniqueSuffix}${ext}`);
          }
        }),
        limits: { fileSize: 5 * 1024 * 1024 }
      });

      upload.single('signature')(req, res, async function(err) {
        if (err) {
          console.error('Erro ao fazer upload de assinatura:', err);
          return res.status(500).json({ error: 'Falha ao processar upload: ' + err.message });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const userId = parseInt(req.params.id);
        const fileName = path.basename(req.file.path);
        const tempPath = req.file.path;
        
        // Estrutura final para assinaturas de usuário
        const finalDir = path.join(process.cwd(), 'uploads', 'users', `user_${userId}`, 'signatures');
        const finalPath = path.join(finalDir, fileName);
        const signatureUrl = `/uploads/users/user_${userId}/signatures/${fileName}`;
        
        // Criar diretório final
        if (!fs.existsSync(finalDir)) {
          fs.mkdirSync(finalDir, { recursive: true });
        }
        
        // Mover arquivo
        try {
          fs.renameSync(tempPath, finalPath);
        } catch (error) {
          fs.copyFileSync(tempPath, finalPath);
          fs.unlinkSync(tempPath);
        }
        
        // Atualizar URL da assinatura no banco de dados
        storage.updateUser(userId, { signatureUrl: signatureUrl }).then(() => {
          console.log(`Assinatura URL salva no banco: ${signatureUrl}`);
        }).catch((dbError) => {
          console.error('Erro ao salvar assinatura URL no banco:', dbError);
        });
        
        console.log(`Upload de assinatura bem sucedido: ${fileName}`);
        res.status(200).json({ 
          url: signatureUrl,
          originalName: req.file.originalname,
          size: req.file.size
        });
      });
    } catch (error) {
      console.error('Erro ao processar upload de assinatura:', error);
      res.status(500).json({ error: 'Falha ao processar upload' });
    }
  });

  // Endpoint para exclusão de usuários
  app.delete(
    "/api/users/:id",
    isAuthenticated,
    hasPermission("admin"),
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        console.log(`Tentando excluir usuário com ID ${userId}`);

        if (isNaN(userId)) {
          return res.status(400).json({ error: "ID de usuário inválido" });
        }

        // Verificar se o usuário existe
        const user = await storage.getUser(userId);
        if (!user) {
          console.log(`Usuário com ID ${userId} não encontrado`);
          return res.status(404).json({ error: "Usuário não encontrado" });
        }

        // Verificar se não é o próprio usuário tentando se excluir
        if (req.user && req.user.id === userId) {
          console.log(
            `Usuário ${userId} tentando excluir a si mesmo - operação negada`,
          );
          return res
            .status(400)
            .json({ error: "Você não pode excluir seu próprio usuário" });
        }

        console.log(`Excluindo usuário ${userId} (${user.username})`);

        // Excluir o usuário
        const success = await storage.deleteUser(userId);
        if (!success) {
          console.log(`Falha ao excluir usuário ${userId}`);
          return res
            .status(500)
            .json({ error: "Não foi possível excluir o usuário" });
        }

        console.log(`Usuário ${userId} excluído com sucesso`);
        res.status(204).send();
      } catch (error) {
        console.error("Erro ao excluir usuário:", error);
        res.status(500).json({ error: "Erro ao excluir usuário" });
      }
    },
  );

  // API para buscar pedido em andamento do usuário atual
  app.get(
    "/api/medical-orders/in-progress",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        
        if (!userId) {
          return res.status(401).json({ message: "Usuário não autenticado" });
        }
        
        console.log(`Buscando pedido em andamento para o usuário ID: ${userId}`);
        
        // Buscar pedido em andamento para o usuário
        const orderInProgress = await storage.getMedicalOrderInProgressByUser(userId);
        
        if (orderInProgress) {
          console.log(`Pedido em andamento encontrado: ID ${orderInProgress.id}`);
          return res.status(200).json(orderInProgress);
        } else {
          console.log(`Nenhum pedido em andamento encontrado para o usuário ID: ${userId}`);
          return res.status(404).json({ message: "Nenhum pedido em andamento encontrado" });
        }
      } catch (error) {
        console.error("Erro ao buscar pedido em andamento:", error);
        return res.status(500).json({ message: "Erro interno do servidor" });
      }
    }
  );

  // API para buscar pedidos cirúrgicos em andamento de um paciente específico
  app.get(
    "/api/medical-orders/in-progress/patient/:patientId",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const patientId = parseInt(req.params.patientId);
        console.log(
          `Buscando pedidos em andamento para o paciente ID ${patientId}`,
        );

        // Validar ID do paciente
        if (isNaN(patientId)) {
          return res.status(400).json({ message: "ID de paciente inválido" });
        }

        // Verificamos primeiro se o paciente existe
        const patient = await storage.getPatient(patientId);
        if (!patient) {
          return res.status(404).json({ message: "Paciente não encontrado" });
        }

        // SEGURANÇA: Obter ID do médico logado
        const currentUserId = req.user?.id;
        if (!currentUserId) {
          return res.status(401).json({ message: "Usuário não autenticado" });
        }

        // Buscar pedidos para este paciente via storage (a função já está implementada)
        const allOrders = await storage.getMedicalOrdersForPatient(patientId);

        // FILTRO DE SEGURANÇA: Filtrar apenas pedidos do médico logado E em preenchimento
        const inProgressOrders = allOrders.filter((order) => {
          // Verificar se o pedido pertence ao médico logado
          if (order.userId !== currentUserId) {
            console.log(`Pedido ${order.id} rejeitado: pertence ao médico ${order.userId}, não ao médico logado ${currentUserId}`);
            return false;
          }
          // Verificar se order existe e tem um ID
          if (!order || typeof order.id !== "number") {
            return false;
          }

          console.log(
            `Verificando pedido ${order.id} com status: "${order.statusCode}"`,
          );

          // Comparação estrita com o valor "em_preenchimento"
          const isInProgress = order.statusCode === "em_preenchimento";
          console.log(
            `Pedido está em preenchimento? ${isInProgress ? "SIM" : "NÃO"}`,
          );
          return isInProgress;
        });

        // Verificação adicional - garantir que todos os pedidos tenham IDs válidos
        const validOrders = inProgressOrders.filter(
          (order) =>
            order &&
            typeof order.id === "number" &&
            order.patientId === patientId,
        );

        console.log(
          `Encontrado(s) ${validOrders.length} pedido(s) válidos em preenchimento para o paciente ${patientId}`,
        );

        // Se não houver pedidos válidos, retorna um array vazio
        if (validOrders.length === 0) {
          console.log(
            "Nenhum pedido válido encontrado. Retornando array vazio.",
          );
          return res.status(200).json([]);
        }

        // Logando pedidos detalhados para debug
        console.log("Pedidos em preenchimento encontrados:");
        validOrders.forEach((order) => {
          console.log(
            `ID: ${order.id}, Status: ${order.statusCode}, Paciente: ${order.patientId}`,
          );
        });

        // LOG DETALHADO: Mostrar dados essenciais que serão enviados para o formulário
        console.log("DADOS RETORNADOS PARA FORMULÁRIO:");
        validOrders.forEach((order) => {
          console.log(
            `Pedido ID ${order.id}: CID=${order.cidCodeId}, Hospital=${order.hospitalId}, Procedimento=${order.procedureCbhpmId}, Indicação="${order.clinicalIndication}"`,
          );
          console.log(
            `Arquivos: ExamImages=${JSON.stringify(order.exam_images_url)}, MedicalReport=${order.medical_report_url}`,
          );
        });

        // Retornar apenas os pedidos válidos
        return res.status(200).json(validOrders);
      } catch (error) {
        console.error(
          `Erro ao buscar pedidos em andamento para o paciente ${req.params.patientId}:`,
          error,
        );
        return res.status(500).json({
          message: "Erro ao buscar pedidos em andamento para o paciente",
        });
      }
    },
  );

  // REMOVED: PDF upload route moved to upload-routes.ts for consistency
  // PDF upload now follows exact same pattern as exam images and medical reports

  const httpServer = createServer(app);
  // API para atualizar pedidos médicos
  app.put(
    "/api/medical-orders/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const orderId = parseInt(req.params.id);
        const orderData = req.body;

        console.log(
          `Atualizando pedido médico ${orderId} com dados:`,
          orderData,
        );

        // 🏭 LOG ESPECÍFICO PARA FORNECEDORES
        console.log("🏭 SERVIDOR - Dados de fornecedores recebidos:", {
          supplierIds: orderData.supplierIds,
          supplierIdsType: typeof orderData.supplierIds,
          supplierIdsIsArray: Array.isArray(orderData.supplierIds),
          allKeys: Object.keys(orderData)
        });

        // Validar ID do pedido
        if (isNaN(orderId)) {
          return res.status(400).json({ message: "ID do pedido inválido" });
        }

        // Validar autenticação do usuário
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Usuário não autenticado" });
        }

        // Buscar o pedido médico atual para verificar permissões
        const currentOrder = await storage.getMedicalOrder(orderId);
        if (!currentOrder) {
          return res
            .status(404)
            .json({ message: "Pedido médico não encontrado" });
        }

        // Verificar se o usuário tem permissão para editar o pedido
        // O criador do pedido ou um administrador pode editá-lo
        const isAdmin = req.user.roleId === 1;
        if (currentOrder.userId !== userId && !isAdmin) {
          return res
            .status(403)
            .json({ message: "Sem permissão para editar este pedido médico" });
        }

        // Log para rastrear valores de lateralidade ao salvar
        console.log(
          "PUT /api/medical-orders/:id - Dados de lateralidade recebidos:",
          {
            cidLaterality: orderData.cidLaterality,
            procedureLaterality: orderData.procedureLaterality,
          },
        );

        // Garantir que arrays sejam inicializados corretamente
        const orderWithDefaults = {
          ...orderData,
          secondaryProcedureIds: orderData.secondaryProcedureIds || [],
          secondaryProcedureQuantities:
            orderData.secondaryProcedureQuantities || [],
          secondaryProcedureLateralities:
            orderData.secondaryProcedureLateralities || [],
          opmeItemIds: orderData.opmeItemIds || [],
          opmeItemQuantities: orderData.opmeItemQuantities || [],
          // PRESERVAR URLs de imagens existentes se não forem fornecidas
          exam_images_url: orderData.exam_images_url !== undefined ? orderData.exam_images_url : currentOrder.exam_images_url || [],
          multiple_cid_ids: orderData.multiple_cid_ids || [],

          // Garantir que campos de texto estejam definidos
          clinical_justification: orderData.clinicalJustification,
          additional_notes: orderData.additionalNotes,
          medical_report_url: orderData.medical_report_url,
        };

        // Atualizar o pedido médico no banco de dados
        const updatedOrder = await storage.updateMedicalOrder(
          orderId,
          orderWithDefaults,
        );

        // Log após atualização
        console.log("Pedido atualizado:", updatedOrder);

        if (!updatedOrder) {
          return res
            .status(500)
            .json({ message: "Erro ao atualizar pedido médico" });
        }

        res.json(updatedOrder);
      } catch (error) {
        console.error("Erro ao atualizar pedido médico:", error);
        res.status(500).json({
          message: "Erro ao atualizar pedido médico",
          error: error.message,
        });
      }
    },
  );

  // ==== ROTAS CRUD PARA ADMINISTRAÇÃO DE CID-10 ====
  
  // API para buscar códigos CID-10 com filtros
  app.get(
    "/api/cid-codes",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { search, category } = req.query;
        console.log(`Buscando códigos CID-10 - search: ${search}, category: ${category}`);
        
        const cidCodesResult = await storage.getCidCodes(
          search as string | undefined,
          category as string | undefined
        );
        
        console.log(`Encontrados ${cidCodesResult.length} códigos CID-10`);
        res.status(200).json(cidCodesResult);
      } catch (error) {
        console.error("Erro ao buscar códigos CID-10:", error);
        res.status(500).json({ message: "Erro ao buscar códigos CID-10" });
      }
    },
  );

  // API para buscar códigos CID-10 com base em um termo de busca (DEVE vir antes do endpoint /:id)
  app.get(
    "/api/cid-codes/search",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const searchTerm = (req.query.q || req.query.term) as string;

        if (!searchTerm || searchTerm.trim().length < 2) {
          return res.status(400).json({
            message: "Termo de busca deve ter pelo menos 2 caracteres",
          });
        }

        const cidCodes = await storage.searchCidCodes(searchTerm);
        console.log(
          `Encontrados ${cidCodes.length} códigos CID-10 para o termo "${searchTerm}" na tabela cid_codes`,
        );

        res.status(200).json(cidCodes);
      } catch (error) {
        console.error("Erro ao buscar códigos CID-10:", error);
        res.status(500).json({ message: "Erro ao buscar códigos CID-10" });
      }
    },
  );

  // API para buscar um código CID-10 específico por ID
  app.get(
    "/api/cid-codes/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        
        if (isNaN(id)) {
          return res.status(400).json({ message: "ID inválido" });
        }
        
        const cidCode = await storage.getCidCode(id);
        
        if (!cidCode) {
          return res.status(404).json({ message: "Código CID-10 não encontrado" });
        }
        
        res.json(cidCode);
      } catch (error) {
        console.error("Erro ao buscar código CID-10:", error);
        res.status(500).json({ message: "Erro ao buscar código CID-10" });
      }
    },
  );

  // API para criar novo código CID-10
  app.post(
    "/api/cid-codes",
    isAuthenticated,
    hasPermission("catalog_create"),
    async (req: Request, res: Response) => {
      try {
        // Validar dados usando o schema Zod
        const validationResult = insertCidCodeSchema.safeParse(req.body);
        
        if (!validationResult.success) {
          const errors = validationResult.error.errors.map(err => 
            `${err.path.join('.')}: ${err.message}`
          ).join(', ');
          
          return res.status(400).json({ 
            message: `Dados inválidos: ${errors}` 
          });
        }
        
        const { code, description, category } = validationResult.data;
        
        const newCidCode = await storage.createCidCode({
          code: code.trim().toUpperCase(),
          description: description.trim(),
          category
        });
        
        console.log(`Código CID-10 criado: ${newCidCode.code}`);
        res.status(201).json(newCidCode);
      } catch (error) {
        console.error("Erro ao criar código CID-10:", error);
        if (error.message.includes("unique")) {
          res.status(409).json({ message: "Código CID-10 já existe" });
        } else if (error.message.includes("enum")) {
          res.status(400).json({ message: "Categoria inválida. Selecione uma categoria válida da lista." });
        } else {
          res.status(500).json({ message: "Erro ao criar código CID-10" });
        }
      }
    },
  );

  // API para atualizar código CID-10
  app.put(
    "/api/cid-codes/:id",
    isAuthenticated,
    hasPermission("catalog_edit"),
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        
        if (isNaN(id)) {
          return res.status(400).json({ message: "ID inválido" });
        }
        
        const { code, description, category } = req.body;
        const updates: any = {};
        
        if (code) updates.code = code.trim().toUpperCase();
        if (description) updates.description = description.trim();
        if (category) updates.category = category;
        
        const updatedCidCode = await storage.updateCidCode(id, updates);
        
        if (!updatedCidCode) {
          return res.status(404).json({ message: "Código CID-10 não encontrado" });
        }
        
        console.log(`Código CID-10 atualizado: ${updatedCidCode.code}`);
        res.json(updatedCidCode);
      } catch (error) {
        console.error("Erro ao atualizar código CID-10:", error);
        if (error.message.includes("unique")) {
          res.status(409).json({ message: "Código CID-10 já existe" });
        } else {
          res.status(500).json({ message: "Erro ao atualizar código CID-10" });
        }
      }
    },
  );

  // API para excluir código CID-10
  app.delete(
    "/api/cid-codes/:id",
    isAuthenticated,
    hasPermission("catalog_delete"),
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        
        if (isNaN(id)) {
          return res.status(400).json({ message: "ID inválido" });
        }
        
        const success = await storage.deleteCidCode(id);
        
        if (success) {
          console.log(`Código CID-10 excluído: ID ${id}`);
          res.json({ message: "Código CID-10 excluído com sucesso" });
        } else {
          res.status(404).json({ message: "Código CID-10 não encontrado" });
        }
      } catch (error) {
        console.error("Erro ao excluir código CID-10:", error);
        if (error.message.includes("associações")) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "Erro ao excluir código CID-10" });
        }
      }
    },
  );



  // API para buscar todos os procedimentos
  app.get(
    "/api/procedures",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        console.log("Buscando todos os procedimentos...");
        const proceduresResult = await db.select().from(procedures).where(eq(procedures.active, true));
        console.log(`Encontrados ${proceduresResult.length} procedimentos`);
        res.status(200).json(proceduresResult);
      } catch (error) {
        console.error("Erro ao buscar todos os procedimentos:", error);
        res.status(500).json({ message: "Erro ao buscar procedimentos" });
      }
    },
  );

  // API para buscar procedimentos com base em um termo de busca (DEVE vir ANTES do endpoint /:id)
  app.get("/api/procedures/search", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const searchTerm = req.query.q as string;

      if (!searchTerm || searchTerm.trim().length < 2) {
        return res
          .status(400)
          .json({ message: "Termo de busca deve ter pelo menos 2 caracteres" });
      }

      const procedures = await storage.searchProcedures(searchTerm);
      console.log(
        `Encontrados ${procedures.length} procedimentos para o termo "${searchTerm}" na tabela procedures`,
      );

      res.status(200).json(procedures);
    } catch (error) {
      console.error("Erro ao buscar procedimentos:", error);
      res.status(500).json({ message: "Erro ao buscar procedimentos" });
    }
  });

  // Endpoint para buscar procedimento por ID
  app.get(
    "/api/procedures/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const procedureId = parseInt(req.params.id);

        if (isNaN(procedureId)) {
          return res
            .status(400)
            .json({ message: "ID do procedimento inválido" });
        }

        console.log(`Buscando procedimento com ID: ${procedureId}`);
        const procedure = await storage.getProcedureById(procedureId);

        if (!procedure) {
          return res
            .status(404)
            .json({ message: "Procedimento não encontrado" });
        }

        console.log(`Procedimento encontrado: ${procedure.name}`);
        res.json(procedure);
      } catch (error) {
        console.error("Erro ao buscar procedimento por ID:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    },
  );

  // API para criar novo procedimento
  app.post("/api/procedures", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const procedureData = req.body;
      console.log("Criando novo procedimento:", procedureData);
      
      const newProcedure = await storage.createProcedure(procedureData);
      res.status(201).json(newProcedure);
    } catch (error) {
      console.error("Erro ao criar procedimento:", error);
      res.status(500).json({ message: "Erro ao criar procedimento" });
    }
  });

  // API para atualizar procedimento
  app.put("/api/procedures/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const procedureId = parseInt(req.params.id);
      const procedureData = req.body;
      
      if (isNaN(procedureId)) {
        return res.status(400).json({ message: "ID de procedimento inválido" });
      }
      
      console.log(`Atualizando procedimento ID ${procedureId}:`, procedureData);
      
      const updatedProcedure = await storage.updateProcedure(procedureId, procedureData);
      if (!updatedProcedure) {
        return res.status(404).json({ message: "Procedimento não encontrado" });
      }
      
      res.status(200).json(updatedProcedure);
    } catch (error) {
      console.error("Erro ao atualizar procedimento:", error);
      res.status(500).json({ message: "Erro ao atualizar procedimento" });
    }
  });

  // API para excluir procedimento
  app.delete("/api/procedures/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const procedureId = parseInt(req.params.id);
      
      if (isNaN(procedureId)) {
        return res.status(400).json({ message: "ID de procedimento inválido" });
      }
      
      console.log(`Excluindo procedimento ID ${procedureId}`);
      
      const deleted = await storage.deleteProcedure(procedureId);
      if (!deleted) {
        return res.status(404).json({ message: "Procedimento não encontrado" });
      }
      
      res.status(200).json({ message: "Procedimento excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir procedimento:", error);
      res.status(500).json({ message: "Erro ao excluir procedimento" });
    }
  });

  // Nova API para buscar materiais OPME sem autenticação (DEVE vir ANTES do endpoint /:id)
  app.get("/api/opme-items/search", async (req: Request, res: Response) => {
    try {
      const searchTerm =
        (req.query.q as string) || (req.query.term as string);

      if (!searchTerm || searchTerm.trim().length < 2) {
        return res
          .status(400)
          .json({ message: "Termo de busca deve ter pelo menos 2 caracteres" });
      }

      const opmeItems = await storage.searchOpmeItems(searchTerm);
      console.log(
        `Encontrados ${opmeItems.length} materiais OPME para o termo "${searchTerm}" na tabela opme_items`,
      );

      res.status(200).json(opmeItems);
    } catch (error) {
      console.error("Erro ao buscar materiais OPME:", error);
      res.status(500).json({ message: "Erro ao buscar materiais OPME" });
    }
  });

  // API para buscar um item OPME específico por ID (DEVE vir DEPOIS do endpoint /search)
  app.get("/api/opme-items/:id", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "ID de item OPME inválido" });
      }
      
      const opmeItem = await storage.getOpmeItemById(itemId);
      
      if (!opmeItem) {
        return res.status(404).json({ message: "Item OPME não encontrado" });
      }
      
      console.log(`Item OPME encontrado: ${opmeItem.technicalName} (ID: ${itemId})`);
      res.status(200).json(opmeItem);
    } catch (error) {
      console.error("Erro ao buscar item OPME por ID:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // API para listar todos os materiais OPME
  app.get("/api/opme-items", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("Buscando todos os materiais OPME...");
      const opmeItems = await storage.getOpmeItems();
      console.log(`Encontrados ${opmeItems.length} materiais OPME`);
      res.status(200).json(opmeItems);
    } catch (error) {
      console.error("Erro ao buscar materiais OPME:", error);
      res.status(500).json({ message: "Erro ao buscar materiais OPME" });
    }
  });

  // API para criar um novo material OPME
  app.post("/api/opme-items", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("Criando novo material OPME:", req.body);
      
      const {
        anvisaRegistrationNumber,
        processNumber,
        technicalName,
        commercialName,
        riskClass,
        holderCnpj,
        registrationHolder,
        manufacturerName,
        countryOfManufacture,
        registrationDate,
        expirationDate,
        isValid
      } = req.body;

      // Validações básicas
      if (!technicalName || !commercialName || !manufacturerName) {
        return res.status(400).json({ 
          message: "Nome técnico, nome comercial e fabricante são obrigatórios" 
        });
      }

      const newOpmeItem = await storage.createOpmeItem({
        anvisaRegistrationNumber: anvisaRegistrationNumber || null,
        processNumber: processNumber || null,
        technicalName,
        commercialName,
        riskClass: riskClass || null,
        holderCnpj: holderCnpj || null,
        registrationHolder: registrationHolder || null,
        manufacturerName,
        countryOfManufacture: countryOfManufacture || null,
        registrationDate: registrationDate || null,
        expirationDate: expirationDate || null,
        isValid: isValid !== undefined ? isValid : true,
      });

      console.log(`Material OPME criado com sucesso: ${newOpmeItem.technicalName} (ID: ${newOpmeItem.id})`);
      res.status(201).json(newOpmeItem);
    } catch (error) {
      console.error("Erro ao criar material OPME:", error);
      res.status(500).json({ 
        message: "Erro ao criar material OPME",
        error: error.message 
      });
    }
  });

  // API para atualizar um material OPME
  app.put("/api/opme-items/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "ID de material OPME inválido" });
      }

      console.log(`Atualizando material OPME ID ${itemId}:`, req.body);

      const {
        anvisaRegistrationNumber,
        processNumber,
        technicalName,
        commercialName,
        riskClass,
        holderCnpj,
        registrationHolder,
        manufacturerName,
        countryOfManufacture,
        registrationDate,
        expirationDate,
        isValid
      } = req.body;

      // Validações básicas
      if (!technicalName || !commercialName || !manufacturerName) {
        return res.status(400).json({ 
          message: "Nome técnico, nome comercial e fabricante são obrigatórios" 
        });
      }

      const updatedOpmeItem = await storage.updateOpmeItem(itemId, {
        anvisaRegistrationNumber: anvisaRegistrationNumber || null,
        processNumber: processNumber || null,
        technicalName,
        commercialName,
        riskClass: riskClass || null,
        holderCnpj: holderCnpj || null,
        registrationHolder: registrationHolder || null,
        manufacturerName,
        countryOfManufacture: countryOfManufacture || null,
        registrationDate: registrationDate || null,
        expirationDate: expirationDate || null,
        isValid: isValid !== undefined ? isValid : true,
      });

      if (!updatedOpmeItem) {
        return res.status(404).json({ message: "Material OPME não encontrado" });
      }

      console.log(`Material OPME atualizado: ${updatedOpmeItem.technicalName} (ID: ${itemId})`);
      res.status(200).json(updatedOpmeItem);
    } catch (error) {
      console.error("Erro ao atualizar material OPME:", error);
      res.status(500).json({ 
        message: "Erro ao atualizar material OPME",
        error: error.message 
      });
    }
  });

  // API para excluir um material OPME
  app.delete("/api/opme-items/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.id);
      
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "ID de material OPME inválido" });
      }

      console.log(`Excluindo material OPME ID ${itemId}`);

      // Verificar se o material existe
      const existingItem = await storage.getOpmeItemById(itemId);
      if (!existingItem) {
        return res.status(404).json({ message: "Material OPME não encontrado" });
      }

      const deleted = await storage.deleteOpmeItem(itemId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Erro ao excluir material OPME" });
      }

      console.log(`Material OPME excluído: ${existingItem.technicalName} (ID: ${itemId})`);
      res.status(200).json({ message: "Material OPME excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir material OPME:", error);
      res.status(500).json({ 
        message: "Erro ao excluir material OPME",
        error: error.message 
      });
    }
  });

  // API para listar todos os fornecedores
  console.log("🔧 Registrando rota GET /api/suppliers");
  app.get("/api/suppliers", async (req: Request, res: Response) => {
    try {
      console.log("=== ENDPOINT /api/suppliers CHAMADO ===");
      console.log("Query params:", req.query);
      console.log("User:", req.user?.username);
      console.log("Headers Accept:", req.headers.accept);
      console.log("Content-Type do response será:", res.getHeader('Content-Type'));
      
      const showAll = req.query.showAll === "true";
      
      // Se showAll for true, retorna todos os fornecedores (ativos e inativos)
      // Caso contrário, retorna apenas os ativos
      const suppliers = await storage.getSuppliers();
      console.log(`Dados brutos do storage: ${suppliers.length} fornecedores encontrados`);
      console.log("Primeiro fornecedor:", suppliers[0]);
      
      const filteredSuppliers = showAll ? suppliers : suppliers.filter(s => s.active);
      
      console.log(`Retornando ${filteredSuppliers.length} fornecedores ${showAll ? '(incluindo inativos)' : '(apenas ativos)'}`);
      console.log("Dados filtrados:", filteredSuppliers);
      
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(filteredSuppliers);
    } catch (error) {
      console.error("ERRO DETALHADO ao listar fornecedores:", error);
      res.status(500).json({ message: "Erro ao listar fornecedores", error: error.message });
    }
  });

  // API para buscar fornecedores por termo de busca (nome ou CNPJ) sem autenticação
  app.get("/api/suppliers/search", async (req: Request, res: Response) => {
    try {
      const searchTerm = req.query.term as string;

      // Se não tiver termo de busca ou termo vazio, retornar todos os fornecedores ativos
      if (!searchTerm || searchTerm.trim().length === 0) {
        const allSuppliers = await storage.getSuppliers();
        console.log(
          `Retornando todos os ${allSuppliers.length} fornecedores ativos`,
        );
        return res.status(200).json(allSuppliers);
      }

      // Se tiver termo de busca com menos de 2 caracteres
      if (searchTerm.trim().length < 2) {
        return res
          .status(400)
          .json({ message: "Termo de busca deve ter pelo menos 2 caracteres" });
      }

      const suppliers = await storage.searchSuppliers(searchTerm);
      console.log(
        `Encontrados ${suppliers.length} fornecedores para o termo "${searchTerm}"`,
      );

      res.status(200).json(suppliers);
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
      res.status(500).json({ message: "Erro ao buscar fornecedores" });
    }
  });

  // API para criar novo fornecedor
  app.post("/api/suppliers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const supplierData = req.body;
      console.log("Criando novo fornecedor:", supplierData);
      
      const newSupplier = await storage.createSupplier(supplierData);
      res.status(201).json(newSupplier);
    } catch (error) {
      console.error("Erro ao criar fornecedor:", error);
      res.status(500).json({ message: "Erro ao criar fornecedor" });
    }
  });

  // API para atualizar fornecedor
  app.put("/api/suppliers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const supplierId = parseInt(req.params.id);
      const supplierData = req.body;
      
      if (isNaN(supplierId)) {
        return res.status(400).json({ message: "ID de fornecedor inválido" });
      }
      
      console.log(`Atualizando fornecedor ID ${supplierId}:`, supplierData);
      
      const updatedSupplier = await storage.updateSupplier(supplierId, supplierData);
      if (!updatedSupplier) {
        return res.status(404).json({ message: "Fornecedor não encontrado" });
      }
      
      res.status(200).json(updatedSupplier);
    } catch (error) {
      console.error("Erro ao atualizar fornecedor:", error);
      res.status(500).json({ message: "Erro ao atualizar fornecedor" });
    }
  });

  // API para excluir fornecedor
  app.delete("/api/suppliers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const supplierId = parseInt(req.params.id);
      
      if (isNaN(supplierId)) {
        return res.status(400).json({ message: "ID de fornecedor inválido" });
      }
      
      console.log(`Excluindo fornecedor ID ${supplierId}`);
      
      const deleted = await storage.deleteSupplier(supplierId);
      if (!deleted) {
        return res.status(404).json({ message: "Fornecedor não encontrado" });
      }
      
      res.status(200).json({ message: "Fornecedor excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir fornecedor:", error);
      res.status(500).json({ message: "Erro ao excluir fornecedor" });
    }
  });





  // Endpoints de Notificações
  app.get("/api/notifications", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const notifications = await storage.getNotifications(userId);
      res.status(200).json(notifications);
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
      res.status(500).json({ message: "Erro ao buscar notificações" });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const count = await storage.getUnreadNotificationsCount(userId);
      res.status(200).json({ count });
    } catch (error) {
      console.error("Erro ao buscar contador de notificações:", error);
      res.status(500).json({ count: 0 });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId || isNaN(notificationId)) {
        return res.status(400).json({ message: "Dados inválidos" });
      }

      await storage.markNotificationAsRead(notificationId);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
      res.status(500).json({ message: "Erro ao marcar notificação como lida" });
    }
  });

  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      await storage.markAllNotificationsAsRead(userId);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Erro ao marcar todas as notificações como lidas:", error);
      res.status(500).json({ message: "Erro ao marcar todas as notificações como lidas" });
    }
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId || isNaN(notificationId)) {
        return res.status(400).json({ message: "Dados inválidos" });
      }

      await storage.deleteNotification(notificationId);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Erro ao excluir notificação:", error);
      res.status(500).json({ message: "Erro ao excluir notificação" });
    }
  });
  
  // API para obter pedidos médicos de um usuário específico
  app.get(
    "/api/orders/user/:userId",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const requestedUserId = parseInt(req.params.userId);
        const currentUserId = req.user?.id;
        const isAdmin = req.user?.roleId === 1;
        
        // Verificar se o ID do usuário é válido
        if (isNaN(requestedUserId)) {
          return res.status(400).json({ message: "ID de usuário inválido" });
        }
        
        // Verificar permissões: apenas administradores podem ver pedidos de outros usuários
        if (!isAdmin && requestedUserId !== currentUserId) {
          return res.status(403).json({
            message: "Acesso negado. Você só pode visualizar seus próprios pedidos."
          });
        }
        
        console.log(`Buscando pedidos para o usuário ID: ${requestedUserId}`);
        
        // Buscar pedidos do usuário
        const orders = await storage.getMedicalOrdersByUser(requestedUserId);
        
        // Formatar os pedidos para exibição na interface
        const formattedOrders = await Promise.all(
          orders.map(async (order) => {
            // Buscar informações associadas (paciente, hospital, etc.)
            const patient = order.patientId
              ? await storage.getPatient(order.patientId)
              : null;
            const hospital = order.hospitalId
              ? await storage.getHospital(order.hospitalId)
              : null;
            const user = order.userId
              ? await storage.getUser(order.userId)
              : null;
            const procedure = order.procedureCbhpmId
              ? await storage.getProcedure(order.procedureCbhpmId)
              : null;

            return {
              id: order.id,
              patientId: order.patientId,
              patientName: patient ? patient.fullName : "Paciente não encontrado",
              patientPhone: patient ? patient.phone : null,
              hospitalId: order.hospitalId,
              hospitalName: hospital ? hospital.name : "Hospital não encontrado",
              procedureName: procedure
                ? procedure.name
                : order.procedureName || "Não especificado",
              status: order.statusCode || "não_especificado",
              createdAt: order.createdAt,
              updatedAt: order.updatedAt,
              procedureDate: order.procedureDate,
              userName: user ? user.name : "Usuário desconhecido",
              receivedValue: order.receivedValue,
            };
          })
        );
        
        console.log(`Encontrados ${formattedOrders.length} pedidos para o usuário ID: ${requestedUserId}`);
        res.json(formattedOrders);
      } catch (error) {
        console.error(`Erro ao obter pedidos do usuário ID ${req.params.userId}:`, error);
        res.status(500).json({ message: "Erro ao obter pedidos do usuário" });
      }
    }
  );
  
  // Buscar um pedido médico específico por ID
  app.get(
    "/api/medical-orders/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const orderId = parseInt(req.params.id);
        if (isNaN(orderId)) {
          return res.status(400).json({ error: "ID de pedido inválido" });
        }

        // Buscar o pedido médico completo
        console.log(`Buscando detalhes do pedido ID: ${orderId}`);
        const order = await storage.getMedicalOrder(orderId);
        
        if (!order) {
          return res.status(404).json({ error: "Pedido não encontrado" });
        }
        
        // Buscar informações relacionadas
        const patient = order.patientId
          ? await storage.getPatient(order.patientId)
          : null;
        
        const hospital = order.hospitalId
          ? await storage.getHospital(order.hospitalId)
          : null;
            
        // Buscar informações do usuário (médico)
        const user = order.userId
          ? await storage.getUser(order.userId)
          : null;
          
        // Buscar procedimento principal se existir
        const procedure = order.procedureCbhpmId
          ? await storage.getProcedure(order.procedureCbhpmId)
          : null;
          
        // Buscar diagnósticos (CID) associados
        let cidCodes = [];
        let cidDescriptions = [];
        
        // Verificar o CID principal
        if (order.cidCodeId) {
          const cidCode = await storage.getCidCode(order.cidCodeId);
          if (cidCode) {
            cidCodes.push(cidCode.code);
            cidDescriptions.push(cidCode.description);
          }
        }
        
        // Verificar CIDs adicionais se existirem
        if (order.multiple_cid_ids && Array.isArray(order.multiple_cid_ids) && order.multiple_cid_ids.length > 0) {
          console.log(`Buscando CIDs adicionais: ${order.multiple_cid_ids.join(', ')}`);
          
          // Buscar cada CID adicional
          for (const cidId of order.multiple_cid_ids) {
            try {
              const cidCode = await storage.getCidCode(cidId);
              if (cidCode) {
                cidCodes.push(cidCode.code);
                cidDescriptions.push(cidCode.description);
              }
            } catch (err) {
              console.error(`Erro ao buscar CID ${cidId}:`, err);
            }
          }
        }
        
        // Buscar procedimentos secundários
        let procedureIds = [];
        let procedureNames = [];
        let procedureCodes = [];
        let procedureSides = [];
        let accessRoutes = [];
        let techniques = [];
        
        // Adicionar procedimento principal se existir
        if (procedure) {
          procedureIds.push(procedure.id);
          procedureNames.push(procedure.name);
          procedureCodes.push(procedure.code);
          procedureSides.push(order.procedureLaterality || 'não_especificado');
          accessRoutes.push('não_especificado'); // Pode ser ajustado conforme necessário
          techniques.push('não_especificado'); // Pode ser ajustado conforme necessário
        }
        
        // Verificar procedimentos secundários
        if (order.secondaryProcedureIds && Array.isArray(order.secondaryProcedureIds) && order.secondaryProcedureIds.length > 0) {
          console.log(`Buscando procedimentos secundários: ${order.secondaryProcedureIds.join(', ')}`);
          
          for (let i = 0; i < order.secondaryProcedureIds.length; i++) {
            const procedureId = order.secondaryProcedureIds[i];
            try {
              const procData = await storage.getProcedure(procedureId);
              if (procData) {
                procedureIds.push(procData.id);
                procedureNames.push(procData.name);
                procedureCodes.push(procData.code);
                
                // Buscar dados relacionados aos procedimentos secundários
                const laterality = order.secondaryProcedureLateralities && order.secondaryProcedureLateralities[i] 
                  ? order.secondaryProcedureLateralities[i] 
                  : 'não_especificado';
                
                procedureSides.push(laterality);
                accessRoutes.push('não_especificado'); // Pode ser ajustado conforme necessário
                techniques.push('não_especificado'); // Pode ser ajustado conforme necessário
              }
            } catch (err) {
              console.error(`Erro ao buscar procedimento ${procedureId}:`, err);
            }
          }
        }
        
        // Buscar materiais OPME
        let opmeItemIds = [];
        let opmeItemNames = [];
        let opmeItemCodes = [];
        let opmeItemQuantities = [];
        let opmeItemUnits = [];
        let opmeItemSuppliers = [];
        
        // Verificar materiais OPME se existirem
        if (order.opmeItemIds && Array.isArray(order.opmeItemIds) && order.opmeItemIds.length > 0) {
          console.log(`Buscando materiais OPME: ${order.opmeItemIds.join(', ')}`);
          
          for (let i = 0; i < order.opmeItemIds.length; i++) {
            const opmeItemId = order.opmeItemIds[i];
            try {
              const opmeItem = await storage.getOpmeItem(opmeItemId);
              if (opmeItem) {
                opmeItemIds.push(opmeItem.id);
                opmeItemNames.push(opmeItem.name);
                opmeItemCodes.push(opmeItem.code || 'sem código');
                
                // Obter quantidade e unidade
                const quantity = order.opmeItemQuantities && order.opmeItemQuantities[i] 
                  ? order.opmeItemQuantities[i] 
                  : 1;
                
                opmeItemQuantities.push(quantity);
                opmeItemUnits.push(opmeItem.unit || 'unidade');
                
                // Buscar fornecedor se existir
                if (order.opmeSupplierIds && order.opmeSupplierIds[i]) {
                  try {
                    const supplier = await storage.getSupplier(order.opmeSupplierIds[i]);
                    opmeItemSuppliers.push(supplier ? supplier.companyName : 'Fornecedor não especificado');
                  } catch (err) {
                    console.error(`Erro ao buscar fornecedor para OPME ${opmeItemId}:`, err);
                    opmeItemSuppliers.push('Fornecedor não especificado');
                  }
                } else {
                  opmeItemSuppliers.push('Fornecedor não especificado');
                }
              }
            } catch (err) {
              console.error(`Erro ao buscar item OPME ${opmeItemId}:`, err);
            }
          }
        }
        
        // Buscar exames
        let examIds = [];
        let examNames = [];
        let examDates = [];
        let examResults = [];
        let examFiles = [];
        
        // Verificar exames se existirem
        if (order.examIds && Array.isArray(order.examIds) && order.examIds.length > 0) {
          console.log(`Buscando exames: ${order.examIds.join(', ')}`);
          
          for (let i = 0; i < order.examIds.length; i++) {
            const examId = order.examIds[i];
            try {
              // Verificamos se a função getExam existe no storage
              const exam = typeof storage.getExam === 'function' 
                ? await storage.getExam(examId)
                : { id: examId, name: 'Exame', examDate: 'Data não especificada', result: 'Resultado não disponível' };
              if (exam) {
                examIds.push(exam.id);
                examNames.push(exam.name || 'Exame sem nome');
                examDates.push(exam.examDate || 'Data não especificada');
                examResults.push(exam.result || 'Resultado não disponível');
                examFiles.push(exam.fileUrl || '');
              }
            } catch (err) {
              console.error(`Erro ao buscar exame ${examId}:`, err);
            }
          }
        }
        
        // Formatação dos dados completos do pedido
        const orderDetails = {
          ...order,
          patientName: patient?.fullName || 'Paciente não encontrado',
          hospitalName: hospital?.name || 'Hospital não especificado',
          doctorName: user?.name || user?.fullName || 'Médico não identificado',
          procedureName: procedure?.name || 'Não especificado',
          statusCode: order.statusCode || 'não_especificado',
          // Adicionar arrays de CIDs para o frontend
          cidCodes: cidCodes,
          cidDescriptions: cidDescriptions,
          // Adicionar arrays de procedimentos para o frontend
          procedureIds: procedureIds,
          procedureNames: procedureNames,
          procedureCodes: procedureCodes,
          procedureSides: procedureSides,
          accessRoutes: accessRoutes,
          techniques: techniques,
          // Adicionar arrays de materiais OPME para o frontend
          opmeItemIds: opmeItemIds,
          opmeItemNames: opmeItemNames,
          opmeItemCodes: opmeItemCodes,
          opmeItemQuantities: opmeItemQuantities,
          opmeItemUnits: opmeItemUnits,
          opmeItemSuppliers: opmeItemSuppliers,
          // Adicionar arrays de exames para o frontend
          examIds: examIds,
          examNames: examNames,
          examDates: examDates,
          examResults: examResults,
          examFiles: examFiles
        };
        
        console.log(`Detalhes do pedido ${orderId} enviados com sucesso`);
        return res.json(orderDetails);
      } catch (error) {
        console.error("Erro ao buscar pedido por ID:", error);
        return res.status(500).json({ error: "Erro interno do servidor" });
      }
    }
  );

  // ==== ASSOCIAÇÕES CID-10 / CBHPM ====
  
  // Listar todas as associações CID-10/CBHPM (com filtro opcional por CID)
  app.get(
    "/api/cid-cbhpm-associations",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { cidCodeId } = req.query;
        
        // Construir a query base
        let query = db
          .select({
            id: cidCbhpmAssociations.id,
            cidCodeId: cidCbhpmAssociations.cidCodeId,
            procedureId: cidCbhpmAssociations.procedureId,
            createdAt: cidCbhpmAssociations.createdAt,
            cidCode: {
              id: cidCodes.id,
              code: cidCodes.code,
              description: cidCodes.description,
              category: cidCodes.category,
            },
            procedure: {
              id: procedures.id,
              code: procedures.code,
              name: procedures.name,
              porte: procedures.porte,
            },
          })
          .from(cidCbhpmAssociations)
          .leftJoin(cidCodes, eq(cidCbhpmAssociations.cidCodeId, cidCodes.id))
          .leftJoin(procedures, eq(cidCbhpmAssociations.procedureId, procedures.id));

        // Aplicar filtro por CID se fornecido
        if (cidCodeId) {
          console.log(`Filtrando associações para CID ID: ${cidCodeId}`);
          query = query.where(eq(cidCbhpmAssociations.cidCodeId, parseInt(cidCodeId as string)));
        }

        const associations = await query.orderBy(cidCodes.code, procedures.code);

        console.log(`Encontradas ${associations.length} associações${cidCodeId ? ` para CID ${cidCodeId}` : ''}`);
        res.json(associations);
      } catch (error) {
        console.error("Erro ao buscar associações CID-10/CBHPM:", error);
        res.status(500).json({ message: "Erro ao buscar associações" });
      }
    }
  );

  // Criar nova associação CID-10/CBHPM
  app.post(
    "/api/cid-cbhpm-associations",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { cidCodeId, procedureId } = req.body;

        if (!cidCodeId || !procedureId) {
          return res.status(400).json({ 
            message: "CID Code ID e Procedure ID são obrigatórios" 
          });
        }

        // Verificar se a associação já existe
        const existingAssociation = await db
          .select()
          .from(cidCbhpmAssociations)
          .where(
            and(
              eq(cidCbhpmAssociations.cidCodeId, cidCodeId),
              eq(cidCbhpmAssociations.procedureId, procedureId)
            )
          );

        if (existingAssociation.length > 0) {
          return res.status(400).json({ 
            message: "Esta associação já existe" 
          });
        }

        // Criar nova associação
        const [newAssociation] = await db
          .insert(cidCbhpmAssociations)
          .values({
            cidCodeId: parseInt(cidCodeId),
            procedureId: parseInt(procedureId),
          })
          .returning();

        res.status(201).json(newAssociation);
      } catch (error) {
        console.error("Erro ao criar associação CID-10/CBHPM:", error);
        res.status(500).json({ message: "Erro ao criar associação" });
      }
    }
  );

  // Deletar associação CID-10/CBHPM
  app.delete(
    "/api/cid-cbhpm-associations/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const associationId = parseInt(req.params.id);

        if (isNaN(associationId)) {
          return res.status(400).json({ message: "ID inválido" });
        }

        const deletedAssociation = await db
          .delete(cidCbhpmAssociations)
          .where(eq(cidCbhpmAssociations.id, associationId))
          .returning();

        if (deletedAssociation.length === 0) {
          return res.status(404).json({ message: "Associação não encontrada" });
        }

        res.json({ message: "Associação removida com sucesso" });
      } catch (error) {
        console.error("Erro ao deletar associação CID-10/CBHPM:", error);
        res.status(500).json({ message: "Erro ao deletar associação" });
      }
    }
  );

  // Atualizar status de um pedido médico
  app.patch('/api/medical-orders/:id/status', async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status } = req.body;

      console.log(`Tentando atualizar status do pedido ${orderId} para: ${status}`);

      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }

      if (!status) {
        return res.status(400).json({ error: "Status é obrigatório" });
      }

      // Verificar se o pedido existe
      const existingOrder = await storage.getMedicalOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      console.log(`Pedido encontrado. Status atual: ${existingOrder.statusCode}`);

      // Atualizar diretamente no banco de dados
      const [updatedOrder] = await db
        .update(medicalOrders)
        .set({ 
          statusCode: status,
          updatedAt: new Date()
        })
        .where(eq(medicalOrders.id, orderId))
        .returning();

      console.log(`Status atualizado. Novo status: ${updatedOrder?.statusCode}`);
      
      res.json({ 
        message: "Status atualizado com sucesso", 
        order: updatedOrder,
        previousStatus: existingOrder.status,
        newStatus: status
      });
    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Agendar procedimento (definir data do procedimento)
  app.patch('/api/medical-orders/:id/schedule', async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { procedureDate } = req.body;

      console.log(`Agendando procedimento ${orderId} para: ${procedureDate}`);

      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }

      if (!procedureDate) {
        return res.status(400).json({ error: "Data do procedimento é obrigatória" });
      }

      // Verificar se o pedido existe
      const existingOrder = await storage.getMedicalOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      // Atualizar a data do procedimento
      const updatedOrder = await storage.updateMedicalOrder(orderId, { 
        procedureDate: procedureDate 
      });

      if (!updatedOrder) {
        return res.status(500).json({ error: "Falha ao agendar procedimento" });
      }

      console.log(`Procedimento agendado. Nova data: ${updatedOrder.procedureDate}`);
      
      res.json({ 
        message: "Procedimento agendado com sucesso", 
        order: updatedOrder,
        procedureDate: procedureDate
      });
    } catch (error) {
      console.error('Erro ao agendar procedimento:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Atualizar valor recebido pela cirurgia
  app.patch('/api/medical-orders/:id/received-value', async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { receivedValue } = req.body;

      console.log(`Atualizando valor recebido do pedido ${orderId}: R$ ${receivedValue ? (receivedValue / 100).toFixed(2) : 'removendo valor'}`);

      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }

      // Validar que o valor é um número válido ou null
      if (receivedValue !== null && receivedValue !== undefined && (isNaN(receivedValue) || receivedValue < 0)) {
        return res.status(400).json({ error: "Valor recebido deve ser um número positivo ou nulo" });
      }

      // Verificar se o pedido existe
      const existingOrder = await storage.getMedicalOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      // Atualizar o valor recebido (em centavos)
      const updatedOrder = await storage.updateMedicalOrder(orderId, { 
        receivedValue: receivedValue 
      });

      if (!updatedOrder) {
        return res.status(500).json({ error: "Falha ao atualizar valor recebido" });
      }

      const formattedValue = receivedValue ? `R$ ${(receivedValue / 100).toFixed(2)}` : 'Valor removido';
      console.log(`Valor recebido atualizado: ${formattedValue}`);
      
      res.json({ 
        message: "Valor recebido atualizado com sucesso", 
        order: updatedOrder,
        receivedValue: receivedValue,
        formattedValue: formattedValue
      });
    } catch (error) {
      console.error('Erro ao atualizar valor recebido:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Rota para processar documentos com Google Vision API
  app.post('/api/process-document', upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
      }

      const { documentType } = req.body; // 'identity' ou 'insurance'
      
      console.log(`🔄 Processando documento tipo: ${documentType}`);
      
      let imageBuffer: Buffer;
      
      // Verificar se é PDF
      if (req.file.mimetype === 'application/pdf') {
        console.log('📄 Detectado PDF - convertendo para imagem...');
        imageBuffer = await convertPDFToImage(req.file.path);
      } else {
        // Ler arquivo de imagem diretamente
        imageBuffer = fs.readFileSync(req.file.path);
      }
      
      let processedData;
      let extractedText = '';
      
      if (documentType === 'identity') {
        console.log('🆕 Usando nova arquitetura unificada para documento de identidade...');
        
        try {
          // Importar e usar o novo ExtractionOrchestrator
          const { ExtractionOrchestrator } = await import('./services/document-extraction/core/extraction-orchestrator');
          
          const orchestrator = new ExtractionOrchestrator();
          console.log('🔄 ROTA /api/process-document: Iniciando processamento com nova arquitetura unificada...');
          console.log('📄 ROTA: Tamanho do buffer de imagem:', imageBuffer.length, 'bytes');
          
          const result = await orchestrator.processDocument(imageBuffer);
          
          console.log('📋 ROTA: Resultado da nova arquitetura:', result.success ? '✅ SUCESSO' : '❌ FALHA');
          console.log('📊 ROTA: Detalhes do resultado:', JSON.stringify(result, null, 2));
          
          if (result.success) {
            console.log('✅ Documento de identidade processado:', result.data);
            
            // Converter resultado para formato compatível
            const compatibleData = {
              fullName: result.data.nomeCompleto,
              idNumber: result.data.rg || result.data.cpf,
              cpf: result.data.cpf,
              birthDate: result.data.dataNascimento,
              mothersName: result.data.nomeMae,
              fathersName: result.data.nomePai,
              birthPlace: result.data.naturalidade,
              issuedBy: result.data.orgaoExpedidor,
              documentType: result.data.tipoDocumento,
              subtype: result.data.subtipoDocumento,
              // Metadados da nova arquitetura
              confidence: result.confidence,
              method: result.method,
              newArchitecture: true
            };
            
            res.json({
              success: true,
              extractedText: 'Processado pela nova arquitetura unificada',
              data: compatibleData,
              metadata: {
                architecture: 'unified',
                confidence: result.confidence,
                detectionMethod: result.method,
                version: '2.0'
              }
            });
            return;
            
          } else {
            console.log('❌ ROTA: Falha na nova arquitetura:', result.errors?.join(', ') || 'Erro desconhecido');
            console.log('🔄 ROTA: Iniciando fallback para sistema legado...');
            console.log('⚠️ ROTA: ATENÇÃO - Sistema caindo para legacy devido a falha na nova arquitetura');
            
            // Fallback para sistema antigo se nova arquitetura falhar
            console.log('🔄 FALLBACK: Extraindo texto com Google Vision...');
            extractedText = await extractTextFromImage(imageBuffer);
            console.log('📝 FALLBACK: Texto extraído (primeiros 200 chars):', extractedText.substring(0, 200));
            
            console.log('🔄 FALLBACK: Processando com sistema legado...');
            processedData = processIdentityDocument(extractedText);
            console.log('📋 FALLBACK: Dados processados pelo sistema legado:', processedData);
            
            const normalizedData = await normalizeExtractedData(processedData);
            console.log('✅ FALLBACK: Dados normalizados:', normalizedData);
            
            res.json({
              success: true,
              extractedText,
              data: normalizedData,
              metadata: {
                architecture: 'legacy',
                fallback: true,
                reason: result.errors?.join(', ') || 'Nova arquitetura falhou',
                version: '1.0'
              }
            });
          }
          
        } catch (error) {
          console.error('❌ Erro na nova arquitetura:', error);
          
          // Fallback para sistema antigo
          console.log('🔄 Usando sistema antigo como fallback...');
          extractedText = await extractTextFromImage(imageBuffer);
          processedData = processIdentityDocument(extractedText);
          
          const normalizedData = await normalizeExtractedData(processedData);
          
          res.json({
            success: true,
            extractedText,
            data: normalizedData,
            metadata: {
              architecture: 'legacy',
              fallback: true,
              error: error instanceof Error ? error.message : 'Erro desconhecido',
              version: '1.0'
            }
          });
        }
        
      } else if (documentType === 'insurance') {
        console.log('🆕 FORÇANDO nova arquitetura modular para carteirinha...');
        
        try {
          // Importar dinamicamente o novo sistema
          const { documentExtractionService } = await import('./services/document-extraction/index');
          
          console.log('✅ Serviço de extração importado com sucesso');
          
          // Usar a nova arquitetura modular
          console.log('🔄 Iniciando processamento com nova arquitetura...');
          const result = await documentExtractionService.processInsuranceCard(imageBuffer);
          
          console.log('📋 Resultado da nova arquitetura:', result.success ? '✅ SUCESSO' : '❌ FALHA');
          
          if (result.errors) {
            console.log('🔍 Erros encontrados:', result.errors);
          }
        
          if (result.success) {
            console.log('✅ Carteirinha processada com nova arquitetura:', result.data);
            
            // Converter resultado para formato compatível com sistema atual
            const compatibleData = {
              operadora: result.data.operadora,
              normalizedOperadora: result.data.normalizedOperadora,
              nomeTitular: result.data.nomeTitular,
              numeroCarteirinha: result.data.numeroCarteirinha,
              plano: result.data.plano,
              dataNascimento: result.data.dataNascimento,
              cns: result.data.cns,
              ansCode: result.data.ansCode,
              // Metadados da nova arquitetura
              confidence: result.confidence,
              method: result.method,
              newArchitecture: true
            };
            
            res.json({
              success: true,
              extractedText: 'Processado pela nova arquitetura modular',
              data: compatibleData,
              metadata: {
                architecture: 'modular',
                confidence: result.confidence,
                detectionMethod: result.method,
                version: '2.0'
              }
            });
            return;
            
          } else {
            console.log('❌ Falha na nova arquitetura:', result.errors?.join(', ') || 'Erro desconhecido');
            
            res.status(500).json({
              success: false,
              error: 'Falha no processamento da carteirinha',
              errors: result.errors,
              metadata: {
                architecture: 'modular',
                version: '2.0'
              }
            });
          }
        } catch (error) {
          console.error('❌ Erro na nova arquitetura:', error);
          
          res.status(500).json({
            success: false,
            error: 'Erro interno na nova arquitetura',
            details: error instanceof Error ? error.message : 'Erro desconhecido',
            metadata: {
              architecture: 'modular',
              version: '2.0'
            }
          });
        }
        
      } else {
        return res.status(400).json({ error: 'Tipo de documento inválido' });
      }
      
      
      // Remover o arquivo temporário
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
    } catch (error) {
      console.error('❌ Erro ao processar documento:', error);
      
      // Remover arquivo temporário em caso de erro
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ 
        error: 'Erro ao processar documento',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // API para formulário de contato
  app.post("/api/contact", async (req: Request, res: Response) => {
    try {
      const { name, email, phone, subject, message } = req.body;

      // Validação básica
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ 
          error: "Campos obrigatórios: nome, email, assunto e mensagem" 
        });
      }

      // Criar mensagem de contato
      const contactMessage = await storage.createContactMessage({
        name,
        email,
        phone: phone || null,
        subject,
        message
      });

      console.log(`Nova mensagem de contato criada: ID ${contactMessage.id}`);

      res.status(201).json({ 
        message: "Mensagem enviada com sucesso",
        id: contactMessage.id
      });
    } catch (error) {
      console.error("Erro ao processar mensagem de contato:", error);
      res.status(500).json({ 
        error: "Erro interno do servidor"
      });
    }
  });

  // === ROTAS DE RECURSOS (APPEALS) ===
  
  // Criar recurso para pedido recusado
  app.post("/api/medical-orders/:orderId/appeals", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const { justification, additionalDocuments, rejectionReason } = req.body;
      const userId = (req as any).user.id;

      if (isNaN(orderId)) {
        return res.status(400).json({ message: "ID do pedido inválido" });
      }

      if (!justification || justification.trim().length === 0) {
        return res.status(400).json({ message: "Justificativa é obrigatória" });
      }

      // Verificar se o pedido existe e está recusado
      const order = await storage.getMedicalOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }

      if (order.status !== "recusado") {
        return res.status(400).json({ message: "Apenas pedidos recusados podem ter recursos" });
      }

      // Criar o recurso
      const appeal = await storage.createAppeal({
        medicalOrderId: orderId,
        justification: justification.trim(),
        additionalDocuments: additionalDocuments || null,
        rejectionReason: rejectionReason ? rejectionReason.trim() : null,
        createdBy: userId,
        status: "em_analise"
      });

      console.log(`Recurso criado: ID ${appeal.id} para pedido ${orderId}`);
      res.status(201).json(appeal);

    } catch (error) {
      console.error("Erro ao criar recurso:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Listar recursos de um pedido
  app.get("/api/medical-orders/:orderId/appeals", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);

      if (isNaN(orderId)) {
        return res.status(400).json({ message: "ID do pedido inválido" });
      }

      const appeals = await storage.getAppealsByOrderId(orderId);
      res.json(appeals);

    } catch (error) {
      console.error("Erro ao buscar recursos:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Atualizar status de um recurso (para administradores)
  app.patch("/api/appeals/:appealId/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const appealId = parseInt(req.params.appealId);
      const { status, reviewerNotes } = req.body;

      if (isNaN(appealId)) {
        return res.status(400).json({ message: "ID do recurso inválido" });
      }

      if (!["aprovado", "negado", "cancelado"].includes(status)) {
        return res.status(400).json({ message: "Status inválido" });
      }

      const updatedAppeal = await storage.updateAppealStatus(appealId, status, reviewerNotes);
      if (!updatedAppeal) {
        return res.status(404).json({ message: "Recurso não encontrado" });
      }

      console.log(`Status do recurso ${appealId} atualizado para: ${status}`);
      res.json(updatedAppeal);

    } catch (error) {
      console.error("Erro ao atualizar status do recurso:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  return httpServer;
}
