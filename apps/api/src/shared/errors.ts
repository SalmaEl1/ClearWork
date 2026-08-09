/**
 * Error de dominio con un código HTTP asociado. Los servicios lanzan
 * subclases de AppError; el errorHandler es el único sitio que sabe
 * traducirlas a una respuesta HTTP.
 */
export class AppError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Solicitud inválida") {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "No autenticado") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "No autorizado para realizar esta acción") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso no encontrado") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "El recurso está en un estado incompatible con esta operación") {
    super(message, 409);
  }
}
