import axios from 'axios';
import Fee from '../models/Fee.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_URL = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';

const getAccessToken = async () => {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    const response = await axios.post(
      `${PAYPAL_API_URL}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting PayPal token:', error);
    throw error;
  }
};

export const createOrder = async (req, res) => {
  try {
    const { amount, feeId, month, year, studentName } = req.body;
    const usdAmount = (amount / 83).toFixed(2);
    
    const accessToken = await getAccessToken();
    
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: feeId,
        description: `Hostel Fee - ${month} ${year}`,
        custom_id: feeId,
        amount: {
          currency_code: 'USD',
          value: usdAmount,
          breakdown: {
            item_total: {
              currency_code: 'USD',
              value: usdAmount
            }
          }
        },
        items: [{
          name: `Hostel Fee - ${month} ${year}`,
          unit_amount: { currency_code: 'USD', value: usdAmount },
          quantity: '1'
        }]
      }],
      application_context: {
        brand_name: 'Hostel Management',
        user_action: 'PAY_NOW',
        return_url: `${process.env.FRONTEND_URL}/payment-success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`
      }
    };
    
    const response = await axios.post(
      `${PAYPAL_API_URL}/v2/checkout/orders`,
      orderData,
      { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    
    res.json({ success: true, orderId: response.data.id });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
};

export const captureOrder = async (req, res) => {
  try {
    const { orderId, feeId, amount, studentId, studentName, studentEmail, month, year } = req.body;
    
    const accessToken = await getAccessToken();
    
    const response = await axios.post(
      `${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`,
      {},
      { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    
    if (response.data.status === 'COMPLETED') {
      const fee = await Fee.findById(feeId);
      if (!fee) return res.status(404).json({ success: false, message: 'Fee not found' });
      
      const receiptId = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const paidAmount = amount || fee.dueAmount;
      
      fee.payments.push({
        amount: paidAmount,
        transactionId: response.data.id,
        paymentMethod: 'paypal',
        receiptId,
        paymentDate: new Date(),
        status: 'success',
        paidBy: req.user.role
      });
      
      fee.paidAmount += paidAmount;
      fee.dueAmount = fee.totalAmount - fee.paidAmount;
      if (fee.paidAmount >= fee.totalAmount) fee.status = 'paid';
      else if (fee.paidAmount > 0) fee.status = 'partial';
      await fee.save();
      
      await Payment.create({
        feeId, studentId, studentName, studentEmail,
        month, year, amount: paidAmount,
        transactionId: response.data.id, receiptId,
        paymentMethod: 'paypal', paidBy: req.user.role,
        paymentDetails: response.data
      });
      
      await Notification.create({
        recipient: studentId,
        type: 'fee',
        title: 'Payment Successful',
        message: `Payment of ₹${paidAmount} received for ${month} ${year}`,
        data: { feeId, transactionId: response.data.id }
      });
      
      res.json({ success: true, receiptId, transactionId: response.data.id });
    } else {
      throw new Error('Payment not completed');
    }
  } catch (error) {
    console.error('Error capturing payment:', error);
    res.status(500).json({ success: false, message: 'Payment capture failed' });
  }
};