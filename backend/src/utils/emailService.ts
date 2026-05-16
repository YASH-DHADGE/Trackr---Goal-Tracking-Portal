export const sendNotification = (to: string, subject: string, body: string) => {
  // In a real application, this would use nodemailer, SendGrid, AWS SES, etc.
  // For the hackathon/demo, we simulate sending an email.
  
  console.log(`\n================= EMAIL NOTIFICATION =================`);
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`------------------------------------------------------`);
  console.log(body);
  console.log(`======================================================\n`);
};
