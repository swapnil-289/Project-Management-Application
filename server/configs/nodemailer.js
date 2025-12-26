import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com", // Corrected hostname if using Brevo
    port: 587,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // Corrected key name and removed hardcoded fallback
    },
});

const sendEmail = async ({ to, subject, body }) => {
    try {
        const response = await transporter.sendMail({
            from: process.env.SENDER_EMAIL,
            to,
            subject,
            html: body, //HTML body
        });
        return response
    } catch (error) {
        console.error("Email send failed:", error);
    }
}

export default sendEmail