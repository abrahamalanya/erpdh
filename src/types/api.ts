export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Role {
  id: number;
  name: string;
}

export interface User {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  estado: string;
  roles?: Role[];
}

export interface LoginData {
  user: User;
  access_token: string;
  token_type: string;
}
