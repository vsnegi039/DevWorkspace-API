import { Resend } from 'resend';

export class ResendEmail {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  /**
   * Sends a simple email
   */
  public async sendSimpleMail({
    from,
    to,
    subject,
    text,
    html,
    replyTo,
    attachments = [],
  }: {
    from: string;
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    replyTo?: string;
    attachments?: {
      filename: string;
      content: string | Buffer;
      type?: string;
      disposition?: string;
      contentId?: string;
    }[];
  }) {
    console.log('Sending email via Resend to:', html);
    const msg = {
      from,
      to,
      subject,
      text,
      html,
      reply_to: replyTo,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: typeof a.content === 'string' ? a.content : a.content.toString('base64'),
        type: a.type,
        disposition: a.disposition,
        content_id: a.contentId,
      })),
    };

    return this.send(msg);
  }

  /**
   * Core send handler
   */
  public async send(mailOptions: any) {
    try {
      const response = await this.resend.emails.send(mailOptions);

      return {
        success: true,
        response,
      };
    } catch (error: any) {
      console.error('Resend Error:', error?.message || error);
      return {
        success: false,
        error,
      };
    }
  }
}
