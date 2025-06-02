import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

interface OCRResult {
  text: string;
  confidence: number;
  boundingBoxes?: Array<{
    text: string;
    vertices: Array<{ x: number; y: number }>;
  }>;
}

interface GoogleVisionResponse {
  responses: Array<{
    textAnnotations?: Array<{
      description: string;
      boundingPoly?: {
        vertices: Array<{ x: number; y: number }>;
      };
    }>;
    fullTextAnnotation?: {
      text: string;
    };
    error?: {
      code: number;
      message: string;
    };
  }>;
}

export class OCRService {
  private static instance: OCRService;
  
  // Debug: Log what we're getting from environment
  private readonly API_KEY = this.getApiKey();
  private readonly API_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';

  private getApiKey(): string {
    // Debug logging
    console.log('=== OCR API Key Debug ===');
    console.log('Constants.expoConfig:', !!Constants.expoConfig);
    console.log('Constants.expoConfig.extra:', !!Constants.expoConfig?.extra);
    console.log('Environment key exists:', !!Constants.expoConfig?.extra?.googleCloudVisionApiKey);
    
    // Try different ways to get the API key
    const apiKey = Constants.expoConfig?.extra?.googleCloudVisionApiKey || 
                   Constants.manifest?.extra?.googleCloudVisionApiKey ||
                   Constants.manifest2?.extra?.expoClient?.extra?.googleCloudVisionApiKey ||
                   '';
    
    console.log('API key length:', apiKey.length);
    console.log('API key starts with:', apiKey ? apiKey.substring(0, 10) + '...' : 'undefined');
    console.log('=========================');
    
    return apiKey;
  }

