import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { Movie, MovieRepository } from "/opt/nodejs/moviesLayer";
import { DynamoDB } from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk";

//Monitora as funcoes que utilizam o sdk
AWSXRay.captureAWS(require("aws-sdk"));

const moviesDdb = process.env.MOVIES_DDB!;
const ddbClient = new DynamoDB.DocumentClient();
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

  if (event.resource === "/movies") {
    console.log("POST /movies");

    //Capturando body da requisicao e tipando como a interface a qual defini no productslayer
    const movie = JSON.parse(event.body!) as Movie;
    const movieCreated = await movieRepository.createMovie(movie);

    return {
      statusCode: 201,
      body: JSON.stringify(movieCreated),
    };
  } else if (event.resource === "/movies/{id}") {
    const movieId = event.pathParameters!.id as string;

    if (event.httpMethod === "PUT") {
      console.log(`PUT /movies/${movieId}`);

      //O ponto de exclamação mostra que o acesso do objeto nao é obrigatório, ou seja, o objeto body pode ou não vir no objeto event
      const movie = JSON.parse(event.body!);

      try {
        const MovieUpdated = await movieRepository.updateMovie(movieId, movie);

        return { statusCode: 200, body: JSON.stringify(MovieUpdated) };
      } catch (ConditionalCheckFailedException) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: "Product not found",
            error: ConditionalCheckFailedException,
          }),
        };
      }
    } else if (event.httpMethod === "DELETE") {
      console.log(`DELETE /movies/${movieId}`);

      try {
        const movie = await movieRepository.deleteMovie(movieId);

        return { statusCode: 200, body: JSON.stringify(movie) };
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
