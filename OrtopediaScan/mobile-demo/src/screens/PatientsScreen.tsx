import React, { useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Text, Card, Searchbar, Button, FAB, useTheme, Divider, Title, Dialog, Portal } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS } from '../api/apiClient';

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
  healthPlan: string | null;
};

const PatientsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [visible, setVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Consulta de pacientes
  const { data: patients, isLoading, error } = useQuery({
    queryKey: [API_ENDPOINTS.PATIENTS],
    queryFn: async () => {
      try {
        // Simula uma chamada de API
        // Em produção, essa chamada seria feita através do apiClient
        return [
          {
            id: 1,
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
          },
          {
            id: 2,
            name: "João Santos",
            cpf: "987.654.321-00",
            birthDate: "1975-10-20",
            gender: "Masculino",
            phoneNumber: "(21) 91234-5678",
            email: "joao@email.com",
            address: "Av. Central, 456",
            city: "Rio de Janeiro",
            state: "RJ",
            healthPlan: "Amil"
          },
          {
            id: 3,
            name: "Ana Oliveira",
            cpf: "456.789.123-00",
            birthDate: "1990-03-25",
            gender: "Feminino",
            phoneNumber: "(21) 99876-5432",
            email: "ana@email.com",
            address: "Rua dos Lírios, 789",
            city: "Niterói",
            state: "RJ",
            healthPlan: "SulAmérica"
          },
        ];
      } catch (err) {
        console.error("Erro ao buscar pacientes:", err);
        throw err;
      }
    }
  });

  // Filtra os pacientes baseado na busca
  const filteredPatients = patients?.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.cpf.includes(searchQuery)
  );

  const handlePatientPress = (patient: Patient) => {
    navigation.navigate('PatientDetails', { patientId: patient.id });
  };

  const showDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setVisible(true);
  };

  const hideDialog = () => setVisible(false);

  const renderPatientItem = ({ item }: { item: Patient }) => (
    <Card 
      style={styles.patientCard} 
      onPress={() => handlePatientPress(item)}
      onLongPress={() => showDialog(item)}
    >
      <Card.Content>
        <Title>{item.name}</Title>
        <View style={styles.patientDetails}>
          <Text>CPF: {item.cpf}</Text>
          <Text>Tel: {item.phoneNumber}</Text>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.patientDetails}>
          <Text>Plano: {item.healthPlan || 'Não informado'}</Text>
          <Text>{item.city}, {item.state}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Buscar por nome ou CPF"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Carregando pacientes...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Erro ao carregar pacientes. Por favor, tente novamente.
          </Text>
          <Button mode="contained" onPress={() => {}}>
            Tentar novamente
          </Button>
        </View>
      ) : (
        <FlatList
          data={filteredPatients}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPatientItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Nenhum paciente encontrado com essa busca.'
                  : 'Nenhum paciente cadastrado.'}
              </Text>
            </View>
          }
        />
      )}

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={() => {}}
        color="white"
      />

      <Portal>
        <Dialog visible={visible} onDismiss={hideDialog}>
          <Dialog.Title>Opções para {selectedPatient?.name}</Dialog.Title>
          <Dialog.Content>
            <Text>Escolha uma ação para este paciente:</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDialog}>Cancelar</Button>
            <Button onPress={() => {
              hideDialog();
              if (selectedPatient) {
                navigation.navigate('PatientDetails', { patientId: selectedPatient.id });
              }
            }}>Ver Detalhes</Button>
            <Button onPress={() => {
              hideDialog();
              if (selectedPatient) {
                navigation.navigate('CreateOrder');
              }
            }}>Nova Ordem</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchBar: {
    marginBottom: 16,
    elevation: 2,
  },
  listContainer: {
    paddingBottom: 80,
  },
  patientCard: {
    marginBottom: 12,
  },
  patientDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  divider: {
    marginVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default PatientsScreen;