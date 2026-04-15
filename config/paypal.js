// config/paypal.js
import axios from 'axios';

const PAYPAL_API = process.env.PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

let accessToken = null;
let tokenExpiry = null;

// Get PayPal Access Token
export const getPayPalAccessToken = async () => {
  // Check if token is still valid
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }
  
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');
  
  try {
    const response = await axios.post(
      `${PAYPAL_API}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`
        }
      }
    );
    
    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    return accessToken;
  } catch (error) {
    console.error('PayPal token error:', error.response?.data || error.message);
    throw error;
  }
};

// Create PayPal Order
export const createPayPalOrder = async (amount, description, customData) => {
  const token = await getPayPalAccessToken();
  
  try {
    const response = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: amount.toString(),
            breakdown: {
              item_total: {
                currency_code: 'USD',
                value: amount.toString()
              }
            }
          },
          description: description,
          custom_id: JSON.stringify(customData)
        }],
        application_context: {
          brand_name: 'Hostel Management System',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
          return_url: `${process.env.FRONTEND_URL}/payment-success`,
          cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('PayPal create order error:', error.response?.data || error.message);
    throw error;
  }
};

// Capture PayPal Order
export const capturePayPalOrder = async (orderId) => {
  const token = await getPayPalAccessToken();
  
  try {
    const response = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('PayPal capture order error:', error.response?.data || error.message);
    throw error;
  }
};