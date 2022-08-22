import { DynamoDB, SNS } from "aws-sdk";
import { Order, OrderProduct, OrderRepository } from "/opt/nodejs/ordersLayer";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";
import { Movie, MovieRepository } from "/opt/nodejs/moviesLayer";
import * as AWSXRay from "aws-xray-sdk";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import {
  OrderMovie,
  OrderProductResponse,
  OrderRequest,
  OrderResponse,
  PaymentType,
} from "/opt/nodejs/ordersApiLayer";
// import {
//   OrderEvent,
//   OrderEventType,
//   Envelope,
// } from "/opt/nodejs/orderEventsLayer";
export enum OrderEventType {
  CREATED = "ORDER_CREATED",
  DELETED = "ORDER_DELETED",
}

export interface Envelope {
  eventType: OrderEventType;
  data: string;
}

export interface OrderEvent {
  email: string;
  orderId: string;
  billing: {
    payment: string;
    totalPrice: number;
  };
  productCodes: string[];
  movieId: string;
  requestId: string;
}

AWSXRay.captureAWS(require("aws-sdk"));

const ordersDdb = process.env.ORDERS_DDB!;
const productsDdb = process.env.PRODUCTS_DDB!;
const moviesDdb = process.env.MOVIES_DDB!;
const orderEventsTopicArn = process.env.ORDER_EVENTS_TOPIC_ARN!;

const ddbClient = new DynamoDB.DocumentClient();
const snsClient = new SNS();

const orderRepository = new OrderRepository(ddbClient, ordersDdb);
const productRepository = new ProductRepository(ddbClient, productsDdb);
const movieRepository = new MovieRepository(ddbClient, moviesDdb);

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  const apiRequestId = event.requestContext.requestId;
  const lambdaRequestId = context.awsRequestId;

  console.log(
    `API GATEWAY REQUEST ID: ${apiRequestId} - LambdaRequestId: ${lambdaRequestId}`
  );

  if (method == "GET") {
    if (event.queryStringParameters) {
      const email = event.queryStringParameters!.email;
      const orderId = event.queryStringParameters!.orderId;

      if (email && orderId) {
        //Get one order from an user
        try {
          const order = await orderRepository.getOrder(email, orderId);
          return {
            statusCode: 200,
            body: JSON.stringify(convertToOrderResponse(order)),
          };
        } catch (error) {
          console.log((<Error>error).message);

          return {
            statusCode: 400,
            body: (<Error>error).message,
          };
        }
      } else if (email) {
        //Get all orders from an email account
        const orders = await orderRepository.getOrdersByEmail(email);

        return {
          statusCode: 200,
          body: JSON.stringify(orders.map(convertToOrderResponse)),
        };
      } else {
        return {
          statusCode: 400,
          body: "Bad Request - Invalid Query String Parameters",
        };
      }
    } else {
      //Get all orders
      const orders = await orderRepository.getAllOrders();

      return {
        statusCode: 200,
        body: JSON.stringify(orders.map(convertToOrderResponse)),
      };
    }
  } else if (method == "POST") {
    console.log("/POST /orders");

    const orderRequest = JSON.parse(event.body!) as OrderRequest;
    const products = await productRepository.getProductsByIds(
      orderRequest.productsIds
    );
    const movie = await movieRepository.getMovieById(orderRequest.movieId);

    if (products.length === orderRequest.productsIds.length) {
      const order = buildOrder(orderRequest, products, movie);
      const orderCreated = await orderRepository.createOrder(order);
      const orderResponse = convertToOrderResponse(orderCreated);

      const movieUpdated = updateMovieChairs(movie, orderRequest);

      const eventResult = await sendOrderEvent(
        orderCreated,
        movie,
        OrderEventType.CREATED,
        lambdaRequestId
      );
      console.log(
        `Order created event sent - OrderID: ${orderCreated.sk} - MessageID: ${eventResult.MessageId}`
      );

      try {
        await movieRepository.updateMovie(movieUpdated.id, movieUpdated);
      } catch (error) {
        console.log((<Error>error).message);
        return {
          statusCode: 400,
          body: (<Error>error).message,
        };
      }

      return { statusCode: 201, body: JSON.stringify(orderResponse) };
    } else {
      return { statusCode: 404, body: "Some product was not found" };
    }
  } else if (method == "DELETE") {
    console.log("/DELETE /orders");

    const email = event.queryStringParameters!.email!;
    const orderId = event.queryStringParameters!.orderId!;

    try {
      const orderDeleted = await orderRepository.deleteOrder(email, orderId);
      const movie = await movieRepository.getMovieById(orderDeleted.movie.id);
      const movieUpdated = updateMovieChairsDeleted(movie, orderDeleted);
      await movieRepository.updateMovie(orderDeleted.movie.id, movieUpdated);

      return {
        statusCode: 200,
        body: JSON.stringify(convertToOrderResponse(orderDeleted)),
      };
    } catch (error) {
      console.log((<Error>error).message);

      return {
        statusCode: 400,
        body: (<Error>error).message,
      };
    }
  }

  return {
    statusCode: 400,
    body: "Bad Request",
  };
}

