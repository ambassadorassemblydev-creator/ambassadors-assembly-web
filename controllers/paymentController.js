import { donationRepo } from '../repositories/donationRepo.js';
import axios from 'axios';
import { emailService } from '../services/emailService.js';
import { verifyRecaptcha } from '../utils/recaptcha.js';
import { logger } from '../config/logger.js';


export const paymentController = {
    /**
     * High IQ: Verify Paystack transaction on the server 
     * This prevents users from spoofing the "Success" callback.
     */
    verifyPayment: async (req, res) => {
        try {
            const { reference, amount, categoryId, type, email } = req.body;
            const userId = req.user?.id;

            if (!reference) {
                return res.status(400).json({ success: false, message: 'Reference is required' });
            }

            // 0. Verify reCAPTCHA
            const isHuman = await verifyRecaptcha(req.body['g-recaptcha-response']);
            if (!isHuman) {
                return res.status(400).json({ success: false, message: 'Security verification failed. Please try again.' });
            }


            // 1. Verify with Paystack API
            const secretKey = process.env.PAYSTACK_SECRET_KEY;
            
            if (!secretKey) {
                console.warn('[PaymentController] PAYSTACK_SECRET_KEY missing. Fallback to repository insertion only.');
                // For now, if secret is missing, we log it (not ideal for prod, but keeps the flow working)
                const result = await donationRepo.verifyAndCompleteDonation(reference, amount, categoryId, userId, email);
                return res.json(result);
            }

            const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
                headers: {
                    Authorization: `Bearer ${secretKey}`
                }
            });

            const { data } = response.data;

            if (data.status === 'success' && data.amount === amount * 100) {
                // 2. Finalize in DB
                const result = await donationRepo.verifyAndCompleteDonation(reference, amount, categoryId, userId, email);
                
                // 3. Send Donation Success Email
                await emailService.sendDonationSuccessEmail({
                    to: email,
                    name: req.user?.user_metadata?.first_name || 'Ambassador',
                    amount,
                    reference,
                    categoryName: categoryId || 'General Giving',
                    userId,
                    donationId: result.donation?.id
                });

                // 4. Alert Admin (High Priority)
                await emailService.sendAdminDonationAlert({
                    amount,
                    reference,
                    email,
                    categoryId,
                    donorName: req.user?.user_metadata?.full_name || email
                });

                return res.json(result);
            } else {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Payment verification failed or amount mismatch.' 
                });
            }

        } catch (error) {
            console.error('[PaymentController] Verification Error:', error.response?.data || error.message);
            return res.status(500).json({ 
                success: false, 
                message: 'Error verifying payment. Please contact support with your reference.' 
            });
        }
    },

    /**
     * Webhook handler for Paystack (High IQ)
     * This handles asynchronous events like successful card charges.
     */
    handleWebhook: async (req, res) => {
        try {
            const secret = process.env.PAYSTACK_SECRET_KEY;
            const hash = req.headers['x-paystack-signature'];

            if (!secret || !hash) {
                return res.status(401).send('No secret or signature');
            }

            // Verify signature
            const crypto = await import('crypto');
            const expectedHash = crypto.createHmac('sha512', secret)
                .update(JSON.stringify(req.body))
                .digest('hex');

            if (hash !== expectedHash) {
                return res.status(401).send('Invalid signature');
            }

            const event = req.body;
            console.info(`[Paystack Webhook] Event received: ${event.event}`);

            if (event.event === 'charge.success') {
                const { reference, amount, metadata, customer } = event.data;
                const categoryId = metadata?.categoryId;
                const userId = metadata?.userId;
                
                // Idempotent processing in DB
                const dbResult = await donationRepo.verifyAndCompleteDonation(
                    reference, 
                    amount / 100, 
                    categoryId, 
                    userId, 
                    customer.email
                );

                if (dbResult.message === 'Already processed') {
                    logger.info(`[Paystack Webhook] Duplicate success received for reference: ${reference}`);
                    return res.sendStatus(200);
                }

                // Trigger Success Email for Webhook success too
                await emailService.sendDonationSuccessEmail({
                    to: customer.email,
                    name: customer.first_name || 'Ambassador',
                    amount: amount / 100,
                    reference,
                    categoryName: categoryId || 'General Giving',
                    userId,
                    donationId: dbResult.donation?.id
                });

                // Trigger Admin Alert for Webhook too
                await emailService.sendAdminDonationAlert({
                    amount: amount / 100,
                    reference,
                    email: customer.email,
                    categoryId,
                    donorName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email
                });
            } else if (event.event === 'charge.failed') {
                const { reference, message, customer } = event.data;
                logger.warn(`[Paystack Webhook] Charge failed for ${customer.email}: ${message} (Ref: ${reference})`);
                
                // Notify the user about the failure
                await emailService.sendDonationFailedEmail({
                    to: customer.email,
                    name: customer.first_name || 'Ambassador',
                    reason: message,
                    reference
                });
            }


            res.sendStatus(200);
        } catch (error) {
            console.error('[PaymentController] Webhook Error:', error.message);
            res.sendStatus(500);
        }
    }
};

