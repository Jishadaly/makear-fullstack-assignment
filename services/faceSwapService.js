
const axios = require('axios');


class FaceSwapService {
  constructor() {
    this.apiUrl = process.env.FACE_SWAP_API_URL;
    this.apiKey = process.env.FACE_SWAP_API_KEY || 'f1ae6feb20b94cf2b7bfad2721eda29a_667dcff57f6a4b308f3f23bff13a5786_andoraitools';
    this.timeout = 30000; // 30 seconds timeout

    if (!this.apiKey) {
      console.warn('⚠️ Face Swap API key not provided. Service will use mock responses.');
    }
  }

  getAxiosInstance() {
    return axios.create({
      baseURL: this.apiUrl,
      timeout: this.timeout,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'image/jpeg',
      }

    });
  }


  async swapFace(inputImageBuffer, styleImageBuffer) {
    try {
      if (!this.apiKey) throw new Error("API key is required");

      // Helper function to upload image and get imageUrl
      const uploadImageToLightX = async (buffer, mimetype) => {
        const uploadRes = await axios.post(
          `${this.apiUrl}/uploadImageUrl`,
          {
            uploadType: "imageUrl",
            size: buffer.length,
            contentType: mimetype
          },
          { headers: { "x-api-key": this.apiKey, "Content-Type": "application/json" } }
        );

        const { uploadImage, imageUrl } = uploadRes.data.body;
        if (!uploadImage || !imageUrl) throw new Error("Failed to get upload URL");

        // PUT actual image
        await axios.put(uploadImage, buffer, {
          headers: { "Content-Type": mimetype, "Content-Length": buffer.length }
        });

        return imageUrl;
      };

      // 1️⃣ Upload input image
      const inputImageUrl = await uploadImageToLightX(inputImageBuffer.buffer, inputImageBuffer.mimetype);

      // 2️⃣ Upload style image
      const styleImageUrl = await uploadImageToLightX(styleImageBuffer.buffer, styleImageBuffer.mimetype);

      // 3️⃣ Trigger face swap
      const swapRes = await axios.post(
        `${this.apiUrl.replace("v2", "v1")}/face-swap`,
        { imageUrl: inputImageUrl, styleImageUrl },
        { headers: { "x-api-key": this.apiKey, "Content-Type": "application/json" } }
      );

      console.log('inputImgURL', inputImageUrl)
      console.log('styleinputImgURL', styleImageUrl)
      console.log('swapRes11111', swapRes.status)


      const { orderId, maxRetriesAllowed } = swapRes.data.body;
      if (!orderId) throw new Error("Failed to create face swap order");

      // 4️⃣ Poll for result (max 5 retries, every 3 seconds)
      let outputUrl = null;
      for (let i = 0; i < maxRetriesAllowed; i++) {
        await new Promise(r => setTimeout(r, 3000));

        const statusRes = await axios.post(
          `${this.apiUrl.replace("v2", "v1")}/order-status`,
          { orderId },
          { headers: { "x-api-key": this.apiKey, "Content-Type": "application/json" } }
        );

        const statusBody = statusRes.data.body;
        if (!statusBody) continue;

        if (statusBody.status === "active") {
          outputUrl = statusBody.output;
          break;
        } else if (statusBody.status === "failed") {
          throw new Error("Face swap failed on server");
        }
      }

      if (!outputUrl) throw new Error("Face swap timed out");
      console.log('outURL', outputUrl)

      // 5️⃣ Download final swapped image
      const finalImageRes = await axios.get(outputUrl, { responseType: "arraybuffer" });
      return { buffer: Buffer.from(finalImageRes.data), outputUrl }

    } catch (err) {
      console.error("Face swap error:", err.response?.data || err.message);
      throw new Error("Face swap failed, please try again later.");
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