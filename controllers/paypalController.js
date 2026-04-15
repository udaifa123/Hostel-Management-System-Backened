import axios from 'axios';
import Fee from '../models/Fee.js';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_URL = 'https://api-m.sandbox.paypal.com';

// Get PayPal access token
const getAccessToken = async () => {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    const response = await axios({
      method: 'post',
      url: `${PAYPAL_API_URL}/v1/oauth2/token`,
      data: 'grant_type=client_credentials',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    console.log('✅ PayPal access token obtained');
    return response.data.access_token;
  } catch (error) {
    console.error('❌ PayPal Token Error:', error.response?.data || error.message);
    throw new Error('Failed to get PayPal access token');
  }
};

// Create PayPal Order
export const createOrder = async (req, res) => {
  try {
    const { amount, feeId, month, year, studentName } = req.body;
    
    console.log('📝 Creating PayPal order:', { amount, feeId, studentName });
    
    if (!amount || !feeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount and feeId are required' 
      });
    }
    
    const accessToken = await getAccessToken();
    
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: feeId,
        description: `Hostel Fee Payment - ${studentName || 'Student'}`,
        custom_id: feeId,
        amount: {
          currency_code: 'INR',
          value: amount.toString(),
          breakdown: {
            item_total: {
              currency_code: 'INR',
              value: amount.toString()
            }
          }
        },
        items: [{
          name: `Hostel Fee - ${month || 'Monthly'} ${year || new Date().getFullYear()}`,
          unit_amount: {
            currency_code: 'INR',
            value: amount.toString()
          },
          quantity: '1'
        }]
      }],
      application_context: {
        brand_name: 'Hostel Management System',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/fees?payment=success`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/fees?payment=cancelled`
      }
    };
    
    const response = await axios({
      method: 'post',
      url: `${PAYPAL_API_URL}/v2/checkout/orders`,
      data: orderData,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ PayPal order created:', response.data.id);
    
    res.json({
      success: true,
      orderId: response.data.id
    });
    
  } catch (error) {
    console.error('❌ PayPal create order error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      message: error.response?.data?.message || 'Failed to create PayPal order'
    });
  }
};

// Capture PayPal Payment
export const captureOrder = async (req, res) => {
  try {
    const { orderId, feeId, amount, studentId, studentName } = req.body;
    
    console.log('💰 Capturing PayPal order:', { orderId, feeId });
    
    if (!orderId || !feeId) {
      return res.status(400).json({
        success: false,
        message: 'OrderId and feeId are required'
      });
    }
    
    const accessToken = await getAccessToken();
    
    const response = await axios({
      method: 'post',
      url: `${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`,
      data: {},
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.status === 'COMPLETED') {
      const fee = await Fee.findById(feeId);
      
      if (!fee) {
        return res.status(404).json({
          success: false,
          message: 'Fee record not found'
        });
      }
      
      const paidAmount = parseFloat(response.data.purchase_units[0].payments.captures[0].amount.value);
      const transactionId = response.data.id;
      const receiptId = `RCPT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      console.log(`✅ Payment received: ₹${paidAmount}`);
      
      // Update fee
      fee.paidAmount = (fee.paidAmount || 0) + paidAmount;
      fee.dueAmount = (fee.totalAmount || fee.amount) - fee.paidAmount;
      fee.status = fee.dueAmount <= 0 ? 'paid' : 'partial';
      fee.paymentMethod = 'paypal';
      fee.transactionId = transactionId;
      fee.paymentDate = new Date();
      
      if (!fee.payments) fee.payments = [];
      fee.payments.push({
        amount: paidAmount,
        transactionId: transactionId,
        paymentMethod: 'paypal',
        receiptId: receiptId,
        paymentDate: new Date(),
        status: 'completed'
      });
      
      await fee.save();
      
      res.json({
        success: true,
        message: 'Payment captured successfully',
        receiptId: receiptId,
        transactionId: transactionId,
        paidAmount: paidAmount
      });
      
    } else {
      res.json({
        success: false,
        message: 'Payment not completed'
      });
    }
    
  } catch (error) {
    console.error('❌ PayPal capture error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to capture payment'
    });
  }
};