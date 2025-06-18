import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, Button, Title, Divider, useTheme, ProgressBar, TextInput, RadioButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Camera, CameraType } from 'expo-camera';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const documentTypes = [
  { label: 'Laudo Médico', value: 'laudo' },
  { label: 'Pedido Médico', value: 'pedido' },
  { label: 'Exame de Imagem', value: 'exame_imagem' },
  { label: 'Exame Laboratorial', value: 'exame_lab' },
  { label: 'Relatório Médico', value: 'relatorio' },
  { label: 'Outro', value: 'outro' },
];

const ScanDocumentScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [type, setType] = useState(CameraType.back);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [recognitionProgress, setRecognitionProgress] = useState<number>(0);
  const [documentType, setDocumentType] = useState<string>('laudo');
  const [patientId, setPatientId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const cameraRef = useRef<Camera | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(status === 'granted');
    })();
  }, []);

  const handleCameraType = () => {
    setType(type === CameraType.back ? CameraType.front : CameraType.back);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
          skipProcessing: false,
        });
        setCapturedImage(photo.uri);
        startTextRecognition();
      } catch (error) {
        console.error('Erro ao capturar imagem:', error);
        Alert.alert('Erro', 'Não foi possível capturar a imagem. Tente novamente.');
      }
    }
  };

  const startTextRecognition = () => {
    // Em um aplicativo real, seria utilizado o Tesseract.js ou Google Vision API
    // para realizar o OCR da imagem capturada
    setIsRecognizing(true);
    setRecognitionProgress(0);
    
    // Simulação da análise OCR com progresso
    const interval = setInterval(() => {
      setRecognitionProgress((prev) => {
        const newProgress = prev + 0.1;
        if (newProgress >= 1) {
          clearInterval(interval);
          setIsRecognizing(false);
          
          // Texto de exemplo que seria extraído do processo OCR
          setRecognizedText(
            'LAUDO MÉDICO\n\n' +
            'Paciente: Maria Silva\n' +
            'Data: 05/05/2023\n\n' +
            'Diagnóstico: Artrose de joelho direito (CID M17.1)\n\n' +
            'O paciente apresenta desgaste articular significativo no compartimento medial do joelho direito, ' +
            'com redução do espaço articular e formação de osteófitos marginais. ' +
            'Há sinais de esclerose subcondral e presença de cistos subcondrais.\n\n' +
            'Conduta: Indicada artroplastia total do joelho direito.\n\n' +
            'Dr. Carlos Oliveira\n' +
            'CRM 98765-RJ'
          );
        }
        return newProgress;
      });
    }, 300);
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setRecognizedText('');
    setRecognitionProgress(0);
    setIsRecognizing(false);
  };

  const saveDocument = async () => {
    if (!patientId) {
      Alert.alert('Erro', 'Por favor, selecione um paciente para associar este documento.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Simula uma chamada de API para salvar o documento
      // Em produção, seria uma chamada real à API
      setTimeout(() => {
        setIsSubmitting(false);
        Alert.alert(
          'Documento Salvo',
          'O documento foi digitalizado e salvo com sucesso.',
          [
            { 
              text: 'OK', 
              onPress: () => navigation.goBack() 
            }
          ]
        );
      }, 1500);
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Erro', 'Não foi possível salvar o documento. Tente novamente.');
    }
  };

  if (cameraPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <Text>Solicitando permissão da câmera...</Text>
      </View>
    );
  }

  if (cameraPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Text>Sem acesso à câmera</Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.goBack()}
          style={{ marginTop: 16 }}
        >
          Voltar
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {capturedImage ? (
        // Tela de visualização do documento digitalizado
        <View style={styles.previewContainer}>
          <Title style={styles.previewTitle}>Documento Digitalizado</Title>
          
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: capturedImage }} 
              style={styles.previewImage} 
              resizeMode="contain"
            />
          </View>

          {isRecognizing ? (
            <View style={styles.recognitionProgressContainer}>
              <Text style={styles.progressText}>Analisando texto...</Text>
              <ProgressBar 
                progress={recognitionProgress} 
                color={theme.colors.primary}
                style={styles.progressBar}
              />
            </View>
          ) : (
            <>
              <View style={styles.textResultContainer}>
                <Title style={styles.sectionTitle}>Texto Reconhecido</Title>
                <TextInput
                  mode="outlined"
                  multiline
                  numberOfLines={8}
                  value={recognizedText}
                  onChangeText={setRecognizedText}
                  style={styles.recognizedTextInput}
                />
              </View>
              
              <View style={styles.formContainer}>
                <Title style={styles.sectionTitle}>Informações do Documento</Title>
                
                <Text style={styles.label}>Tipo de Documento</Text>
                <RadioButton.Group 
                  onValueChange={value => setDocumentType(value)} 
                  value={documentType}
                >
                  <View style={styles.radioGroup}>
                    {documentTypes.map(option => (
                      <RadioButton.Item
                        key={option.value}
                        label={option.label}
                        value={option.value}
                        style={styles.radioItem}
                      />
                    ))}
                  </View>
                </RadioButton.Group>
                
                <TextInput
                  label="ID do Paciente"
                  value={patientId}
                  onChangeText={setPatientId}
                  style={styles.input}
                  keyboardType="numeric"
                />
                
                <View style={styles.buttonContainer}>
                  <Button 
                    mode="outlined" 
                    onPress={resetCapture}
                    style={styles.button}
                  >
                    Digitalizar Novamente
                  </Button>
                  <Button 
                    mode="contained" 
                    onPress={saveDocument}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    style={styles.button}
                  >
                    Salvar Documento
                  </Button>
                </View>
              </View>
            </>
          )}
        </View>
      ) : (
        // Tela da câmera para captura do documento
        <View style={styles.cameraContainer}>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={type}
            ratio="4:3"
          >
            <View style={styles.cameraControls}>
              <View style={styles.cameraButtonsContainer}>
                <TouchableOpacity
                  style={styles.flipButton}
                  onPress={handleCameraType}
                >
                  <Text style={styles.flipText}>Flip</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={takePicture}
                >
                  <View style={styles.captureCircle} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.cameraGuide}>
                <View style={styles.cameraGuideFrame} />
                <Text style={styles.cameraGuideText}>
                  Alinhe o documento dentro da moldura e capture
                </Text>
              </View>
            </View>
          </Camera>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  cameraButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 30,
  },
  flipButton: {
    padding: 15,
  },
  flipText: {
    color: 'white',
    fontSize: 16,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  cancelButton: {
    padding: 15,
  },
  cancelText: {
    color: 'white',
    fontSize: 16,
  },
  cameraGuide: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraGuideFrame: {
    width: '80%',
    height: '60%',
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
  },
  cameraGuideText: {
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
    textAlign: 'center',
  },
  previewContainer: {
    flex: 1,
    padding: 16,
  },
  previewTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  imageContainer: {
    height: 200,
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  recognitionProgressContainer: {
    marginBottom: 16,
  },
  progressText: {
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  textResultContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  recognizedTextInput: {
    minHeight: 150,
  },
  formContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  radioGroup: {
    marginBottom: 16,
  },
  radioItem: {
    paddingVertical: 4,
  },
  input: {
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default ScanDocumentScreen;