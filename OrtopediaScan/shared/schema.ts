import { pgTable, text, serial, integer, boolean, date, timestamp, pgEnum, numeric, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Estados brasileiros já definidos posteriormente no arquivo

// Operadoras de Saúde (Health Insurance Providers)
export const healthInsuranceProviders = pgTable("health_insurance_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cnpj: text("cnpj").notNull().unique(),
  ansCode: text("ans_code").notNull().unique(), // Código ANS (Agência Nacional de Saúde)
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  contactPerson: text("contact_person"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertHealthInsuranceProviderSchema = createInsertSchema(healthInsuranceProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type HealthInsuranceProvider = typeof healthInsuranceProviders.$inferSelect;
export type InsertHealthInsuranceProvider = z.infer<typeof insertHealthInsuranceProviderSchema>;

// Planos de Saúde (dados oficiais ANS)
export const healthInsurancePlans = pgTable("health_insurance_plans", {
  id: serial("id").primaryKey(),
  registroAns: text("registro_ans").notNull(), // Código ANS da operadora (relaciona com health_insurance_providers.ans_code)
  cdPlano: text("cd_plano").notNull(), // Código único do plano
  nmPlano: text("nm_plano"), // Nome do plano
  modalidade: text("modalidade"), // Medicina de Grupo, Cooperativa Médica, etc.
  segmentacao: text("segmentacao"), // Ambulatorial, Hospitalar, Odontológica, Referência
  acomodacao: text("acomodacao"), // Apartamento, Enfermaria
  tipoContratacao: text("tipo_contratacao"), // Individual/Familiar, Coletivo Empresarial, etc.
  abrangenciaGeografica: text("abrangencia_geografica"), // Municipal, Estadual, Regional, Nacional
  situacao: text("situacao"), // Status do plano
  dtInicioComercializacao: text("dt_inicio_comercializacao"), // Data de início
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHealthInsurancePlanSchema = createInsertSchema(healthInsurancePlans).omit({
  id: true,
  createdAt: true,
});

export type HealthInsurancePlan = typeof healthInsurancePlans.$inferSelect;
export type InsertHealthInsurancePlan = z.infer<typeof insertHealthInsurancePlanSchema>;

// Patient schema
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  cpf: text("cpf").notNull().unique(),
  birthDate: date("birth_date").notNull(),
  gender: text("gender").notNull(),
  email: text("email"),
  phone: text("phone"),
  phone2: text("phone2"),
  insurance: text("insurance"),
  insuranceNumber: text("insurance_number"),
  plan: text("plan"), // Plano
  notes: text("notes"),
  isActive: boolean("is_active").default(false), // Paciente ativo
  activatedBy: text("activated_by"), // Médico que ativou o paciente
});

export const insertPatientSchema = createInsertSchema(patients).pick({
  fullName: true,
  cpf: true,
  birthDate: true,
  gender: true,
  email: true,
  phone: true,
  phone2: true,
  insurance: true,
  insuranceNumber: true,
  plan: true,
  notes: true,
  isActive: true,
  activatedBy: true,
});

// OPME items schema
export const opmeItems = pgTable("opme_items", {
  id: serial("id").primaryKey(),
  anvisaRegistrationNumber: text("anvisa_registration_number"),      // Número de registro ANVISA
  processNumber: text("process_number"),                            // Número do processo ANVISA
  technicalName: text("technical_name").notNull(),                  // Nome técnico (ex: "Placa bloqueada")
  commercialName: text("commercial_name").notNull(),                // Nome comercial (ex: "TARGON - Sistema de haste")
  riskClass: text("risk_class"),                                    // Classe de risco I, II, III ou IV
  holderCnpj: text("holder_cnpj"),                                  // CNPJ do detentor do registro
  registrationHolder: text("registration_holder"),                  // Nome do detentor do registro
  manufacturerName: text("manufacturer_name"),                      // Fabricante real
  countryOfManufacture: text("country_of_manufacture"),             // País de origem
  registrationDate: date("registration_date"),                      // Data de publicação do registro
  expirationDate: date("expiration_date"),                          // Validade do registro
  isValid: boolean("is_valid").default(true),                       // Se o material ainda está vigente
  createdAt: timestamp("created_at").defaultNow().notNull(),        // Data de criação do registro
  updatedAt: timestamp("updated_at").defaultNow().notNull(),        // Data de atualização do registro
});

export const insertOpmeItemSchema = createInsertSchema(opmeItems).pick({
  anvisaRegistrationNumber: true,
  processNumber: true,
  technicalName: true,
  commercialName: true,
  riskClass: true,
  holderCnpj: true,
  registrationHolder: true,
  manufacturerName: true,
  countryOfManufacture: true,
  registrationDate: true,
  expirationDate: true,
  isValid: true,
});

// Surgical procedures - CBHPM codes
export const procedures = pgTable("procedures", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // Código CBHPM (ex: 3.07.24.08-4)
  name: text("name").notNull(), // Nome do procedimento
  porte: text("porte"), // Porte do procedimento
  custoOperacional: text("custo_operacional"), // Custo operacional
  porteAnestesista: text("porte_anestesista"), // Porte anestesista
  numeroAuxiliares: integer("numero_auxiliares"), // Número de auxiliares
  description: text("description"), // Descrição adicional se necessário
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProcedureSchema = createInsertSchema(procedures).pick({
  code: true,
  name: true,
  porte: true,
  custoOperacional: true,
  porteAnestesista: true,
  numeroAuxiliares: true,
  description: true,
  active: true,
});

// Status de pedidos cirúrgicos na tabela de referência
export const orderStatuses = pgTable("order_statuses", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  displayOrder: integer("display_order").notNull(),
  color: text("color"),
  icon: text("icon"),
});

export const insertOrderStatusSchema = createInsertSchema(orderStatuses);
export type OrderStatus = typeof orderStatuses.$inferSelect;
export type InsertOrderStatus = z.infer<typeof insertOrderStatusSchema>;

// Manter enum para compatibilidade (deprecated)
export const orderStatusEnum = pgEnum("order_status", ["em_preenchimento", "em_avaliacao", "aceito", "recusado", "realizado", "cancelado"]);

// Enum para tipo de procedimento
export const procedureTypeEnum = pgEnum("procedure_type", ["eletiva", "urgencia"]);

// Enum para lateralidade do CID
export const cidLateralityEnum = pgEnum("cid_laterality", ["esquerdo", "direito", "bilateral", "indeterminado"]);

// Enum para status de pagamento
export const paymentStatusEnum = pgEnum("payment_status", ["pendente", "pago", "glosa", "recusado"]);

// Medical orders schema - normalizado
export const medicalOrders = pgTable("medical_orders", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id), // Usuário que criou o pedido
  hospitalId: integer("hospital_id").references(() => hospitals.id),
  procedureId: integer("procedure_id").notNull(),
  procedureDate: date("procedure_date"), // Data planejada
  // Nota: a coluna surgeryDate foi removida pois não existe na tabela real
  reportContent: text("report_content"),
  clinicalIndication: text("clinical_indication").notNull(),
  cidCodeId: integer("cid_code_id").references(() => cidCodes.id), // Referência à tabela de códigos CID
  cidLaterality: cidLateralityEnum("cid_laterality"), // Lateralidade do CID: esquerdo, direito ou bilateral
  clinical_justification: text("clinical_justification"), // Sugestão de justificativa clínica para o procedimento
  multiple_cid_ids: integer("multiple_cid_ids").array(), // Array de IDs de códigos CID-10 adicionais
  procedureCbhpmId: integer("procedure_cbhpm_id").references(() => procedures.id), // ID do procedimento CBHPM principal
  procedureCbhpmQuantity: integer("procedure_cbhpm_quantity").default(1), // Quantidade do procedimento principal
  procedureLaterality: cidLateralityEnum("procedure_laterality"), // Lateralidade do procedimento principal: esquerdo, direito ou bilateral
  secondaryProcedureIds: integer("secondary_procedure_ids").array(), // Array de IDs de procedimentos secundários
  secondaryProcedureQuantities: integer("secondary_procedure_quantities").array(), // Array de quantidades para procedimentos secundários
  secondaryProcedureLateralities: text("secondary_procedure_lateralities").array(), // Array de lateralidades para procedimentos secundários
  opmeItemIds: integer("opme_item_ids").array(), // Array de IDs de itens OPME associados ao pedido
  opmeItemQuantities: integer("opme_item_quantities").array(), // Array de quantidades para cada item OPME
  procedureType: procedureTypeEnum("procedure_type"), // Tipo de procedimento: eletiva ou urgência
  // Fornecedores de materiais OPME (array de IDs)
  supplierIds: integer("supplier_ids").array(), // Array de IDs dos fornecedores selecionados
  // Colunas de imagens (ajustadas para corresponder exatamente ao banco de dados)
  exam_images_url: text("exam_images_url").array(), // Array de URLs das imagens dos exames
  exam_image_count: integer("exam_image_count").default(0), // Contador de imagens
  medical_report_url: text("medical_report_url"),
  order_pdf_url: text("order_pdf_url"), // URL do PDF gerado do pedido
  additional_notes: text("additional_notes"),
  statusCode: text("status_code").notNull().default("em_preenchimento").references(() => orderStatuses.code), // Status do pedido com referência à tabela order_statuses
  // As colunas abaixo foram comentadas porque não existem na tabela real do banco de dados
  // paymentStatus: paymentStatusEnum("payment_status"), // Status de pagamento do honorário médico
  // paymentDate: date("payment_date"), // Data do pagamento
  // paymentValue: integer("payment_value"), // Valor do pagamento em centavos
  // hasPendingPayment: boolean("has_pending_payment").default(false), // Indica se há pagamento pendente
  // cancelReason: text("cancel_reason"), // Motivo do cancelamento (se aplicável)
  // glosaReason: text("glosa_reason"), // Motivo da glosa (se aplicável)
  complexity: text("complexity"), // Complexidade/porte cirúrgico
  receivedValue: integer("received_value"), // Valor recebido pela cirurgia em centavos
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMedicalOrderSchema = createInsertSchema(medicalOrders).pick({
  patientId: true,
  userId: true,
  hospitalId: true,
  procedureId: true,
  procedureDate: true,
  // surgeryDate foi removido pois não existe na tabela real
  reportContent: true,
  clinicalIndication: true,
  cidCodeId: true,
  cidLaterality: true, // Adicionado campo de lateralidade do CID
  procedureCbhpmId: true,
  procedureCbhpmQuantity: true,
  procedureLaterality: true, // Adicionado campo de lateralidade do procedimento principal
  secondaryProcedureIds: true,
  secondaryProcedureQuantities: true,
  secondaryProcedureLateralities: true,
  opmeItemIds: true,
  opmeItemQuantities: true,
  procedureType: true,
  // Fornecedores de materiais OPME
  supplierIds: true,
  // Usando nomes exatos das colunas do banco de dados
  exam_images_url: true,
  exam_image_count: true,
  medical_report_url: true,
  order_pdf_url: true,
  additional_notes: true,
  statusCode: true, // Campo com referência à tabela order_statuses
  // Campos de pagamento removidos pois não existem na tabela real
  complexity: true,
  receivedValue: true, // Valor recebido pela cirurgia
});

// Order items schema
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  opmeItemId: integer("opme_item_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).pick({
  orderId: true,
  opmeItemId: true,
  quantity: true,
});

// Scanned documents schema
export const scannedDocuments = pgTable("scanned_documents", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  documentType: text("document_type").notNull(), // "identification" or "medical_report"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertScannedDocumentSchema = createInsertSchema(scannedDocuments).pick({
  patientId: true,
  documentType: true,
  content: true,
});

// Permissions enum
export const permissionEnum = pgEnum("permission", [
  // Módulos principais
  "dashboard_view",
  "patients_view", "patients_create", "patients_edit", "patients_delete",
  "hospitals_view", "hospitals_create", "hospitals_edit", "hospitals_delete",
  "orders_view", "orders_create", "orders_edit", "orders_delete", 
  "catalog_view", "catalog_create", "catalog_edit", "catalog_delete",
  "reports_view", "reports_create", "reports_export",
  // Módulos administrativos
  "users_view", "users_create", "users_edit", "users_delete",
  "roles_view", "roles_create", "roles_edit", "roles_delete",
  "system_settings"
]);

// Roles table (Papéis)
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRoleSchema = createInsertSchema(roles).pick({
  name: true,
  description: true,
  isDefault: true,
});

// Role Permissions join table
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permission: permissionEnum("permission").notNull(),
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).pick({
  roleId: true,
  permission: true,
});

// Users table with enhanced security features
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // Será armazenado como hash bcrypt
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  roleId: integer("role_id").notNull().references(() => roles.id),
  crm: integer("crm"), // Número CRM para médicos
  active: boolean("active").default(false),
  lastLogin: timestamp("last_login"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockoutUntil: timestamp("lockout_until"),
  consentAccepted: timestamp("consent_accepted"), // Data/hora em que o usuário aceitou o termo de consentimento
  signatureUrl: text("signature_url"), // URL da assinatura do médico
  signatureNote: text("signature_note"), // Nota de texto para aparecer embaixo da assinatura
  logoUrl: text("logo_url"), // URL do logotipo do médico
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  name: true,
  roleId: true,
  crm: true,
  active: true,
  signatureNote: true,
});

