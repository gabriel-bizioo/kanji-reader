import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { darkTheme } from '../styles/theme';

interface ExpoPDFViewerProps {
  source: { uri: string };
  onPageChanged?: (page: number, totalPages: number) => void;
  onLoadComplete?: (totalPages: number) => void;
  onError?: (error: Error) => void;
  style?: any;
  currentPage?: number;
}

const ExpoPDFViewer: React.FC<ExpoPDFViewerProps> = ({
  source,
  onPageChanged,
  onLoadComplete,
  onError,
  style,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    loadPDFAsBase64();
  }, [source.uri]);

  const loadPDFAsBase64 = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(source.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Debug the base64 content
      const first100 = base64.substring(0, 100);
      const pdfHeader = base64.substring(0, 20);
      
      console.log('First 100 chars of base64:', first100);
      console.log('PDF header check:', pdfHeader);
      
      setDebugInfo(`Base64 length: ${base64.length}\nHeader: ${pdfHeader}\nFirst 50: ${first100.substring(0, 50)}`);
      setBase64Data(base64);
      
    } catch (error) {
      console.error('Error loading PDF as base64:', error);
      setError(`Failed to load PDF: ${error}`);
      setLoading(false);
      onError?.(new Error(`Failed to load PDF: ${error}`));
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView message:', data);
      
      switch (data.type) {
        case 'success':
          setLoading(false);
          onLoadComplete?.(1); // Just say 1 page for now
          break;
        case 'error':
          setError(data.message);
          setLoading(false);
          onError?.(new Error(data.message));
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  // Ultra-simple HTML that just tries to display the PDF
  const generateSimpleHTML = () => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 20px;
            background-color: ${darkTheme.colors.pdfBackground};
            color: white;
            font-family: monospace;
        }
        .debug {
            background: #333;
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 5px;
            font-size: 12px;
            white-space: pre-wrap;
        }
        .pdf-container {
            width: 100%;
            height: 400px;
            border: 2px solid #666;
            background: white;
        }
        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
    </style>
</head>
<body>
    <div class="debug">
        Debug Info:
        Base64 length: ${base64Data.length}
        PDF header: ${base64Data.substring(0, 20)}
        First 50 chars: ${base64Data.substring(0, 50)}
    </div>
    
    <h3>Method 1: Direct Base64 PDF</h3>
    <div class="pdf-container">
        <iframe 
            src="data:application/pdf;base64,${base64Data}"
            title="PDF Direct"
        ></iframe>
    </div>
    
    <div class="debug">
        If you see a PDF above, the base64 is valid!
        If blank, the base64 is corrupted or WebView can't handle it.
    </div>
    
    <script>
        // Just report success
        setTimeout(() => {
            window.ReactNativeWebView?.postMessage(JSON.stringify({
                type: 'success'
            }));
        }, 2000);
    </script>
</body>
</html>`;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <ActivityIndicator size="large" color={darkTheme.colors.primary} />
        <Text style={styles.loadingText}>Testing PDF...</Text>
        <Text style={styles.debugText}>{debugInfo}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <Text style={styles.errorText}>PDF Test Error</Text>
        <Text style={styles.errorDetails}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadPDFAsBase64}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: generateSimpleHTML() }}
        style={styles.webview}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.pdfBackground,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: darkTheme.colors.pdfBackground,
  },
  loadingText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    marginTop: darkTheme.spacing.md,
    textAlign: 'center',
  },
  debugText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textTertiary,
    marginTop: darkTheme.spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    ...darkTheme.typography.h3,
    color: darkTheme.colors.error,
    marginBottom: darkTheme.spacing.sm,
    textAlign: 'center',
  },
  errorDetails: {
    ...darkTheme.typography.bodySmall,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: darkTheme.spacing.lg,
    paddingHorizontal: darkTheme.spacing.md,
  },
  retryButton: {
    backgroundColor: darkTheme.colors.primary,
    paddingHorizontal: darkTheme.spacing.lg,
    paddingVertical: darkTheme.spacing.md,
    borderRadius: darkTheme.borderRadius.lg,
  },
  retryButtonText: {
    ...darkTheme.typography.button,
    color: darkTheme.colors.text,
  },
});

export default ExpoPDFViewer;
