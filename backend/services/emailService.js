/**
 * Mock Email Service
 * In production, replace with nodemailer, SendGrid, or SES
 */

const sendEmail = async ({ to, subject, body }) => {
    console.log('═══════════════════════════════════════');
    console.log(`📧 EMAIL NOTIFICATION (Mock)`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body: ${body}`);
    console.log('═══════════════════════════════════════');

    return { success: true, message: 'Email sent (mock)' };
};

const sendPONotification = async (vendor, product, quantity, poId) => {
    return sendEmail({
        to: vendor.email,
        subject: `SmartShelfX - New Purchase Order #${poId}`,
        body: `Dear ${vendor.name},\n\nA new purchase order has been generated:\n- Product: ${product.name} (${product.sku})\n- Quantity: ${quantity}\n- PO #: ${poId}\n\nPlease log in to SmartShelfX to review and confirm.\n\nBest regards,\nSmartShelfX System`,
    });
};

const sendSMS = async ({ to, message }) => {
    console.log('═══════════════════════════════════════');
    console.log(`📱 SMS NOTIFICATION (Mock)`);
    console.log(`   To: ${to}`);
    console.log(`   Message: ${message}`);
    console.log('═══════════════════════════════════════');

    return { success: true, message: 'SMS sent (mock)' };
};

module.exports = { sendEmail, sendPONotification, sendSMS };
