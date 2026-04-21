import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private api = 'http://localhost:3000';

  async login(email: string, senha: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.api}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });

      if (!response.ok) return false;

      const data = await response.json();

      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));

      return true;

    } catch (e) {
      return false;
    }
  }

  getToken(): string {
    return localStorage.getItem('token') || '';
  }

  getUsuario() {
    return JSON.parse(localStorage.getItem('usuario') || 'null');
  }

  isAdmin(): boolean {
    return this.getUsuario()?.perfil === 'admin';
  }

  isAutenticado(): boolean {
    return !!this.getToken();
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  }
}