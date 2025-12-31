import Stripe from 'stripe';
import crypto from 'crypto';
import axios from 'axios';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

class PaymentService {
  constructor() {
    this.stripe = null;
    this.providers = new Map();
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    this.initializeProviders();
  }

  initializeProviders() {
    // Initialize Stripe
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
      });
      this.providers.set('stripe', {
        name: 'Stripe',
        client: this.stripe,
        enabled: true,
        priority: 1,
      });
      logger.info('✅ Stripe payment provider initialized');
    }

    // Initialize PayPal
    if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
      this.providers.set('paypal', {
        name: 'PayPal',
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        enabled: true,
        priority: 2,
      });
      logger.info('✅ PayPal payment provider initialized');
    }

    // Initialize Razorpay
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.providers.set('razorpay', {
        name: 'Razorpay',
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
        enabled: true,
        priority: 3,
      });
      logger.info('✅ Razorpay payment provider initialized');
    }
  }

  // Customer Management
  async createCustomer(user, paymentMethod = 'stripe') {
    try {
      const provider = this.providers.get(paymentMethod);
      if (!provider || !provider.enabled) {
        throw new AppError(`Payment provider ${paymentMethod} not available`, 400);
      }

      switch (paymentMethod) {
        case 'stripe':
          return await this.createStripeCustomer(user);
        case 'paypal':
          return await this.createPayPalCustomer(user);
        default:
          throw new AppError(`Customer creation not supported for ${paymentMethod}`, 400);
      }
    } catch (error) {
      logger.error('Error creating customer:', error);
      throw error;
    }
  }

  async createStripeCustomer(user) {
    const customer = await this.stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user.id,
        createdAt: new Date().toISOString(),
      },
    });

    return {
      id: customer.id,
      provider: 'stripe',
      email: customer.email,
      created: customer.created,
      metadata: customer.metadata,
    };
  }

  async createPayPalCustomer(user) {
    const auth = await this.getPayPalAccessToken();
    
    const response = await axios.post(
      `${process.env.PAYPAL_API_URL}/v2/customer/partner-referrals`,
      {
        tracking_id: `user_${user.id}`,
        operations: [
          {
            operation: 'API_INTEGRATION',
            api_integration_preference: {
              rest_api_integration: {
                integration_method: 'PAYPAL',
                integration_type: 'THIRD_PARTY',
                third_party_details: {
                  features: ['PAYMENT', 'REFUND'],
                },
              },
            },
          },
        ],
        products: ['EXPRESS_CHECKOUT'],
        legal_consents: [
          {
            type: 'SHARE_DATA_CONSENT',
            granted: true,
          },
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${auth.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      id: response.data.referral_data.referral_id,
      provider: 'paypal',
      links: response.data.links,
    };
  }

  // Payment Methods
  async addPaymentMethod(customerId, paymentMethodData, provider = 'stripe') {
    try {
      switch (provider) {
        case 'stripe':
          return await this.addStripePaymentMethod(customerId, paymentMethodData);
        case 'paypal':
          return await this.addPayPalPaymentMethod(customerId, paymentMethodData);
        default:
          throw new AppError(`Payment method addition not supported for ${provider}`, 400);
      }
    } catch (error) {
      logger.error('Error adding payment method:', error);
      throw error;
    }
  }

  async addStripePaymentMethod(customerId, paymentMethodData) {
    // Create payment method
    const paymentMethod = await this.stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: paymentMethodData.cardNumber,
        exp_month: paymentMethodData.expMonth,
        exp_year: paymentMethodData.expYear,
        cvc: paymentMethodData.cvc,
      },
      billing_details: {
        name: paymentMethodData.name,
        email: paymentMethodData.email,
        address: paymentMethodData.address,
      },
    });

    // Attach to customer
    await this.stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customerId,
    });

    // Set as default if requested
    if (paymentMethodData.setAsDefault) {
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethod.id,
        },
      });
    }

    return {
      id: paymentMethod.id,
      type: paymentMethod.type,
      last4: paymentMethod.card.last4,
      brand: paymentMethod.card.brand,
      exp_month: paymentMethod.card.exp_month,
      exp_year: paymentMethod.card.exp_year,
      isDefault: paymentMethodData.setAsDefault || false,
    };
  }

  async addPayPalPaymentMethod(customerId, paymentMethodData) {
    const auth = await this.getPayPalAccessToken();
    
    const response = await axios.post(
      `${process.env.PAYPAL_API_URL}/v2/vault/payment-tokens`,
      {
        customer_id: customerId,
        payment_source: {
          card: {
            name: paymentMethodData.name,
            number: paymentMethodData.cardNumber,
            expiry: `${paymentMethodData.expYear}-${paymentMethodData.expMonth.toString().padStart(2, '0')}`,
            security_code: paymentMethodData.cvc,
            billing_address: paymentMethodData.address,
          },
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${auth.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      id: response.data.id,
      type: 'card',
      last4: response.data.payment_source.card.last_digits,
      brand: response.data.payment_source.card.brand,
      expiry: response.data.payment_source.card.expiry,
    };
  }

  // Subscriptions
  async createSubscription(user, plan, paymentMethod = 'stripe') {
    try {
      const provider = this.providers.get(paymentMethod);
      if (!provider || !provider.enabled) {
        throw new AppError(`Payment provider ${paymentMethod} not available`, 400);
      }

      switch (paymentMethod) {
        case 'stripe':
          return await this.createStripeSubscription(user, plan);
        case 'paypal':
          return await this.createPayPalSubscription(user, plan);
        default:
          throw new AppError(`Subscription creation not supported for ${paymentMethod}`, 400);
      }
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  async createStripeSubscription(user, plan) {
    const plans = {
      'premium': process.env.STRIPE_PREMIUM_PRICE_ID,
      'enterprise': process.env.STRIPE_ENTERPRISE_PRICE_ID,
    };

    const priceId = plans[plan];
    if (!priceId) {
      throw new AppError(`Plan ${plan} not found`, 400);
    }

    const subscription = await this.stripe.subscriptions.create({
      customer: user.stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: user.id,
        plan: plan,
        startDate: new Date().toISOString(),
      },
    });

    return {
      id: subscription.id,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      plan: plan,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      paymentIntent: subscription.latest_invoice.payment_intent.id,
    };
  }

  async createPayPalSubscription(user, plan) {
    const plans = {
      'premium': process.env.PAYPAL_PREMIUM_PLAN_ID,
      'enterprise': process.env.PAYPAL_ENTERPRISE_PLAN_ID,
    };

    const planId = plans[plan];
    if (!planId) {
      throw new AppError(`Plan ${plan} not found`, 400);
    }

    const auth = await this.getPayPalAccessToken();
    
    const response = await axios.post(
      `${process.env.PAYPAL_API_URL}/v1/billing/subscriptions`,
      {
        plan_id: planId,
        subscriber: {
          name: {
            given_name: user.name.split(' ')[0],
            surname: user.name.split(' ').slice(1).join(' '),
          },
          email_address: user.email,
        },
        application_context: {
          brand_name: 'OmniMind AI',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
          },
          return_url: `${process.env.FRONTEND_URL}/subscribe/success`,
          cancel_url: `${process.env.FRONTEND_URL}/subscribe/cancel`,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${auth.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      id: response.data.id,
      status: response.data.status,
      plan: plan,
      links: response.data.links,
    };
  }

  async cancelSubscription(subscriptionId, provider = 'stripe') {
    try {
      switch (provider) {
        case 'stripe':
          return await this.cancelStripeSubscription(subscriptionId);
        case 'paypal':
          return await this.cancelPayPalSubscription(subscriptionId);
        default:
          throw new AppError(`Subscription cancellation not supported for ${provider}`, 400);
      }
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  async cancelStripeSubscription(subscriptionId) {
    const subscription = await this.stripe.subscriptions.cancel(subscriptionId, {
      invoice_now: false,
      prorate: true,
    });

    return {
      id: subscription.id,
      status: subscription.status,
      canceled_at: subscription.canceled_at,
      cancellation_reason: 'user_requested',
      current_period_end: subscription.current_period_end,
    };
  }

  async cancelPayPalSubscription(subscriptionId) {
    const auth = await this.getPayPalAccessToken();
    
    await axios.post(
      `${process.env.PAYPAL_API_URL}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        reason: 'User requested cancellation',
      },
      {
        headers: {
          'Authorization': `Bearer ${auth.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      id: subscriptionId,
      status: 'CANCELLED',
      canceled_at: new Date().toISOString(),
    };
  }

  // Invoices
  async getInvoices(customerId, limit = 10, provider = 'stripe') {
    try {
      switch (provider) {
        case 'stripe':
          return await this.getStripeInvoices(customerId, limit);
        case 'paypal':
          return await this.getPayPalInvoices(customerId, limit);
        default:
          throw new AppError(`Invoice retrieval not supported for ${provider}`, 400);
      }
    } catch (error) {
      logger.error('Error getting invoices:', error);
      throw error;
    }
  }

  async getStripeInvoices(customerId, limit = 10) {
    const invoices = await this.stripe.invoices.list({
      customer: customerId,
      limit: limit,
      expand: ['data.charge', 'data.payment_intent'],
    });

    return invoices.data.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      status: invoice.status,
      created: invoice.created,
      due_date: invoice.due_date,
      paid: invoice.paid,
      receipt_url: invoice.hosted_invoice_url,
      download_url: invoice.invoice_pdf,
      lines: invoice.lines.data.map(line => ({
        description: line.description,
        amount: line.amount,
        period: line.period,
      })),
    }));
  }

  // One-time Payments
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    if (!this.stripe) {
      throw new AppError('Stripe not initialized', 500);
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: metadata,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    };
  }

  async confirmPayment(paymentIntentId, paymentMethodId = null) {
    if (!this.stripe) {
      throw new AppError('Stripe not initialized', 500);
    }

    const paymentIntent = await this.stripe.paymentIntents.confirm(
      paymentIntentId,
      paymentMethodId ? { payment_method: paymentMethodId } : {}
    );

    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      customer: paymentIntent.customer,
      payment_method: paymentIntent.payment_method,
      charges: paymentIntent.charges.data.map(charge => ({
        id: charge.id,
        amount: charge.amount / 100,
        status: charge.status,
        receipt_url: charge.receipt_url,
      })),
    };
  }

  // Refunds
  async createRefund(paymentId, amount, reason = 'requested_by_customer', provider = 'stripe') {
    try {
      switch (provider) {
        case 'stripe':
          return await this.createStripeRefund(paymentId, amount, reason);
        case 'paypal':
          return await this.createPayPalRefund(paymentId, amount, reason);
        default:
          throw new AppError(`Refund creation not supported for ${provider}`, 400);
      }
    } catch (error) {
      logger.error('Error creating refund:', error);
      throw error;
    }
  }

  async createStripeRefund(paymentId, amount, reason) {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentId,
      amount: Math.round(amount * 100),
      reason: reason,
    });

    return {
      id: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
      reason: refund.reason,
      created: refund.created,
    };
  }

  // Webhook Handling
  async handleStripeWebhook(payload, signature) {
    if (!this.webhookSecret) {
      throw new AppError('Webhook secret not configured', 500);
    }

    let event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );
    } catch (error) {
      logger.error('Webhook signature verification failed:', error);
      throw new AppError('Invalid signature', 400);
    }

    logger.info(`🔔 Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancel(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePayment(event.data.object);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoiceFailure(event.data.object);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    return { received: true, event: event.type };
  }

  async handlePaymentSuccess(paymentIntent) {
    // Update user's subscription status
    logger.info(`Payment successful: ${paymentIntent.id}`);
    
    // Here you would update your database
    // await User.updateOne(
    //   { stripeCustomerId: paymentIntent.customer },
    //   { 
    //     'subscription.status': 'active',
    //     'subscription.lastPayment': new Date(),
    //   }
    // );
  }

  async handlePaymentFailure(paymentIntent) {
    logger.warn(`Payment failed: ${paymentIntent.id}`);
    
    // Send notification to user
    // await Notification.create({
    //   userId: user._id,
    //   type: 'billing',
    //   title: 'Payment Failed',
    //   message: `Your payment of $${paymentIntent.amount / 100} failed. Please update your payment method.`,
    //   priority: 'high',
    // });
  }

  async handleSubscriptionUpdate(subscription) {
    logger.info(`Subscription updated: ${subscription.id}`);
    
    // Update subscription in database
    // await User.updateOne(
    //   { stripeCustomerId: subscription.customer },
    //   {
    //     'subscription.plan': subscription.metadata.plan,
    //     'subscription.status': subscription.status,
    //     'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
    //   }
    // );
  }

  async handleSubscriptionCancel(subscription) {
    logger.info(`Subscription canceled: ${subscription.id}`);
    
    // Update user to free plan
    // await User.updateOne(
    //   { stripeCustomerId: subscription.customer },
    //   {
    //     'subscription.plan': 'free',
    //     'subscription.status': 'canceled',
    //   }
    // );
  }

  // Utility Methods
  async getPayPalAccessToken() {
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const response = await axios.post(
      `${process.env.PAYPAL_API_URL}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data;
  }

  calculateProratedAmount(subscription, newPlanPrice, changeDate = new Date()) {
    // Calculate prorated amount when changing plans
    const daysInPeriod = 30; // Assuming monthly billing
    const daysUsed = Math.floor(
      (changeDate.getTime() - new Date(subscription.current_period_start * 1000).getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    
    const oldPlanPrice = subscription.plan.amount / 100;
    const dailyRate = oldPlanPrice / daysInPeriod;
    const credit = daysUsed * dailyRate;
    
    const proratedAmount = Math.max(0, newPlanPrice - credit);
    return Math.round(proratedAmount * 100); // Return in cents
  }

  generateReceipt(payment) {
    const receiptId = `RCPT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    
    return {
      id: receiptId,
      date: new Date().toISOString(),
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      customer: {
        email: payment.customer_email,
        name: payment.customer_name,
      },
      items: payment.items || [],
      tax: payment.tax || 0,
      total: payment.amount + (payment.tax || 0),
      paymentMethod: payment.payment_method_details?.type || 'card',
      notes: 'Thank you for choosing OmniMind AI Platform.',
    };
  }

  async getProviderStatus() {
    const status = {};
    
    for (const [name, provider] of this.providers) {
      status[name] = {
        enabled: provider.enabled,
        name: provider.name,
        priority: provider.priority,
      };
    }
    
    return status;
  }

  validateCardNumber(cardNumber) {
    // Luhn algorithm validation
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  maskCardNumber(cardNumber) {
    if (cardNumber.length < 4) return cardNumber;
    return '•••• •••• •••• ' + cardNumber.slice(-4);
  }

  async getPaymentAnalytics(startDate, endDate) {
    if (!this.stripe) {
      throw new AppError('Stripe not initialized', 500);
    }

    const payments = await this.stripe.paymentIntents.list({
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
      limit: 100,
    });

    const subscriptions = await this.stripe.subscriptions.list({
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
      limit: 100,
    });

    const analytics = {
      totalRevenue: payments.data.reduce((sum, payment) => sum + (payment.amount_received || 0), 0) / 100,
      successfulPayments: payments.data.filter(p => p.status === 'succeeded').length,
      failedPayments: payments.data.filter(p => p.status === 'requires_payment_method').length,
      newSubscriptions: subscriptions.data.filter(s => s.status === 'active').length,
      canceledSubscriptions: subscriptions.data.filter(s => s.status === 'canceled').length,
      averagePaymentAmount: 0,
      revenueByCurrency: {},
      revenueByPlan: {},
    };

    // Calculate averages
    const successfulPayments = payments.data.filter(p => p.status === 'succeeded');
    if (successfulPayments.length > 0) {
      analytics.averagePaymentAmount = successfulPayments.reduce((sum, p) => sum + (p.amount_received || 0), 0) / successfulPayments.length / 100;
    }

    // Group by currency
    successfulPayments.forEach(payment => {
      const currency = payment.currency.toUpperCase();
      const amount = payment.amount_received / 100;
      
      analytics.revenueByCurrency[currency] = (analytics.revenueByCurrency[currency] || 0) + amount;
    });

    // Group by plan (from subscription metadata)
    subscriptions.data.forEach(sub => {
      const plan = sub.metadata.plan || 'unknown';
      analytics.revenueByPlan[plan] = (analytics.revenueByPlan[plan] || 0) + 1;
    });

    return analytics;
  }
}

export default new PaymentService();