// src/industries/energy/index.ts
export interface EnergyParams {
    userId: string;
    houseId: string;
    // Basic service info
    serviceType: 'electric' | 'gas' | 'both';
    // Security deposit handling
    requiresDeposit?: boolean;
    depositAmount?: number;
    depositPaymentMethod?: 'upfront' | 'installments';
  }
  
  export async function handleEnergyRequest(params: EnergyParams, apiKey: string) {
    // Create initial staged request
    const stagedRequest = await fetch('https://api.housetabz.com/v1/energy/staged-requests', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
  
    const { stagedRequestId } = await stagedRequest.json();
  
    // If deposit is required, create a deposit requirement
    if (params.requiresDeposit && params.depositAmount) {
      await fetch(`https://api.housetabz.com/v1/energy/staged-requests/${stagedRequestId}/deposit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: params.depositAmount,
          paymentMethod: params.depositPaymentMethod || 'upfront'
        })
      });
    }
  
    return { stagedRequestId };
  }