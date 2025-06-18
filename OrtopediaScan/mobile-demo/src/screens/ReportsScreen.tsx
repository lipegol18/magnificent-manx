import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Title, Divider, List, useTheme, SegmentedButtons, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS } from '../api/apiClient';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Tipos de relatórios disponíveis
type ReportType = 'orders' | 'opme' | 'hospitals';

// Período para filtragem
type Period = 'week' | 'month' | 'quarter' | 'year' | 'custom';

const ReportsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const [reportType, setReportType] = useState<ReportType>('orders');
  const [period, setPeriod] = useState<Period>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Dados simulados para os diferentes tipos de relatórios
  const ordersData = [
    { id: 1, name: 'Artroscopia de Joelho', count: 12, value: 145000 },
    { id: 2, name: 'Prótese de Quadril', count: 8, value: 240000 },
    { id: 3, name: 'Artrodese de Coluna', count: 5, value: 185000 },
    { id: 4, name: 'Osteotomia', count: 7, value: 105000 },
    { id: 5, name: 'Reparo de Ligamento', count: 15, value: 125000 },
  ];

  const opmeData = [
    { id: 1, name: 'Parafuso Ortopédico', count: 48, value: 60000 },
    { id: 2, name: 'Placa de Fixação', count: 32, value: 120000 },
    { id: 3, name: 'Prótese de Joelho', count: 12, value: 180000 },
    { id: 4, name: 'Enxerto Ósseo', count: 18, value: 72000 },
    { id: 5, name: 'Fixador Externo', count: 9, value: 49500 },
  ];

  const hospitalsData = [
    { id: 1, name: 'Hospital São Lucas', count: 15, value: 225000 },
    { id: 2, name: 'Hospital Albert Einstein', count: 22, value: 330000 },
    { id: 3, name: 'Hospital Samaritano', count: 10, value: 150000 },
    { id: 4, name: 'Hospital Sírio-Libanês', count: 18, value: 270000 },
    { id: 5, name: 'Hospital Copa D\'Or', count: 12, value: 180000 },
  ];

  // Obtém os dados conforme o tipo de relatório selecionado
  const getReportData = () => {
    switch (reportType) {
      case 'orders':
        return ordersData;
      case 'opme':
        return opmeData;
      case 'hospitals':
        return hospitalsData;
      default:
        return [];
    }
  };

  // Formatação de moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Calcula o total do relatório
  const reportTotal = getReportData().reduce(
    (total, current) => total + current.value, 
    0
  );

  // Descrição do relatório com base no tipo selecionado
  const getReportDescription = () => {
    const periodText = {
      week: 'na última semana',
      month: 'no último mês',
      quarter: 'no último trimestre',
      year: 'no último ano',
      custom: 'no período selecionado'
    }[period];

    switch (reportType) {
      case 'orders':
        return `Procedimentos realizados ${periodText}, agrupados por tipo.`;
      case 'opme':
        return `Materiais OPME utilizados ${periodText}, agrupados por tipo.`;
      case 'hospitals':
        return `Procedimentos realizados ${periodText}, agrupados por hospital.`;
      default:
        return '';
    }
  };

  // Título do relatório com base no tipo selecionado
  const getReportTitle = () => {
    switch (reportType) {
      case 'orders':
        return 'Relatório de Procedimentos';
      case 'opme':
        return 'Relatório de Materiais OPME';
      case 'hospitals':
        return 'Relatório por Hospital';
      default:
        return 'Relatório';
    }
  };

  // Função para gerar e exportar o relatório
  const generateReport = () => {
    setIsLoading(true);
    
    // Simulação de geração de relatório
    setTimeout(() => {
      setIsLoading(false);
      // Aqui seria implementada a exportação real do relatório
      alert('Relatório gerado com sucesso.');
    }, 1500);
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.filterCard}>
        <Card.Content>
          <Title style={styles.filterTitle}>Filtros do Relatório</Title>
          
          <Text style={styles.sectionLabel}>Tipo de Relatório</Text>
          <SegmentedButtons
            value={reportType}
            onValueChange={(value) => setReportType(value as ReportType)}
            buttons={[
              { value: 'orders', label: 'Procedimentos' },
              { value: 'opme', label: 'Materiais' },
              { value: 'hospitals', label: 'Hospitais' },
            ]}
            style={styles.segmentedButtons}
          />
          
          <Text style={styles.sectionLabel}>Período</Text>
          <SegmentedButtons
            value={period}
            onValueChange={(value) => setPeriod(value as Period)}
            buttons={[
              { value: 'week', label: 'Semana' },
              { value: 'month', label: 'Mês' },
              { value: 'quarter', label: 'Trimestre' },
              { value: 'year', label: 'Ano' },
              { value: 'custom', label: 'Personalizado' },
            ]}
            style={styles.segmentedButtons}
          />
          
          {period === 'custom' && (
            <View style={styles.dateRangeContainer}>
              <TextInput
                label="Data Inicial"
                value={startDate}
                onChangeText={setStartDate}
                style={styles.dateInput}
                placeholder="DD/MM/AAAA"
              />
              <TextInput
                label="Data Final"
                value={endDate}
                onChangeText={setEndDate}
                style={styles.dateInput}
                placeholder="DD/MM/AAAA"
              />
            </View>
          )}
          
          <Button 
            mode="contained" 
            onPress={generateReport} 
            loading={isLoading}
            disabled={isLoading}
            style={styles.generateButton}
          >
            Exportar Relatório
          </Button>
        </Card.Content>
      </Card>
      
      <Card style={styles.reportCard}>
        <Card.Content>
          <Title style={styles.reportTitle}>{getReportTitle()}</Title>
          <Text style={styles.reportDescription}>{getReportDescription()}</Text>
          
          <List.Section>
            {getReportData().map((item) => (
              <View key={item.id}>
                <View style={styles.reportItemRow}>
                  <View style={styles.reportItemInfo}>
                    <Text style={styles.reportItemName}>{item.name}</Text>
                    <Text style={styles.reportItemCount}>{item.count} unidades</Text>
                  </View>
                  <Text style={styles.reportItemValue}>{formatCurrency(item.value)}</Text>
                </View>
                <Divider style={styles.itemDivider} />
              </View>
            ))}
            
            <View style={styles.reportTotalRow}>
              <Text style={styles.reportTotalLabel}>Total</Text>
              <Text style={styles.reportTotalValue}>{formatCurrency(reportTotal)}</Text>
            </View>
          </List.Section>
        </Card.Content>
      </Card>
      
      <Card style={styles.reportCard}>
        <Card.Content>
          <Title style={styles.chartTitle}>Gráfico de Distribuição</Title>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>
              Visualização gráfica dos dados seria exibida aqui
            </Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  filterCard: {
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 16,
    marginBottom: 8,
    marginTop: 12,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dateInput: {
    width: '48%',
  },
  generateButton: {
    marginTop: 16,
  },
  reportCard: {
    marginBottom: 16,
  },
  reportTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  reportDescription: {
    marginBottom: 16,
    opacity: 0.7,
  },
  reportItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  reportItemInfo: {
    flex: 1,
  },
  reportItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  reportItemCount: {
    opacity: 0.7,
  },
  reportItemValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  itemDivider: {
    height: 1,
  },
  reportTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginTop: 8,
  },
  reportTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  reportTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  chartTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  chartPlaceholderText: {
    textAlign: 'center',
    opacity: 0.6,
  },
});

export default ReportsScreen;