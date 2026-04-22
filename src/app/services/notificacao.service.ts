import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class NotificacaoService {

  notificacoes: any[] = [];
  private intervalo: any;

  constructor(private api: ApiService) {}

  iniciar(usuario_id: number) {
    this.verificar(usuario_id);
    this.intervalo = setInterval(() => {
      this.verificar(usuario_id);
    }, 5000);
  }

  parar() {
    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
  }

  private async verificar(usuario_id: number) {
    try {
      const data = await this.api.get(`/notificacoes/${usuario_id}`);
      this.notificacoes = data;
    } catch (e) {
      console.error('Erro ao verificar notificações:', e);
    }
  }

  get total() {
    return this.notificacoes.length;
  }
}