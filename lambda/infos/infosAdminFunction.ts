import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { Infos, InfosRepository } from "/opt/nodejs/infosLayer";
import { DynamoDB } from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk";

//Monitora as funcoes que utilizam o sdk
AWSXRay.captureAWS(require("aws-sdk"));

const infosDdb = process.env.INFOS_DDB!;
const ddbClient = new DynamoDB.DocumentClient();
const infosRepository = new InfosRepository(ddbClient, infosDdb);

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const lambdaRequestId = context.awsRequestId;
  const apiRequestId = event.requestContext.requestId;
  const method = event.httpMethod;

  console.log(
    `API GATEWAY REQUEST ID: ${apiRequestId} - LAMBDA REQUEST ID: ${lambdaRequestId}`
  );

  if (method == "GET") {
    const infos = await infosRepository.getInfos();

    return {
      statusCode: 200,
      body: JSON.stringify(infos),
    };
  }

  if (method == "POST") {
    const infoRequest = JSON.parse(event.body!) as Infos;
    const info = await infosRepository.createInfos(infoRequest);

    return {
      statusCode: 201,
      body: JSON.stringify(info),
    };
  }

  if (method == "PUT") {
    const info = JSON.parse(event.body!);
    const infoId = event.queryStringParameters!.infoId!;

    try {
      const infoUpdated = await infosRepository.updateInfos(infoId, info);

      return { statusCode: 200, body: JSON.stringify(infoUpdated) };
    } catch (ConditionalCheckFailedException) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Info not found",
          error: ConditionalCheckFailedException,
        }),
      };
    }
  }

  if (method == "DELETE") {
    const infoId = event.queryStringParameters!.infoId!;

    try {
      const infoDeleted = await infosRepository.deleteInfos(infoId);

      return { statusCode: 200, body: JSON.stringify(infoDeleted) };
    } catch (ConditionalCheckFailedException) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Info not found",
          error: ConditionalCheckFailedException,
        }),
      };
    }
  }

  return { statusCode: 400, body: "Bad Request" };
}
