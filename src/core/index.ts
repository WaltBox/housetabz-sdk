// Type definitions
export interface HouseTabzConfig {
  apiKey: string;
  secretKey: string;
  environment?: 'development' | 'staging' | 'production';
}

export interface MountOptions {
  serviceName: string;
  pricing: number;
  transactionId: string;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

interface URLParams {
  userId: string | null;
  partnerId: string | null;
  ref: string | null;
}

export class HouseTabzError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'HouseTabzError';
  }
}

class HouseTabz {
  private static readonly VERSION = '1.0.0';
  private static instance: HouseTabz | null = null;
  private config: HouseTabzConfig | null = null;
  private params: URLParams | null = null;
  private baseUrl: string = '';

  private constructor() {}

  static getInstance(): HouseTabz {
    if (!HouseTabz.instance) {
      HouseTabz.instance = new HouseTabz();
    }
    return HouseTabz.instance;
  }

  private determineBaseUrl(environment: string = 'development'): string {
    const urls = {
      production: 'https://api.housetabz.com/api',
      staging: 'https://staging.housetabz.com/api',
      development: 'http://localhost:3004/api'
    };
    return urls[environment] || urls.development;
  }

  private extractURLParams(): URLParams {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('user_id');
    const partnerId = params.get('partner_id');
    const ref = params.get('ref');

    console.log('Extracted URL params:', { userId, partnerId, ref });
    return { userId, partnerId, ref };
  }

  async init(config: HouseTabzConfig): Promise<void> {
    try {
      // Store config and extract params
      this.config = config;
      this.params = this.extractURLParams();
      this.baseUrl = this.determineBaseUrl(config.environment);

      console.log('Initializing HouseTabz:', {
        baseUrl: this.baseUrl,
        params: this.params,
        environment: config.environment
      });

      // Validate configuration
      if (!config.apiKey || !config.secretKey) {
        throw new HouseTabzError('API key and Secret key are required', 'INVALID_CONFIG');
      }

      // Validate URL parameters
      if (!this.params.userId) {
        throw new HouseTabzError('user_id is required in URL', 'MISSING_USER_ID');
      }
      if (!this.params.partnerId) {
        throw new HouseTabzError('partner_id is required in URL', 'MISSING_PARTNER_ID');
      }
      if (this.params.ref !== 'housetabz') {
        throw new HouseTabzError('Invalid referrer', 'INVALID_REF');
      }

      console.log('HouseTabz initialized successfully');
    } catch (error) {
      console.error('Initialization failed:', error);
      throw error;
    }
  }

  async mount(selector: string, options: MountOptions): Promise<void> {
    try {
      console.log('Mounting HouseTabz button with options:', options);

      const container = document.querySelector(selector);
      if (!container) {
        throw new HouseTabzError(`Container ${selector} not found`, 'INVALID_SELECTOR');
      }

      this.renderButton(container, options);
    } catch (error) {
      console.error('Mount failed:', error);
      throw error;
    }
  }

  private renderButton(container: Element, options: MountOptions): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'housetabz-wrapper';

    const button = document.createElement('button');
    button.className = 'housetabz-connect-button';
    button.innerHTML = 'Connect to <span class="housetabz-highlight">HouseTabz</span>';

    const messageContainer = document.createElement('div');
    messageContainer.className = 'housetabz-message';
    messageContainer.style.display = 'none';

    button.onclick = async () => {
      try {
        button.disabled = true;
        button.classList.add('loading');
        messageContainer.style.display = 'block';

        const response = await this.createStagedRequest(options);
        this.handleSuccess(button, messageContainer, response, options);
      } catch (error) {
        this.handleError(button, messageContainer, error as Error, options);
      }
    };

    wrapper.appendChild(button);
    wrapper.appendChild(messageContainer);
    container.innerHTML = '';
    container.appendChild(wrapper);
  }

  private async createStagedRequest(options: MountOptions) {
    const url = `${this.baseUrl}/partners/staged-request`;  // No partnerId in URL
    
    console.log('Creating staged request:', { url, options });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-HouseTabz-API-Key': this.config!.apiKey,
            'X-HouseTabz-Secret-Key': this.config!.secretKey
        },
        body: JSON.stringify({
            transactionId: options.transactionId,
            serviceName: options.serviceName,
            pricing: options.pricing,
            userId: this.params?.userId
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new HouseTabzError(error.message || 'Request failed', 'API_ERROR');
    }

    return await response.json();
}
  private handleSuccess(
    button: HTMLButtonElement,
    messageContainer: HTMLDivElement,
    response: any,
    options: MountOptions
  ): void {
    button.classList.remove('loading');
    button.disabled = true;
    messageContainer.style.display = 'block';
    messageContainer.innerHTML = `
      <div class="success-box">
        <p>Request successful! Roommates have been notified to accept.</p>
      </div>
    `;
    options.onSuccess?.(response);
  }

  private handleError(
    button: HTMLButtonElement,
    messageContainer: HTMLDivElement,
    error: Error,
    options: MountOptions
  ): void {
    button.disabled = false;
    button.classList.remove('loading');
    messageContainer.style.display = 'block';
    messageContainer.innerHTML = `
      <div class="error-box">
        <p>${error.message || 'Something went wrong. Please try again.'}</p>
      </div>
    `;
    options.onError?.(error);
  }
}

// Apply styles
const style = document.createElement('style');
style.innerHTML = `
  .housetabz-connect-button {
    padding: 14px 24px;
    font-size: 16px;
    font-weight: 600;
    color: black;
    background-color: #34d399;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    width: 100%;
  }

  .housetabz-connect-button:hover {
    background-color: #2d9f78;
    transform: translateY(-1px);
    box-shadow: 0 6px 10px rgba(0, 0, 0, 0.1);
  }

  .housetabz-connect-button:disabled {
    background-color: #a7f3d0;
    cursor: not-allowed;
    box-shadow: none;
  }

  .housetabz-connect-button.loading {
    cursor: progress;
  }

  .housetabz-highlight {
    font-family: 'Montserrat', sans-serif;
    font-weight: 700;
    color: black;
  }

  .housetabz-message {
    margin-top: 12px;
    font-size: 14px;
    text-align: center;
  }

  .success-box {
    background-color: #e0fce4;
    color: #047857;
    padding: 12px;
    border-radius: 6px;
  }

  .error-box {
    background-color: #fee2e2;
    color: #b91c1c;
    padding: 12px;
    border-radius: 6px;
  }
`;
document.head.appendChild(style);

// Export singleton instance
export default HouseTabz.getInstance();