import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Estilos para o PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 20,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  logoContainer: {
    width: 120,
    height: 60,
    marginRight: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  hospitalInfo: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333333',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  column: {
    flex: 1,
    paddingRight: 10,
  },
  label: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#666666',
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: '#000000',
    lineHeight: 1.3,
  },
  justification: {
    fontSize: 10,
    lineHeight: 1.4,
    textAlign: 'justify',
    color: '#000000',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    textAlign: 'center',
    fontSize: 8,
    color: '#666666',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    marginVertical: 10,
  },
});

interface OrderPDFDocumentProps {
  orderData: any;
  patientData: any;
  hospitalData: any;
  procedureData: any;
  cidData: any;
  secondaryProcedures?: any[];
  opmeItems?: any[];
  suppliers?: any[];
}

export const OrderPDFDocument: React.FC<OrderPDFDocumentProps> = ({
  orderData,
  patientData,
  hospitalData,
  procedureData,
  cidData,
  secondaryProcedures = [],
  opmeItems = [],
  suppliers = [],
}) => {
  // Formatar data
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Formatar CPF
  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          {hospitalData?.logoUrl && (
            <View style={styles.logoContainer}>
              <Image src={hospitalData.logoUrl} style={styles.logo} />
            </View>
          )}
          <View style={styles.hospitalInfo}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
              {hospitalData?.name || 'Hospital'}
            </Text>
            {hospitalData?.address && (
              <Text style={{ fontSize: 9, color: '#666666', marginBottom: 2 }}>
                {hospitalData.address}
              </Text>
            )}
            {hospitalData?.phone && (
              <Text style={{ fontSize: 9, color: '#666666' }}>
                Tel: {hospitalData.phone}
              </Text>
            )}
          </View>
        </View>

        {/* Título */}
        <Text style={styles.title}>
          Solicitação de Procedimento Cirúrgico
        </Text>

        <View style={styles.divider} />

        {/* Dados do Paciente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do Paciente</Text>
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Nome Completo:</Text>
              <Text style={styles.value}>{patientData?.fullName || 'Não informado'}</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>CPF:</Text>
              <Text style={styles.value}>
                {patientData?.cpf ? formatCPF(patientData.cpf) : 'Não informado'}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Data de Nascimento:</Text>
              <Text style={styles.value}>
                {patientData?.birthDate ? formatDate(patientData.birthDate) : 'Não informado'}
              </Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Convênio:</Text>
              <Text style={styles.value}>{patientData?.insurance || 'Particular'}</Text>
            </View>
          </View>
          {patientData?.insuranceNumber && (
            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={styles.label}>Número da Carteirinha:</Text>
                <Text style={styles.value}>{patientData.insuranceNumber}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Dados do Procedimento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do Procedimento</Text>
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Procedimento Principal:</Text>
              <Text style={styles.value}>
                {procedureData?.name || 'Não especificado'}
                {procedureData?.cbhpmCode && ` (${procedureData.cbhpmCode})`}
              </Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Caráter:</Text>
              <Text style={styles.value}>
                {orderData?.procedureType === 'eletiva' ? 'Eletivo' : 
                 orderData?.procedureType === 'urgencia' ? 'Urgência' : 
                 orderData?.procedureType === 'emergencia' ? 'Emergência' : 'Não especificado'}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Lateralidade do Procedimento:</Text>
              <Text style={styles.value}>
                {orderData?.procedureLaterality === 'direito' ? 'Direito' :
                 orderData?.procedureLaterality === 'esquerdo' ? 'Esquerdo' :
                 orderData?.procedureLaterality === 'bilateral' ? 'Bilateral' : 'Não especificado'}
              </Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>CID-10:</Text>
              <Text style={styles.value}>
                {cidData?.code && cidData?.description 
                  ? `${cidData.code} - ${cidData.description}`
                  : 'Não especificado'}
              </Text>
            </View>
          </View>
        </View>

        {/* Procedimentos Secundários */}
        {secondaryProcedures && secondaryProcedures.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Procedimentos Secundários</Text>
            {secondaryProcedures.map((proc, index) => (
              <Text key={index} style={styles.value}>
                • {proc.name} {proc.cbhpmCode && `(${proc.cbhpmCode})`}
              </Text>
            ))}
          </View>
        )}

        {/* Materiais OPME */}
        {opmeItems && opmeItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Materiais Necessários (OPME)</Text>
            {opmeItems.map((item, index) => (
              <Text key={index} style={styles.value}>
                • 1x {item.technicalName || item.commercialName || 'Material não especificado'}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.divider} />

        {/* Indicação Clínica */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicação Clínica</Text>
          <Text style={styles.value}>
            {orderData?.clinicalIndication || 'Não informado'}
          </Text>
        </View>

        {/* Justificativa Clínica */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Justificativa Clínica</Text>
          <Text style={styles.justification}>
            {orderData?.clinical_justification || orderData?.clinicalJustification || 'Não informado'}
          </Text>
        </View>

        {/* Observações Adicionais */}
        {orderData?.additional_notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações Adicionais</Text>
            <Text style={styles.value}>
              {orderData.additional_notes}
            </Text>
          </View>
        )}

        {/* Rodapé */}
        <Text style={styles.footer}>
          Documento gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
          {orderData?.id && ` | Pedido #${orderData.id}`}
        </Text>
      </Page>
    </Document>
  );
};