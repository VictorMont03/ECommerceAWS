import { Context, SNSMessage, SQSEvent } from "aws-lambda";
import { AWSError, SES } from "aws-sdk";
import { PromiseResult } from "aws-sdk/lib/request";
import * as AWSXray from "aws-xray-sdk";
import { Envelope, OrderEvent } from "/opt/nodejs/orderEventsLayer";

AWSXray.captureAWS(require("aws-sdk"));

const sesClient = new SES();

export async function handler(
  event: SQSEvent,
  context: Context
): Promise<void> {
  const promise: Promise<PromiseResult<SES.SendEmailResponse, AWSError>>[] = [];
  event.Records.forEach((record) => {
    const body = JSON.parse(record.body) as SNSMessage;
    promise.push(sendOrderEmail(body));
  });

  await Promise.all(promise);

  return;
}

function sendOrderEmail(body: SNSMessage) {
  const envelope = JSON.parse(body.Message) as Envelope;
  const event = JSON.parse(envelope.data) as OrderEvent;

  return sesClient
    .sendEmail({
      Destination: {
        ToAddresses: [event.email],
      },
      Message: {
        Body: {
          Text: {
            Charset: "UTF-8",
            Data: `Recebemos seu pedido o seu vouncher é ${event.orderId}
          `,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: `PEDIDO RECEBIDO - CINEMA SGC`,
        },
      },
      Source: "vm.ribeiro.company@gmail.com",
      ReplyToAddresses: ["vm.ribeiro.company@gmail.com"],
    })
    .promise();
}
