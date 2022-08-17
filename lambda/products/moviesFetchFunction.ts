import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { MovieRepository } from "/opt/nodejs/moviesLayer";
import { DynamoDB } from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk";

//Monitora as funcoes que utilizam o sdk
AWSXRay.captureAWS(require("aws-sdk"));

//Busca nas variaveis de ambiente a variavel PRODUCTS_DDB, que foi salva na Stack App
const moviesDdb = process.env.MOVIES_DDB!;
//Iniciando cliente do DynamoDB
const ddbClient = new DynamoDB.DocumentClient();
//inicia o objeto criado anteriormente passando como parametros o cliente ddb e o nome da tabela desejada
const movieRepository = new MovieRepository(ddbClient, moviesDdb);

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const lambdaRequestId = context.awsRequestId;
  const apiRequestId = event.requestContext.requestId;

  console.log(
    `API GATEWAY REQUEST ID: ${apiRequestId} - LAMBDA REQUEST ID: ${lambdaRequestId}`
  );

  const method = event.httpMethod;

  if (event.resource === "/movies") {
    if (method === "GET") {
      console.log("/GET Movies - OK");

      const products = await movieRepository.getAllMovies();

      return {
        statusCode: 200,
        body: JSON.stringify(products),
      };
    }
  } else if (event.resource === "/movies/{id}") {
    const movieId = event.pathParameters!.id as string;
    console.log(`/GET Movie by id - ID: /${movieId}`);

    try {
      const movie = await movieRepository.getMovieById(movieId);

      return { statusCode: 200, body: JSON.stringify(movie) };
    } catch (error) {
      console.log(error);

      return {
        statusCode: 404,
        body: JSON.stringify({
          message: (<Error>error).message,
        }),
      };
    }
  }
  return {
    statusCode: 400,
    body: JSON.stringify({
      message: "Bad Request",
    }),
  };
}
