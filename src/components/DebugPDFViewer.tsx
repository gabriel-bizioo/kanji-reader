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

interface DebugPDFViewerProps {
  source: { uri: string };
  onPageChanged?: (page: number, totalPages: number) => void;
  onLoadComplete?: (totalPages: number) => void;
  onError?: (error: Error) => void;
  onTextExtracted?: (text: string, pageNumber: number) => void;
  style?: any;
  currentPage?: number;
}

const DebugPDFViewer: React.FC<DebugPDFViewerProps> = ({
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
  const [base64Data, setBase64Data] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfReady, setPdfReady] = useState(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    loadPDFAsBase64();
  }, [source.uri]);

  const loadPDFAsBase64 = async () => {
    try {
      setLoading(true);
      setError(null);
      setPdfReady(false);
      
      console.log('Loading PDF...');
      
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(source.uri);
      if (!fileInfo.exists) {
        throw new Error('PDF file not found');
      }
      
      console.log(`Reading ${Math.round((fileInfo.size || 0) / 1024)}KB PDF...`);
      
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(source.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log(`Base64 conversion complete: ${Math.round(base64.length / 1024)}KB`);
      setBase64Data(base64);
      
    } catch (error) {
      console.error('Error loading PDF:', error);
      setError(`Failed to load PDF: ${error}`);
      setLoading(false);
      onError?.(new Error(`Failed to load PDF: ${error}`));
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'pdfLoaded':
          console.log(`PDF loaded successfully: ${data.totalPages} pages`);
          setLoading(false);
          setTotalPages(data.totalPages);
          setPdfReady(true);
          onLoadComplete?.(data.totalPages);
          
          // Navigate to initial page if specified
          if (initialPage > 1 && initialPage <= data.totalPages) {
            setTimeout(() => navigateToPage(initialPage), 500);
          } else {
            setCurrentPage(1);
            onPageChanged?.(1, data.totalPages);
          }
          break;
          
        case 'pageChanged':
          console.log(`Page changed to: ${data.pageNumber}`);
          setCurrentPage(data.pageNumber);
          onPageChanged?.(data.pageNumber, data.totalPages);
          break;
          
        case 'textExtracted':
          onTextExtracted?.(data.text, data.pageNumber);
          break;
          
        case 'error':
          console.error('PDF.js error:', data.message);
          setError(data.message);
          setLoading(false);
          setPdfReady(false);
          onError?.(new Error(data.message));
          break;
          
        case 'log':
          console.log('PDF.js:', data.message);
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const navigateToPage = (pageNumber: number) => {
    if (pdfReady && pageNumber >= 1 && pageNumber <= totalPages) {
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'navigateToPage',
        pageNumber
      }));
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      navigateToPage(currentPage + 1);
    }
  };
  
  const previousPage = () => {
    if (currentPage > 1) {
      navigateToPage(currentPage - 1);
    }
  };

  const extractTextFromCurrentPage = () => {
    if (pdfReady) {
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'extractText',
        pageNumber: currentPage
      }));
    }
  };

  // Generate HTML with embedded base64 PDF
  const generatePDFHTML = () => {
    if (!base64Data) return '<html><body>Loading...</body></html>';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
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
            overflow: hidden;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        #container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 10px;
        }
        
        #pdfCanvas {
            max-width: 100%;
            max-height: 100%;
            background: white;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            border-radius: 4px;
        }
        
        #controls {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            padding: 12px 20px;
            border-radius: 25px;
            display: flex;
            align-items: center;
            gap: 15px;
            z-index: 100;
            backdrop-filter: blur(10px);
        }
        
        button {
            background: #007AFF;
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background-color 0.2s;
        }
        
        button:disabled {
            background: #444;
            cursor: not-allowed;
        }
        
        button:active:not(:disabled) {
            background: #0051D0;
        }
        
        #pageInfo {
            color: white;
            font-size: 14px;
            font-weight: 600;
            min-width: 80px;
            text-align: center;
        }
        
        #loading {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            padding: 20px;
            border-radius: 10px;
            background: rgba(0,0,0,0.8);
            backdrop-filter: blur(10px);
        }
        
        .spinner {
            border: 3px solid #333;
            border-top: 3px solid #007AFF;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div id="loading">
        <div class="spinner"></div>
        <div>Loading PDF...</div>
        <div style="font-size: 12px; margin-top: 10px;">Parsing ${Math.round(base64Data.length / 1024)}KB document...</div>
    </div>
    
    <div id="container" style="display: none;">
        <canvas id="pdfCanvas"></canvas>
    </div>
    
    <div id="controls" style="display: none;">
        <button onclick="previousPage()" id="prevBtn">◀ Previous</button>
        <span id="pageInfo">1 / 1</span>
        <button onclick="nextPage()" id="nextBtn">Next ▶</button>
    </div>

    <script>
        let pdfDoc = null;
        let currentPage = ${initialPage};
        let totalPages = 0;
        let pageRendering = false;
        let pageNumPending = null;
        
        const canvas = document.getElementById('pdfCanvas');
        const ctx = canvas.getContext('2d');

        function sendMessage(data) {
            try {
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify(data));
                }
            } catch (e) {
                console.log('Message send error:', e);
            }
        }

        function showPDF() {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('container').style.display = 'flex';
            document.getElementById('controls').style.display = 'flex';
        }

        // Initialize PDF.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        // Use the working method: direct base64 conversion
        const base64Data = '${base64Data}';
        const binaryData = atob(base64Data);
        
        pdfjsLib.getDocument({
            data: binaryData,
            verbosity: 0
        }).promise.then(pdf => {
            pdfDoc = pdf;
            totalPages = pdf.numPages;
            
            showPDF();
            
            sendMessage({
                type: 'pdfLoaded',
                totalPages: totalPages
            });
            
            // Render initial page
            renderPage(currentPage);
            
        }).catch(error => {
            document.getElementById('loading').innerHTML = '<div style="color: #ff4444;">PDF Load Error: ' + error.message + '</div>';
            sendMessage({
                type: 'error',
                message: 'PDF load failed: ' + error.message
            });
        });

        function renderPage(pageNumber) {
            if (pageRendering) {
                pageNumPending = pageNumber;
                return;
            }
            
            if (!pdfDoc || pageNumber < 1 || pageNumber > totalPages) {
                return;
            }
            
            pageRendering = true;
            
            pdfDoc.getPage(pageNumber).then(page => {
                // Calculate scale to fit screen
                const viewport = page.getViewport({ scale: 1 });
                const containerWidth = window.innerWidth - 40;
                const containerHeight = window.innerHeight - 100;
                
                const scaleWidth = containerWidth / viewport.width;
                const scaleHeight = containerHeight / viewport.height;
                const scale = Math.min(scaleWidth, scaleHeight, 3);
                
                const scaledViewport = page.getViewport({ scale: scale });
                
                canvas.height = scaledViewport.height;
                canvas.width = scaledViewport.width;

                const renderContext = {
                    canvasContext: ctx,
                    viewport: scaledViewport
                };

                const renderTask = page.render(renderContext);
                
                renderTask.promise.then(() => {
                    pageRendering = false;
                    currentPage = pageNumber;
                    updatePageInfo();
                    
                    sendMessage({
                        type: 'pageChanged',
                        pageNumber: currentPage,
                        totalPages: totalPages
                    });
                    
                    // Auto-extract text
                    extractTextFromPage(page);
                    
                    if (pageNumPending !== null) {
                        renderPage(pageNumPending);
                        pageNumPending = null;
                    }
                }).catch(error => {
                    pageRendering = false;
                    sendMessage({ 
                        type: 'log', 
                        message: 'Render error: ' + error.message
                    });
                });
            }).catch(error => {
                pageRendering = false;
                sendMessage({ 
                    type: 'log', 
                    message: 'Page error: ' + error.message
                });
            });
        }

        function extractTextFromPage(page) {
            page.getTextContent().then(textContent => {
                const text = textContent.items
                    .map(item => item.str)
                    .join(' ')
                    .trim();
                
                if (text) {
                    sendMessage({
                        type: 'textExtracted',
                        text: text,
                        pageNumber: currentPage
                    });
                }
            }).catch(error => {
                sendMessage({ 
                    type: 'log', 
                    message: 'Text extraction error: ' + error.message
                });
            });
        }

        function nextPage() {
            if (currentPage < totalPages) {
                renderPage(currentPage + 1);
            }
        }

        function previousPage() {
            if (currentPage > 1) {
                renderPage(currentPage - 1);
            }
        }

        function updatePageInfo() {
            document.getElementById('pageInfo').textContent = currentPage + ' / ' + totalPages;
            document.getElementById('prevBtn').disabled = currentPage === 1;
            document.getElementById('nextBtn').disabled = currentPage === totalPages;
        }

        // Listen for messages from React Native
        window.addEventListener('message', function(event) {
            try {
                const data = JSON.parse(event.data);
                
                switch (data.type) {
                    case 'navigateToPage':
                        if (data.pageNumber >= 1 && data.pageNumber <= totalPages) {
                            renderPage(data.pageNumber);
                        }
                        break;
                    case 'extractText':
                        if (pdfDoc && currentPage >= 1 && currentPage <= totalPages) {
                            pdfDoc.getPage(currentPage).then(extractTextFromPage);
                        }
                        break;
                }
            } catch (error) {
                sendMessage({ 
                    type: 'log', 
                    message: 'Message handling error: ' + error.message
                });
            }
        });
    </script>
