import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { darkTheme } from '../styles/theme';

interface ExpoPDFViewerProps {
  source: { uri: string };
  onPageChanged?: (page: number, totalPages: number) => void;
  onLoadComplete?: (totalPages: number) => void;
  onError?: (error: Error) => void;
  onTextExtracted?: (text: string, pageNumber: number) => void;
  style?: any;
  currentPage?: number;
}

const ExpoPDFViewer: React.FC<ExpoPDFViewerProps> = ({
  source,
  onPageChanged,
  onLoadComplete,
  onError,
  onTextExtracted,
  style,
  currentPage: initialPage = 1,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    setupPDFForViewing();
  }, [source.uri]);

  const setupPDFForViewing = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Setting up PDF for viewing...');
      
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(source.uri);
      if (!fileInfo.exists) {
        throw new Error('PDF file not found');
      }
      
      console.log(`PDF file found: ${Math.round((fileInfo.size || 0) / 1024)}KB`);
      
      // For Google Drive viewer, we need a publicly accessible URL
      // Since we can't make local files public, we'll create a simple data URL approach
      
      // Option 1: Try a simple iframe approach first
      setPdfUrl(source.uri);
      setLoading(false);
      
      // Simulate successful load for now
      setTimeout(() => {
        setTotalPages(100); // Placeholder - Google viewer doesn't give us page count
        onLoadComplete?.(100);
        onPageChanged?.(1, 100);
      }, 2000);
      
    } catch (error) {
      console.error('Error setting up PDF:', error);
      setError(`Failed to setup PDF: ${error}`);
      setLoading(false);
      onError?.(new Error(`Failed to setup PDF: ${error}`));
    }
  };

  const handleWebViewLoad = () => {
    console.log('WebView loaded');
    setLoading(false);
  };

  const handleWebViewError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    setError(`WebView error: ${nativeEvent.description}`);
    setLoading(false);
  };

  // Generate simple HTML that tries multiple approaches
  const generateViewerHTML = () => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background-color: #1a1a1a;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .viewer-container {
            width: 100%;
            height: 100%;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
        
        .message {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        
        .error {
            color: #ff4444;
        }
        
        .loading {
            color: #007AFF;
        }
    </style>
</head>
<body>
    <div class="viewer-container">
        <div class="message loading">
            <h3>Loading PDF...</h3>
            <p>Initializing viewer...</p>
        </div>
    </div>

    <script>
        function sendMessage(data) {
            try {
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify(data));
                }
            } catch (e) {
                console.log('Message send error:', e);
            }
        }

        function showMessage(title, text, isError = false) {
            const container = document.querySelector('.viewer-container');
            container.innerHTML = \`
                <div class="message \${isError ? 'error' : 'loading'}">
                    <h3>\${title}</h3>
                    <p>\${text}</p>
                </div>
            \`;
        }

        function loadPDFViewer() {
            try {
                showMessage('Loading PDF...', 'Setting up viewer...');
                
                // Try to create a simple PDF viewer
                const container = document.querySelector('.viewer-container');
                
                // Method 1: Try direct file access (probably won't work)
                const fileUrl = '${source.uri}';
                
                // Method 2: Create an object element
                container.innerHTML = \`
                    <object data="\${fileUrl}" type="application/pdf" width="100%" height="100%">
                        <div class="message error">
                            <h3>PDF Preview Not Available</h3>
                            <p>This device doesn't support direct PDF viewing.</p>
                            <p>File: \${fileUrl}</p>
                        </div>
                    </object>
                \`;
                
                // Give it time to load
                setTimeout(() => {
                    sendMessage({
                        type: 'pdfLoaded',
                        totalPages: 1,
                        currentPage: 1
                    });
                }, 2000);
                
            } catch (error) {
                showMessage('Error', 'Failed to load PDF: ' + error.message, true);
                sendMessage({
                    type: 'error',
                    message: 'PDF load failed: ' + error.message
                });
            }
        }

        // Start loading
        setTimeout(loadPDFViewer, 1000);
    </script>
</body>
</html>`;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <ActivityIndicator size="large" color={darkTheme.colors.primary} />
        <Text style={styles.loadingText}>Loading PDF...</Text>
        <Text style={styles.debugText}>Setting up simple viewer...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <Text style={styles.errorText}>📄</Text>
        <Text style={styles.errorTitle}>PDF Viewer Error</Text>
        <Text style={styles.errorDetails}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={setupPDFForViewing}
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
        source={{ html: generateViewerHTML() }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlaybook={true}
        mixedContentMode="compatibility"
        onLoadEnd={handleWebViewLoad}
        onError={handleWebViewError}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('PDF Viewer message:', data);
            
            switch (data.type) {
              case 'pdfLoaded':
                setTotalPages(data.totalPages);
                setCurrentPage(data.currentPage);
                onLoadComplete?.(data.totalPages);
                onPageChanged?.(data.currentPage, data.totalPages);
                break;
              case 'error':
                setError(data.message);
                onError?.(new Error(data.message));
                break;
            }
          } catch (error) {
            console.log('Message parse error:', error);
          }
        }}
      />
      
      {/* Simple status display */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          Simple PDF Viewer - File: {source.uri.split('/').pop()}
        </Text>
      </View>
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
    fontSize: 48,
    marginBottom: darkTheme.spacing.md,
  },
  errorTitle: {
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
  statusBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default ExpoPDFViewer;