// User individual permissions (override role permissions)
export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  permission: permissionEnum("permission").notNull(),
  granted: boolean("granted").notNull(), // true = conceder, false = negar explicitamente
});

export const insertUserPermissionSchema = createInsertSchema(userPermissions).pick({
  userId: true,
  permission: true,
  granted: true,
});

// Export types
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type OpmeItem = typeof opmeItems.$inferSelect;
export type InsertOpmeItem = z.infer<typeof insertOpmeItemSchema>;

export type Procedure = typeof procedures.$inferSelect;
export type InsertProcedure = z.infer<typeof insertProcedureSchema>;

export type MedicalOrder = typeof medicalOrders.$inferSelect;
export type InsertMedicalOrder = z.infer<typeof insertMedicalOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type ScannedDocument = typeof scannedDocuments.$inferSelect;
export type InsertScannedDocument = z.infer<typeof insertScannedDocumentSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;

// Hospital schema
export const hospitals = pgTable("hospitals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  businessName: text("business_name"), // Nome Empresarial (opcional temporariamente)
  cnpj: text("cnpj").notNull().unique(),
  cnes: text("cnes"), // CNES (máximo 7 dígitos) (opcional temporariamente)
  ibgeStateCode: integer("ibge_state_code").notNull().references(() => brazilianStates.ibgeCode), // Código IBGE do estado
  ibgeCityCode: integer("ibge_city_code").references(() => municipalities.ibgeCode), // Código IBGE da cidade
  cep: text("cep"), // CEP no formato brasileiro (opcional temporariamente)
  address: text("address"), // Endereço (opcional temporariamente)
  number: integer("number"), // Número (opcional temporariamente)
  logoUrl: text("logo_url"), // URL do logo do hospital
});

