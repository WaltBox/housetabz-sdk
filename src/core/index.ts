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

  private constructor() {}

  static getInstance(): HouseTabz {
    if (!HouseTabz.instance) {
      HouseTabz.instance = new HouseTabz();
    }
    return HouseTabz.instance;
  }

  private determineBaseUrl(environment: string = 'development'): string {
    const urls = {
      production: 'https://housetabz.com',
      staging: 'https://staging.housetabz.com',
      development: 'http://localhost:3000'
    };
    return urls[environment] || urls.development;
  }

  // Check if we should show the button
  private shouldDisplay(): boolean {
    const params = new URLSearchParams(window.location.search);
    return params.get('ref') === 'housetabz';
  }

  async init(config: HouseTabzConfig): Promise<void> {
    this.config = config;
    this.baseUrl = this.determineBaseUrl(config.environment);
    console.log('Base URL:', this.baseUrl);

    if (!config.apiKey) {
      throw new Error('API key is required');
    }
  }

  async mount(selector: string, options: MountOptions): Promise<void> {
    // Only show button if user came from HouseTabz
    if (!this.shouldDisplay()) {
      return;
    }

    const container = document.querySelector(selector);
    if (!container) return;

    this.renderButton(container, options);
  }

  private handleButtonClick(options: MountOptions): void {
    const currentParams = new URLSearchParams(window.location.search);
    const partnerId = currentParams.get('partner_id');
    
    if (!partnerId) {
        console.error('Missing partner_id parameter');
        return;
    }

    // In your SDK's handleButtonClick function:
const params = new URLSearchParams({
  serviceName: options.serviceName,
  serviceType: options.serviceType,
  amount: options.estimatedAmount.toString(),
  upfront: options.requiredUpfrontPayment?.toString() || '0',
  transactionId: options.transactionId,
  apiKey: this.config!.apiKey,
  secretKey: this.config!.secretKey,  // <-- Add secretKey here
  partner_id: partnerId
});

    const redirectUrl = `http://localhost:3000/confirm-request?${params}`;
    window.location.href = redirectUrl;
}
  private renderButton(container: Element, options: MountOptions): void {
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
  .housetabz-connect-button {
    padding: 14px 24px;
    font-size: 16px;
    font-weight: 600;
    color: white;
    background-color: #6A0DAD;
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
//npx http-server -p 8080
