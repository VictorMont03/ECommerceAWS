import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";
import { DynamoDB, Lambda } from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk";

import { ProductEvent, ProductEventType } from "/opt/nodejs/productEventsLayer";

//Monitora as funcoes que utilizam o sdk
AWSXRay.captureAWS(require("aws-sdk"));

//Busca nas variaveis de ambiente a variavel PRODUCTS_DDB, que foi salva na Stack App
const productsDdb = process.env.PRODUCTS_DDB!;
//Iniciando cliente do DynamoDB
const ddbClient = new DynamoDB.DocumentClient();
//Cliente lambda do DynamoDB
const lambdaClient = new Lambda();
//Capturando valor da variavel de ambiente passada na funcao lambda da pilha de produtos
const productEventsFunctionName = process.env.PRODUCT_EVENTS_FUNCTION_NAME!;
//inicia o objeto criado anteriormente passando como parametros o cliente ddb e o nome da tabela desejada
const productRepository = new ProductRepository(ddbClient, productsDdb);
//Inicia o objeto de eventos

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const lambdaRequestId = context.awsRequestId;
  const apiRequestId = event.requestContext.requestId;

  console.log(
    `API GATEWAY REQUEST ID: ${apiRequestId} - LAMBDA REQUEST ID: ${lambdaRequestId}`
  );

  if (event.resource === "/products") {
    console.log("POST /products");

    //Capturando body da requisicao e tipando como a interface a qual defini no productslayer
    const product = JSON.parse(event.body!) as Product;
    const productCreated = await productRepository.createProduct(product);

    const response = await sendProductEvent(
      product,
      ProductEventType.CREATED,
      "user@gmail.com",
      lambdaRequestId
    );

    console.log(response);

    return {
      statusCode: 201,
      body: JSON.stringify(productCreated),
    };
  } else if (event.resource === "/products/{id}") {
    const productId = event.pathParameters!.id as string;

    if (event.httpMethod === "PUT") {
      console.log(`PUT /products/${productId}`);

      //O ponto de exclamação mostra que o acesso do objeto nao é obrigatório, ou seja, o objeto body pode ou não vir no objeto event
      const product = JSON.parse(event.body!);

      try {
        const ProductUpdated = await productRepository.updateProduct(
          productId,
          product
        );

        const response = await sendProductEvent(
          product,
          ProductEventType.UPDATED,
          "userUpdate@gmail.com",
          lambdaRequestId
        );

        console.log(response);

        return { statusCode: 200, body: JSON.stringify(ProductUpdated) };
      } catch (ConditionalCheckFailedException) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: "Product not found" }),
        };
      }
    } else if (event.httpMethod === "DELETE") {
      console.log(`DELETE /products/${productId}`);

      try {
        const product = await productRepository.deleteProduct(productId);

        const response = await sendProductEvent(
          product,
          ProductEventType.DELETED,
          "userDelete@gmail.com",
          lambdaRequestId
        );

        console.log(response);

        return { statusCode: 200, body: JSON.stringify(product) };
      } catch (error) {
        return {
          statusCode: 200,
          body: JSON.stringify({ message: (<Error>error).message }),
        };
      }
    }
  }

  return { statusCode: 400, body: "Bad Request" };
}

function sendProductEvent(
  product: Product,
  eventType: ProductEventType,
  email: string,
  lambdaRequestId: string
) {
  const event: ProductEvent = {
    email: email,
    eventType: eventType,
    productCode: product.code,
    productId: product.id,
    productPrice: product.price,
    requestId: lambdaRequestId,
  };

  return lambdaClient
    .invoke({
      FunctionName: productEventsFunctionName,
      Payload: JSON.stringify(event),
      //Poder capturar o retorno || A invocação é sincrona
      //RequestResponse -> Espera a finalizacao da funcao de admin para terminar sua execucao
      //Event -> Ao ser chamada tenta terminar sua execução o mais rápido possível
      InvocationType: "RequestResponse",
    })
    .promise();
}
