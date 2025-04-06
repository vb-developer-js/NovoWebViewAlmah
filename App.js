// App.js
import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView, StyleSheet, Platform, StatusBar, View, Text, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';

const protocolo = 'https';
const dominio = 'app.almahcondos.com.br';

export default function App() {
  const [url, setUrl] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const webviewRef = useRef(null);

  useEffect(() => {
    const generateUrl = async () => {
      const dispositivoID = Device.osInternalBuildId || 'unknown';
      //const dispositivoOS = Device.osName || 'unknown';
      const dispositivoOS = 'Android';
      const dispositivoOSVersion = Device.osVersion || 'unknown';

      const finalUrl = `${protocolo}://${dominio}/index.aspx?Origem=App&DispositivoID=${dispositivoID}&DispositivoOS=${dispositivoOS}&DispositivoOSVersion=${dispositivoOSVersion}`;
      setUrl(finalUrl);
    };

    generateUrl();

    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  const handleDownload = async (jsonString) => {
    try {
      const dataStr = jsonString.split('integracaoapp-download:')[1];
      const dados = JSON.parse(dataStr);

      const downloadUrl = `${protocolo}://${dominio}/GED/GED00103.aspx?empresa=${dados.CodigoEmpresa}&origem=${dados.Origem}&codigoorigem=${dados.CodigoOrigem}&codigo=${dados.Codigo}`;
      const fileUri = FileSystem.documentDirectory + (dados.Nome || 'arquivo.pdf');

      const downloadResumable = FileSystem.createDownloadResumable(downloadUrl, fileUri);
      const { uri } = await downloadResumable.downloadAsync();

      Alert.alert('Download concluído', `Arquivo salvo em:\n${uri}`);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      Alert.alert('Erro ao realizar download', error.message);
      console.error('Erro no download:', error);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão negada', 'Permita o acesso à câmera para continuar.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        base64: true,
        quality: 0.3,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const base64Image = result.assets[0].base64;
        const script = `window.resultado_foto('${base64Image}');`;
        webviewRef.current.injectJavaScript(script);
      }
    } catch (error) {
      Alert.alert('Erro ao acessar a câmera', error.message);
      console.error('Erro na câmera:', error);
    }
  };

  const handleNavigation = (navState) => {
    const { url: navUrl } = navState;

    if (!navUrl) return false;

    // integracaoapp-download
    if (navUrl.includes('integracaoapp-download')) {
      console.log('Download requisitado:', navUrl);
      handleDownload(navUrl);
      return false;
    }

    // integracaoapp-notificar
    if (navUrl.includes('integracaoapp-notificar')) {
      console.log('Notificação requisitada:', navUrl);
      return false;
    }

    // integracaoapp-offline
    if (navUrl.includes('integracaoapp-tokenacesso')) {
      console.log('Modo Token requisitado:', navUrl);
      return false;
    }

    // integracaoapp-offline
    if (navUrl.includes('integracaoapp-offline')) {
      console.log('Modo offline requisitado:', navUrl);
      return false;
    }

    // integracaoapp-native
    if (navUrl.includes('integracaoapp-native')) {
      console.log('Requisição nativa recebida:', navUrl);

      if (navUrl.includes('CAMERA')) {
        handleCameraCapture();
      }

      return false;
    }

    return true;
  };

  return (
    <SafeAreaView style={styles.container}>
      {isConnected ? (
        url && (
          <WebView
            originWhitelist={['*']}
            ref={webviewRef}
            source={{ uri: url }}
            style={styles.webview}
            onShouldStartLoadWithRequest={handleNavigation}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        )
      ) : (
        <View style={styles.offlineContainer}>
          <Text style={styles.offlineText}>Sem conexão com a internet</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  webview: {
    flex: 1,
  },
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8d7da',
  },
  offlineText: {
    color: '#721c24',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
