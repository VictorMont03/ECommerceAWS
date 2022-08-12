import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from "aws-lambda"
import {ProductRepository} from "/opt/nodejs/productsLayer";
import {DynamoDB} from "aws-sdk"
import * as AWSXRay from "aws-xray-sdk"

//Monitora as funcoes que utilizam o sdk 
AWSXRay.captureAWS(require("aws-sdk"))

//Busca nas variaveis de ambiente a variavel PRODUCTS_DDB, que foi salva na Stack App
const productsDdb = process.env.PRODUCTS_DDB!;
//Iniciando cliente do DynamoDB
const ddbClient = new DynamoDB.DocumentClient();
//inicia o objeto criado anteriormente passando como parametros o cliente ddb e o nome da tabela desejada 
const productRepository = new ProductRepository(ddbClient, productsDdb);

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult>{
    const lambdaRequestId = context.awsRequestId;
    const apiRequestId = event.requestContext.requestId;

    console.log(`API GATEWAY REQUEST ID: ${apiRequestId} - LAMBDA REQUEST ID: ${lambdaRequestId}`);
    
    const method = event.httpMethod;
    
    if(event.resource === "/products"){
        if(method === "GET"){
            console.log('/GET Products - OK');

            const products = await productRepository.getAllProducts();

            return{
                statusCode: 200,
                body: JSON.stringify(products)
            }
            
        }
    }else if(event.resource === "/products/{id}"){
        const productId = event.pathParameters!.id as string
        console.log(`/GET Product by id - ID: /${productId}`);
    
       

        try{
            const product = await productRepository.getProductById(productId);

            return{ statusCode: 200,
                body: JSON.stringify(product)}
        }catch(error){
            console.log(error);

            return{ statusCode: 404,
                body: JSON.stringify({
                    message: (<Error>error).message
                })}
            
        }  
    }
        return {statusCode: 400, body: JSON.stringify({
            message: "Bad Request"
        })}
    
}
