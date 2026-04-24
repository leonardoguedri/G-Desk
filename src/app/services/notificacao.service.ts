import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class NotificacaoService {

  notificacoes: any[] = [];
  notificacoesSetor: any[] = [];
  private intervalo: any;

  constructor(private api: ApiService, private router: Router) {}

  iniciar(usuario_id: number) {
    this.verificar(usuario_id);
    this.intervalo = setInterval(() => {
      this.verificar(usuario_id);
    }, 5000);
  }

  parar() {
    if (this.intervalo) clearInterval(this.intervalo);
  }

  private async verificar(usuario_id: number) {
    try {
      const [pessoais, setor] = await Promise.all([
        this.api.get(`/notificacoes/${usuario_id}`),
        this.api.get(`/notificacoes-setor/${usuario_id}`)
      ]);
      this.notificacoes = pessoais;
      this.notificacoesSetor = setor;
    } catch (e) {
      console.error('Erro nas notificações:', e);
    }
  }

  async marcarComoLida(id: number, usuario_id: number) {
    await this.api.put(`/notificacoes/${id}/lida`, {});
    await this.verificar(usuario_id);
  }

  async marcarTodasLidas(usuario_id: number) {
    await this.api.put(`/notificacoes/usuario/${usuario_id}/todas-lidas`, {});
    await this.verificar(usuario_id);
  }

  abrirChamado(chamado_id: number) {
    this.router.navigate(['/chamado', chamado_id]);
  }

  get totalPessoais() {
    return this.notificacoes.length;
  }

  get totalSetor() {
    return this.notificacoesSetor.length;
  }

  get total() {
    return this.totalPessoais + this.totalSetor;
  }
}