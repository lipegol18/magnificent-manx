import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Title, Divider, Chip, List, useTheme, Step, Stepper, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Step = {
  id: number;
  title: string;
  description: string;
};

type Patient = {
  id: number;
  name: string;
  cpf: string;
  birthDate: string;
  gender: string;
};

type Hospital = {
  id: number;
  name: string;
  city: string;
  state: string;
};

type Procedure = {
  id: number;
  name: string;
  code: string;
  description: string | null;
};

type OpmeItem = {
  id: number;
  name: string;
  code: string;
  manufacturer: string;
  description: string | null;
  price: number;
};

const CreateOrderScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeStep, setActiveStep] = useState(0);
  
  // Estados do pedido
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [procedureDate, setProcedureDate] = useState<string>('');
  const [medicalReport, setMedicalReport] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<{ item: OpmeItem; quantity: number }[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  // Lista de passos
  const steps: Step[] = [
    {
      id: 1,
      title: 'Hospital',
      description: 'Selecione o hospital'
    },
    {
      id: 2,
      title: 'Paciente',
      description: 'Selecione o paciente'
    },
    {
      id: 3,
      title: 'Procedimento',
      description: 'Informe o procedimento e data'
    },
    {
      id: 4,
      title: 'Materiais',
      description: 'Selecione os materiais OPME'
    },
    {
      id: 5,
      title: 'Revisão',
      description: 'Revise e confirme o pedido'
    }
  ];

  // Dados mockados para exemplo
  const hospitals = [
    {
      id: 1,
      name: "Hospital São Lucas",
      city: "Rio de Janeiro",
      state: "RJ",
    },
    {
      id: 2,
      name: "Hospital Albert Einstein",
      city: "São Paulo",
      state: "SP",
    },
  ];

  const patients = [
    {
      id: 1,
      name: "Maria Silva",
      cpf: "123.456.789-00",
      birthDate: "1980-05-15",
      gender: "Feminino",
    },
    {
      id: 2,
      name: "João Santos",
      cpf: "987.654.321-00",
      birthDate: "1975-10-20",
      gender: "Masculino",
    },
  ];

  const procedures = [
    {
      id: 1,
      name: "Artroscopia de Joelho",
      code: "ART-JOE-001",
      description: "Procedimento minimamente invasivo para tratamento de lesões no joelho",
    },
    {
      id: 2,
      name: "Prótese de Quadril",
      code: "PRO-QUA-002",
      description: "Substituição total ou parcial da articulação do quadril",
    },
  ];

  const opmeItems = [
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
  ];

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSubmit = () => {
    // Aqui seria feita a submissão do pedido para a API
    console.log('Pedido submetido com sucesso!');
    navigation.navigate('Main', { screen: 'Home' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para adicionar item OPME
  const addItem = useCallback((item: OpmeItem) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.item.id === item.id);
      if (exists) {
        return prev.map((i) => 
          i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        return [...prev, { item, quantity: 1 }];
      }
    });
  }, []);

  // Função para remover item OPME
  const removeItem = useCallback((itemId: number) => {
    setSelectedItems((prev) => 
      prev.filter((i) => i.item.id !== itemId)
    );
  }, []);

  // Função para alterar quantidade de item OPME
  const updateQuantity = useCallback((itemId: number, quantity: number) => {
    if (quantity < 1) return;
    
    setSelectedItems((prev) => 
      prev.map((i) => 
        i.item.id === itemId ? { ...i, quantity } : i
      )
    );
  }, []);

  // Calcula o total da ordem
  const orderTotal = selectedItems.reduce(
    (total, current) => total + (current.item.price * current.quantity), 
    0
  );

  // Renderiza o conteúdo com base no passo atual
  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Seleção de Hospital
        return (
          <View style={styles.stepContainer}>
            <Title>Selecione o Hospital</Title>
            <Text style={styles.stepDescription}>
              Escolha o hospital onde será realizado o procedimento:
            </Text>
            {hospitals.map((hospital) => (
              <Card 
                key={hospital.id}
                style={[
                  styles.selectionCard,
                  selectedHospital?.id === hospital.id ? styles.selectedCard : {}
                ]}
                onPress={() => setSelectedHospital(hospital)}
              >
                <Card.Content>
                  <Title style={styles.cardTitle}>{hospital.name}</Title>
                  <Text>{hospital.city}, {hospital.state}</Text>
                </Card.Content>
              </Card>
            ))}
          </View>
        );
        
      case 1: // Seleção de Paciente
        return (
          <View style={styles.stepContainer}>
            <Title>Selecione o Paciente</Title>
            <Text style={styles.stepDescription}>
              Escolha o paciente para este procedimento:
            </Text>
            {patients.map((patient) => (
              <Card 
                key={patient.id}
                style={[
                  styles.selectionCard,
                  selectedPatient?.id === patient.id ? styles.selectedCard : {}
                ]}
                onPress={() => setSelectedPatient(patient)}
              >
                <Card.Content>
                  <Title style={styles.cardTitle}>{patient.name}</Title>
                  <Text>CPF: {patient.cpf}</Text>
                  <Text>Nascimento: {patient.birthDate}</Text>
                </Card.Content>
              </Card>
            ))}
          </View>
        );
        
      case 2: // Procedimento e Data
        return (
          <View style={styles.stepContainer}>
            <Title>Procedimento e Data</Title>
            <Text style={styles.stepDescription}>
              Selecione o procedimento e informe a data prevista:
            </Text>
            
            <Title style={styles.sectionTitle}>Procedimento</Title>
            {procedures.map((procedure) => (
              <Card 
                key={procedure.id}
                style={[
                  styles.selectionCard,
                  selectedProcedure?.id === procedure.id ? styles.selectedCard : {}
                ]}
                onPress={() => setSelectedProcedure(procedure)}
              >
                <Card.Content>
                  <Title style={styles.cardTitle}>{procedure.name}</Title>
                  <Text>Código: {procedure.code}</Text>
                  {procedure.description && (
                    <Text style={styles.description}>{procedure.description}</Text>
                  )}
                </Card.Content>
              </Card>
            ))}
            
            <Title style={styles.sectionTitle}>Data do Procedimento</Title>
            <TextInput
              label="Data do Procedimento"
              value={procedureDate}
              onChangeText={setProcedureDate}
              style={styles.textInput}
              placeholder="DD/MM/AAAA"
            />
            
            <Title style={styles.sectionTitle}>Laudo Médico</Title>
            <TextInput
              label="Laudo Médico"
              value={medicalReport}
              onChangeText={setMedicalReport}
              style={styles.textInput}
              multiline
              numberOfLines={4}
              placeholder="Descreva o laudo médico ou justificativa para o procedimento..."
            />
          </View>
        );
        
      case 3: // Seleção de Materiais OPME
        return (
          <View style={styles.stepContainer}>
            <Title>Seleção de Materiais OPME</Title>
            <Text style={styles.stepDescription}>
              Selecione os materiais necessários para o procedimento:
            </Text>
            
            <Title style={styles.sectionTitle}>Itens Disponíveis</Title>
            {opmeItems.map((item) => (
              <Card 
                key={item.id}
                style={styles.opmeCard}
                onPress={() => addItem(item)}
              >
                <Card.Content>
                  <View style={styles.opmeCardHeader}>
                    <Title style={styles.cardTitle}>{item.name}</Title>
                    <Chip>{item.code}</Chip>
                  </View>
                  <Text>Fabricante: {item.manufacturer}</Text>
                  {item.description && (
                    <Text style={styles.description}>{item.description}</Text>
                  )}
                  <Text style={styles.price}>{formatCurrency(item.price)}</Text>
                </Card.Content>
                <Card.Actions>
                  <Button onPress={() => addItem(item)}>Adicionar</Button>
                </Card.Actions>
              </Card>
            ))}
            
            {selectedItems.length > 0 && (
              <>
                <Title style={styles.sectionTitle}>Itens Selecionados</Title>
                {selectedItems.map(({ item, quantity }) => (
                  <Card key={item.id} style={styles.selectedItemCard}>
                    <Card.Content>
                      <View style={styles.selectedItemHeader}>
                        <Title style={styles.cardTitle}>{item.name}</Title>
                        <View style={styles.quantityControl}>
                          <Button 
                            mode="outlined" 
                            onPress={() => updateQuantity(item.id, quantity - 1)}
                          >-</Button>
                          <Text style={styles.quantityText}>{quantity}</Text>
                          <Button 
                            mode="outlined" 
                            onPress={() => updateQuantity(item.id, quantity + 1)}
                          >+</Button>
                        </View>
                      </View>
                      <Text style={styles.itemTotal}>
                        {formatCurrency(item.price * quantity)}
                      </Text>
                    </Card.Content>
                    <Card.Actions>
                      <Button onPress={() => removeItem(item.id)}>Remover</Button>
                    </Card.Actions>
                  </Card>
                ))}
                
                <Card style={styles.totalCard}>
                  <Card.Content>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Total:</Text>
                      <Text style={styles.totalValue}>{formatCurrency(orderTotal)}</Text>
                    </View>
                  </Card.Content>
                </Card>
              </>
            )}
          </View>
        );
        
      case 4: // Revisão
        return (
          <View style={styles.stepContainer}>
            <Title>Revisão da Ordem</Title>
            <Text style={styles.stepDescription}>
              Revise todos os dados da ordem antes de confirmar:
            </Text>
            
            <Card style={styles.reviewCard}>
              <Card.Title title="Hospital" />
              <Card.Content>
                {selectedHospital ? (
                  <>
                    <Text style={styles.reviewItemTitle}>{selectedHospital.name}</Text>
                    <Text>{selectedHospital.city}, {selectedHospital.state}</Text>
                  </>
                ) : (
                  <Text style={styles.missingInfo}>Nenhum hospital selecionado</Text>
                )}
              </Card.Content>
            </Card>
            
            <Card style={styles.reviewCard}>
              <Card.Title title="Paciente" />
              <Card.Content>
                {selectedPatient ? (
                  <>
                    <Text style={styles.reviewItemTitle}>{selectedPatient.name}</Text>
                    <Text>CPF: {selectedPatient.cpf}</Text>
                    <Text>Nascimento: {selectedPatient.birthDate}</Text>
                  </>
                ) : (
                  <Text style={styles.missingInfo}>Nenhum paciente selecionado</Text>
                )}
              </Card.Content>
            </Card>
            
            <Card style={styles.reviewCard}>
              <Card.Title title="Procedimento" />
              <Card.Content>
                {selectedProcedure ? (
                  <>
                    <Text style={styles.reviewItemTitle}>{selectedProcedure.name}</Text>
                    <Text>Código: {selectedProcedure.code}</Text>
                    {procedureDate ? (
                      <Text>Data: {procedureDate}</Text>
                    ) : (
                      <Text style={styles.missingInfo}>Data não informada</Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.missingInfo}>Nenhum procedimento selecionado</Text>
                )}
              </Card.Content>
            </Card>
            
            <Card style={styles.reviewCard}>
              <Card.Title title="Materiais OPME" />
              <Card.Content>
                {selectedItems.length > 0 ? (
                  <>
                    {selectedItems.map(({ item, quantity }) => (
                      <View key={item.id} style={styles.reviewItem}>
                        <Text style={styles.reviewItemTitle}>{item.name}</Text>
                        <Text>Qtd: {quantity} × {formatCurrency(item.price)}</Text>
                        <Text style={styles.reviewItemSubtotal}>
                          {formatCurrency(item.price * quantity)}
                        </Text>
                      </View>
                    ))}
                    <Divider style={styles.reviewDivider} />
                    <View style={styles.reviewTotal}>
                      <Text style={styles.reviewTotalLabel}>Total:</Text>
                      <Text style={styles.reviewTotalValue}>
                        {formatCurrency(orderTotal)}
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.missingInfo}>Nenhum material selecionado</Text>
                )}
              </Card.Content>
            </Card>
            
            <Title style={styles.sectionTitle}>Observações Adicionais</Title>
            <TextInput
              label="Observações"
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
              style={styles.textInput}
              multiline
              numberOfLines={3}
              placeholder="Observações adicionais sobre o pedido..."
            />
          </View>
        );
        
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.stepperCard}>
        <Card.Content>
          <View style={styles.stepperContainer}>
            {steps.map((step, index) => (
              <View key={step.id} style={styles.stepItem}>
                <View 
                  style={[
                    styles.stepIndicator, 
                    index <= activeStep ? styles.activeStepIndicator : {}
                  ]}
                >
                  <Text style={styles.stepNumber}>{step.id}</Text>
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>

      {renderStepContent()}

      <View style={styles.navigationButtons}>
        <Button 
          mode="outlined" 
          onPress={handleBack}
          disabled={activeStep === 0}
          style={styles.navigationButton}
        >
          Voltar
        </Button>
        
        {activeStep === steps.length - 1 ? (
          <Button 
            mode="contained" 
            onPress={handleSubmit}
            style={styles.navigationButton}
          >
            Finalizar Pedido
          </Button>
        ) : (
          <Button 
            mode="contained" 
            onPress={handleNext}
            style={styles.navigationButton}
          >
            Avançar
          </Button>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  stepperCard: {
    marginBottom: 16,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    width: 60,
  },
  stepIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  activeStepIndicator: {
    backgroundColor: '#3b82f6',
  },
  stepNumber: {
    color: 'white',
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  stepContainer: {
    marginBottom: 16,
  },
  stepDescription: {
    marginBottom: 16,
    opacity: 0.7,
  },
  selectionCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  cardTitle: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  textInput: {
    marginBottom: 12,
  },
  description: {
    marginTop: 4,
    opacity: 0.7,
  },
  opmeCard: {
    marginBottom: 12,
  },
  opmeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  price: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4f46e5',
    textAlign: 'right',
  },
  selectedItemCard: {
    marginBottom: 8,
  },
  selectedItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    marginHorizontal: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemTotal: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  totalCard: {
    marginTop: 8,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 32,
  },
  navigationButton: {
    width: '48%',
  },
  reviewCard: {
    marginBottom: 16,
  },
  reviewItemTitle: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  reviewItem: {
    marginBottom: 8,
  },
  reviewItemSubtotal: {
    textAlign: 'right',
    fontWeight: 'bold',
  },
  reviewDivider: {
    marginVertical: 8,
  },
  reviewTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  reviewTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  missingInfo: {
    fontStyle: 'italic',
    opacity: 0.6,
  },
});

export default CreateOrderScreen;