export const insertHospitalSchema = createInsertSchema(hospitals).pick({
  name: true,
  businessName: true,
  cnpj: true,
  cnes: true,
  ibgeStateCode: true,
  ibgeCityCode: true,
  cep: true,
  address: true,
  number: true,
  logoUrl: true,
});

export type Hospital = typeof hospitals.$inferSelect;
export type InsertHospital = z.infer<typeof insertHospitalSchema>;

// CID-10 codes schema
export const cidCategories = pgEnum("cid_categories", [
  // Categorias ortopédicas específicas (mantidas para compatibilidade)
  "Joelho", 
  "Coluna", 
  "Ombro", 
  "Quadril", 
  "Pé e tornozelo",
  
  // Categorias CID-10 oficiais completas
  "Doenças Infecciosas e Parasitárias",
  "Neoplasias",
  "Doenças do Sangue e Órgãos Hematopoéticos",
  "Doenças Endócrinas e Metabólicas",
  "Transtornos Mentais e Comportamentais",
  "Doenças do Sistema Nervoso",
  "Doenças do Olho e Anexos",
  "Doenças do Ouvido",
  "Doenças do Aparelho Circulatório",
  "Doenças do Aparelho Respiratório",
  "Doenças do Aparelho Digestivo",
  "Doenças da Pele e Tecido Subcutâneo",
  "Doenças do Sistema Osteomuscular",
  "Doenças do Aparelho Geniturinário",
  "Gravidez, Parto e Puerpério",
  "Afecções Período Perinatal",
  "Malformações Congênitas",
  "Sintomas e Sinais Anormais",
  "Lesões e Envenenamentos",
  "Causas Externas",
  "Fatores que Influenciam o Estado de Saúde",
  "Outros"
]);

