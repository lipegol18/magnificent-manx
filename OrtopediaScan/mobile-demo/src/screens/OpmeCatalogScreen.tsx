import React, { useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Text, Card, Searchbar, Button, Chip, useTheme, Divider, Title, Dialog, Portal } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS } from '../api/apiClient';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type OpmeItem = {
  id: number;
  name: string;
  code: string;
  manufacturer: string;
  description: string | null;
  price: number;
};

const OpmeCatalogScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [visible, setVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OpmeItem | null>(null);

  // Consulta de itens OPME
  const { data: opmeItems, isLoading, error } = useQuery({
    queryKey: [API_ENDPOINTS.OPME_ITEMS],
    queryFn: async () => {
      try {
        // Simula uma chamada de API
        // Em produção, essa chamada seria feita através do apiClient
        return [
          {
            id: 1,
            name: "Parafuso Ortopédico de Titânio",
            code: "PO-TI-001",
            manufacturer: "OrthoMed",
            description: "Parafuso de titânio para fixação de fraturas ósseas",
            price: 1250.50
          },
          {
            id: 2,
            name: "Placa de Fixação para Úmero",
            code: "PF-UM-002",
            manufacturer: "Johnson & Johnson",
            description: "Placa anatômica para fixação de fraturas do úmero",
            price: 3750.75
          },
          {
            id: 3,
            name: "Prótese Total de Joelho",
            code: "PTJ-003",
            manufacturer: "Smith & Nephew",
            description: "Sistema completo para artroplastia total do joelho",
            price: 12500.00
          },
          {
            id: 4,
            name: "Enxerto Ósseo Liofilizado",
            code: "EOL-004",
            manufacturer: "BioOrtho",
            description: "Material para substituição óssea em procedimentos ortopédicos",
            price: 3200.25
          },
          {
            id: 5,
            name: "Fixador Externo para Tíbia",
            code: "FET-005",
            manufacturer: "Synthes",
            description: "Sistema de fixação externa para fraturas complexas da tíbia",
            price: 5400.90
          },
        ];
      } catch (err) {
        console.error("Erro ao buscar itens OPME:", err);
        throw err;
      }
    }
  });

  // Filtra os itens baseado na busca
  const filteredItems = opmeItems?.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showDialog = (item: OpmeItem) => {
    setSelectedItem(item);
    setVisible(true);
  };

  const hideDialog = () => setVisible(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const renderOpmeItem = ({ item }: { item: OpmeItem }) => (
    <Card 
      style={styles.itemCard} 
      onPress={() => showDialog(item)}
    >
      <Card.Content>
        <View style={styles.itemHeader}>
          <Title style={styles.itemName}>{item.name}</Title>
          <Chip>{item.code}</Chip>
        </View>
        <Text style={styles.manufacturer}>Fabricante: {item.manufacturer}</Text>
        
        <Divider style={styles.divider} />
        
        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        
        <Text style={styles.price}>{formatCurrency(item.price)}</Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Buscar por nome, código ou fabricante"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Carregando catálogo OPME...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Erro ao carregar o catálogo. Por favor, tente novamente.
          </Text>
          <Button mode="contained" onPress={() => {}}>
            Tentar novamente
          </Button>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOpmeItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Nenhum item OPME encontrado com essa busca.'
                  : 'Nenhum item OPME cadastrado.'}
              </Text>
            </View>
          }
        />
      )}

      <Portal>
        <Dialog visible={visible} onDismiss={hideDialog}>
          <Dialog.Title>{selectedItem?.name}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogCode}>Código: {selectedItem?.code}</Text>
            <Text style={styles.dialogManufacturer}>Fabricante: {selectedItem?.manufacturer}</Text>
            
            {selectedItem?.description && (
              <Text style={styles.dialogDescription}>
                {selectedItem.description}
              </Text>
            )}
            
            <Text style={styles.dialogPrice}>
              {selectedItem ? formatCurrency(selectedItem.price) : ''}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDialog}>Fechar</Button>
            <Button onPress={() => {
              hideDialog();
              navigation.navigate('CreateOrder');
            }}>Adicionar à Ordem</Button>
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
    paddingBottom: 16,
  },
  itemCard: {
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  manufacturer: {
    fontSize: 14,
    opacity: 0.7,
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.8,
  },
  price: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4f46e5',
    textAlign: 'right',
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
  dialogCode: {
    marginBottom: 8,
  },
  dialogManufacturer: {
    marginBottom: 12,
  },
  dialogDescription: {
    marginBottom: 12,
    opacity: 0.8,
  },
  dialogPrice: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4f46e5',
    textAlign: 'right',
  },
});

export default OpmeCatalogScreen;