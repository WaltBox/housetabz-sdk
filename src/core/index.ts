// Type definitions
export interface HouseTabzConfig {
  apiKey: string;
  secretKey: string; 
  environment?: 'development' | 'staging' | 'production';
}

export interface MountOptions {
  serviceName: string;
  serviceType: 'energy' | 'cleaning';
  estimatedAmount: number;
  requiredUpfrontPayment?: number;
  transactionId: string;
}

class HouseTabz {
  private static instance: HouseTabz | null = null;
  private config: HouseTabzConfig | null = null;
  private baseUrl: string = '';

  private constructor() {
    console.log('HouseTabz SDK Instantiated');
  }

  public static getInstance(): HouseTabz {
    console.log('Getting HouseTabz Instance');
    if (!HouseTabz.instance) {
      HouseTabz.instance = new HouseTabz();
    }
    return HouseTabz.instance;
  }

  private getBaseUrl(environment: string = 'development'): string {
    const urls = {
      production: 'https://housetabz.com',
      staging: 'https://staging.housetabz.com',
      development: 'http://localhost:3000'
    };
    console.log('Setting Base URL for environment:', environment);
    return urls[environment] || urls.development;
  }

  private isDisplayable(): boolean {
    const params = new URLSearchParams(window.location.search);
    const shouldDisplay = params.get('ref') === 'housetabz';
    console.log('Display Check:', { ref: params.get('ref'), shouldDisplay });
    return shouldDisplay;
  }

  public async init(config: HouseTabzConfig): Promise<void> {
    console.log('=== Initializing HouseTabz SDK ===');
    try {
      if (!config.apiKey) throw new Error('API key is required');
      if (!config.secretKey) throw new Error('Secret key is required');

      this.config = config;
      this.baseUrl = this.getBaseUrl(config.environment);
      
      console.log({
        environment: config.environment,
        baseUrl: this.baseUrl,
        apiKeyPresent: !!config.apiKey,
        sessionStorage: {
          available: !!window.sessionStorage,
          userId: window.sessionStorage.getItem('housetabz_user_id')
        }
      });
    } catch (error) {
      console.error('Initialization Error:', error);
      throw error;
    }
  }

  public async mount(selector: string, options: MountOptions): Promise<void> {
    console.log('=== Mounting HouseTabz Button ===');
    console.log({ selector, options });

    if (!this.isDisplayable()) {
      console.log('Mount Cancelled: Display conditions not met');
      return;
    }

    const container = document.querySelector(selector);
    if (!container) {
      console.log('Mount Failed: Container not found');
      return;
    }

    this.renderButton(container, options);
    console.log('Button Mounted Successfully');
  }

  private handleButtonClick(options: MountOptions): void {
    console.log('=== HouseTabz Button Clicked ===');
    
    try {
      if (!this.config) {
        throw new Error('HouseTabz not initialized');
      }

      const currentParams = new URLSearchParams(window.location.search);
      const partnerId = currentParams.get('partner_id');
      const userId = window.sessionStorage.getItem('housetabz_user_id');
      
      console.log('Click State:', {
        partnerId,
        userId,
        sessionStorageKeys: Object.keys(window.sessionStorage),
        currentUrl: window.location.href
      });

      if (!partnerId) throw new Error('Partner ID is required');
      if (!userId) throw new Error('User ID is required');

      const params = new URLSearchParams({
        serviceName: options.serviceName,
        serviceType: options.serviceType,
        amount: options.estimatedAmount.toString(),
        upfront: options.requiredUpfrontPayment?.toString() || '0',
        transactionId: options.transactionId,
        apiKey: this.config.apiKey,
        secretKey: this.config.secretKey,
        partner_id: partnerId,
        user_id: userId
      });

      const redirectUrl = `${this.baseUrl}/confirm-request?${params}`;
      console.log('Redirecting to:', redirectUrl);
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('Button Click Error:', error);
      alert(error.message);
    }
  }

  private renderButton(container: Element, options: MountOptions): void {
    console.log('Rendering Button');
    const wrapper = document.createElement('div');
    wrapper.className = 'housetabz-wrapper';

    const button = document.createElement('button');
    button.className = 'housetabz-connect-button';
    button.innerHTML = 'Split with <span class="housetabz-highlight">HouseTabz</span>';
    button.onclick = () => this.handleButtonClick(options);

    wrapper.appendChild(button);
    container.innerHTML = '';
    container.appendChild(wrapper);
  }
}

// Apply button styles
const style = document.createElement('style');
style.innerHTML = `
  .housetabz-wrapper {
    width: 100%;
    margin: 10px 0;
  }

  .housetabz-connect-button {
    padding: 14px 24px;
    font-size: 16px;
    font-weight: 600;
    color: white;
    background-color: #34d399;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    width: 100%;
  }

  .housetabz-connect-button:hover {
    background-color: #5A0C93;
    transform: translateY(-1px);
  }

  .housetabz-connect-button:disabled {
    background-color: #9B6FB8;
    cursor: not-allowed;
  }

  .housetabz-highlight {
    font-family: 'Montserrat', sans-serif;
    font-weight: 700;
    color: white;
  }
`;
document.head.appendChild(style);

export default HouseTabz.getInstance();