export const cidCodes = pgTable("cid_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // Código CID-10 (ex: M17.0)
  description: text("description").notNull(), // Descrição do código
  category: cidCategories("category").notNull().default("Outros"), // Categoria ortopédica
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCidCodeSchema = createInsertSchema(cidCodes).pick({
  code: true,
  description: true,
  category: true,
});

export type CidCode = typeof cidCodes.$inferSelect;
export type InsertCidCode = z.infer<typeof insertCidCodeSchema>;

// Tabela de associações CID-10 / CBHPM (1 para N)
export const cidCbhpmAssociations = pgTable("cid_cbhpm_associations", {
  id: serial("id").primaryKey(),
  cidCodeId: integer("cid_code_id").notNull().references(() => cidCodes.id, { onDelete: 'cascade' }),
  procedureId: integer("procedure_id").notNull().references(() => procedures.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCidCbhpmAssociationSchema = createInsertSchema(cidCbhpmAssociations).pick({
  cidCodeId: true,
  procedureId: true,
});

export type CidCbhpmAssociation = typeof cidCbhpmAssociations.$inferSelect;
export type InsertCidCbhpmAssociation = z.infer<typeof insertCidCbhpmAssociationSchema>;

// Relações para as associações CID-10 / CBHPM
export const cidCbhpmAssociationsRelations = relations(cidCbhpmAssociations, ({ one }) => ({
  cidCode: one(cidCodes, {
    fields: [cidCbhpmAssociations.cidCodeId],
    references: [cidCodes.id],
    relationName: "cidAssociations",
  }),
  procedure: one(procedures, {
    fields: [cidCbhpmAssociations.procedureId],
    references: [procedures.id],
    relationName: "procedureAssociations",
  }),
}));

// Fornecedores (Suppliers)
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  tradeName: text("trade_name"),
  cnpj: text("cnpj").notNull().unique(),
  municipalityId: integer("municipality_id").notNull().references(() => municipalities.id),
  address: text("address"),
  neighborhood: text("neighborhood"),
  postalCode: text("postal_code"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  anvisaCode: text("anvisa_code"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Definir relação entre fornecedores e municípios
export const suppliersRelations = relations(suppliers, ({ one }) => ({
  municipality: one(municipalities, {
    fields: [suppliers.municipalityId],
    references: [municipalities.id],
    relationName: "supplierMunicipality",
  }),
}));

export const insertSupplierSchema = createInsertSchema(suppliers).pick({
  companyName: true,
  tradeName: true,
  cnpj: true,
  municipalityId: true,
  address: true,
  neighborhood: true,
  postalCode: true,
  phone: true,
  email: true,
  website: true,
  anvisaCode: true,
  active: true,
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

// Enum para tipos de notificações
export const notificationTypeEnum = pgEnum("notification_type", ["info", "warning", "success"]);

// Tabela de notificações
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  message: text("message").notNull(),
  type: notificationTypeEnum("type").default("info").notNull(),
  read: boolean("read").default(false).notNull(),
  link: text("link"), // Link opcional para direcionar quando clicar na notificação
  entityType: text("entity_type"), // Tipo de entidade relacionada (ex: "medicalOrder", "patient")
  entityId: integer("entity_id"), // ID da entidade relacionada
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  message: true,
  type: true,
  read: true,
  link: true,
  entityType: true,
  entityId: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Tabela para mensagens de "Fale Conosco"
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  responseMessage: text("response_message"),
  responseDate: timestamp("response_date"),
  respondedById: integer("responded_by_id").references(() => users.id, { onDelete: "set null" }),
});

export const contactMessagesRelations = relations(contactMessages, ({ one }) => ({
  user: one(users, {
    fields: [contactMessages.userId],
    references: [users.id],
    relationName: "contactMessageUser",
  }),
  respondedBy: one(users, {
    fields: [contactMessages.respondedById],
    references: [users.id],
    relationName: "contactMessageRespondedBy",
  }),
}));

export const insertContactMessageSchema = createInsertSchema(contactMessages)
  .omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true, 
    status: true, 
    responseMessage: true, 
    responseDate: true, 
    respondedById: true 
  })
  .extend({
    email: z.string().email("E-mail inválido"),
    message: z.string().min(10, "A mensagem deve ter pelo menos 10 caracteres"),
  });

export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;

// Relação entre médicos (usuários com CRM) e hospitais
export const doctorHospitals = pgTable("doctor_hospitals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  hospitalId: integer("hospital_id").notNull().references(() => hospitals.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDoctorHospitalSchema = createInsertSchema(doctorHospitals).pick({
  userId: true,
  hospitalId: true,
});

export type DoctorHospital = typeof doctorHospitals.$inferSelect;
export type InsertDoctorHospital = z.infer<typeof insertDoctorHospitalSchema>;

// Brazilian States with IBGE codes
export const brazilianStates = pgTable("brazilian_states", {
  id: serial("id").primaryKey(),
  stateCode: text("state_code").notNull().unique(), // State abbreviation (e.g., SP, RJ)
  name: text("name").notNull(), // State name (e.g., São Paulo, Rio de Janeiro)
  ibgeCode: integer("ibge_code").notNull().unique(), // IBGE code for the state
  region: text("region").notNull(), // Region (e.g., Southeast, Northeast)
});

export const insertBrazilianStateSchema = createInsertSchema(brazilianStates).pick({
  stateCode: true,
  name: true,
  ibgeCode: true,
  region: true,
});

export type BrazilianState = typeof brazilianStates.$inferSelect;
export type InsertBrazilianState = z.infer<typeof insertBrazilianStateSchema>;

// Brazilian Municipalities with IBGE codes and state relationship
export const municipalities = pgTable("municipalities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ibgeCode: integer("ibge_code").notNull().unique(),
  stateId: integer("state_id")
    .notNull()
    .references(() => brazilianStates.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relationship between municipalities and states
export const municipalitiesRelations = relations(municipalities, ({ one }) => ({
  state: one(brazilianStates, {
    fields: [municipalities.stateId],
    references: [brazilianStates.id],
    relationName: "municipalityState",
  })
}));

export const insertMunicipalitySchema = createInsertSchema(municipalities).pick({
  name: true,
  ibgeCode: true,
  stateId: true,
});

export type Municipality = typeof municipalities.$inferSelect;
export type InsertMunicipality = z.infer<typeof insertMunicipalitySchema>;

// Tabela de relacionamento entre OPMEs e Fornecedores
export const opmeSuppliers = pgTable("opme_suppliers", {
  id: serial("id").primaryKey(),
  opmeItemId: integer("opme_item_id").notNull().references(() => opmeItems.id, { onDelete: 'cascade' }),
  supplierId: integer("supplier_id").notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  registrationAnvisa: text("registration_anvisa"),                // Número de registro ANVISA específico do fornecedor
  commercialDescription: text("commercial_description"),          // Descrição comercial específica do fornecedor
  isPreferred: boolean("is_preferred").default(false),           // Indica se este é o fornecedor preferencial
  active: boolean("active").default(true),                       // Status do relacionamento
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }),  // Preço unitário
  lastPriceUpdate: date("last_price_update"),                    // Data da última atualização de preço
  deliveryTimeDays: integer("delivery_time_days"),               // Prazo de entrega em dias
  minimumQuantity: integer("minimum_quantity").default(1),       // Quantidade mínima para pedido
  notes: text("notes"),                                          // Observações adicionais
  createdAt: timestamp("created_at").defaultNow().notNull(),     // Data de criação
  updatedAt: timestamp("updated_at").defaultNow().notNull(),     // Data de atualização
});

// Definindo relações
export const opmeSupplierRelations = relations(opmeSuppliers, ({ one }) => ({
  opmeItem: one(opmeItems, {
    fields: [opmeSuppliers.opmeItemId],
    references: [opmeItems.id],
  }),
  supplier: one(suppliers, {
    fields: [opmeSuppliers.supplierId],
    references: [suppliers.id],
  }),
}));

export const insertOpmeSupplierSchema = createInsertSchema(opmeSuppliers).pick({
  opmeItemId: true,
  supplierId: true,
  registrationAnvisa: true,
  commercialDescription: true,
  isPreferred: true,
  active: true,
  unitPrice: true,
  lastPriceUpdate: true,
  deliveryTimeDays: true,
  minimumQuantity: true,
  notes: true,
});

export type OpmeSupplier = typeof opmeSuppliers.$inferSelect;
export type InsertOpmeSupplier = z.infer<typeof insertOpmeSupplierSchema>;

// Tabela de associação entre médicos e pacientes
export const doctorPatients = pgTable("doctor_patients", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: 'cascade' }),
  associatedAt: timestamp("associated_at").defaultNow().notNull(),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
});