</body>
</html>`;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <ActivityIndicator size="large" color={darkTheme.colors.primary} />
        <Text style={styles.loadingText}>Loading PDF...</Text>
        <Text style={styles.debugText}>
          {base64Data ? 
            `Processing ${Math.round(base64Data.length / 1024)}KB...` : 
            'Reading file...'
          }
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <Text style={styles.errorText}>📄</Text>
        <Text style={styles.errorTitle}>PDF Loading Error</Text>
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
        source={{ html: generatePDFHTML() }}
        style={styles.webview}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlaybook={true}
        mixedContentMode="compatibility"
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          setError(`WebView error: ${nativeEvent.description}`);
        }}
      />
      
      {/* External navigation controls */}
      {pdfReady && totalPages > 0 && (
        <View style={styles.externalControls}>
          <TouchableOpacity
            style={[styles.navButton, currentPage === 1 && styles.disabledButton]}
            onPress={previousPage}
            disabled={currentPage === 1}
          >
            <Text style={styles.navButtonText}>◀</Text>
          </TouchableOpacity>
          
          <Text style={styles.pageText}>
            {currentPage} / {totalPages}
          </Text>
          
          <TouchableOpacity
            style={[styles.navButton, currentPage === totalPages && styles.disabledButton]}
            onPress={nextPage}
            disabled={currentPage === totalPages}
          >
            <Text style={styles.navButtonText}>▶</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.extractButton}
            onPress={extractTextFromCurrentPage}
          >
            <Text style={styles.extractButtonText}>Extract</Text>
          </TouchableOpacity>
        </View>
      )}
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
  externalControls: {
    position: 'absolute',
    top: 140,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  disabledButton: {
    opacity: 0.3,
  },
  navButtonText: {
    color: darkTheme.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  pageText: {
    color: 'white',
    fontSize: 14,
    marginHorizontal: 8,
  },
  extractButton: {
    backgroundColor: darkTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  extractButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default DebugPDFViewer;
