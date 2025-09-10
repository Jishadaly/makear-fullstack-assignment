/**
 * Face Swap Service
 * Handles API calls to external face swap service
 */

const axios = require('axios');
const FormData = require('form-data');

class FaceSwapService {
  constructor() {
    this.apiUrl = process.env.FACE_SWAP_API_URL || 'https://api.faceswap.dev/v1';
    this.apiKey = process.env.FACE_SWAP_API_KEY;
    this.timeout = 30000; // 30 seconds timeout
    
    if (!this.apiKey) {
      console.warn('⚠️ Face Swap API key not provided. Service will use mock responses.');
    }
  }

  /**
   * Initialize axios instance with default config
   */
  getAxiosInstance() {
    return axios.create({
      baseURL: this.apiUrl,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'User-Agent': 'FaceSwap-App/1.0.0'
      }
    });
  }

  /**
   * Perform face swap operation
   * @param {Buffer} sourceImageBuffer - Original image buffer
   * @param {Buffer} targetImageBuffer - Target face image buffer (optional)
   * @returns {Promise<Buffer>} Swapped image buffer
   */
  async swapFace(sourceImageBuffer, targetImageBuffer = null) {
    try {
      // If no API key provided, return mock swapped image
      if (!this.apiKey) {
        return this.mockFaceSwap(sourceImageBuffer);
      }

      const formData = new FormData();
      formData.append('source_image', sourceImageBuffer, {
        filename: 'source.jpg',
        contentType: 'image/jpeg'
      });

      // If target image provided, use it; otherwise use default celebrity face
      if (targetImageBuffer) {
        formData.append('target_image', targetImageBuffer, {
          filename: 'target.jpg',
          contentType: 'image/jpeg'
        });
      } else {
        // Use default celebrity face or template
        formData.append('use_template', 'celebrity_1');
      }

      // Additional parameters
      formData.append('quality', 'high');
      formData.append('enhance', 'true');

      const axiosInstance = this.getAxiosInstance();
      
      const response = await axiosInstance.post('/swap', formData, {
        headers: {
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer'
      });

      if (response.status !== 200) {
        throw new Error(`Face swap API returned status: ${response.status}`);
      }

      return Buffer.from(response.data);

    } catch (error) {
      console.error('Face swap error:', error.message);
      
      // If API fails, return mock result
      if (error.response?.status >= 400) {
        console.log('API error, falling back to mock response');
        return this.mockFaceSwap(sourceImageBuffer);
      }
      
      throw new Error('Face swap service temporarily unavailable');
    }
  }

  /**
   * Get available face templates/celebrities
   * @returns {Promise<Array>} List of available templates
   */
  async getAvailableTemplates() {
    try {
      if (!this.apiKey) {
        return this.getMockTemplates();
      }

      const axiosInstance = this.getAxiosInstance();
      const response = await axiosInstance.get('/templates');

      return response.data.templates || [];

    } catch (error) {
      console.error('Get templates error:', error.message);
      return this.getMockTemplates();
    }
  }

  /**
   * Check API service status
   * @returns {Promise<Object>} Service status
   */
  async checkServiceStatus() {
    try {
      if (!this.apiKey) {
        return {
          status: 'mock',
          available: true,
          message: 'Using mock face swap service'
        };
      }

      const axiosInstance = this.getAxiosInstance();
      const response = await axiosInstance.get('/health');

      return {
        status: 'online',
        available: true,
        message: 'Face swap service is available',
        ...response.data
      };

    } catch (error) {
      console.error('Service status check error:', error.message);
      
      return {
        status: 'offline',
        available: false,
        message: 'Face swap service is temporarily unavailable',
        error: error.message
      };
    }
  }

  /**
   * Mock face swap for development/fallback
   * @param {Buffer} sourceImageBuffer - Original image buffer
   * @returns {Promise<Buffer>} Mock swapped image buffer
   */
  async mockFaceSwap(sourceImageBuffer) {
    try {
      const sharp = require('sharp');
      
      // Create a simple transformation to simulate face swap
      // In reality, this would be replaced by actual face swap logic
      const processedImage = await sharp(sourceImageBuffer)
        .modulate({
          brightness: 1.1,
          saturation: 1.2,
          hue: 10
        })
        .sharpen()
        .composite([{
          input: Buffer.from(
            '<svg width="100" height="30"><text x="10" y="20" font-family="Arial" font-size="12" fill="rgba(255,255,255,0.8)">Face Swapped</text></svg>'
          ),
          top: 10,
          left: 10,
        }])
        .jpeg({ quality: 90 })
        .toBuffer();

      // Add artificial delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      return processedImage;

    } catch (error) {
      console.error('Mock face swap error:', error.message);
      // Return original image if mock processing fails
      return sourceImageBuffer;
    }
  }

  /**
   * Get mock templates for development
   * @returns {Array} Mock template list
   */
  getMockTemplates() {
    return [
      {
        id: 'celebrity_1',
        name: 'Celebrity Template 1',
        description: 'Popular celebrity face template',
        thumbnail: '/public/images/template1_thumb.jpg'
      },
      {
        id: 'celebrity_2',
        name: 'Celebrity Template 2',
        description: 'Another celebrity face template',
        thumbnail: '/public/images/template2_thumb.jpg'
      },
      {
        id: 'model_1',
        name: 'Fashion Model',
        description: 'Professional model face template',
        thumbnail: '/public/images/model1_thumb.jpg'
      }
    ];
  }

  /**
   * Validate image for face swap compatibility
   * @param {Buffer} imageBuffer - Image buffer to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateImageForSwap(imageBuffer) {
    try {
      const sharp = require('sharp');
      const metadata = await sharp(imageBuffer).metadata();

      const validation = {
        valid: true,
        issues: [],
        recommendations: []
      };

      // Check image dimensions
      if (metadata.width < 200 || metadata.height < 200) {
        validation.valid = false;
        validation.issues.push('Image resolution too low (minimum 200x200)');
      }

      // Check aspect ratio
      const aspectRatio = metadata.width / metadata.height;
      if (aspectRatio < 0.5 || aspectRatio > 2) {
        validation.issues.push('Unusual aspect ratio may affect quality');
        validation.recommendations.push('Use images with more standard proportions');
      }

      // Check file size vs dimensions (quality indicator)
      const pixelCount = metadata.width * metadata.height;
      const bytesPerPixel = imageBuffer.length / pixelCount;
      
      if (bytesPerPixel < 0.5) {
        validation.recommendations.push('Image appears heavily compressed, results may vary');
      }

      return validation;

    } catch (error) {
      console.error('Image validation error:', error.message);
      return {
        valid: false,
        issues: ['Unable to process image'],
        recommendations: ['Please ensure the image is valid and not corrupted']
      };
    }
  }

  /**
   * Get service usage statistics (if supported by API)
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsageStats() {
    try {
      if (!this.apiKey) {
        return {
          requests_today: 0,
          requests_total: 0,
          quota_remaining: 'unlimited',
          mock: true
        };
      }

      const axiosInstance = this.getAxiosInstance();
      const response = await axiosInstance.get('/usage');

      return response.data;

    } catch (error) {
      console.error('Usage stats error:', error.message);
      return {
        requests_today: 'N/A',
        requests_total: 'N/A',
        quota_remaining: 'N/A',
        error: true
      };
    }
  }
}

module.exports = new FaceSwapService();