// Relações entre médicos (usuários) e pacientes
export const doctorPatientsRelations = relations(doctorPatients, ({ one }) => ({
  doctor: one(users, {
    fields: [doctorPatients.doctorId],
    references: [users.id],
    relationName: "doctorPatientUser",
  }),
  patient: one(patients, {
    fields: [doctorPatients.patientId],
    references: [patients.id],
    relationName: "doctorPatientPatient",
  })
}));

export const insertDoctorPatientSchema = createInsertSchema(doctorPatients).pick({
  doctorId: true,
  patientId: true,
  notes: true,
  isActive: true,
});

export type DoctorPatient = typeof doctorPatients.$inferSelect;
export type InsertDoctorPatient = z.infer<typeof insertDoctorPatientSchema>;

// Enum para status de recursos
export const appealStatusEnum = pgEnum("appeal_status", [
  "em_analise",     // Em análise
  "aprovado",       // Recurso aprovado
  "negado",         // Recurso negado
  "cancelado"       // Recurso cancelado
]);

// Tabela de recursos para pedidos recusados
export const appeals = pgTable("appeals", {
  id: serial("id").primaryKey(),
  medicalOrderId: integer("medical_order_id").notNull().references(() => medicalOrders.id, { onDelete: 'cascade' }),
  justification: text("justification").notNull(), // Justificativa médica do recurso
  rejectionReason: text("rejection_reason"), // Motivo da recusa enviado pela operadora
  additionalDocuments: text("additional_documents"), // URLs de documentos adicionais (JSON array)
  status: appealStatusEnum("status").notNull().default("em_analise"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"), // Data da análise do recurso
  reviewerNotes: text("reviewer_notes"), // Observações do revisor da seguradora
  createdBy: integer("created_by").notNull().references(() => users.id), // Médico que criou o recurso
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relações da tabela de recursos
export const appealsRelations = relations(appeals, ({ one }) => ({
  medicalOrder: one(medicalOrders, {
    fields: [appeals.medicalOrderId],
    references: [medicalOrders.id],
    relationName: "appealMedicalOrder",
  }),
  creator: one(users, {
    fields: [appeals.createdBy],
    references: [users.id],
    relationName: "appealCreator",
  })
}));

export const insertAppealSchema = createInsertSchema(appeals).omit({
  id: true,
  submittedAt: true,
  updatedAt: true,
});

export type Appeal = typeof appeals.$inferSelect;
export type InsertAppeal = z.infer<typeof insertAppealSchema>;
