import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { IconButton } from 'react-native-paper';

// Importação de telas (serão implementadas em seguida)
import HomeScreen from '../screens/HomeScreen';
import PatientsScreen from '../screens/PatientsScreen';
import PatientDetailsScreen from '../screens/PatientDetailsScreen';
import HospitalsScreen from '../screens/HospitalsScreen';
import CreateOrderScreen from '../screens/CreateOrderScreen';
import OpmeCatalogScreen from '../screens/OpmeCatalogScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ScanDocumentScreen from '../screens/ScanDocumentScreen';

// Tipos para navegação
export type RootStackParamList = {
  Main: undefined;
  PatientDetails: { patientId: number };
  CreateOrder: undefined;
  ScanDocument: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Patients: undefined;
  Hospitals: undefined;
  OpmeCatalog: undefined;
  Reports: undefined;
};

// Criação dos navigators
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Navigator para as tabs principais
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: { 
          backgroundColor: '#1e293b',
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 10
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        headerStyle: {
          backgroundColor: '#1e293b',
        },
        headerTitleStyle: {
          color: '#f8fafc',
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="home" size={size} iconColor={color} />
          ),
        }}
      />
      
      <Tab.Screen 
        name="Patients" 
        component={PatientsScreen} 
        options={{
          title: 'Pacientes',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="account-multiple" size={size} iconColor={color} />
          ),
        }}
      />
      
      <Tab.Screen 
        name="Hospitals" 
        component={HospitalsScreen} 
        options={{
          title: 'Hospitais',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="hospital-building" size={size} iconColor={color} />
          ),
        }}
      />
      
      <Tab.Screen 
        name="OpmeCatalog" 
        component={OpmeCatalogScreen} 
        options={{
          title: 'Catálogo',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="format-list-bulleted" size={size} iconColor={color} />
          ),
        }}
      />
      
      <Tab.Screen 
        name="Reports" 
        component={ReportsScreen} 
        options={{
          title: 'Relatórios',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="chart-bar" size={size} iconColor={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Navigator principal do aplicativo
function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1e293b',
        },
        headerTintColor: '#f8fafc',
        contentStyle: {
          backgroundColor: '#1e293b',
        },
      }}
    >
      <Stack.Screen 
        name="Main" 
        component={MainTabNavigator} 
        options={{ headerShown: false }}
      />
      
      <Stack.Screen 
        name="PatientDetails" 
        component={PatientDetailsScreen} 
        options={{ title: 'Detalhes do Paciente' }}
      />
      
      <Stack.Screen 
        name="CreateOrder" 
        component={CreateOrderScreen} 
        options={{ title: 'Nova Ordem' }}
      />
      
      <Stack.Screen 
        name="ScanDocument" 
        component={ScanDocumentScreen} 
        options={{ title: 'Digitalizar Documento' }}
      />
    </Stack.Navigator>
  );
}

export default AppNavigator;