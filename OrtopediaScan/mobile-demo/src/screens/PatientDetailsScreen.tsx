import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Title, Divider, Chip, List, useTheme, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS } from '../api/apiClient';

type PatientDetailsRouteProp = RouteProp<RootStackParamList, 'PatientDetails'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Patient = {
  id: number;
  name: string;
  cpf: string;
  birthDate: string;
  gender: string;
  phoneNumber: string;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
};

type MedicalOrder = {
  id: number;
  patientId: number;
  hospitalId: number;
  procedureId: number;
  procedureDate: string;
  notes: string | null;
  status: string;
  createdAt: string;
};

type ScannedDocument = {
  id: number;
  patientId: number;
  content: string;
  documentType: string;
  createdAt: string;
};

const PatientDetailsScreen = () => {
  const route = useRoute<PatientDetailsRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const { patientId } = route.params;

  // Mock de dados para exemplo
  const patient = {
    id: patientId,
    name: "Maria Silva",
    cpf: "123.456.789-00",
    birthDate: "1980-05-15",
    gender: "Feminino",
    phoneNumber: "(21) 98765-4321",
    email: "maria@email.com",
    address: "Rua das Flores, 123",
    city: "Rio de Janeiro",
    state: "RJ",
    healthPlan: "Unimed"
  };

  const orders = [
    {
      id: 1,
      patientId: patientId,
      hospitalId: 1,
      procedureId: 1,
      procedureDate: "2023-11-15",
      notes: "Paciente com histórico de hipertensão",
      status: "Aprovado",
      createdAt: "2023-11-01",
      hospitalName: "Hospital São Lucas",
      procedureName: "Artroscopia de Joelho"
    },
    {
      id: 2,
      patientId: patientId,
      hospitalId: 2,
      procedureId: 2,
      procedureDate: "2023-12-20",
      notes: null,
      status: "Pendente",
      createdAt: "2023-12-01",
      hospitalName: "Hospital Albert Einstein",
      procedureName: "Prótese de Quadril"
    }
  ];
  
  const documents = [
    {
      id: 1,
      patientId: patientId,
      content: "Laudo de exame de imagem mostrando desgaste na articulação do joelho direito...",
      documentType: "Laudo Médico",
      createdAt: "2023-10-25"
    },
    {
      id: 2,
      patientId: patientId,
      content: "Solicitação de procedimento cirúrgico para implante de prótese...",
      documentType: "Solicitação",
      createdAt: "2023-11-20"
    }
  ];

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birthDateObj = new Date(birthDate);
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const month = today.getMonth() - birthDateObj.getMonth();
    
    if (month < 0 || (month === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    
    return age;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Cabeçalho com informações do paciente */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title style={styles.patientName}>{patient.name}</Title>
          <View style={styles.patientBasicInfo}>
            <Text>{patient.cpf}</Text>
            <Chip icon="cake-variant" style={styles.ageChip}>
              {calculateAge(patient.birthDate)} anos
            </Chip>
            <Chip icon="gender-male-female" style={styles.genderChip}>
              {patient.gender}
            </Chip>
          </View>
          
          <Divider style={styles.divider} />
          
          <List.Item
            title="Telefone"
            description={patient.phoneNumber}
            left={props => <List.Icon {...props} icon="phone" />}
          />
          
          <List.Item
            title="Email"
            description={patient.email || "Não informado"}
            left={props => <List.Icon {...props} icon="email" />}
          />
          
          <List.Item
            title="Endereço"
            description={patient.address ? `${patient.address}, ${patient.city}, ${patient.state}` : "Não informado"}
            left={props => <List.Icon {...props} icon="map-marker" />}
          />
          
          <List.Item
            title="Plano de Saúde"
            description={patient.healthPlan || "Não informado"}
            left={props => <List.Icon {...props} icon="medical-bag" />}
          />
        </Card.Content>
        <Card.Actions>
          <Button icon="pencil" onPress={() => {}}>Editar</Button>
        </Card.Actions>
      </Card>

      {/* Seção de Ordens Médicas */}
      <Card style={styles.sectionCard}>
        <Card.Title title="Ordens Médicas" />
        <Card.Content>
          {orders.length > 0 ? (
            orders.map((order) => (
              <Card key={order.id} style={styles.orderCard}>
                <Card.Content>
                  <View style={styles.orderHeader}>
                    <Title style={styles.procedureName}>{order.procedureName}</Title>
                    <Chip 
                      style={[
                        styles.statusChip, 
                        { backgroundColor: order.status === 'Aprovado' ? '#dcfce7' : '#fee2e2' }
                      ]}
                      textStyle={{ 
                        color: order.status === 'Aprovado' ? '#166534' : '#991b1b'
                      }}
                    >
                      {order.status}
                    </Chip>
                  </View>
                  
                  <Text>Hospital: {order.hospitalName}</Text>
                  <Text>Data do procedimento: {formatDate(order.procedureDate)}</Text>
                  
                  {order.notes && (
                    <Text style={styles.orderNotes}>
                      Observações: {order.notes}
                    </Text>
                  )}
                </Card.Content>
                <Card.Actions>
                  <Button icon="eye" onPress={() => {}}>Detalhes</Button>
                  <Button icon="file-pdf-box" onPress={() => {}}>PDF</Button>
                </Card.Actions>
              </Card>
            ))
          ) : (
            <Text style={styles.emptyText}>Nenhuma ordem médica encontrada.</Text>
          )}
        </Card.Content>
        <Card.Actions>
          <Button 
            icon="plus" 
            mode="contained" 
            onPress={() => navigation.navigate('CreateOrder')}
          >
            Nova Ordem
          </Button>
        </Card.Actions>
      </Card>

      {/* Seção de Documentos Digitalizados */}
      <Card style={styles.sectionCard}>
        <Card.Title title="Documentos Digitalizados" />
        <Card.Content>
          {documents.length > 0 ? (
            documents.map((doc) => (
              <Card key={doc.id} style={styles.documentCard}>
                <Card.Content>
                  <View style={styles.documentHeader}>
                    <Title style={styles.documentType}>{doc.documentType}</Title>
                    <Text style={styles.documentDate}>{formatDate(doc.createdAt)}</Text>
                  </View>
                  
                  <Text numberOfLines={2} style={styles.documentContent}>
                    {doc.content}
                  </Text>
                </Card.Content>
                <Card.Actions>
                  <Button icon="eye" onPress={() => {}}>Visualizar</Button>
                </Card.Actions>
              </Card>
            ))
          ) : (
            <Text style={styles.emptyText}>Nenhum documento digitalizado encontrado.</Text>
          )}
        </Card.Content>
        <Card.Actions>
          <Button 
            icon="camera" 
            mode="contained" 
            onPress={() => navigation.navigate('ScanDocument')}
          >
            Digitalizar
          </Button>
        </Card.Actions>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
  },
  patientName: {
    fontSize: 24,
    marginBottom: 8,
  },
  patientBasicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  ageChip: {
    height: 30,
  },
  genderChip: {
    height: 30,
  },
  divider: {
    marginVertical: 16,
  },
  sectionCard: {
    marginBottom: 16,
  },
  orderCard: {
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  procedureName: {
    fontSize: 16,
    flex: 1,
  },
  statusChip: {
    height: 30,
  },
  orderNotes: {
    marginTop: 8,
    fontStyle: 'italic',
  },
  documentCard: {
    marginBottom: 12,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentType: {
    fontSize: 16,
  },
  documentDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  documentContent: {
    marginTop: 4,
    opacity: 0.8,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
    marginVertical: 16,
  },
});

export default PatientDetailsScreen;