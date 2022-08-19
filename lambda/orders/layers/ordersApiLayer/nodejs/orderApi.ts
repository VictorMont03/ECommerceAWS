export enum PaymentType {
  CASH = "CASH",
  DEBIT_CARD = "DEBIT_CARD",
  PIX = "PIX",
  CREDIT_CARD = "CREDIT_CARD",
}

export interface Chair {
  id: string;
  reservation: boolean;
}

export interface OrderRequest {
  email: string;
  cpf?: string;
  clientName?: string;
  movieChairs: Chair[];
  productsIds: string[];
  movieId: string;
  payment: PaymentType;
}

export interface OrderProductResponse {
  code: string;
  price: number;
}

export interface OrderMovie {
  movieTitle: string;
  movieSession: string;
  movieChairs: Chair[];
}

export interface OrderResponse {
  email: string;
  id: string;
  createdAt: number;
  billing: {
    payment: PaymentType;
    totalPrice: number;
  };
  products: OrderProductResponse[];
  movie: OrderMovie;
}
