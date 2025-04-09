// Type definitions
export interface HouseTabzConfig {
  apiKey: string;
  secretKey: string;
  environment?: 'development' | 'staging' | 'production';
  userId?: string;      // Optional userId if you want to provide it directly
  partnerId?: string;   // Optional partnerId if you want to provide it directly
}

export interface MountOptions {
  serviceName: string;
  serviceType: 'energy' | 'cleaning' | 'internet' | 'streaming' | 'rent' | 'other';
  estimatedAmount: number;
  requiredUpfrontPayment?: number;
  transactionId: string;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  
  // Styling options
  buttonStyle?: {
    width?: string;                   // Custom width (e.g. '250px')
    borderRadius?: string;            // Border radius (e.g. '4px', '8px')
    fontSize?: string;                // Font size (e.g. '14px')
    buttonText?: string;              // Custom button text
  }
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
  private isInHouseTabzApp: boolean = false;

  private constructor() {
    // Check if we're running inside the HouseTabz WebView
    this.detectHouseTabzApp();
  }

  // Simple detection method that checks for ReactNativeWebView
  private detectHouseTabzApp(): void {
    try {
      // Use a more direct check for the WebView environment
      this.isInHouseTabzApp = !!(window as any).ReactNativeWebView;
      
      console.log('HouseTabz app detection:', {
        isInHouseTabzApp: this.isInHouseTabzApp,
        hasReactNativeWebView: !!(window as any).ReactNativeWebView
      });
    } catch (error) {
      console.warn('Error during HouseTabz app detection:', error);
      this.isInHouseTabzApp = false;
    }
  }

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
      // Store config
      this.config = config;
      this.baseUrl = this.determineBaseUrl(config.environment);
  
      console.log('Initializing HouseTabz:', {
        baseUrl: this.baseUrl,
        environment: config.environment,
        isInHouseTabzApp: this.isInHouseTabzApp
      });
  
      // Only validate API keys
      if (!config.apiKey || !config.secretKey) {
        throw new HouseTabzError('API key and Secret key are required', 'INVALID_CONFIG');
      }
  
      // Extract URL params but don't require them
      this.params = this.extractURLParams();
      
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

    // Create the button with proper fixed styling
    const button = document.createElement('button');
    button.className = 'housetabz-connect-button';
    
    // Apply custom styles if provided
    if (options.buttonStyle) {
      // Apply custom width
      if (options.buttonStyle.width) {
        button.style.width = options.buttonStyle.width;
      }
      
      // Apply custom border radius
      if (options.buttonStyle.borderRadius) {
        button.style.borderRadius = options.buttonStyle.borderRadius;
      }
    }
    
    // Use the real HouseTabz logo with fallback
    const buttonText = options.buttonStyle?.buttonText || 'Pay with';
    
    button.innerHTML = `
      <span class="housetabz-button-content">
        <span class="housetabz-logo">
          <img src="https://housetabz-assets.s3.us-east-1.amazonaws.com/assets/housetabzlogo-update.png" 
               alt="HouseTabz" 
               onerror="this.onerror=null; this.innerHTML='HT';" />
        </span>
        <span class="housetabz-text">${buttonText} <span class="housetabz-brand">HouseTabz</span></span>
      </span>
    `;
    
    // Apply custom font size if provided
    if (options.buttonStyle?.fontSize) {
      const textElement = button.querySelector('.housetabz-text');
      if (textElement) {
        (textElement as HTMLElement).style.fontSize = options.buttonStyle.fontSize;
      }
    }

    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'housetabz-spinner';
    loadingSpinner.style.display = 'none';
    
    const messageContainer = document.createElement('div');
    messageContainer.className = 'housetabz-message';
    messageContainer.style.display = 'none';

    button.onclick = () => {
      try {
        // Show loading state
        button.disabled = true;
        loadingSpinner.style.display = 'inline-block';
        messageContainer.style.display = 'block';
        
        // Recheck if we're in the app - this happens after the page is fully loaded
        const isInApp = !!(window as any).ReactNativeWebView;
        
        // Different message and flow based on environment
        if (isInApp) {
          messageContainer.innerHTML = '<p>Opening HouseTabz payment...</p>';
          this.handleInAppPayment(options, button, loadingSpinner, messageContainer);
        } else {
          messageContainer.innerHTML = '<p>Redirecting to HouseTabz...</p>';
          this.redirectToConfirmPage(options);
        }
        
      } catch (error) {
        // Handle any errors during processing
        this.handleError(button, messageContainer, error as Error, options);
        loadingSpinner.style.display = 'none';
      }
    };

