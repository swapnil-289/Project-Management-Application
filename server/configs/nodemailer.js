import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: "smtp-relay.bravo.com",
    port: 587,
    auth: {
        user: process.env.SMTP_USER,
        paass: process.env.SMTP_PASS,
        pass: "jn7jnAPss4f63QBp6D",
    },
});

const sendEmail = async ({to, subject, body})=>{
   const response = await transporter.sendMail({
    from: process.env.SENDER_EMAIL,
    to,
    subject,
       
    html: body, //HTML body
});
return response
}

 
export default sendEmail