function buildOrder(
  orderRequest: OrderRequest,
  products: Product[],
  movie: Movie
): Order {
  const orderProducts: OrderProductResponse[] = [];
  const orderMovie: OrderMovie = {
    movieTitle: movie.movieTitle,
    movieSession: movie.movieSession,
    movieChairs: orderRequest.movieChairs,
    id: movie.id,
  };
  let totalPrice = 0;

  products.forEach((product) => {
    totalPrice += product.price;
    orderProducts.push({
      code: product.code,
      price: product.price,
    });
  });

  totalPrice += movie.moviePrice;

  const order: Order = {
    pk: orderRequest.email,
    createdAt: Date.now(),
    cpf: orderRequest.cpf!,
    clientName: orderRequest.clientName!,
    products: orderProducts,
    movie: orderMovie,
    billing: {
      payment: orderRequest.payment,
      totalPrice: totalPrice,
    },
  };

  return order;
}

function convertToOrderResponse(order: Order): OrderResponse {
  const orderProducts: OrderProductResponse[] = [];
  const orderMovie: OrderMovie = {
    movieTitle: order.movie.movieTitle,
    movieSession: order.movie.movieSession,
    movieChairs: order.movie.movieChairs,
    id: order.movie.id,
  };

  order.products.forEach((product) => {
    orderProducts.push({
      code: product.code,
      price: product.price,
    });
  });

  const orderResponse: OrderResponse = {
    email: order.pk,
    id: order.sk!,
    createdAt: order.createdAt!,
    billing: {
      payment: order.billing.payment as PaymentType,
      totalPrice: order.billing.totalPrice as number,
    },
    products: orderProducts,
    movie: orderMovie,
  };

  return orderResponse;
}

function updateMovieChairs(movie: Movie, orderRequest: OrderRequest): Movie {
  movie.movieChairs.map((chair) => {
    orderRequest.movieChairs.map((chairSelected) => {
      if (chairSelected.id === chair.id) {
        chair.reservation = true;
      }
    });
  });

  return movie;
}

function updateMovieChairsDeleted(movie: Movie, orderRequest: Order): Movie {
  movie.movieChairs.map((chair) => {
    orderRequest.movie.movieChairs.map((chairSelected) => {
      if (chairSelected.id === chair.id) {
        chair.reservation = false;
      }
    });
  });

  return movie;
}

function sendOrderEvent(
  order: Order,
  movie: Movie,
  eventType: OrderEventType,
  lambdaRequestId: string
) {
  const productCodes: string[] = [];
  order.products.forEach((product) => {
    productCodes.push(product.code);
  });

  const movieId = movie.id;

  const orderEvent: OrderEvent = {
    productCodes: productCodes,
    email: order.pk,
    orderId: order.sk!,
    billing: order.billing,
    movieId: movieId,
    requestId: lambdaRequestId,
  };

  const envelope: Envelope = {
    eventType: eventType,
    data: JSON.stringify(orderEvent),
  };

  return snsClient
    .publish({
      TopicArn: orderEventsTopicArn,
      Message: JSON.stringify(envelope),
    })
    .promise();
}