  public static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService();
    }
    return OCRService.instance;
  }

  /**
   * Extract text from image using Google Cloud Vision API
   */
  async extractTextFromImage(imageUri: string): Promise<OCRResult> {
    try {
      console.log('Starting OCR extraction for:', imageUri);

      // Check if API key is configured
      if (!this.isConfigured()) {
        // More detailed error message
        throw new Error(`Google Cloud Vision API key not configured. 
        
Debug info:
- Constants.expoConfig exists: ${!!Constants.expoConfig}
- Constants.expoConfig.extra exists: ${!!Constants.expoConfig?.extra}
- API key from env: ${this.API_KEY.length > 0 ? 'Found (' + this.API_KEY.length + ' chars)' : 'Not found'}

Please check:
1. Create .env file with GOOGLE_CLOUD_VISION_API_KEY=your_key
2. Update app.config.js to include extra.googleCloudVisionApiKey
3. Restart Expo development server`);
      }

      // Step 1: Convert image to base64
      const base64Image = await this.convertImageToBase64(imageUri);
      console.log(`Image converted to base64: ${Math.round(base64Image.length / 1024)}KB`);

      // Step 2: Call Google Vision API
      const response = await this.callGoogleVisionAPI(base64Image);
      console.log('Google Vision API response received');

      // Step 3: Process response
      const result = this.processVisionResponse(response);
      console.log(`OCR complete: extracted ${result.text.length} characters`);

      return result;

    } catch (error) {
      console.error('OCR extraction failed:', error);
      throw error; // Re-throw the original error with debug info
    }
  }

  /**
   * Convert image file to base64 string
   */
  private async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        throw new Error('Image file not found');
      }

      console.log(`Converting image: ${Math.round((fileInfo.size || 0) / 1024)}KB`);

      // Read as base64
      const base64String = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return base64String;

    } catch (error) {
      console.error('Base64 conversion failed:', error);
      throw new Error(`Failed to convert image: ${error}`);
    }
  }

  /**
   * Call Google Cloud Vision API
   */
  private async callGoogleVisionAPI(base64Image: string): Promise<GoogleVisionResponse> {
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 50,
            },
            {
              type: 'DOCUMENT_TEXT_DETECTION',
              maxResults: 50,
            },
          ],
          imageContext: {
            languageHints: ['ja'], // Japanese language hint
          },
        },
      ],
    };

    console.log('Calling Google Vision API...');

    const response = await fetch(`${this.API_ENDPOINT}?key=${this.API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Vision API error:', response.status, errorText);
      throw new Error(`Google Vision API error: ${response.status} - ${errorText}`);
    }

    const jsonResponse: GoogleVisionResponse = await response.json();

    // Check for API errors
    if (jsonResponse.responses?.[0]?.error) {
      const error = jsonResponse.responses[0].error;
      throw new Error(`Google Vision API error: ${error.code} - ${error.message}`);
    }

    return jsonResponse;
  }

  /**
   * Process Google Vision API response
   */
  private processVisionResponse(response: GoogleVisionResponse): OCRResult {
    const firstResponse = response.responses?.[0];
    
    if (!firstResponse) {
      throw new Error('No response from Google Vision API');
    }

    // Try to get text from fullTextAnnotation first (more structured)
    let extractedText = firstResponse.fullTextAnnotation?.text || '';
    
    // If no full text annotation, fall back to individual text annotations
    if (!extractedText && firstResponse.textAnnotations) {
      // The first annotation usually contains all the text
      extractedText = firstResponse.textAnnotations[0]?.description || '';
    }

    if (!extractedText) {
      console.warn('No text detected in image');
      return {
        text: '',
        confidence: 0,
        boundingBoxes: [],
      };
    }

    // Clean up the text
    const cleanedText = this.cleanExtractedText(extractedText);

    // Extract bounding boxes for individual words/characters
    const boundingBoxes = this.extractBoundingBoxes(firstResponse.textAnnotations || []);

    // Calculate overall confidence (simplified)
    const confidence = this.calculateConfidence(cleanedText, boundingBoxes);

    return {
      text: cleanedText,
      confidence,
      boundingBoxes,
    };
  }

  /**
   * Clean and normalize extracted text
   */
  private cleanExtractedText(text: string): string {
    return text
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove leading/trailing whitespace
      .trim()
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  }

  /**
   * Extract bounding boxes from text annotations
   */
  private extractBoundingBoxes(textAnnotations: any[]): Array<{
    text: string;
    vertices: Array<{ x: number; y: number }>;
  }> {
    // Skip the first annotation (it's the full text)
    return textAnnotations.slice(1).map(annotation => ({
      text: annotation.description || '',
      vertices: annotation.boundingPoly?.vertices || [],
    }));
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(text: string, boundingBoxes: any[]): number {
    // Simple confidence calculation based on:
    // - Text length (longer = more confident)
    // - Number of detected text blocks
    // - Presence of Japanese characters
    
    let confidence = 0;

    // Base confidence from text length
    if (text.length > 0) {
      confidence += Math.min(text.length / 100, 0.5); // Max 0.5 from length
    }

    // Bonus for detecting Japanese characters
    const hasHiragana = /[\u3040-\u309F]/.test(text);
    const hasKatakana = /[\u30A0-\u30FF]/.test(text);
    const hasKanji = /[\u4E00-\u9FAF]/.test(text);

    if (hasHiragana) confidence += 0.15;
    if (hasKatakana) confidence += 0.15;
    if (hasKanji) confidence += 0.2;

    // Bonus for multiple text blocks
    if (boundingBoxes.length > 1) {
      confidence += Math.min(boundingBoxes.length / 20, 0.2); // Max 0.2 from blocks
    }

    return Math.min(confidence, 1.0); // Cap at 1.0
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return this.API_KEY !== '' && this.API_KEY.length > 0;
  }

  /**
   * Test OCR with a simple image (for debugging)
   */
  async testOCR(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          message: 'Google Cloud Vision API key not configured. Please add GOOGLE_CLOUD_VISION_API_KEY to your environment variables.',
        };
      }

      // Test with a simple base64 encoded test image (1x1 pixel)
      const testResponse = await fetch(`${this.API_ENDPOINT}?key=${this.API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
          }],
        }),
      });

      if (testResponse.ok) {
        return {
          success: true,
          message: 'Google Cloud Vision API is working',
        };
      } else {
        return {
          success: false,
          message: `API test failed: ${testResponse.status}`,
        };
      }

    } catch (error) {
      return {
        success: false,
        message: `API test error: ${error}`,
      };
    }
  }
}

export const ocrService = OCRService.getInstance();
