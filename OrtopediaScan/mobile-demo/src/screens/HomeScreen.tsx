import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Title, Surface, useTheme, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();

  return (
    <ScrollView style={styles.container}>
      {/* Card de boas-vindas */}
      <Surface style={styles.headerContainer} elevation={1}>
        <Title style={styles.headerTitle}>Bem-vindo ao MedSync</Title>
        <Text style={styles.headerSubtitle}>
          Sistema de gerenciamento de ordens médicas para materiais OPME
        </Text>
      </Surface>

      {/* Cards de ações principais */}
      <View style={styles.actionsContainer}>
        <Card style={[styles.actionCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content>
            <Title style={{ color: theme.colors.onPrimaryContainer }}>Nova Ordem</Title>
            <Text style={{ color: theme.colors.onPrimaryContainer }}>
              Crie uma nova ordem médica para um paciente
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button 
              mode="contained"
              onPress={() => navigation.navigate('CreateOrder')}
            >
              Criar
            </Button>
          </Card.Actions>
        </Card>

        <Card style={[styles.actionCard, { backgroundColor: theme.colors.secondaryContainer }]}>
          <Card.Content>
            <Title style={{ color: theme.colors.onSecondaryContainer }}>Digitalizar</Title>
            <Text style={{ color: theme.colors.onSecondaryContainer }}>
              Digitalizar um documento usando a câmera
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button 
              mode="contained"
              onPress={() => navigation.navigate('ScanDocument')}
            >
              Digitalizar
            </Button>
          </Card.Actions>
        </Card>
      </View>

      <Divider style={styles.divider} />

      {/* Cards de acesso rápido */}
      <Title style={styles.sectionTitle}>Acesso Rápido</Title>
      <View style={styles.quickAccessContainer}>
        <Card style={styles.quickAccessCard} onPress={() => navigation.navigate('Main', { screen: 'Patients' })}>
          <Card.Content>
            <Title>Pacientes</Title>
            <Text>Gerenciar pacientes</Text>
          </Card.Content>
        </Card>

        <Card style={styles.quickAccessCard} onPress={() => navigation.navigate('Main', { screen: 'Hospitals' })}>
          <Card.Content>
            <Title>Hospitais</Title>
            <Text>Ver lista de hospitais</Text>
          </Card.Content>
        </Card>

        <Card style={styles.quickAccessCard} onPress={() => navigation.navigate('Main', { screen: 'OpmeCatalog' })}>
          <Card.Content>
            <Title>Catálogo OPME</Title>
            <Text>Buscar materiais</Text>
          </Card.Content>
        </Card>

        <Card style={styles.quickAccessCard} onPress={() => navigation.navigate('Main', { screen: 'Reports' })}>
          <Card.Content>
            <Title>Relatórios</Title>
            <Text>Ver estatísticas</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Disclaimer */}
      <Surface style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerText}>
          Esta aplicação está em conformidade com a LGPD e protege todos os dados dos pacientes.
        </Text>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    padding: 20,
    marginTop: 10,
    marginHorizontal: 16,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 24,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
  },
  actionCard: {
    width: '48%',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
    marginHorizontal: 16,
  },
  sectionTitle: {
    marginLeft: 16,
    marginBottom: 12,
  },
  quickAccessContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 16,
  },
  quickAccessCard: {
    width: '48%',
    marginBottom: 12,
  },
  disclaimerContainer: {
    marginHorizontal: 16,
    marginVertical: 24,
    padding: 16,
    borderRadius: 8,
  },
  disclaimerText: {
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default HomeScreen;