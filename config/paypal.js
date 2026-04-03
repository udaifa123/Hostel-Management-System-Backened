import checkoutNodeJssdk from '@paypal/checkout-server-sdk';

// PayPal Environment Configuration
function environment() {
  let clientId = process.env.PAYPAL_CLIENT_ID;
  let clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  // Use sandbox for testing, live for production
  if (process.env.NODE_ENV === 'production') {
    return new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret);
  }
  return new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
}

function client() {
  return new checkoutNodeJssdk.core.PayPalHttpClient(environment());
}

export default { client, environment };