    wrapper.appendChild(button);
    button.appendChild(loadingSpinner);
    wrapper.appendChild(messageContainer);
    container.innerHTML = '';
    container.appendChild(wrapper);
  }

  private handleInAppPayment(
    options: MountOptions, 
    button: HTMLButtonElement,
    loadingSpinner: HTMLDivElement,
    messageContainer: HTMLDivElement
  ): void {
    if (!this.config) {
      throw new HouseTabzError('HouseTabz not initialized properly', 'NOT_INITIALIZED');
    }

    try {
      // Create payment request data with just the transaction details
      // No authentication data needed - that will be handled by the app modal
      const paymentData = {
        serviceName: options.serviceName,
        serviceType: options.serviceType,
        amount: options.estimatedAmount,
        upfront: options.requiredUpfrontPayment || 0,
        transactionId: options.transactionId,
        apiKey: this.config.apiKey,
        secretKey: this.config.secretKey
      };

      console.log('Sending payment request to app:', paymentData);

      // Send message to React Native WebView
      console.log('About to send message to ReactNativeWebView:', paymentData);
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({
        type: 'housetabz_payment_request',
        data: paymentData
      }));
      console.log('Message sent to ReactNativeWebView');

      // Listen for response from the app
      window.addEventListener('message', (event) => {
        try {
          if (typeof event.data === 'string') {
            const response = JSON.parse(event.data);
            
            if (response.type === 'housetabz_payment_response') {
              if (response.status === 'success') {
                // Handle success
                loadingSpinner.style.display = 'none';
                button.disabled = false;
                messageContainer.innerHTML = `
                  <div class="success-box">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="#10b981" stroke-width="2"/>
                      <path d="M7 10L9 12L13 8" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <p>Payment request successful!</p>
                  </div>
                `;
                if (options.onSuccess) options.onSuccess(response.data);
              } else if (response.status === 'error') {
                // Handle error
                this.handleError(button, messageContainer, new Error(response.message), options);
              } else if (response.status === 'cancel') {
                // Handle cancellation
                loadingSpinner.style.display = 'none';
                button.disabled = false;
                messageContainer.innerHTML = '<p>Payment request cancelled</p>';
                if (options.onCancel) options.onCancel();
              }
            }
          }
        } catch (error) {
          console.error('Error processing app response:', error);
        }
      });
    } catch (error) {
      console.error('Error in in-app payment flow:', error);
      this.handleError(button, messageContainer, error as Error, options);
    }
  }

  private redirectToConfirmPage(options: MountOptions): void {
    if (!this.config) {
      throw new HouseTabzError('HouseTabz not initialized properly', 'NOT_INITIALIZED');
    }
  
    // Build URL parameters for the confirm page
    const params = new URLSearchParams({
      serviceName: options.serviceName,
      serviceType: options.serviceType,
      amount: options.estimatedAmount.toString(),
      upfront: options.requiredUpfrontPayment?.toString() || '0',
      transactionId: options.transactionId,
      apiKey: this.config.apiKey,
      secretKey: this.config.secretKey
    });
  
    // Use userId from different sources in order of priority:
    // 1. Direct config value (if provided)
    // 2. URL parameter (if present)
    const userId = this.config.userId || this.params?.userId || '';
    if (userId) {
      params.append('user_id', userId);
    }
    
    // Use partnerId from different sources in order of priority:
    // 1. Direct config value (if provided)
    // 2. URL parameter (if present)
    const partnerId = this.config.partnerId || this.params?.partnerId || '';
    if (partnerId) {
      params.append('partner_id', partnerId);
    }
  
    // Construct the redirect URL
    const redirectUrl = `${this.baseUrl}/confirm-request?${params.toString()}`;
    console.log('Redirecting to:', redirectUrl);
    
    // Redirect to the confirmation page
    window.location.href = redirectUrl;
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
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="#ef4444" stroke-width="2"/>
          <path d="M13 7L7 13" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
          <path d="M7 7L13 13" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p>${error.message || 'Something went wrong. Please try again.'}</p>
      </div>
    `;
    options.onError?.(error);
  }
}

// Import Montserrat font
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap';
document.head.appendChild(fontLink);

// Apply the new styles
const style = document.createElement('style');
style.innerHTML = `
  .housetabz-wrapper {
    width: 100%;
    margin: 8px 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }

  .housetabz-connect-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 250px; /* Fixed width matching PayPal */
    height: 40px; /* Fixed height */
    padding: 0 16px;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  /* Mobile adjustment for better touch targets */
  @media (max-width: 768px) {
    .housetabz-connect-button {
      height: 44px;
    }
  }

  .housetabz-connect-button:hover {
    background-color: #f9f9f9;
    border-color: #d0d0d0;
  }

  .housetabz-connect-button:active {
    background-color: #f5f5f5;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .housetabz-connect-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .housetabz-button-content {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .housetabz-logo {
    margin-right: 8px;
    display: flex;
    align-items: center;
    height: 22px; /* Slightly larger logo */
    width: 22px;
    flex-shrink: 0;
  }

  .housetabz-logo img {
    height: 100%;
    width: auto;
  }

  .housetabz-text {
    font-size: 14px;
    font-weight: 500;
    color: #424242;
    white-space: nowrap;
  }

  .housetabz-brand {
    font-family: 'Montserrat', sans-serif;
    font-weight: 900; /* Montserrat Black */
    color: #10b981;
    letter-spacing: -0.01em;
  }

  .housetabz-spinner {
    position: absolute;
    right: 16px;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(0, 0, 0, 0.1);
    border-top-color: #10b981;
    border-radius: 50%;
    animation: housetabz-spin 0.8s linear infinite;
  }

  @keyframes housetabz-spin {
    to { transform: rotate(360deg); }
  }

  .housetabz-message {
    margin-top: 8px;
    font-size: 13px;
    text-align: center;
  }

  .success-box, .error-box {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 12px;
    border-radius: 4px;
    margin-top: 8px;
  }

  .success-box {
    background-color: rgba(16, 185, 129, 0.1);
    color: #047857;
  }

  .error-box {
    background-color: rgba(239, 68, 68, 0.1);
    color: #b91c1c;
  }

  .success-box svg, .error-box svg {
    margin-right: 8px;
  }

  .success-box p, .error-box p {
    margin: 0;
  }
`;
document.head.appendChild(style);

// Export singleton instance
export default HouseTabz.getInstance();

// npx http-server -p 8080