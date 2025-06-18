import React, { useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Text, Card, Searchbar, Button, FAB, useTheme, Divider, Title, Dialog, Portal } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS } from '../api/apiClient';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Hospital = {
  id: number;
  name: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  phone: string | null;
  email: string | null;
};

const HospitalsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [visible, setVisible] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  // Consulta de hospitais
  const { data: hospitals, isLoading, error } = useQuery({
    queryKey: [API_ENDPOINTS.HOSPITALS],
    queryFn: async () => {
      try {
        // Simula uma chamada de API
        // Em produção, essa chamada seria feita através do apiClient
        return [
          {
            id: 1,
            name: "Hospital São Lucas",
            cnpj: "12.345.678/0001-90",
            address: "Av. Brasil, 1500",
            city: "Rio de Janeiro",
            state: "RJ",
            phone: "(21) 3333-4444",
            email: "contato@saolucas.com"
          },
          {
            id: 2,
            name: "Hospital Albert Einstein",
            cnpj: "98.765.432/0001-10",
            address: "Av. Albert Einstein, 627",
            city: "São Paulo",
            state: "SP",
            phone: "(11) 2151-1233",
            email: "contato@einstein.br"
          },
          {
            id: 3,
            name: "Hospital Samaritano",
            cnpj: "23.456.789/0001-12",
            address: "R. Pereira da Silva, 80",
            city: "Niterói",
            state: "RJ",
            phone: "(21) 2729-6868",
            email: "contato@samaritano.com.br"
          },
        ];
      } catch (err) {
        console.error("Erro ao buscar hospitais:", err);
        throw err;
      }
    }
  });

  // Filtra os hospitais baseado na busca
  const filteredHospitals = hospitals?.filter(
    (hospital) =>
      hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hospital.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hospital.cnpj.includes(searchQuery)
  );

  const showDialog = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setVisible(true);
  };

  const hideDialog = () => setVisible(false);

  const renderHospitalItem = ({ item }: { item: Hospital }) => (
    <Card 
      style={styles.hospitalCard} 
      onPress={() => showDialog(item)}
    >
      <Card.Content>
        <Title style={styles.hospitalName}>{item.name}</Title>
        <Text>CNPJ: {item.cnpj}</Text>
        <Divider style={styles.divider} />
        <View style={styles.hospitalDetails}>
          <Text>{item.address}</Text>
          <Text>{item.city}, {item.state}</Text>
        </View>
        <View style={styles.hospitalDetails}>
          <Text>Tel: {item.phone || 'Não informado'}</Text>
          <Text>Email: {item.email || 'Não informado'}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Buscar por nome, cidade ou CNPJ"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Carregando hospitais...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Erro ao carregar hospitais. Por favor, tente novamente.
          </Text>
          <Button mode="contained" onPress={() => {}}>
            Tentar novamente
          </Button>
        </View>
      ) : (
        <FlatList
          data={filteredHospitals}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderHospitalItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Nenhum hospital encontrado com essa busca.'
                  : 'Nenhum hospital cadastrado.'}
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
          <Dialog.Title>Opções para {selectedHospital?.name}</Dialog.Title>
          <Dialog.Content>
            <Text>Escolha uma ação para este hospital:</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDialog}>Cancelar</Button>
            <Button onPress={() => {
              hideDialog();
              if (selectedHospital) {
                navigation.navigate('CreateOrder');
              }
            }}>Nova Ordem</Button>
            <Button onPress={() => {
              hideDialog();
            }}>Editar</Button>
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
  hospitalCard: {
    marginBottom: 12,
  },
  hospitalName: {
    fontSize: 18,
  },
  hospitalDetails: {
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

export default HospitalsScreen;